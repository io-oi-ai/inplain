/**
 * Plain DSL v2 · source ↔ strict schema adapter
 *
 * parseDsl (render-v2) 输出 loose ParsedDoc(blocks 的 data 是 Record<string, unknown>)。
 * 我们要把它 lift 成严格 Zod-typed DeckDocV2 / DocDocV2 / SheetDocV2,
 * 才能 (1) AI 看到 strict path 写 JsonPatchOp,(2) tryApply 用 schema 校验 patch 结果。
 *
 * 反向 (doc → string) 已经在 serialize.ts 实现,本文件只做正向。
 *
 * 永不抛 —— 失败返回 null,让 caller 知道 source 不是合法 v2(可能是 v1 marp,要降级)。
 */

import { parseDsl, type Block, type ParsedDoc } from "@/lib/render-v2/parse-dsl";
import {
  DeckDocV2,
  DocDocV2,
  SheetDocV2,
  type DeckDocV2 as DeckDocV2T,
  type DocDocV2 as DocDocV2T,
  type SheetDocV2 as SheetDocV2T,
} from "./schemas";

// ─────────────────────────────────────────────
// 顶层入口
// ─────────────────────────────────────────────

/** source string → DeckDocV2。失败返回 null。 */
export function parseDeckV2(source: string): DeckDocV2T | null {
  const parsed = parseDsl(source);
  if (!isV2(parsed, "deck@v2")) {
    if (process.env.PLAIN_DEBUG_ADAPTER) {
      console.warn("[adapter] parseDeckV2: not v2", parsed.front);
    }
    return null;
  }
  const sections = parsed.blocks
    .filter((b): b is Extract<Block, { kind: "section" }> => b.kind === "section")
    .map(sectionToDeckSection)
    .filter((s): s is Record<string, unknown> => s !== null);
  const candidate = {
    plain: "deck@v2",
    theme: pickFrontString(parsed, "theme") ?? "monocle",
    title: pickFrontString(parsed, "title") ?? "未命名 deck",
    author: pickFrontString(parsed, "author"),
    date: pickFrontString(parsed, "date"),
    description: pickFrontString(parsed, "description"),
    sections,
  };
  const r = DeckDocV2.safeParse(candidate);
  if (!r.success && process.env.PLAIN_DEBUG_ADAPTER) {
    console.warn("[adapter] parseDeckV2: schema failed", r.error.issues.slice(0, 5));
  }
  return r.success ? r.data : null;
}

/** source string → DocDocV2。失败返回 null。 */
export function parseDocV2(source: string): DocDocV2T | null {
  const parsed = parseDsl(source);
  if (!isV2(parsed, "doc@v2")) return null;
  const blocks: Array<Record<string, unknown>> = [];
  for (const b of parsed.blocks) {
    if (b.kind === "md") {
      blocks.push({ kind: "md", text: b.text });
      continue;
    }
    if (b.kind === "callout") {
      blocks.push({ kind: "callout", variant: b.variant, body: b.body });
      continue;
    }
    if (b.kind === "code-group") {
      // code-group 还原成 md(::: code-group + fenced),保证 generate→edit roundtrip 不丢
      const fences = b.tabs
        .map((t) => "```" + t.info + "\n" + t.code + "\n```")
        .join("\n");
      blocks.push({ kind: "md", text: "::: code-group\n" + fences + "\n:::" });
      continue;
    }
    if (b.kind === "interactive") {
      // tabs/accordion/steps 还原成 md(::: name + ## 标题 section),保证 roundtrip 不丢
      const inner = b.sections
        .map((s) => "## " + s.title + "\n" + s.body)
        .join("\n\n");
      blocks.push({ kind: "md", text: "::: " + b.name + "\n" + inner + "\n:::" });
      continue;
    }
    // section → 按 name 映射成 DocBlock
    const mapped = sectionToDocBlock(b);
    if (mapped) blocks.push(mapped);
  }
  const candidate = {
    plain: "doc@v2",
    theme: pickFrontString(parsed, "theme") ?? "monocle",
    title: pickFrontString(parsed, "title") ?? "未命名 doc",
    author: pickFrontString(parsed, "author"),
    date: pickFrontString(parsed, "date"),
    description: pickFrontString(parsed, "description"),
    blocks,
  };
  const r = DocDocV2.safeParse(candidate);
  return r.success ? r.data : null;
}

/** source string → SheetDocV2。失败返回 null。 */
export function parseSheetV2(source: string): SheetDocV2T | null {
  const parsed = parseDsl(source);
  if (!isV2(parsed, "sheet@v2")) return null;
  const sections = parsed.blocks
    .filter((b): b is Extract<Block, { kind: "section" }> => b.kind === "section")
    .map(sectionToSheetSection)
    .filter((s): s is Record<string, unknown> => s !== null);
  const candidate = {
    plain: "sheet@v2",
    theme: pickFrontString(parsed, "theme") ?? "dune-dark",
    title: pickFrontString(parsed, "title") ?? "未命名 sheet",
    author: pickFrontString(parsed, "author"),
    date: pickFrontString(parsed, "date"),
    description: pickFrontString(parsed, "description"),
    dataSource: pickFrontString(parsed, "data-source"),
    sections,
  };
  const r = SheetDocV2.safeParse(candidate);
  return r.success ? r.data : null;
}

// ─────────────────────────────────────────────
// frontmatter helpers
// ─────────────────────────────────────────────

function isV2(parsed: ParsedDoc, expected: string): boolean {
  const v = parsed.front.plain;
  if (typeof v !== "string") return false;
  // 兼容 AI 偶尔写成 "deck@v2 " (trailing space) 或 quoted
  return v.trim().replace(/^["']|["']$/g, "") === expected;
}

function pickFrontString(parsed: ParsedDoc, key: string): string | undefined {
  const v = parsed.front[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// ─────────────────────────────────────────────
// Deck section adapter
//
// parseDsl 的 block.name 就是 DeckSection.kind 的字符串(cover / stats / ...)。
// data 字段已经按 yaml-ish 解析过,大多数 field 名也对得上。
// 但有几处命名要修(parser 用 kebab,schema 用 camel 等),这里统一矫正。
// ─────────────────────────────────────────────

function sectionToDeckSection(b: Extract<Block, { kind: "section" }>): Record<string, unknown> | null {
  const kind = b.name;
  const data = b.data ?? {};
  // 已知的 DeckSection kinds — 不在白名单的 section 直接弃(避免污染)
  const known = new Set([
    "cover",
    "hero-question",
    "stats",
    "diagnosis",
    "pull-quote",
    "proposal",
    "features",
    "timeline",
    "closing",
    "image",
    "gallery",
    "media-split",
  ]);
  if (!known.has(kind)) return null;

  // kebab → camel 字段重命名(只针对已知字段)
  const obj: Record<string, unknown> = { kind, ...data };
  if ("display-tail" in obj) {
    obj.displayTail = obj["display-tail"];
    delete obj["display-tail"];
  }
  if ("speaker-notes" in obj) {
    obj.speakerNotes = obj["speaker-notes"];
    delete obj["speaker-notes"];
  }
  if ("metric-label" in obj) {
    obj.metricLabel = obj["metric-label"];
    delete obj["metric-label"];
  }
  // diagnosis.items[].metric-label · 同时把 num/value/metric 等用户用 YAML 写裸数字
  // (例:`num: 01` YAML 当 1)的字段强转 string · ShortText schema 要求 string。
  // V27-O · 修 pull → edit roundtrip 的 schema error。
  if (Array.isArray(obj.items)) {
    obj.items = (obj.items as Array<Record<string, unknown>>).map((it) => {
      const n = { ...it };
      if ("metric-label" in n) {
        n.metricLabel = n["metric-label"];
        delete n["metric-label"];
      }
      // 数字 → 字符串 · 防 YAML 把 "01" 解析成 1 / "23.5" 解析成 23.5
      for (const key of ["num", "value", "metric", "head", "label", "hint"]) {
        if (typeof n[key] === "number") n[key] = String(n[key]);
      }
      return n;
    });
  }
  // 顶层也可能有 num/metric/etc 是数字 · 同样转
  for (const key of ["num", "value", "metric", "bigNumber", "big-number"]) {
    if (typeof obj[key] === "number") obj[key] = String(obj[key]);
  }
  if ("big-number" in obj) {
    obj.bigNumber = obj["big-number"];
    delete obj["big-number"];
  }
  // byline 是 string[] · YAML 写裸 2026 会变 number · 全部 stringify
  for (const key of ["byline", "bullets", "tags"]) {
    if (Array.isArray(obj[key])) {
      obj[key] = (obj[key] as unknown[]).map((v) =>
        typeof v === "number" ? String(v) : v,
      );
    }
  }
  return obj;
}

// ─────────────────────────────────────────────
// Doc block adapter
//
// 大部分 DocBlock kinds 是 section 形式(hero / flow / data-block / numbered / pull-quote)。
// md / callout 已经被 parseDsl 直接出成顶级 block,不会走这里。
// ─────────────────────────────────────────────

function sectionToDocBlock(b: Extract<Block, { kind: "section" }>): Record<string, unknown> | null {
  const kind = b.name;
  const data = b.data ?? {};
  const known = new Set(["hero", "flow", "data-block", "numbered", "pull-quote"]);
  if (!known.has(kind)) return null;
  // YAML-ish parse 会把 "2026.04" / "100" 这类值读成 number,但 schema 里 meta/byline
  // 等数组字段要 string[] → 整单 reject。这里把字符串数组字段里的非字符串项强转回 string。
  return coerceStringArrays({ kind, ...data });
}

/** 把已知"字符串数组"字段(meta/byline/tags/bullets)里的 number/bool 项转成 string。 */
function coerceStringArrays(obj: Record<string, unknown>): Record<string, unknown> {
  const STRING_ARRAY_FIELDS = new Set(["meta", "byline", "tags", "bullets"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (STRING_ARRAY_FIELDS.has(k) && Array.isArray(v)) {
      out[k] = v.map((x) => (typeof x === "string" ? x : String(x)));
    } else if (Array.isArray(v)) {
      // 嵌套数组项(如 items/weeks)里也可能有 meta/bullets
      out[k] = v.map((x) =>
        x && typeof x === "object" && !Array.isArray(x)
          ? coerceStringArrays(x as Record<string, unknown>)
          : x,
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─────────────────────────────────────────────
// Sheet section adapter
// ─────────────────────────────────────────────

function sectionToSheetSection(b: Extract<Block, { kind: "section" }>): Record<string, unknown> | null {
  const kind = b.name;
  const variant = b.variant; // panel 子类型
  const data = b.data ?? {};
  if (kind === "panel") {
    if (!variant) return null;
    return coerceStringArrays({ kind: "panel", variant, ...data });
  }
  const known = new Set(["dashboard-header", "kpis", "insight", "closing"]);
  if (!known.has(kind)) return null;
  return coerceStringArrays({ kind, ...data });
}
