/**
 * CLI 跑 agent 的统一入口 · V26-E.4 重写 · 走新 Agent runtime + plainTools。
 *
 * 老路径:CLI 直接 import generateDeckV2/editDeckV2/... 9 个老函数 · 串 routeIntent + dispatch
 * 新路径:
 *   - new Agent({ tools: plainTools, rules: PLAIN_DEFAULT_RULES, ... })
 *   - agent.prompt(contextualPrompt)
 *   - subscribe(emit) · 收集 EvDoc / EvPatch / EvError 出最终 Result
 *
 * CLI 6 个 sub-command(plain deck generate / deck edit / doc generate / doc edit / sheet generate / sheet edit)
 * 全部走这一份 runAgent 入口 · 只是 kind / current source / instruction 不同。
 *
 * 输出语义不变(stderr 进度 + stdout/文件源 + 可选 cloud push)。
 */
import { writeFileSync } from "node:fs";
import { nanoid } from "nanoid";
// V36 fix · run-agent 整个 agent 子系统的值 import 全改函数内动态 import,把 run-agent
// 这个节点从 CLI ESM 循环依赖里彻底摘除(顶层静态 import 在 linking 期拿到未初始化的
// binding → "does not provide an export")。type import 保留(linking 期擦除,无影响)。
// web 端走 webpack 不受此环影响,故只改 CLI 路径。
import type { Agent as AgentType } from "@/lib/agent/core/agent";
import type { AgentEvent } from "@/lib/agent/core/events";
import type {
  DocKind,
  WorkspaceContext,
} from "@/core";
// V36 fix · agent-system 改函数内动态 import(见 runAgent):它在 CLI 完整 import 图里
// 被卷进一条 ESM 循环依赖,顶层静态 import 会在 linking 期拿到未初始化的 binding
// ("does not provide an export named AGENT_SYSTEM_PROMPT")。动态 import 推迟到运行时,
// 此时环已完全初始化,binding 可用。web 端走 webpack 不受影响,故只在 CLI 路径改。
import type { ContextualPromptInput } from "@/lib/agent/prompts/agent-system";
import { emit, progress, fail, getOutputMode } from "./output";
import { gatewayFetch } from "./gateway-client";

export type Result = {
  kind: DocKind;
  source: string;
  /** 不再 parse 回 doc 节省时间 · CLI 拿 source 已足够(file 写出 / cloud push) */
  doc?: unknown;
};

type RunAgentInput = {
  /** 用户原始 prompt(或 intent / instruction) */
  prompt: string;
  /** 期望文档类型 · 给 LLM 一个 hint */
  kind: DocKind;
  /** 当前 source · edit 必传 · generate 不传 */
  currentSource?: string;
  /** 跨文档引用 */
  workspace?: WorkspaceContext;
  /** 单次 turn 上限 · 默认 5 */
  maxTurns?: number;
};

/**
 * 统一跑一次 Agent · 收集 doc/patch 事件 · 返回 Result
 */
async function runAgent(input: RunAgentInput): Promise<Result> {
  // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头 import 注释)。
  // 整个 agent 子系统的值在这里运行时加载,此时环已完全初始化,binding 可用。
  const [{ AGENT_SYSTEM_PROMPT, buildContextualPrompt }, { Agent }, { getModel }, { plainTools }, { PLAIN_DEFAULT_RULES }, { getModelConfig }] =
    await Promise.all([
      import("@/lib/agent/prompts/agent-system"),
      import("@/lib/agent/core/agent"),
      import("@/lib/agent/provider"),
      import("@/lib/agent/tools"),
      import("@/lib/agent/rules"),
      import("@/lib/agents/config"),
    ]);
  const cfg = getModelConfig("generator");
  const model = getModel(cfg.provider, cfg.modelId);

  const agent = new Agent({
    systemPrompt: AGENT_SYSTEM_PROMPT,
    model,
    tools: plainTools,
    rules: PLAIN_DEFAULT_RULES,
    maxTurns: input.maxTurns ?? 5,
  });

  let finalKind: DocKind = input.kind;
  let finalSource: string | null = null;
  let lastErr: { code: string; message: string } | null = null;

  agent.subscribe((e: AgentEvent) => {
    switch (e.type) {
      case "intent":
        progress(`intent: ${e.intent.action} ${e.intent.target} — ${e.intent.reason ?? ""}`);
        break;
      case "reasoning":
        progress(`  ${e.source}: ${e.text}`);
        break;
      case "tool_execution_start":
        progress(`▸ tool: ${e.toolName}`);
        break;
      case "tool_execution_end":
        if (e.result.kind === "doc") {
          finalSource = e.result.source;
          finalKind = e.result.docKind as DocKind;
        } else if (e.result.kind === "patch") {
          progress(`  patch: ${e.result.ops.length} ops — ${e.result.rationale}`);
        } else if (e.result.kind === "error") {
          lastErr = { code: e.result.code, message: e.result.message };
        }
        break;
      case "doc":
        finalSource = e.source;
        finalKind = e.kind as DocKind;
        break;
      case "patch":
        progress(`  patch: ${e.ops.length} ops — ${e.rationale}`);
        break;
      case "rule_hit":
        progress(`! rule "${e.ruleCode}" hit · retrying`);
        break;
      case "error":
        lastErr = { code: e.code, message: e.message };
        // V27-L debug · 把 error event 完整 dump 给 PLAIN_DEBUG · 看 cause / stack
        if (process.env.PLAIN_DEBUG) {
          process.stderr.write(
            `[plain debug] error event:\n${JSON.stringify(e, null, 2).slice(0, 800)}\n`,
          );
        }
        break;
      // 其他事件(agent_start / turn_start / message_* / turn_end / agent_end)CLI 不打 · 太频繁
    }
  });

  const contextualPrompt = buildContextualPrompt({
    prompt: input.prompt,
    kind: input.kind,
    currentSource: input.currentSource,
    workspace: input.workspace as unknown as Array<{
      id: string;
      kind: string;
      title: string;
      source: string;
    }> | undefined,
  });

  // CLI deck/doc/sheet generate/edit 都是明确生成/编辑意图 → 期望调 tool,
  // LLM 当对话时强制重试一轮(同 web)。
  await agent.prompt(contextualPrompt, { expectTool: true });

  if (lastErr) {
    const e = lastErr as { code: string; message: string };
    // V27-L · 当 message="terminated" 这种短消息时 · 说明 stream 被截 ·
    // 加一句具体提示让用户知道下一步怎么办。
    const hint =
      e.message === "terminated" || e.message.length < 30
        ? "\n        提示:可能是 LLM 调用超时(gateway 60s/300s)· 网络抖动 · 或 model 拒绝。\n              重试或换更短 prompt;还失败的话:\n              · plain config 看 gatewayUrl 是不是 prod\n              · PLAIN_DEBUG=1 plain deck generate ... 看完整 stack"
        : "";
    fail(`agent: ${e.code} — ${e.message}${hint}`);
  }
  if (!finalSource) {
    fail(`agent: 没有产生 doc · 检查 prompt 是否触发 generate/edit tool`);
  }
  return { kind: finalKind, source: finalSource! };
}

// ─────────────────────────────────────────────────────────────
// 6 个 CLI sub-command 入口 · 全部走 runAgent
// ─────────────────────────────────────────────────────────────

export async function runGenerateDeck(input: { intent: string; mode?: "brief" | "feature" }): Promise<Result> {
  const promptWithMode = input.mode === "feature"
    ? `${input.intent}\n\n(注:做长 deck · 12-14 个 section · 含多个视觉块)`
    : input.intent;
  return runAgent({ prompt: promptWithMode, kind: "deck" });
}

export async function runGenerateDoc(input: { intent: string }): Promise<Result> {
  return runAgent({ prompt: input.intent, kind: "doc" });
}

export async function runGenerateSheet(input: { intent: string }): Promise<Result> {
  return runAgent({ prompt: input.intent, kind: "sheet" });
}

export async function runEditDeck(input: { source: string; instruction: string; workspace?: WorkspaceContext }): Promise<Result> {
  return runAgent({
    prompt: input.instruction,
    kind: "deck",
    currentSource: input.source,
    workspace: input.workspace,
  });
}

export async function runEditDoc(input: { source: string; instruction: string; workspace?: WorkspaceContext }): Promise<Result> {
  return runAgent({
    prompt: input.instruction,
    kind: "doc",
    currentSource: input.source,
    workspace: input.workspace,
  });
}

export async function runEditSheet(input: { source: string; instruction: string; workspace?: WorkspaceContext }): Promise<Result> {
  return runAgent({
    prompt: input.instruction,
    kind: "sheet",
    currentSource: input.source,
    workspace: input.workspace,
  });
}

// ─────────────────────────────────────────────────────────────
// 通用输出 · 不变 · human → stdout 直写源 · json → 输 { kind, source, doc }
// ─────────────────────────────────────────────────────────────
export type EmitOpts = {
  outFile?: string;
  push?: boolean;
  cloudId?: string;
  cloudTitle?: string;
  /** V27-Q · 推 cloud 时绑 project · null 显式不带(覆盖 default) */
  projectId?: string | null;
};

export async function emitResult(r: Result, opts: EmitOpts | string = {}): Promise<void> {
  const o: EmitOpts = typeof opts === "string" ? { outFile: opts } : opts;

  if (o.outFile) {
    writeFileSync(o.outFile, r.source);
    progress(`wrote ${o.outFile} (${r.source.length} bytes)`);
    if (getOutputMode() === "json" && !o.push) {
      emit({ kind: r.kind, file: o.outFile, bytes: r.source.length });
    }
  } else if (!o.push) {
    if (getOutputMode() === "json") {
      emit({ kind: r.kind, source: r.source });
    } else {
      process.stdout.write(r.source);
      if (!r.source.endsWith("\n")) process.stdout.write("\n");
    }
  }

  if (o.push) {
    const id = o.cloudId ?? nanoid(10);
    const title = o.cloudTitle ?? inferTitle(r.source) ?? `Untitled ${r.kind}`;
    const now = Date.now();
    try {
      await gatewayFetch<{ ok: boolean; id: string }>({
        method: "POST",
        path: "workspace/documents",
        body: {
          id,
          kind: r.kind,
          title,
          source: r.source,
          createdAt: now,
          updatedAt: now,
          projectId: o.projectId === undefined ? null : o.projectId,
        },
      });
      progress(
        `✓ pushed to cloud: ${id}  (${r.kind} · ${title}${o.projectId ? ` · project=${o.projectId}` : ""})`,
      );
      if (getOutputMode() === "json") {
        emit({
          kind: r.kind,
          file: o.outFile ?? null,
          bytes: r.source.length,
          cloudId: id,
          title,
        });
      } else if (!o.outFile) {
        process.stdout.write(`${id}\n`);
      }
    } catch (e) {
      fail(`cloud push failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

function inferTitle(source: string): string | null {
  const m = source.match(/^---\s*\n[\s\S]*?\ntitle:\s*([^\n]+)/m);
  if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  const h = source.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : null;
}
