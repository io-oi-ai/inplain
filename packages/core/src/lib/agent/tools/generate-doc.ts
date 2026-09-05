/**
 * V26-C · generate_doc Tool · 包装老 generateDocV2
 */
import { z } from "zod";
import { defineTool } from "../core/tool";
import { generateDocV2, type GenInput } from "@/lib/agents-v2/generate";
import type { HistoryTurn } from "@/lib/agents-v2/prompts";

const GenerateDocInput = z.object({
  prompt: z.string().min(1).describe("用户想要 doc 的什么内容 · 报告 / 文章 / 提案 / 笔记"),
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
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
});

export const generateDocTool = defineTool({
  name: "generate_doc",
  description: `生成一份 Plain Doc(长文阅读网页)。
适合用户想要"写一份报告 / 调研 / 提案 / 复盘 / 长文章"时调用。
返回符合 Plain DSL v2 的 Markdown source · 渲染层自动出网页 · 含 TOC / 数学公式 / 表格。`,
  input: GenerateDocInput,
  streaming: true,
  execute: async (args, ctx) => {
    const input: GenInput = {
      prompt: args.prompt,
      workspace: args.workspace,
      history: args.history as HistoryTurn[] | undefined,
      signal: ctx.signal,
    };
    try {
      const { doc, source } = await generateDocV2(input, (e) => {
        if (e.type === "phase") {
          ctx.emitReasoning("progress", e.detail ?? `阶段: ${e.phase}`);
        } else if (e.type === "usage") {
          ctx.reportUsage?.({ inputTokens: e.inputTokens, outputTokens: e.outputTokens });
        } else {
          ctx.emitReasoning(e.source, e.text);
        }
      });
      return { kind: "doc", docKind: "doc", source, doc };
    } catch (e) {
      return {
        kind: "error",
        code: "GENERATE_DOC_FAILED",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
