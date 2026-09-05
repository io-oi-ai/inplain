/**
 * Plain DSL v2 · Editors
 *
 * 跟 v1 deck-edit / doc-edit / sheet-edit 同构,但操作 strict DeckDocV2 / DocDocV2 / SheetDocV2。
 *
 * 流程:
 *   1. source(string) → parseXxxV2(adapter) → strict DocV2 JSON
 *   2. AI 接 current JSON + 用户指令 → 输出 EditInstruction (RFC 6902 patch + rationale)
 *   3. tryApply 干跑 + zod 校验 → 新 DocV2
 *   4. 失败带提示重试一次,二次失败 throw PATCH_INVALID
 *   5. serializeXxx 转回 source string · 同时 emit patch event 让前端做 undo timeline
 */

import { generateText, parsePartialJson, type LanguageModel } from "ai";
import { selectModel } from "@/lib/agents/model";
import { getModelConfig, getFallbackModelConfig, shouldFallback } from "@/lib/agents/config";
import { getModel } from "@/lib/agent/provider";
import { buildCachedSystem } from "@/lib/agents/llm-options";
import { EditInstruction, type AgentEvent } from "@/lib/agents/types";
import { tryApply } from "@/lib/agents/patch";
import { AgentError } from "@/lib/agents/errors";
import { parseDeckV2, parseDocV2, parseSheetV2 } from "./adapter";
import { serializeDeck, serializeDoc, serializeSheet } from "./serialize";
import { DeckDocV2, DocDocV2, SheetDocV2 } from "./schemas";
import { noThinking } from "@/lib/agent/provider/no-thinking";
import {
  DECK_EDIT_PROMPT_V2,
  DOC_EDIT_PROMPT_V2,
  SHEET_EDIT_PROMPT_V2,
  buildEditPromptV2,
  type HistoryTurn,
} from "./prompts";

export type EditInput = {
  /** 当前文档源(string · markdown DSL v2) */
  currentSource: string;
  /** 用户的自然语言改动指令 */
  instruction: string;
  workspace?: Array<{ id: string; kind: string; title: string; source: string }>;
  history?: HistoryTurn[];
  signal?: AbortSignal;
  model?: LanguageModel;
};

export type EditResult = {
  /** 新的 source string(serialize 后) */
  source: string;
  /** AI 给出的 patch(供前端 undo/timeline 用) */
  patch: import("@/lib/agents/types").JsonPatchOp[];
  /** AI 改动说明(一句话) */
  rationale: string;
};

export { AgentError };

// ─────────────────────────────────────────────
// 通用模板
// ─────────────────────────────────────────────

async function runEdit<T>(opts: {
  currentDoc: T;
  schema: import("zod").ZodType<T>;
  systemPrompt: string;
  instruction: string;
  workspace?: EditInput["workspace"];
  history?: EditInput["history"];
  signal?: AbortSignal;
  model?: LanguageModel;
  emit: (e: AgentEvent) => void;
}): Promise<{ newDoc: T; instr: import("@/lib/agents/types").EditInstruction }> {
  const provider = getModelConfig("editor").provider;
  const cachedSystem = buildCachedSystem({
    provider,
    prompt: opts.systemPrompt,
  });

  // V27-Z3 · 用 generateText + 手动 parse 替代 generateObject。
  //   generateObject 在 workerd 上对 moonshot 偶发空回(schema 注入 → "No object
  //   generated: response did not match schema")。generateText 非流式拿完整文本再
  //   自己 parse + repair,稳得多(同 generate.ts 策略)。失败自动重试最多 2 次。
  const attemptOnce = async (retryHint?: string, modelOverride?: LanguageModel) => {
    const editModel = modelOverride ?? opts.model ?? selectModel("editor");
    const { text } = await generateText({
      model: editModel,
      system: cachedSystem,
      prompt: buildEditPromptV2(
        opts.currentDoc,
        opts.instruction,
        retryHint,
        opts.workspace,
        opts.history,
      ),
      maxOutputTokens: 8000,
      abortSignal: opts.signal,
      ...noThinking(editModel),
    });
    const candidate = extractEditJson(text);
    if (!candidate) throw new AgentError("PATCH_INVALID", "editor 未返回可解析的 JSON");
    // 严格 JSON.parse(包 try,坏 JSON 不抛 → 走 parsePartialJson 容错)
    try {
      const direct = EditInstruction.safeParse(normalizeEditValue(JSON.parse(candidate)));
      if (direct.success) return direct.data;
    } catch {
      // fall through to parsePartialJson
    }
    const r = await parsePartialJson(candidate);
    if (r.state !== "failed-parse" && r.value !== undefined) {
      const repaired = EditInstruction.safeParse(normalizeEditValue(r.value));
      if (repaired.success) {
        opts.emit({ type: "reasoning", source: "rationale", text: "patch 结构偏差已自动修复" });
        return repaired.data;
      }
    }
    throw new AgentError("PATCH_INVALID", "editor 输出不符合 EditInstruction schema");
  };

  const attempt = async (retryHint?: string) => {
    let lastErr: unknown;
    let fbModel: LanguageModel | undefined;
    let switched = false;
    for (let i = 1; i <= 2; i++) {
      try {
        return await attemptOnce(retryHint, fbModel);
      } catch (e) {
        lastErr = e;
        // 容灾 · provider 失败(余额不足/5xx)→ 切 fallback provider 重试
        if (!switched && !opts.model && shouldFallback(e)) {
          const fb = getFallbackModelConfig("editor");
          if (fb) {
            switched = true;
            opts.emit({ type: "reasoning", source: "rationale", text: `主模型不可用 · 切换备用模型 ${fb.provider} 重试…` });
            try { fbModel = getModel(fb.provider, fb.modelId); } catch { /* 未配 key · 继续原 model */ }
            continue;
          }
        }
        if (i < 2) opts.emit({ type: "reasoning", source: "rationale", text: `编辑结果不合规 · 自动重试…` });
      }
    }
    throw lastErr;
  };

  let instr = await attempt();
  if (instr.rationale?.trim().length > 0) {
    opts.emit({ type: "reasoning", source: "rationale", text: instr.rationale.trim() });
  }
  opts.emit({
    type: "phase",
    phase: "editing",
    detail: `应用 ${instr.patch.length} 处改动…`,
  });

  let result = tryApply(opts.currentDoc, instr.patch, opts.schema);
  if (!result.ok) {
    // 首次 patch 有的改动落不上(LLM 给的 path 偶有偏差)→ 内部带提示重试一次。
    // 这是正常的自愈流程,**不要**emit 成吓人的红色 phase/失败 —— 用低调 reasoning。
    opts.emit({
      type: "reasoning",
      source: "rationale",
      text: "正在微调改动位置…",
    });
    instr = await attempt(result.error);
    result = tryApply(opts.currentDoc, instr.patch, opts.schema);
    if (!result.ok) {
      // 重试后仍落不上 → 友好中文(原始 RFC6902 报错太技术,用户看不懂)。
      // 上层 editXxxV2 会 catch 这个并降级到"整体重写"(editFallbackRegen),通常能救回。
      throw new AgentError(
        "PATCH_INVALID",
        "没能精确定位要改的位置 · 已尝试整体重写",
      );
    }
  }
  return { newDoc: result.doc, instr };
}

// ─────────────────────────────────────────────
// Deck
// ─────────────────────────────────────────────

export async function editDeckV2(
  input: EditInput,
  emit: (e: AgentEvent) => void,
): Promise<EditResult> {
  emit({ type: "phase", phase: "editing" });
  const currentDoc = parseDeckV2(input.currentSource);
  if (!currentDoc) {
    throw new AgentError(
      "PATCH_INVALID",
      "当前 deck 源不是合法 v2 格式 · 无法在 v2 编辑器里改",
    );
  }
  try {
    const { newDoc, instr } = await runEdit({
      currentDoc,
      schema: DeckDocV2,
      systemPrompt: DECK_EDIT_PROMPT_V2,
      instruction: input.instruction,
      workspace: input.workspace,
      history: input.history,
      signal: input.signal,
      model: input.model,
      emit,
    });
    emit({ type: "patch", ops: instr.patch, rationale: instr.rationale });
    return { source: serializeDeck(newDoc), patch: instr.patch, rationale: instr.rationale };
  } catch (e) {
    return editFallbackRegen("deck", currentDoc, input, emit, e);
  }
}

// ─────────────────────────────────────────────
// Doc
// ─────────────────────────────────────────────

export async function editDocV2(
  input: EditInput,
  emit: (e: AgentEvent) => void,
): Promise<EditResult> {
  emit({ type: "phase", phase: "editing" });
  const currentDoc = parseDocV2(input.currentSource);
  if (!currentDoc) {
    throw new AgentError(
      "PATCH_INVALID",
      "当前 doc 源不是合法 v2 格式 · 无法在 v2 编辑器里改",
    );
  }
  try {
    const { newDoc, instr } = await runEdit({
      currentDoc,
      schema: DocDocV2,
      systemPrompt: DOC_EDIT_PROMPT_V2,
      instruction: input.instruction,
      workspace: input.workspace,
      history: input.history,
      signal: input.signal,
      model: input.model,
      emit,
    });
    emit({ type: "patch", ops: instr.patch, rationale: instr.rationale });
    return { source: serializeDoc(newDoc), patch: instr.patch, rationale: instr.rationale };
  } catch (e) {
    // patch 反复失败(常见于"再优化下"这类模糊指令,LLM 给的 path 对不上)→
    // 降级:基于当前文档 + 指令整体重新生成,比强行 patch 可靠。
    return editFallbackRegen("doc", currentDoc, input, emit, e);
  }
}

// ─────────────────────────────────────────────
// Sheet
// ─────────────────────────────────────────────

export async function editSheetV2(
  input: EditInput,
  emit: (e: AgentEvent) => void,
): Promise<EditResult> {
  emit({ type: "phase", phase: "editing" });
  const currentDoc = parseSheetV2(input.currentSource);
  if (!currentDoc) {
    throw new AgentError(
      "PATCH_INVALID",
      "当前 sheet 源不是合法 v2 格式 · 无法在 v2 编辑器里改",
    );
  }
  try {
    const { newDoc, instr } = await runEdit({
      currentDoc,
      schema: SheetDocV2,
      systemPrompt: SHEET_EDIT_PROMPT_V2,
      instruction: input.instruction,
      workspace: input.workspace,
      history: input.history,
      signal: input.signal,
      model: input.model,
      emit,
    });
    emit({ type: "patch", ops: instr.patch, rationale: instr.rationale });
    return { source: serializeSheet(newDoc), patch: instr.patch, rationale: instr.rationale };
  } catch (e) {
    return editFallbackRegen("sheet", currentDoc, input, emit, e);
  }
}

/**
 * Edit 降级:patch 反复失败时,基于当前文档 + 指令整体重新生成。
 * "再优化下/换个说法"这类模糊指令,patch 很难精准定位,重新生成更可靠。
 * 用 generate 路径(已验证稳),把当前文档摘要 + 指令拼成 generation prompt。
 */
async function editFallbackRegen<T>(
  kind: "deck" | "doc" | "sheet",
  currentDoc: T,
  input: EditInput,
  emit: (e: AgentEvent) => void,
  originalErr: unknown,
): Promise<EditResult> {
  emit({
    type: "reasoning",
    source: "rationale",
    text: "精确改动未成功 · 改为基于当前内容整体重写",
  });
  const gen = await import("./generate");
  const genPrompt =
    `这是当前文档的内容(JSON):\n${JSON.stringify(currentDoc).slice(0, 6000)}\n\n` +
    `请按以下指令修改后,输出完整的新文档(保留未提及部分,只改指令要求的):\n${input.instruction}`;
  const genInput = {
    prompt: genPrompt,
    workspace: input.workspace,
    history: input.history,
    signal: input.signal,
    model: input.model,
  };
  try {
    if (kind === "deck") {
      const { source } = await gen.generateDeckV2(genInput, () => {});
      return { source, patch: [], rationale: "基于当前内容整体重写" };
    }
    if (kind === "sheet") {
      const { source } = await gen.generateSheetV2(genInput, () => {});
      return { source, patch: [], rationale: "基于当前内容整体重写" };
    }
    const { source } = await gen.generateDocV2(genInput, () => {});
    return { source, patch: [], rationale: "基于当前内容整体重写" };
  } catch {
    // fallback 也失败 → 抛原始 edit 错误(更能说明问题)
    throw originalErr instanceof AgentError
      ? originalErr
      : new AgentError("PATCH_INVALID", String((originalErr as Error)?.message ?? originalErr));
  }
}

/**
 * 从 generateText 文本里提取首个 JSON 值(剥 markdown fence)。
 * 同时支持对象 `{…}` 和数组 `[…]` —— moonshot 常直接输出裸 patch 数组(无 {patch,rationale} 外层)。
 */
function extractEditJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const objStart = body.indexOf("{");
  const arrStart = body.indexOf("[");
  // 取最先出现的 { 或 [
  const useArr = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
  if (useArr) {
    const end = body.lastIndexOf("]");
    if (arrStart === -1 || end <= arrStart) return null;
    return body.slice(arrStart, end + 1).trim();
  }
  const end = body.lastIndexOf("}");
  if (objStart === -1 || end <= objStart) return null;
  return body.slice(objStart, end + 1).trim();
}

/**
 * 规范化 editor 输出为 EditInstruction 形状。
 * moonshot 常直接输出裸 patch 数组(如 [{op,path,value}]),没有 {patch,rationale} 外层。
 * 这里把数组包成 { patch: [...], rationale: "" }。
 */
function normalizeEditValue(v: unknown): unknown {
  if (Array.isArray(v)) {
    return { patch: v, rationale: "" };
  }
  // 已是对象但用了别名(ops / operations 代替 patch)
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (!o.patch && Array.isArray(o.ops)) return { patch: o.ops, rationale: o.rationale ?? "" };
    if (!o.patch && Array.isArray(o.operations)) return { patch: o.operations, rationale: o.rationale ?? "" };
  }
  return v;
}

