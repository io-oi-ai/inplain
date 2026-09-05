/**
 * V26-C · edit_doc Tool · 包装老 editDocV2
 */
import { z } from "zod";
import { defineTool } from "../core/tool";
import { editDocV2, type EditInput } from "@/lib/agents-v2/edit";
import type { AgentEvent as OldAgentEvent } from "@/lib/agents/types";

const EditDocInput = z.object({
  /** V27-B · 可选 · 不传时 server 用 docId 自动注入 */
  currentSource: z.string().optional(),
  instruction: z.string().min(1),
  workspace: z
    .array(z.object({ id: z.string(), kind: z.string(), title: z.string(), source: z.string() }))
    .optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  /** V27-B · 文档 ID · web 工作台传 · server 拉 source */
  docId: z.string().optional(),
});

export const editDocTool = defineTool({
  name: "edit_doc",
  description: `修改一份现有 Plain Doc(长文)。
适合用户想要"改某一段 / 加章节 / 删掉某部分 / 改 callout"时调用。
返回 RFC 6902 JSON Patch + 新 source。`,
  input: EditDocInput,
  execute: async (args, ctx) => {
    // V27-B · server-side source attach
    let source = args.currentSource ?? "";
    if (!source.trim() && args.docId && ctx.getSource) {
      const resolved = await ctx.getSource(args.docId);
      if (resolved) source = resolved;
    }
    if (!source.trim()) {
      return {
        kind: "error",
        code: "EDIT_DOC_NO_SOURCE",
        message: "edit_doc 缺少 current source:既没传 currentSource,也没能从 server 拉到 docId 对应的源。",
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
      const { source, patch, rationale } = await editDocV2(input, (e) => {
        bridgeOldEventToCtx(e, ctx);
      });
      ctx.emit({ type: "doc", kind: "doc", source });
      return { kind: "patch", ops: patch, rationale };
    } catch (e) {
      return {
        kind: "error",
        code: "EDIT_DOC_FAILED",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

function bridgeOldEventToCtx(
  e: OldAgentEvent,
  ctx: { emitReasoning: (s: "plan" | "slide" | "rationale" | "progress", t: string) => void },
): void {
  if (e.type === "phase") {
    ctx.emitReasoning("progress", e.detail ?? `阶段: ${e.phase}`);
  } else if (e.type === "reasoning") {
    ctx.emitReasoning(e.source, e.text);
  }
}
