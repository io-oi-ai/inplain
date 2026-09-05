/**
 * Plain Sheet v3 · NL chat-driven 编辑入口
 *
 * 路径分发:
 *   A · panel-level patch   (SHEET_V3_PATCH_PROMPT)
 *   B · field-level patch   (SHEET_V3_FIELD_PATCH_PROMPT)
 *   C · regenerate          → 转回 generateSheetV3 (full regenerate)
 *
 * V25 PR-4 范围:
 *   - A / B 走 RFC 6902 patch · 直接 generateObject(schema: EditInstruction)
 *   - C 暂时直接降级到 throw,引导用户走 generate 入口(下一 PR 接通)
 */

import { generateObject, type LanguageModel } from "ai";
import { selectModel } from "@/lib/agents/model";
import { EditInstruction, type AgentEvent } from "@/lib/agents/types";
import { tryApply } from "@/lib/agents/patch";
import { AgentError } from "@/lib/agents/errors";
import { SheetDocV3, type SheetDocV3T } from "./schemas";
import { parseSheetV3, serializeSheetV3 } from "./serialize";
import {
  SHEET_V3_PATCH_PROMPT,
  SHEET_V3_FIELD_PATCH_PROMPT,
} from "./prompts";
import { routeInstruction } from "./router";
import { noThinking } from "@/lib/agent/provider/no-thinking";

export type SheetV3EditInput = {
  currentSource: string;
  instruction: string;
  /** 跨 sheet 上下文 · V25 PR-4 暂不使用,占位兼容 v2 API 形状 */
  workspace?: Array<{ id: string; kind: string; title: string; source: string }>;
  /** chat 历史 · V25 PR-4 暂不使用 */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  signal?: AbortSignal;
  model?: LanguageModel;
};

export type SheetV3EditResult = {
  source: string;
  patch: import("@/lib/agents/types").JsonPatchOp[];
  rationale: string;
  /** A/B/C 三路径 · 让前端能告诉用户走的哪条路 */
  path: "A" | "B" | "C";
};

export async function editSheetV3(
  input: SheetV3EditInput,
  emit: (e: AgentEvent) => void,
): Promise<SheetV3EditResult> {
  // 1. 解析 current source · 必须是合法 v3
  const currentDoc = parseSheetV3(input.currentSource);
  if (!currentDoc) {
    throw new AgentError(
      "NO_CURRENT",
      "current source 不是合法 sheet@v3 · 无法编辑",
    );
  }

  // 2. 路由 · 决定 A / B / C
  const decision = routeInstruction(input.instruction, true);
  emit({
    type: "reasoning",
    source: "progress",
    text: `路由:路径 ${decision.path} (${decision.reason})`,
  });

  // C 路径暂未实装(下一 PR)
  if (decision.path === "C") {
    throw new AgentError(
      "UNSUPPORTED",
      "整页 regenerate 路径 (C) 还没接通 · 请用 'generate' 入口重新生成",
    );
  }

  // 3. A/B 路径 · LLM 出 RFC 6902 patch
  const systemPrompt =
    decision.path === "A" ? SHEET_V3_PATCH_PROMPT : SHEET_V3_FIELD_PATCH_PROMPT;
  const userPrompt = buildPatchPrompt(currentDoc, input.instruction);

  const editModel = input.model ?? selectModel("editor");
  const attempt = async (retryHint?: string) => {
    const { object } = await generateObject({
      model: editModel,
      schema: EditInstruction,
      system: systemPrompt,
      prompt: retryHint
        ? `${userPrompt}\n\n# 上次 patch 失败 · 错误:${retryHint}\n根据错误重试。`
        : userPrompt,
      temperature: 0,
      abortSignal: input.signal,
      ...noThinking(editModel),
    });
    return object;
  };

  let instr = await attempt();
  if (instr.rationale?.trim().length > 0) {
    emit({ type: "reasoning", source: "rationale", text: instr.rationale.trim() });
  }
  emit({
    type: "phase",
    phase: "editing",
    detail: `应用 ${instr.patch.length} 处改动…`,
  });

  // 4. tryApply + zod 校验 · 失败重试一次
  let result = tryApply(currentDoc, instr.patch, SheetDocV3);
  if (!result.ok) {
    emit({
      type: "phase",
      phase: "editing",
      detail: `首次 patch 失败,重试:${result.error.slice(0, 80)}`,
    });
    instr = await attempt(result.error);
    if (instr.rationale?.trim().length > 0) {
      emit({
        type: "reasoning",
        source: "rationale",
        text: `重试:${instr.rationale.trim()}`,
      });
    }
    result = tryApply(currentDoc, instr.patch, SheetDocV3);
    if (!result.ok) {
      throw new AgentError("PATCH_INVALID", result.error);
    }
  }

  // 5. serialize 回 DSL
  const newSource = serializeSheetV3(result.doc as SheetDocV3T);
  return {
    source: newSource,
    patch: instr.patch,
    rationale: instr.rationale,
    path: decision.path,
  };
}

function buildPatchPrompt(currentDoc: SheetDocV3T, instruction: string): string {
  // 给 LLM 看 doc 的精简快照(去掉 dataset.data 大字符串,节省 token)
  const snapshot = {
    title: currentDoc.title,
    datasets: currentDoc.datasets.map((d) => ({ id: d.id, source: d.source })),
    queries: currentDoc.queries.map((q) => ({
      id: q.id,
      source: q.source,
      sql_preview: q.sql.slice(0, 200),
    })),
    vizzes: currentDoc.vizzes,
    dashboard: currentDoc.dashboard,
  };
  return `# 当前 sheet@v3 文档快照
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\`

# 用户指令
${instruction}

# 你的输出
按 system prompt 描述的 RFC 6902 JSON Patch 数组返回 EditInstruction:
- patch: 数组,每个元素 { op, path, value? }
- rationale: 一句话总结这次改了什么
`;
}
