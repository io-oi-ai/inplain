/**
 * V26-C · generate_deck Tool · 包装老 generateDeckV2
 *
 * Agent 调用流:
 *   LLM 输出 tool_call("generate_deck", {topic, scope, ...})
 *   ↓
 *   Agent runOneTurn 拿到 toolCall · 调 executeTool
 *   ↓
 *   tool.execute(args, ctx) · 把 GenEvent 转 ctx.emitReasoning
 *   ↓
 *   返回 ToolResultPayload { kind: "doc", docKind: "deck", source, doc }
 *   ↓
 *   Agent emit message_tool_result + emit 顶层 EvDoc 事件
 *
 * 旧 generateDeckV2 不动 · 这里只做适配层 · 等 caller 全切到 Agent 后再下线旧路径。
 */

import { z } from "zod";
import { defineTool } from "../core/tool";
import { generateDeckV2, type GenInput } from "@/lib/agents-v2/generate";
import type { HistoryTurn } from "@/lib/agents-v2/prompts";

const GenerateDeckInput = z.object({
  /** 用户原始 prompt(或经 router 抽出的 topic) */
  prompt: z.string().min(1).describe("用户想要 deck 的什么内容 · 主题 / 目标 / 受众"),
  /** 可选 workspace context · 跨文档引用展开后的内容 */
  workspace: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        title: z.string(),
        source: z.string(),
      }),
    )
    .optional()
    .describe("已有文档列表 · 当 prompt 含 @ref 时这里提供被引文档的内容"),
  /** 可选 chat history · 让 generator 知道之前对话上下文 */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
});

export type GenerateDeckInput = z.infer<typeof GenerateDeckInput>;

export const generateDeckTool = defineTool({
  name: "generate_deck",
  description: `生成一份 Plain Deck(可演讲幻灯片网页)。
适合用户想要"做一份 PPT / 演讲 / 路演 / 分享 deck"时调用。
返回符合 Plain DSL v2 的 Markdown source · 渲染层会自动出网页。`,
  input: GenerateDeckInput,
  streaming: true,
  execute: async (args, ctx) => {
    const input: GenInput = {
      prompt: args.prompt,
      workspace: args.workspace,
      history: args.history as HistoryTurn[] | undefined,
      signal: ctx.signal,
    };
    try {
      const { doc, source } = await generateDeckV2(input, (e) => {
        // 转 Plain GenEvent → ctx.emitReasoning / reportUsage
        if (e.type === "phase") {
          ctx.emitReasoning("progress", e.detail ?? `阶段: ${e.phase}`);
        } else if (e.type === "usage") {
          ctx.reportUsage?.({ inputTokens: e.inputTokens, outputTokens: e.outputTokens });
        } else {
          // GenEvent.reasoning · source 是 plan/slide/progress 三种 · 跟 ctx.emitReasoning 完全对齐
          ctx.emitReasoning(e.source, e.text);
        }
      });
      return {
        kind: "doc",
        docKind: "deck",
        source,
        doc,
      };
    } catch (e) {
      return {
        kind: "error",
        code: "GENERATE_DECK_FAILED",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
