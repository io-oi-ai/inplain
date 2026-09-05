import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { extname, basename } from "node:path";
import { progress, fail } from "../output";
// V36 fix · @/core 和 render-v2 都在 CLI ESM 循环依赖强连通分量内,顶层静态 import 会在
// linking 期拿到未初始化 binding。值改 action 回调内动态 import(运行时环已就绪),
// 类型保留顶层(linking 期擦除)。详见 run-agent.ts 注释。web 端走 webpack 不受影响。
import type { DocKind, WorkspaceContext } from "@/core";

type Fmt = "pptx" | "docx" | "xlsx" | "pdf" | "html";

function detectKind(source: string): DocKind {
  // V21+ · 先看 v2/v3 frontmatter,再看 v1
  const fm = source.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return "doc";
  const body = fm[1];
  // V25 · sheet@v3 / 兼容 v2:plain: deck@v2 / doc@v2 / sheet@v[23]
  const v2v3m = body.match(/^\s*plain:\s*["']?(deck|doc|sheet)@v[23]/m);
  if (v2v3m) return v2v3m[1] as DocKind;
  // v1
  if (/^\s*marp:\s*true/m.test(body)) return "deck";
  if (/^\s*kind:\s*sheet/m.test(body)) return "sheet";
  return "doc";
}

function isV2(source: string): boolean {
  // V25 · 兼容 sheet@v3:^--- 后任意位置含 plain: <kind>@v[23]
  return /^---[\s\S]*?\bplain:\s*["']?(deck|doc|sheet)@v[23]/m.test(source);
}

function defaultOut(input: string, fmt: Fmt): string {
  const base = basename(input, extname(input));
  return `${base}.${fmt}`;
}

/**
 * 导出前展开 @ref(只支持单文件 workspace,即 ref 目标必须是同文件中的某段;
 * 跨文件 ref 在 CLI 模式下需要 --workspace <dir> 加载多文件——当前未实现)。
 *
 * 单文件导出场景下:
 * - @ref 找不到目标 → 替换为 ⟨@ref:not found⟩(同 web 端行为)
 * - [sheet:id] 块嵌入 → 替换为空(没有 workspace 解析不了)
 *
 * Phase 2+ 加 --workspace 参数后,把 dir 里所有 .md 加进 ws 再展开。
 */
// V36 fix · core 工具函数从动态 import 传入(打破 CLI ESM 循环依赖)
type ExpandDeps = Pick<
  typeof import("@/core"),
  "replaceRefs" | "resolveRef" | "parseSheetEmbed" | "sourceToSheet" | "sheetToHtmlTable"
>;
function expandRefs(source: string, ws: WorkspaceContext, core: ExpandDeps): string {
  let s = core.replaceRefs(source, (ref) => {
    const r = core.resolveRef(ref, ws);
    return r.ok ? r.inline : `⟨@ref:${r.reason}⟩`;
  });
  s = s
    .split("\n")
    .map((line) => {
      const em = core.parseSheetEmbed(line.trim());
      if (!em) return line;
      const target = ws.find((d) => d.id === em.docId && d.kind === "sheet");
      if (!target) return line;
      try {
        const sheet = core.sourceToSheet(target.source);
        return core.sheetToHtmlTable(sheet, em.columns, em.limit);
      } catch {
        return line;
      }
    })
    .join("\n");
  return s;
}

export function registerExport(program: Command): void {
  program
    .command("export")
    .description(
      "Export an artifact to a web-native file (HTML). Delivery is a link — export only when you need a file. " +
        "Office (.pptx/.docx/.xlsx) is a legacy compatibility fallback; Office is import-only in Plain.",
    )
    .argument("<file>", "source file (.md)")
    .requiredOption(
      "--to <fmt>",
      "web-native: html (recommended) · legacy Office fallback: pptx | docx | xlsx · (pdf/png via web app)",
    )
    .option("-o, --output <file>", "output path (default: <input>.<fmt>)")
    .action(async (file, opts) => {
      const fmt = opts.to as Fmt;
      if (!["html", "pptx", "docx", "xlsx", "pdf"].includes(fmt)) {
        fail(`unknown format: ${fmt}. Use html (recommended) | pptx | docx | xlsx`);
      }
      if (fmt === "pdf") {
        fail(
          "PDF/PNG are rendered from the web page (browser print pipeline) — export them from the web app or the share link. " +
            "In the CLI, use --to html for the self-contained web-native artifact.",
        );
      }

      // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头注释)
      const core = await import("@/core");
      const { marpToDeck, mdToDoc, sourceToSheet, deckDocToPptx, docDocToDocx, sheetDocToXlsx } = core;

      const source = readFileSync(file, "utf8");
      const kind = detectKind(source);
      const outFile = opts.output ?? defaultOut(file, fmt);
      const sourceIsV2 = isV2(source);
      progress(`export ${file} (${kind}${sourceIsV2 ? " · v2" : ""}) → ${outFile}`);

      // V21 · HTML 路径:Plain 的产物,优先级最高 · 走 render-v2(v2 source)或 render(v1)
      if (fmt === "html") {
        let html: string;
        if (sourceIsV2) {
          // v2 直接走 render-v2(同 web/api/render-v2 行为)· 动态 import 打破循环依赖
          const [{ renderDeck }, { renderDoc }, { renderSheet }] = await Promise.all([
            import("@/lib/render-v2/render-deck"),
            import("@/lib/render-v2/render-doc"),
            import("@/lib/render-v2/render-sheet"),
          ]);
          if (kind === "deck") html = renderDeck({ source });
          else if (kind === "doc") html = renderDoc({ source });
          else html = renderSheet({ source });
        } else {
          // v1 marp/老 doc/sheet · 走 client-bridge 的 render-impl(同 web 旧路径)
          const { renderHtml } = await import("@/lib/client-bridge/render-impl");
          html = renderHtml(kind, source, [
            { id: "self", kind, title: basename(file), source },
          ]);
        }
        writeFileSync(outFile, html);
        process.stderr.write(`✓ wrote ${outFile} (${html.length} bytes · html-first)\n`);
        return;
      }

      // PPTX/DOCX/XLSX 兼容性导出 · 仅 v1 source 直通(v2 暂以错误信息提示)
      if (sourceIsV2) {
        fail(
          `v2 source 暂未直接支持 ${fmt} 兼容导出 · 用 --to html 拿网页产物 ` +
            `(Plain 的产物是网页,不是文件;.${fmt} 仅作降级补丁)`,
        );
      }

      // 单文件 ref 展开:把自己也放进 ws 里(允许 self-ref,例如 sheet 自己引自己的 col)
      const selfWs: WorkspaceContext = [
        { id: "self", kind, title: basename(file), source },
      ];
      const expanded = expandRefs(source, selfWs, core);

      if (fmt === "pptx") {
        if (kind !== "deck") fail(`pptx requires deck source (detected: ${kind})`);
        const deck = marpToDeck(expanded);
        const buf = await deckDocToPptx(deck);
        writeFileSync(outFile, buf);
      } else if (fmt === "docx") {
        if (kind !== "doc") fail(`docx requires doc source (detected: ${kind})`);
        const doc = mdToDoc(expanded);
        const buf = await docDocToDocx(doc);
        writeFileSync(outFile, buf);
      } else if (fmt === "xlsx") {
        if (kind !== "sheet") fail(`xlsx requires sheet source (detected: ${kind})`);
        const sheet = sourceToSheet(expanded);
        const buf = sheetDocToXlsx(sheet);
        writeFileSync(outFile, buf);
      }

      process.stderr.write(`✓ wrote ${outFile}\n`);
    });
}
