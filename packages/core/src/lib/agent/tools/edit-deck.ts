/**
 * V26-C · edit_deck Tool · 包装老 editDeckV2
 *
 * input · 当前 deck source + 用户改动指令
 * output · ToolResultPayload(kind=patch · 含 RFC 6902 ops + 新 source)
 *          客户端 apply 后渲染新版 deck。
 */
import { z } from "zod";
import { defineTool } from "../core/tool";
import { editDeckV2, type EditInput } from "@/lib/agents-v2/edit";
import type { AgentEvent as OldAgentEvent } from "@/lib/agents/types";

const EditDeckInput = z.object({
  /**
   * 当前 deck Markdown source(整份)。
   *
   * V27-B · web 工作台改走 server-side source attach · LLM 可以**留空**或传空字符串。
   * tool 内部会通过 ctx.getSource(docId) 从 server 拿真实 source。
   * CLI / desktop / MCP 仍必须填这个字段(它们没 server backend)。
   */
  currentSource: z.string().optional(),
  /** 自然语言改动指令 · "把封面改成红色" / "加一页 contact" */
  instruction: z.string().min(1),
  /** 可选 workspace context */
  workspace: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        title: z.string(),
        source: z.string(),
      }),
    )
    .optional(),
  /** 可选 chat history */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  /**
   * V27-B · 文档 ID · web 工作台传这个 · server 用它去 DB 拿 source
   * 不传 = 走传统 `currentSource` 字段(向后兼容 CLI / desktop / MCP)
   */
  docId: z.string().optional(),
});

export const editDeckTool = defineTool({
  name: "edit_deck",
  description: `修改一份现有 Plain Deck。
适合用户想要"改 deck 某一页 / 改主题 / 加内容 / 删某节"时调用。
返回 RFC 6902 JSON Patch + 新 source · 不重写整份文档,只发改动 ops。`,
  input: EditDeckInput,
  execute: async (args, ctx) => {
    // V27-B · 优先用 args.currentSource(CLI/desktop/MCP 路径)·
    // 为空且 caller 配了 sourceResolver + 有 docId → server 拉真实 source
    let source = args.currentSource ?? "";
    if (!source.trim() && args.docId && ctx.getSource) {
      const resolved = await ctx.getSource(args.docId);
      if (resolved) source = resolved;
    }
    if (!source.trim()) {
      return {
        kind: "error",
        code: "EDIT_DECK_NO_SOURCE",
        message: "edit_deck 缺少 current source:既没传 currentSource,也没能从 server 拉到 docId 对应的源。",
      };
    }
    const input: EditInput = {
      currentSource: source,
      instruction: args.instruction,
      workspace: args.workspace,
      history: args.history as EditInput["history"],
      signal: ctx.signal,
    };
    try {
      const { source, patch, rationale } = await editDeckV2(input, (e) => {
        bridgeOldEventToCtx(e, ctx);
      });
      // 同时返回 doc kind=patch · 同时把新 source 让上层也能 emit doc 事件
      ctx.emit({
        type: "doc",
        kind: "deck",
        source,
      });
      return {
        kind: "patch",
        ops: patch,
        rationale,
      };
    } catch (e) {
      return {
        kind: "error",
        code: "EDIT_DECK_FAILED",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

/** 老 AgentEvent(phase/reasoning/patch)→ 新 ToolContext emit* 方法 */
function bridgeOldEventToCtx(
  e: OldAgentEvent,
  ctx: { emitReasoning: (s: "plan" | "slide" | "rationale" | "progress", t: string) => void },
): void {
  if (e.type === "phase") {
    ctx.emitReasoning("progress", e.detail ?? `阶段: ${e.phase}`);
  } else if (e.type === "reasoning") {
    ctx.emitReasoning(e.source, e.text);
  }
  // patch / doc / error / delta / intent 在 tool 完成时由 tool 自己返回 ToolResultPayload · 不在这里 emit
}
