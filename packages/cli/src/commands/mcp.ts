import { Command } from "commander";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  runGenerateDeck,
  runGenerateDoc,
  runGenerateSheet,
  runEditDeck,
  runEditDoc,
  runEditSheet,
} from "../run-agent";
import { requireLlmEnv } from "../llm-client";
import { createShareLink } from "../share-link";
// V36 fix · @/core 值改 tool 回调内动态 import,打破 CLI ESM 循环依赖(见 run-agent.ts)

/**
 * Plain MCP server (stdio) — Claude Code / Cursor / 任意 MCP-aware agent 调用入口。
 *
 * 设计原则(见 reference_plain_oss_benchmarks.md):
 * - 粗粒度工具:generate_deck / edit_deck / export — 不暴露 apply_json_patch 这种细粒度
 *   (粗粒度 LLM 调用更可靠,且 prompt injection 风险低)
 * - tool description 必须 unambiguous:每个 description 只描述一个动作,不写"或/和"
 * - 复用 CLI 内部已实现的 run-agent helpers,不重复实现 agent 逻辑
 *
 * Agent identification:每个工具调用时,在 setupLlmEnv 里传不同 agentId,
 * 后续 gateway 计费时按 agent 维度统计(对应"按 agent license"定价)。
 */

const TOOL_DESCRIPTIONS = {
  // ── V32 统一 artifact 工具(首选) ──
  generate_artifact:
    "Generate a Plain living artifact from a natural-language intent. " +
    "Plain is the artifact layer for AI work — one source, delivered as a shareable web page (a link, not a file). " +
    "Choose the expression via `form`: deck (a presentation), doc (a long-form report), or sheet (a data dashboard). " +
    "Returns a shareable link to the published artifact plus its source. " +
    "Use this for a NEW artifact; to modify an existing one use edit_artifact.",
  edit_artifact:
    "Edit an existing Plain artifact via a natural-language instruction. " +
    "Input: the current artifact source, the change instruction, AND its `form` (deck | doc | sheet). " +
    "Output: a shareable link to the updated artifact plus the modified source. " +
    "Use ONLY when modifying an existing artifact; for new ones use generate_artifact.",
  export:
    "Export a Plain artifact source to a self-contained, web-native HTML file. " +
    "Delivery in Plain is normally a link (always the current version) — export a file only when you need one offline. " +
    "Input: artifact source + its `form`. Returns the HTML. " +
    "(PDF/PNG render from the web page; Office .pptx/.docx/.xlsx are a legacy fallback via the export_*_ tools.)",
  // ── 旧的按形态工具(保留 · 向后兼容已接入的 agent) ──
  generate_deck:
    "Generate a Plain presentation (a deck) from a natural-language intent. " +
    "Returns the deck source. Prefer generate_artifact with form:'deck'; kept for compatibility.",
  edit_deck:
    "Edit an existing Plain deck via natural-language instruction. Input: current deck source + instruction. " +
    "Prefer edit_artifact with form:'deck'; kept for compatibility.",
  generate_doc:
    "Generate a Plain long-form report (a doc) from intent. Returns Markdown source with Plain frontmatter. " +
    "Prefer generate_artifact with form:'doc'; kept for compatibility.",
  edit_doc:
    "Edit an existing Plain doc via natural-language instruction. Prefer edit_artifact with form:'doc'.",
  generate_sheet:
    "Generate a Plain data dashboard (a sheet) from intent. Returns the sheet envelope (columns/charts + csv + narrative). " +
    "Prefer generate_artifact with form:'sheet'; kept for compatibility.",
  edit_sheet:
    "Edit an existing Plain sheet via natural-language instruction. Prefer edit_artifact with form:'sheet'.",
  export_deck_pptx:
    "Legacy Office fallback: export a Plain deck source to a .pptx file. " +
    "Prefer `export` (web-native HTML) or sharing the link. Input: deck source. Returns base64 binary.",
  export_doc_docx:
    "Legacy Office fallback: export a Plain doc source to a .docx file. " +
    "Prefer `export` (web-native HTML). Input: doc source. Returns base64 binary.",
  export_sheet_xlsx:
    "Legacy Office fallback: export a Plain sheet source to a .xlsx file. " +
    "Prefer `export` (web-native HTML). Input: sheet source. Returns base64 binary.",
};

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/**
 * 生成成功后顺手发一个分享链接,把 URL 拼到返回文本最前面。
 *
 * 为什么放最前:agent 读到的第一行就是"这东西在哪能打开",它转述给用户时
 * 才会带上链接而不是甩一整篇 Markdown。
 *
 * 失败绝不能吞掉生成结果 —— 分享是增值,不是前提。任何错误都降级成
 * "source + 一行说明",让 agent 知道链接没发成但内容是好的。
 */
async function withShareLink(
  body: string,
  opts: { kind: "deck" | "doc" | "sheet"; source: string; share?: boolean },
): Promise<string> {
  if (opts.share === false) return body;
  try {
    const { url } = await createShareLink({ kind: opts.kind, source: opts.source });
    return `Shareable link: ${url}\n\n${body}`;
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return `(Could not publish a share link: ${why} — the ${opts.kind} itself is fine, below.)\n\n${body}`;
  }
}

/**
 * 错误 → agent 友好的结构化返回(借鉴 OfficeCLI"错误带有效范围建议",让 agent 自纠)。
 * 把裸异常翻成:① 人类可读原因 ② 给 agent 的「下一步该怎么做」建议。
 * isError:true 让 MCP 客户端知道这是失败,但 agent 仍能读到 text 自我修正。
 */
function errResult(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e);
  const low = raw.toLowerCase();
  let hint = "";
  if (low.includes("unauthenticated") || low.includes("login") || low.includes("api key") || low.includes("401")) {
    hint = "需要登录:让用户运行 `plain login`,或设置 PLAIN_API_KEY 环境变量。登录后重试同一调用即可。";
  } else if (low.includes("insufficient") || low.includes("balance") || low.includes("out_of_credits") || low.includes("402")) {
    hint = "账户积分不足:让用户升级套餐或购买积分包后重试。不要反复重试同一调用(会一直失败)。";
  } else if (low.includes("schema") || low.includes("不符合") || low.includes("invalid") || low.includes("不合规")) {
    hint = "生成结果未通过 schema 校验(通常是模型偶发)。建议:① 直接重试一次(多为偶发) ② 或把 intent 描述得更具体简洁。";
  } else if (low.includes("rate") || low.includes("429") || low.includes("timeout") || low.includes("5") && /50[0-4]/.test(raw)) {
    hint = "上游模型暂时不可用(限流/超时/5xx)。建议:等几秒后重试一次,Plain 会自动尝试备用模型。";
  } else {
    hint = "建议:检查输入参数是否完整(generate 需要 intent;edit 需要 source + instruction),修正后重试。";
  }
  return {
    isError: true,
    content: [{ type: "text" as const, text: `错误:${raw}\n\n下一步:${hint}` }],
  };
}

/** 包装 tool handler:统一 try-catch → errResult,所有 tool 出错都给 agent 自纠建议。
 *  透传 MCP SDK 的完整 handler 签名(args, extra…),返回类型交给 SDK 推断。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap<F extends (...a: any[]) => Promise<any>>(fn: F): F {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...a: any[]) => {
    try {
      return await fn(...a);
    } catch (e) {
      return errResult(e);
    }
  }) as F;
}

function okBinary(base64: string, filename: string) {
  return {
    content: [
      { type: "text" as const, text: `Binary ${filename} (${base64.length} base64 chars)` },
      { type: "resource" as const, resource: { uri: `plain://export/${filename}`, blob: base64, mimeType: "application/octet-stream" } },
    ],
  };
}

/** 把 v2 DSL source 转 Document 跑 validate,返回 warnings 文本(干净则空串)。
 *  借鉴 Bento validate · 动态 import 打破 CLI ESM 循环依赖。 */
async function validateSource(source: string): Promise<string> {
  try {
    const [{ dslToDocument }, { validateDocument, formatWarnings }] = await Promise.all([
      import("@/lib/v32/migrate/dsl-to-document"),
      import("@/lib/v32/content/validate"),
    ]);
    const w = formatWarnings(validateDocument(dslToDocument(source)));
    return w === "✓ no issues" ? "" : w;
  } catch {
    return "";
  }
}

function buildServer(): McpServer {
  const server = new McpServer(
    { name: "plain", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // ─── V32 统一 artifact 工具(首选) ──────────────────────────
  const genByForm = {
    deck: (intent: string) => runGenerateDeck({ intent }),
    doc: (intent: string) => runGenerateDoc({ intent }),
    sheet: (intent: string) => runGenerateSheet({ intent }),
  } as const;
  const editByForm = {
    deck: (source: string, instruction: string) => runEditDeck({ source, instruction }),
    doc: (source: string, instruction: string) => runEditDoc({ source, instruction }),
    sheet: (source: string, instruction: string) => runEditSheet({ source, instruction }),
  } as const;

  server.registerTool(
    "generate_artifact",
    {
      description: TOOL_DESCRIPTIONS.generate_artifact,
      inputSchema: {
        intent: z.string().describe("What the artifact should be about, in natural language"),
        form: z
          .enum(["deck", "doc", "sheet"])
          .describe("Expression: deck (presentation) | doc (report) | sheet (dashboard)"),
        share: z
          .boolean()
          .optional()
          .describe(
            "Also publish as a shareable web link and include the URL (default: true). " +
              "Set false to get only the source text.",
          ),
      },
    },
    wrap(async ({ intent, form, share }: { intent: string; form: "deck" | "doc" | "sheet"; share?: boolean }) => {
      requireLlmEnv({ agentId: `mcp/generate_artifact/${form}`, throwOnMissing: true });
      const r = await genByForm[form](intent);
      // 渲染前校验(借鉴 Bento validate)· 把 warnings 附在 source 后给 agent 自纠
      const warn = await validateSource(r.source);
      const body = warn ? `${r.source}\n\n<!-- plain:validate\n${warn}\n-->` : r.source;
      return ok(await withShareLink(body, { kind: form, source: r.source, share }));
    }),
  );

  server.registerTool(
    "edit_artifact",
    {
      description: TOOL_DESCRIPTIONS.edit_artifact,
      inputSchema: {
        source: z.string().describe("Current artifact source"),
        instruction: z.string().describe("Natural-language description of the change to make"),
        form: z.enum(["deck", "doc", "sheet"]).describe("The artifact's form"),
        share: z
          .boolean()
          .optional()
          .describe(
            "Also publish the edited result as a shareable web link (default: true). " +
              "Set false to get only the source text.",
          ),
      },
    },
    wrap(async ({ source, instruction, form, share }: { source: string; instruction: string; form: "deck" | "doc" | "sheet"; share?: boolean }) => {
      requireLlmEnv({ agentId: `mcp/edit_artifact/${form}`, throwOnMissing: true });
      const r = await editByForm[form](source, instruction);
      return ok(await withShareLink(r.source, { kind: form, source: r.source, share }));
    }),
  );

  server.registerTool(
    "export",
    {
      description: TOOL_DESCRIPTIONS.export,
      inputSchema: {
        source: z.string().describe("Artifact source string"),
        form: z.enum(["deck", "doc", "sheet"]).describe("The artifact's form"),
      },
    },
    wrap(async ({ source, form }) => {
      const [{ renderDeck }, { renderDoc }, { renderSheet }] = await Promise.all([
        import("@/lib/render-v2/render-deck"),
        import("@/lib/render-v2/render-doc"),
        import("@/lib/render-v2/render-sheet"),
      ]);
      const html =
        form === "deck"
          ? renderDeck({ source })
          : form === "doc"
            ? renderDoc({ source })
            : renderSheet({ source });
      return ok(html);
    }),
  );

  // ─── generate(旧 · 按形态 · 向后兼容) ─────────────────────
  server.registerTool(
    "generate_deck",
    {
      description: TOOL_DESCRIPTIONS.generate_deck,
      inputSchema: {
        intent: z.string().describe("What the deck should be about, in natural language"),
        mode: z.enum(["brief", "feature"]).optional().describe("brief = 8-12 pages (default); feature = 18-28 pages Monocle-style"),
      },
    },
    wrap(async ({ intent, mode }) => {
      requireLlmEnv({ agentId: "mcp/generate_deck", throwOnMissing: true });
      const r = await runGenerateDeck({ intent, mode });
      return ok(await withShareLink(r.source, { kind: "deck", source: r.source }));
    }),
  );

  server.registerTool(
    "edit_deck",
    {
      description: TOOL_DESCRIPTIONS.edit_deck,
      inputSchema: {
        source: z.string().describe("Current deck Marp Markdown source"),
        instruction: z.string().describe("Natural-language description of the change to make"),
      },
    },
    wrap(async ({ source, instruction }) => {
      requireLlmEnv({ agentId: "mcp/edit_deck", throwOnMissing: true });
      const r = await runEditDeck({ source, instruction });
      return ok(await withShareLink(r.source, { kind: "deck", source: r.source }));
    }),
  );

  server.registerTool(
    "generate_doc",
    {
      description: TOOL_DESCRIPTIONS.generate_doc,
      inputSchema: { intent: z.string() },
    },
    wrap(async ({ intent }) => {
      requireLlmEnv({ agentId: "mcp/generate_doc", throwOnMissing: true });
      const r = await runGenerateDoc({ intent });
      return ok(await withShareLink(r.source, { kind: "doc", source: r.source }));
    }),
  );

  server.registerTool(
    "edit_doc",
    {
      description: TOOL_DESCRIPTIONS.edit_doc,
      inputSchema: {
        source: z.string(),
        instruction: z.string(),
      },
    },
    wrap(async ({ source, instruction }) => {
      requireLlmEnv({ agentId: "mcp/edit_doc", throwOnMissing: true });
      const r = await runEditDoc({ source, instruction });
      return ok(await withShareLink(r.source, { kind: "doc", source: r.source }));
    }),
  );

  server.registerTool(
    "generate_sheet",
    {
      description: TOOL_DESCRIPTIONS.generate_sheet,
      inputSchema: { intent: z.string() },
    },
    wrap(async ({ intent }) => {
      requireLlmEnv({ agentId: "mcp/generate_sheet", throwOnMissing: true });
      const r = await runGenerateSheet({ intent });
      return ok(await withShareLink(r.source, { kind: "sheet", source: r.source }));
    }),
  );

  server.registerTool(
    "edit_sheet",
    {
      description: TOOL_DESCRIPTIONS.edit_sheet,
      inputSchema: {
        source: z.string(),
        instruction: z.string(),
      },
    },
    wrap(async ({ source, instruction }) => {
      requireLlmEnv({ agentId: "mcp/edit_sheet", throwOnMissing: true });
      const r = await runEditSheet({ source, instruction });
      return ok(await withShareLink(r.source, { kind: "sheet", source: r.source }));
    }),
  );

  // ─── export(无需 LLM) ─────────────────────────────────────
  server.registerTool(
    "export_deck_pptx",
    {
      description: TOOL_DESCRIPTIONS.export_deck_pptx,
      inputSchema: { source: z.string() },
    },
    wrap(async ({ source }) => {
      const { deckDocToPptx, marpToDeck } = await import("@/core");
      const buf = await deckDocToPptx(marpToDeck(source));
      return okBinary(Buffer.from(buf).toString("base64"), "deck.pptx");
    }),
  );

  server.registerTool(
    "export_doc_docx",
    {
      description: TOOL_DESCRIPTIONS.export_doc_docx,
      inputSchema: { source: z.string() },
    },
    wrap(async ({ source }) => {
      const { docDocToDocx, mdToDoc } = await import("@/core");
      const buf = await docDocToDocx(mdToDoc(source));
      return okBinary(Buffer.from(buf).toString("base64"), "doc.docx");
    }),
  );

  server.registerTool(
    "export_sheet_xlsx",
    {
      description: TOOL_DESCRIPTIONS.export_sheet_xlsx,
      inputSchema: { source: z.string() },
    },
    wrap(async ({ source }) => {
      const { sheetDocToXlsx, sourceToSheet } = await import("@/core");
      const buf = sheetDocToXlsx(sourceToSheet(source));
      return okBinary(Buffer.from(buf).toString("base64"), "sheet.xlsx");
    }),
  );

  return server;
}

export function registerMcp(program: Command): void {
  program
    .command("mcp")
    .description(
      "Run Plain as a stdio MCP server — lets Claude Code / Cursor / any agent generate, edit, and export living artifacts.",
    )
    .action(async () => {
      const server = buildServer();
      const transport = new StdioServerTransport();
      // 注意:stdout 被 MCP 占用,任何 console.log 会污染协议;走 stderr 即可。
      process.stderr.write("plain mcp server listening on stdio\n");
      await server.connect(transport);
    });
}
