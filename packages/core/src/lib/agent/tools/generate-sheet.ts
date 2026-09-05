/**
 * V26-C · generate_sheet Tool · 包装老 generateSheetV2
 */
import { z } from "zod";
import { defineTool } from "../core/tool";
import { generateSheetV2, type GenInput } from "@/lib/agents-v2/generate";
import type { HistoryTurn } from "@/lib/agents-v2/prompts";

const GenerateSheetInput = z.object({
  prompt: z.string().min(1).describe("用户想要 sheet 的什么数据故事 · KPI / 趋势 / 对比 / 留存"),
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

export const generateSheetTool = defineTool({
  name: "generate_sheet",
  description: `生成一份 Plain Sheet(Dune Analytics 风数据 dashboard 网页)。
适合用户想要"做一份指标 dashboard / 数据复盘 / KPI 面板 / cohort 分析"时调用。
返回符合 Plain DSL v2/v3 的 Markdown source · 含 KPI / chart(line/area/bar/pie/funnel/heatmap/scatter) /
排行 / 数据表 / 大数字 / SQL pipeline 等 12 种 panel。`,
  input: GenerateSheetInput,
  streaming: true,
  execute: async (args, ctx) => {
    const input: GenInput = {
      prompt: args.prompt,
      workspace: args.workspace,
      history: args.history as HistoryTurn[] | undefined,
      signal: ctx.signal,
    };
    try {
      const { doc, source } = await generateSheetV2(input, (e) => {
        if (e.type === "phase") {
          ctx.emitReasoning("progress", e.detail ?? `阶段: ${e.phase}`);
        } else if (e.type === "usage") {
          ctx.reportUsage?.({ inputTokens: e.inputTokens, outputTokens: e.outputTokens });
        } else {
          ctx.emitReasoning(e.source, e.text);
        }
      });
      return { kind: "doc", docKind: "sheet", source, doc };
    } catch (e) {
      return {
        kind: "error",
        code: "GENERATE_SHEET_FAILED",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
