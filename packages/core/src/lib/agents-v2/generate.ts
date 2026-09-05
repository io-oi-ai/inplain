/**
 * Plain DSL v2 · 三件套 generator
 *
 * 调 ai-sdk 的 generateText(非流式)拿完整 JSON,再用 v2 schema 校验。
 * 输出后用 serialize.ts 转成 .md 文本。
 *
 * ⚠ 不用 streamObject:moonshot 等国产 provider 的流式接口在长输出时偶发提前
 *   断流(ai-sdk 拿到截断 JSON → NoObjectGeneratedError),同 prompt 用非流式
 *   generateText 从不截断。生成型产物要"稳定出全",不需要逐字流。详见下方核心注释。
 */
import { generateText, parsePartialJson, type LanguageModel } from "ai";
import type { z } from "zod";
import {
  DeckDocV2,
  DocDocV2,
  SheetDocV2,
  type DeckDocV2 as DeckDocV2T,
  type DocDocV2 as DocDocV2T,
  type SheetDocV2 as SheetDocV2T,
} from "./schemas";
import {
  DECK_GEN_PROMPT_V2,
  DOC_GEN_PROMPT_V2,
  SHEET_GEN_PROMPT_V2,
  buildGeneratePromptV2,
  type HistoryTurn,
} from "./prompts";
import { serializeDeck, serializeDoc, serializeSheet } from "./serialize";
import { selectModel } from "@/lib/agents/model";
import { getFallbackModelConfig, shouldFallback } from "@/lib/agents/config";
import { getModel } from "@/lib/agent/provider";
import { noThinking } from "@/lib/agent/provider/no-thinking";

export type GenInput = {
  prompt: string;
  workspace?: Array<{ id: string; kind: string; title: string; source: string }>;
  history?: HistoryTurn[];
  signal?: AbortSignal;
  model?: LanguageModel;
};

/** 增量 reasoning 事件(供前端展示思考过程) */
export type GenEvent =
  | { type: "phase"; phase: "generating"; detail?: string }
  | { type: "reasoning"; source: "plan" | "slide" | "progress"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

// ─────────────────────────────────────────────
// 共享核心 · generateText + 手动 parse(替代 streamObject)
// ─────────────────────────────────────────────
//
// 为什么不用 streamObject:moonshot(及国产 provider 普遍)的**流式**接口在长输出
// 时不稳定 —— 偶发在极早期(如 `{"theme":"swiss","title":"t`)就断流,ai-sdk 拿到
// 截断 JSON → AI_NoObjectGeneratedError。同一 prompt 用 generateText(**非流式**,
// 服务端一次性返回完整 body)从不截断。生成型产物要的是"稳定出全",而非逐字流,
// 所以这里统一走 generateText + 手动 JSON parse(与 v31 generate-content 同策略)。
//
// 容错链:严格 schema.parse → 失败则 parsePartialJson(容忍截断/尾逗号)+ schema
// → 仍失败抛错(带可读 detail)。schema 的 items 级 min 已放宽到 1(质量靠 prompt
// 引导,schema 只保渲染可行),所以"内容齐但某项数量差一点"不再整单失败。

/**
 * 带自动重试的外层:moonshot 偶发(~10-20%)输出不合 schema 的 JSON,
 * repair 兜不住时整次失败。这里重试最多 3 次(同 prompt 重新生成),
 * 连续 3 次失败概率 <0.5%——间歇失败基本不再报给用户。
 */
async function generateDocViaText<T>(
  schema: z.ZodType<T>,
  system: string,
  input: GenInput,
  emit: (e: GenEvent) => void,
  validate?: (doc: T) => string[],
): Promise<T> {
  const MAX_TRIES = 3;
  let lastErr: unknown;
  let curInput = input;
  let switchedProvider = false; // 已切过 fallback,不再切第二次

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      // #14 失败重试 Plain 吸收(见下方 emit 注释)
      const { doc, usage } = await generateDocViaTextOnce(schema, system, curInput, emit, attempt);
      const qualityIssues = validate?.(doc) ?? [];
      if (qualityIssues.length > 0) {
        curInput = {
          ...curInput,
          prompt: `${input.prompt}\n\n上一次草稿未通过事实审计,必须修正后重新生成:\n- ${qualityIssues.join("\n- ")}\n不要用虚构信息换取成品感。`,
        };
        throw new Error(`GROUNDING_CHECK_FAILED: ${qualityIssues.join(" · ")}`);
      }
      emit({ type: "usage", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
      return doc;
    } catch (e) {
      lastErr = e;
      // 容灾 · provider 级失败(余额不足/5xx/超时)→ 立即切 fallback provider 重试,
      //   不在挂掉的 provider 上耗剩余 attempt。单 provider 余额空不再全站瘫痪。
      if (!switchedProvider && !input.model && shouldFallback(e)) {
        const fb = getFallbackModelConfig("generator");
        if (fb) {
          switchedProvider = true;
          emit({ type: "reasoning", source: "progress", text: `主模型不可用(${(e as Error)?.message?.slice(0, 40) ?? ""}) · 切换备用模型 ${fb.provider} 重试…` });
          try {
            curInput = { ...input, model: getModel(fb.provider, fb.modelId) };
          } catch {
            // fallback model 实例化失败(未配 key)→ 继续走原 model 的剩余 attempt
          }
          continue; // 不计入 schema 重试计数,直接用新 provider 再跑
        }
      }
      if (attempt < MAX_TRIES) {
        emit({ type: "reasoning", source: "progress", text: `生成结果不合规 · 自动重试(${attempt}/${MAX_TRIES - 1})…` });
      } else {
        console.error("[generate] all retries failed:", e instanceof Error ? e.message : String(e));
      }
    }
  }
  throw lastErr;
}

/**
 * Report grounding 的低成本确定性护栏。
 * 不尝试用正则证明所有陈述为真,只拦最常见且风险最高的“成品化幻觉”:
 * 用户没给日期却补报告期、没给历史却写 N 周新高、没给出处却造引语署名。
 * 命中后由 generateDocViaText 带具体 issue 自动重写,最多沿用现有 3 次重试预算。
 */
function reportGroundingIssues(doc: DocDocV2T, prompt: string): string[] {
  if (!/(?:报告|周报|月报|复盘|分析|研究|调研|memo|report|research)/i.test(prompt)) return [];

  const output = JSON.stringify(doc);
  const issues: string[] = [];
  const promptHasCalendar = /(?:19|20)\d{2}|\bW\d{1,2}\b|第\s*\d+\s*周|\d{4}[./-]\d{1,2}/i.test(prompt);

  if (!promptHasCalendar && /(?:19|20)\d{2}|\bW\d{1,2}\b|第\s*\d+\s*周|报告期[：:]\s*\d/i.test(output)) {
    issues.push("用户未提供日期或周次,删除所有自行补写的年份、月份、W 周次和报告期");
  }

  const unsupportedHistory = /过去\s*[一二三四五六七八九十\d]+\s*(?:周|月|季度)|创\s*[一二三四五六七八九十\d]+\s*(?:周|月|季度)新高|首次突破|超过正常(?:日)?周波动/i;
  if (unsupportedHistory.test(output) && !unsupportedHistory.test(prompt)) {
    issues.push("输入没有多周期历史,删除“过去 N 周 / 首次突破 / 创新高 / 超过正常波动”等比较");
  }

  const unsupportedBenchmark = /行业(?:通常|平均|基准)|处于(?:较高|较低|中等)水平|具有边际意义/i;
  if (unsupportedBenchmark.test(output) && !unsupportedBenchmark.test(prompt)) {
    issues.push("输入没有行业基准,删除高低水平和边际意义等无依据评价");
  }

  const hasAttributedQuote = doc.blocks.some((block) => block.kind === "pull-quote" && Boolean(block.attribution));
  if (hasAttributedQuote && !/(?:引语|引用|出处|署名|quote|attribution)/i.test(prompt)) {
    issues.push("用户未提供引语或出处,删除 pull-quote 及虚构署名");
  }

  return issues;
}

type OnceResult<T> = { doc: T; usage: { inputTokens: number; outputTokens: number } };

async function generateDocViaTextOnce<T>(
  schema: z.ZodType<T>,
  system: string,
  input: GenInput,
  emit: (e: GenEvent) => void,
  attempt = 1,
): Promise<OnceResult<T>> {
  const genModel = input.model ?? selectModel("generator");
  const { text, usage } = await generateText({
    model: genModel,
    system,
    prompt: buildGeneratePromptV2(input.prompt, input.workspace, input.history),
    maxOutputTokens: 8000,
    // V27-G · 不设 temperature(K2.6 拒绝任何 !=1 的值)· 让 provider 用默认
    abortSignal: input.signal,
    // #14 · CLI/gateway 路径:重试(attempt>1)带 header,gateway 据此跳过计费(Plain 吞失败重试)
    headers: { "x-plain-attempt": String(attempt) },
    ...noThinking(genModel),
  });

  // #14 · usage 不在这里 emit(否则失败 attempt 也计费);返回给外层,只在成功时 emit。
  const u = { inputTokens: usage?.inputTokens ?? 0, outputTokens: usage?.outputTokens ?? 0 };

  const candidate = extractJsonObject(text);
  if (!candidate) {
    emit({ type: "reasoning", source: "progress", text: `未提取到 JSON · raw="${text.slice(0, 200)}"` });
    throw new Error("generator 未返回可解析的 JSON 对象");
  }

  // 1. 严格 JSON.parse + schema
  try {
    const direct = schema.parse(JSON.parse(candidate));
    return { doc: direct, usage: u };
  } catch {
    // fall through to tolerant repair
  }

  // 2. parsePartialJson(容忍截断/尾逗号)+ schema
  let parsedValue: unknown;
  try {
    const r = await parsePartialJson(candidate);
    if (r.state !== "failed-parse" && r.value !== undefined) {
      parsedValue = r.value;
      const repaired = schema.safeParse(r.value);
      if (repaired.success) {
        emit({ type: "reasoning", source: "progress", text: "schema 偏差已自动修复" });
        return { doc: repaired.data, usage: u };
      }
      emit({
        type: "reasoning",
        source: "progress",
        text: `schema 校验失败: ${formatZodIssues(repaired.error)} · 尝试字段容错...`,
      });
    }
  } catch {
    // ignore
  }

  // 3. 通用字段容错 repair:按 zod error 的 path 逐个删除失败字段,循环重试。
  //   比硬编码字段名通用——任何 optional/有 default 的字段被 LLM 写出非法值,删掉就能过。
  //   也能删 array 里某个非法 item(整项删)。最多迭代 30 次防死循环。
  if (parsedValue !== null && parsedValue !== undefined) {
    const repaired = repairByZodPath(parsedValue, schema, emit);
    if (repaired !== null) return { doc: repaired as T, usage: u };
  }

  throw new Error(`generator 输出不符合 schema · raw 长度 ${text.length}`);
}

/**
 * 通用 repair:safeParse → 失败则按第一个 error 的 path 删掉那个字段 → 重试,循环。
 * 优先删 leaf 字段(设 undefined);若 path 指向 array item 且该 item 无法修,删整项。
 * 返回修好的数据,或 null(无法修复)。
 */
function repairByZodPath<T>(
  value: unknown,
  schema: z.ZodType<T>,
  emit: (e: GenEvent) => void,
): T | null {
  let cur = structuredCloneSafe(value);
  for (let iter = 0; iter < 30; iter++) {
    const r = schema.safeParse(cur);
    if (r.success) {
      if (iter > 0) emit({ type: "reasoning", source: "progress", text: `字段容错 repair 成功(清理 ${iter} 处)` });
      return r.data;
    }
    const issue = (r.error as { issues?: Array<{ path: Array<string | number>; code?: string; maximum?: number; type?: string }> }).issues?.[0];
    if (!issue || !Array.isArray(issue.path)) return null;
    // 数组超上限(LLM 多生成了 item)→ 截断到 max,而非整删(删了违反 min)。守 schema 意图(渲染仍 ≤max)。
    if (issue.code === "too_big" && issue.type === "array" && typeof issue.maximum === "number") {
      const truncated = truncateArrayAtPath(cur, issue.path, issue.maximum);
      if (truncated) { cur = truncated; continue; }
    }
    if (issue.path.length === 0) return null;
    let targetPath = issue.path;
    // 判别键(kind/variant)非法 → 删整个数组项(光删 kind 字段会让 union 更迷茫)。
    // path 形如 [..., "sections", 4, "kind"] → 退到 [..., "sections", 4] 删该 section。
    const last = targetPath[targetPath.length - 1];
    if ((last === "kind" || last === "variant") && targetPath.length >= 2) {
      const parentIdx = targetPath[targetPath.length - 2];
      if (typeof parentIdx === "number") targetPath = targetPath.slice(0, -1); // 删数组项
    }
    const removed = removeAtPath(cur, targetPath);
    if (!removed) return null;
    cur = removed;
  }
  return null;
}

/** 沿 JSON path 删除目标(叶字段设 undefined;array item 整项删)。返回新对象或 null。 */
function removeAtPath(root: unknown, path: Array<string | number>): unknown | null {
  if (path.length === 0) return null;
  const newRoot = structuredCloneSafe(root) as Record<string, unknown> | unknown[];
  let node: unknown = newRoot;
  for (let i = 0; i < path.length - 1; i++) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string | number, unknown>)[path[i]];
  }
  if (node == null || typeof node !== "object") return null;
  const last = path[path.length - 1];
  if (Array.isArray(node) && typeof last === "number") {
    node.splice(last, 1); // 删整个非法数组项
  } else {
    delete (node as Record<string | number, unknown>)[last];
  }
  return newRoot;
}

/** 数组超上限 → 截断到 max(保留前 max 个)。path 指向该数组本身。返回新对象或 null。 */
function truncateArrayAtPath(root: unknown, path: Array<string | number>, max: number): unknown | null {
  const newRoot = structuredCloneSafe(root);
  let node: unknown = newRoot;
  for (let i = 0; i < path.length; i++) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string | number, unknown>)[path[i]];
  }
  if (!Array.isArray(node) || node.length <= max) return null;
  node.length = max; // 截断到 max
  return newRoot;
}

/** 安全深拷贝(structuredClone 在某些 runtime 缺失时退回 JSON)。 */
function structuredCloneSafe<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v)) as T;
  }
}

/** 把 zod error 压成一行可读 issue 摘要(给前端定位) */
function formatZodIssues(err: unknown): string {
  const issues = (err as { issues?: Array<{ path: unknown[]; message: string }> })?.issues;
  if (!Array.isArray(issues)) return String(err).slice(0, 200);
  return issues
    .slice(0, 4)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join(" · ");
}

/** 从可能带 markdown fence / 前后噪声的文本里提取首个完整 JSON 对象 */
function extractJsonObject(raw: string): string | null {
  // 1. ```json ... ``` fence
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : raw;
  // 2. 第一个 { 到最后一个 } —— 平衡裁剪(简单贪婪,够用)
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return body.slice(start, end + 1).trim();
}

// ─────────────────────────────────────────────
// Deck
// ─────────────────────────────────────────────

export async function generateDeckV2(
  input: GenInput,
  emit: (e: GenEvent) => void,
): Promise<{ doc: DeckDocV2T; source: string }> {
  emit({ type: "phase", phase: "generating" });
  const doc = await generateDocViaText(DeckDocV2, DECK_GEN_PROMPT_V2, input, emit);
  const source = serializeDeck(doc);
  emit({ type: "reasoning", source: "progress", text: `deck 生成完成 · ${doc.sections.length} 个 section` });
  return { doc, source };
}

// ─────────────────────────────────────────────
// Doc
// ─────────────────────────────────────────────

export async function generateDocV2(
  input: GenInput,
  emit: (e: GenEvent) => void,
): Promise<{ doc: DocDocV2T; source: string }> {
  emit({ type: "phase", phase: "generating" });
  const doc = await generateDocViaText(
    DocDocV2,
    DOC_GEN_PROMPT_V2,
    input,
    emit,
    (candidate) => reportGroundingIssues(candidate, input.prompt),
  );
  const source = serializeDoc(doc);
  emit({ type: "reasoning", source: "progress", text: `doc 生成完成 · ${doc.blocks.length} 个 block` });
  return { doc, source };
}

// ─────────────────────────────────────────────
// Sheet
// ─────────────────────────────────────────────

export async function generateSheetV2(
  input: GenInput,
  emit: (e: GenEvent) => void,
): Promise<{ doc: SheetDocV2T; source: string }> {
  emit({ type: "phase", phase: "generating" });
  const doc = await generateDocViaText(SheetDocV2, SHEET_GEN_PROMPT_V2, input, emit);
  const source = serializeSheet(doc);
  emit({ type: "reasoning", source: "progress", text: `sheet 生成完成 · ${doc.sections.length} 个 section` });
  return { doc, source };
}
