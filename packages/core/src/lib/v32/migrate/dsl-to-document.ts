/**
 * V32 · S8 迁移 adapter · v2 DSL source → v32 Document
 *
 * 目标:让 Office/PDF 导入产出 v32 Document(现状产出 v2 DSL source markdown)。
 * 本文件只做「v2 结构 → v32 语义块」的纯映射,不碰导入的机械提取 / Claude 结构化逻辑。
 *
 * 契约(对齐 from-v31.ts):
 *   - 纯函数、确定性、无副作用 —— 同输入永远得到同输出(含 id)。
 *   - 缺字段 / 未知 section 容错降级(不抛),兜底成 prose / statement。
 *   - 产出必须能过 v32 parseDocument(zod 校验)。
 *
 * 入口:parseDsl(source) → { front, blocks(v2 Block) } → v32 Document。
 *
 * 注意:v2 DSL 的 data 用 kebab-case 键(display-tail / big-number / metric-label),
 * 跟 v31 的 camelCase 不同 —— 这里按 v2 键名读。
 */
import { parseDsl } from "@/lib/render-v2/parse-dsl";
import type { Block as V2Block, Front } from "@/lib/render-v2/parse-dsl";
import type { Block, CardItem, Document, DocMeta } from "../content/schema";

// ─────────────────────────────────────────────────────────────
// 小工具(容错取值)
// ─────────────────────────────────────────────────────────────

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}
/** V32 S8 · 稳定 block id:`imp${index}`(同输入每次同 id) */
function makeId(index: number): string {
  return `imp${index}`;
}
/** 丢掉 undefined key(让产物干净、便于断言) */
function clean<T extends Record<string, unknown>>(o: T): T {
  for (const k of Object.keys(o)) {
    if (o[k] === undefined) delete o[k];
  }
  return o;
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · front → DocMeta
// ─────────────────────────────────────────────────────────────

function toMeta(front: Front): DocMeta {
  // front.plain 例:"deck@v2" / "doc@v2" / "sheet@v2" → 含 "deck" 走 present
  const plain = str(front.plain) ?? "";
  const defaultMode = /deck/i.test(plain) ? "present" : "report";
  const density =
    front.density === "low" || front.density === "high" ? front.density : "high";
  const out: Record<string, unknown> = {
    title: str(front.title) ?? "",
    author: str(front.author),
    date: str(front.date),
    description: str(front.description),
    density,
    defaultMode,
  };
  return clean(out) as unknown as DocMeta;
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · 卡片 / 序列 / 列 / 象限 小映射
// ─────────────────────────────────────────────────────────────

/** v2 section item(diagnosis/features/proposal)→ v32 CardItem。v2 用 metric-label(kebab) */
function cardFrom(it: unknown): CardItem {
  const c = obj(it);
  return clean({
    num: str(c.num),
    head: str(c.head) ?? str(c.title) ?? "",
    body: str(c.body) ?? "",
    icon: str(c.icon),
    when: str(c.when),
    metric: str(c.metric),
    metricLabel: str(c["metric-label"]) ?? str(c.metricLabel),
  }) as CardItem;
}

/** v2 timeline weeks / pipeline items → v32 SeqItem */
function seqFrom(it: unknown): { when?: string; label: string; hint?: string } {
  const s = obj(it);
  // timeline 的一项是 { when, head, bullets[] } —— head 作 label,bullets 拼进 hint
  const bullets = arr(s.bullets).map((b) => str(b) ?? "").filter(Boolean);
  return clean({
    when: str(s.when) ?? str(s.num),
    label: str(s.label) ?? str(s.head) ?? "",
    hint: str(s.hint) ?? (bullets.length ? bullets.join(" · ") : undefined),
  });
}

function colFrom(v: unknown): { label: string; bullets: string[] } {
  const c = obj(v);
  return {
    label: str(c.label) ?? "",
    bullets: arr(c.bullets).map((b) => str(b) ?? ""),
  };
}

function quadrantLabelsFrom(v: unknown): [string, string, string, string] {
  const a = arr(v).map((x) => str(x) ?? "");
  return [a[0] ?? "", a[1] ?? "", a[2] ?? "", a[3] ?? ""];
}

function ctaFrom(v: unknown): Record<string, unknown> | undefined {
  if (v === undefined || v === null) return undefined;
  const c = obj(v);
  const btn = (b: unknown) => {
    if (b === undefined || b === null) return undefined;
    const x = obj(b);
    return clean({ label: str(x.label) ?? "", href: str(x.href) });
  };
  const primary = btn(c.primary);
  const secondary = btn(c.secondary);
  if (!primary && !secondary) return undefined;
  return clean({ primary, secondary });
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · canvas 降级
//
// pptx 自由画布 = { scene: { elements: [{ type:"text", text/content, x, y, ... }] } }
// 绝对坐标高保真画布进不了语义块 —— 接受降级:提取所有 text 元素的文字,
// 主标题拼成 statement(第一条较短的作大字),其余拼进 prose;
// 拿不到任何文字则退回一个空 prose(不抛)。
// ─────────────────────────────────────────────────────────────

/** 从 canvas data 深挖出所有 text 片段(容忍 scene/elements/children 多种嵌套) */
function extractCanvasTexts(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  const walk = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      // 只有明确是 text 类元素时才收字面文字,避免把坐标/样式当文字
      const type = str(o.type);
      if (type === "text" || type === "label" || o.text !== undefined || o.content !== undefined) {
        const t = str(o.text) ?? str(o.content) ?? str(o.value);
        if (t && t.trim()) out.push(t.trim());
      }
      for (const k of Object.keys(o)) {
        // 递归进容器字段(scene/elements/children/items/nodes)
        if (["scene", "elements", "children", "items", "nodes", "shapes"].includes(k)) {
          walk(o[k]);
        }
      }
    }
  };
  walk(data);
  return out;
}

function canvasToBlocks(data: Record<string, unknown>, id: string, deck: boolean): Block[] {
  const texts = extractCanvasTexts(data);
  const base = deck ? { id, pageBreak: true } : { id };
  if (texts.length === 0) {
    return [clean({ ...base, type: "prose", body: "" }) as Block];
  }
  // 第一条较短的当大标题 statement,其余进 prose 段落
  const [head, ...rest] = texts;
  const blocks: Block[] = [];
  blocks.push(
    clean({
      ...base,
      type: "statement",
      text: head,
    }) as Block,
  );
  if (rest.length > 0) {
    blocks.push(
      clean({
        id: `${id}_body`,
        ...(deck ? { pageBreak: false } : {}),
        type: "prose",
        body: rest.join("\n\n"),
      }) as Block,
    );
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · v2 section{name} → v32 Block
// ─────────────────────────────────────────────────────────────

function sectionToBlocks(
  name: string,
  data: Record<string, unknown>,
  id: string,
  deck: boolean,
): Block[] {
  const base = deck ? { id, pageBreak: true } : { id };

  switch (name) {
    case "cover":
      return [
        clean({
          ...base,
          type: "cover",
          emphasis: "hero",
          kicker: str(data.kicker),
          display: str(data.display) ?? "",
          displayTail: str(data["display-tail"]) ?? str(data.displayTail),
          lead: str(data.lead),
          byline: arr(data.byline).length
            ? arr(data.byline).map((b) => str(b) ?? "")
            : undefined,
        }) as Block,
      ];

    case "hero-question":
      return [
        clean({
          ...base,
          type: "statement",
          bigNumber: str(data["big-number"]) ?? str(data.bigNumber),
          text: str(data.question) ?? str(data.text) ?? "",
          annotation: str(data.annotation),
        }) as Block,
      ];

    case "stats":
    case "kpis":
      return [
        clean({
          ...base,
          type: "metrics",
          title: str(data.title),
          items: arr(data.items).map((it) => {
            const m = obj(it);
            return clean({
              value: str(m.value) ?? "",
              label: str(m.label) ?? "",
              hint: str(m.hint),
              delta:
                m.delta === "up" || m.delta === "down" || m.delta === "flat"
                  ? m.delta
                  : undefined,
            });
          }),
        }) as Block,
      ];

    case "diagnosis":
      return [
        clean({
          ...base,
          type: "cards",
          layout: "numbered",
          title: str(data.title),
          kicker: str(data.kicker),
          items: arr(data.items).map((it) => cardFrom(it)),
        }) as Block,
      ];

    case "features":
      return [
        clean({
          ...base,
          type: "cards",
          layout: "grid",
          title: str(data.title),
          kicker: str(data.kicker),
          items: arr(data.items).map((it) => cardFrom(it)),
        }) as Block,
      ];

    case "proposal":
      return [
        clean({
          ...base,
          type: "cards",
          layout: "steps",
          title: str(data.title),
          kicker: str(data.kicker),
          items: arr(data.steps).map((it) => cardFrom(it)),
        }) as Block,
      ];

    case "timeline":
      return [
        clean({
          ...base,
          type: "sequence",
          flow: "time",
          title: str(data.title),
          kicker: str(data.kicker),
          items: arr(data.weeks).map((it) => seqFrom(it)),
        }) as Block,
      ];

    case "pipeline":
    case "flow":
      return [
        clean({
          ...base,
          type: "sequence",
          flow: "arrow",
          title: str(data.title),
          kicker: str(data.kicker),
          items: arr(data.items).map((it) => seqFrom(it)),
        }) as Block,
      ];

    case "compare":
      return [
        clean({
          ...base,
          type: "compare",
          title: str(data.title),
          left: colFrom(data.left),
          right: colFrom(data.right),
        }) as Block,
      ];

    case "quadrant":
      return [
        clean({
          ...base,
          type: "quadrant",
          xLabel: str(data.xLabel) ?? str(data["x-label"]) ?? "",
          yLabel: str(data.yLabel) ?? str(data["y-label"]) ?? "",
          quadrantLabels: quadrantLabelsFrom(
            data.quadrantLabels ?? data["quadrant-labels"],
          ),
          points: arr(data.points).map((p) => {
            const pt = obj(p);
            return clean({
              label: str(pt.label) ?? "",
              x: typeof pt.x === "number" ? pt.x : Number(pt.x) || 0,
              y: typeof pt.y === "number" ? pt.y : Number(pt.y) || 0,
              focal: typeof pt.focal === "boolean" ? pt.focal : undefined,
            });
          }),
        }) as Block,
      ];

    case "pull-quote":
      return [
        clean({
          ...base,
          type: "quote",
          text: str(data.text) ?? "",
          attribution: str(data.attribution),
        }) as Block,
      ];

    case "closing":
      return [
        clean({
          ...base,
          type: "closing",
          kicker: str(data.kicker),
          display: str(data.display) ?? "",
          sub: str(data.sub),
          cta: ctaFrom(data.cta),
        }) as Block,
      ];

    case "media-split":
    case "image": {
      // v2 media-split 是扁平字段(非嵌套 media 对象)
      const mSide = str(data.side) === "right" ? "right" : "left";
      const body = str(data.body);
      const bullets = arr(data.bullets).map((b) => str(b) ?? "").filter(Boolean);
      const bodyText = body ?? (bullets.length ? bullets.map((b) => `- ${b}`).join("\n") : undefined);
      return [
        clean({
          ...base,
          type: "media",
          text: clean({
            kicker: str(data.kicker),
            title: str(data.title) ?? "",
            body: bodyText,
          }),
          media: clean({
            kind: "image" as const,
            src: str(data.src),
          }),
          side: mSide,
        }) as Block,
      ];
    }

    case "canvas":
      // V32 S8 · 高保真自由画布降级:提取文字保住主要内容
      return canvasToBlocks(data, id, deck);

    // ── sheet panel 语义 ──
    case "big-number": {
      return [
        clean({
          ...base,
          type: "metrics",
          title: str(data.title),
          items: [
            clean({
              value: str(data.value) ?? str(data.number) ?? "",
              label: str(data.label) ?? str(data.title) ?? "",
              hint: str(data.hint),
            }),
          ],
        }) as Block,
      ];
    }

    case "insight":
      return [
        clean({
          ...base,
          type: "prose",
          body: str(data.body) ?? str(data.text) ?? "",
          tone:
            data.tone === "info" ||
            data.tone === "ok" ||
            data.tone === "warn" ||
            data.tone === "danger"
              ? data.tone
              : undefined,
        }) as Block,
      ];

    case "table":
      return [
        clean({
          ...base,
          type: "table",
          title: str(data.title),
          headers: (arr(data.headers).length ? arr(data.headers) : arr(data.columns)).map(
            (h) => str(h) ?? "",
          ),
          rows: arr(data.rows).map((r) => arr(r).map((c) => str(c) ?? "")),
        }) as Block,
      ];

    default:
      // V32 S8 · 未知 section 兜底 → prose(尽量把 data 里的文字捞出来,不抛)
      return [
        clean({
          ...base,
          type: "prose",
          body: unknownSectionBody(data),
        }) as Block,
      ];
  }
}

/** 未知 section:优先 body/text,再退回 title,再把标量字段拼一拼 */
function unknownSectionBody(data: Record<string, unknown>): string {
  const body = str(data.body) ?? str(data.text);
  if (body) return body;
  const title = str(data.title);
  if (title) return title;
  const scalars = Object.values(data)
    .map((v) => str(v))
    .filter((v): v is string => Boolean(v && v.trim()));
  return scalars.join("\n\n");
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · v2 非 section 块
// ─────────────────────────────────────────────────────────────

function calloutToneFrom(v: string): "info" | "ok" | "warn" | "danger" | "tip" | "note" {
  return v === "info" ||
    v === "ok" ||
    v === "warn" ||
    v === "danger" ||
    v === "tip" ||
    v === "note"
    ? v
    : "info";
}

function v2BlockToBlocks(b: V2Block, id: string, deck: boolean): Block[] {
  const base = deck ? { id, pageBreak: true } : { id };
  switch (b.kind) {
    case "section":
      return sectionToBlocks(b.name, obj(b.data), id, deck);

    case "callout":
      return [
        clean({
          ...base,
          type: "callout",
          tone: calloutToneFrom(b.variant),
          body: b.body,
        }) as Block,
      ];

    case "md":
      return [clean({ ...base, type: "prose", body: b.text }) as Block];

    case "code-group": {
      // 降级:把每个 tab 拼成 markdown fenced code → prose
      const body = b.tabs
        .map((t) => "```" + (t.info || "") + "\n" + t.code + "\n```")
        .join("\n\n");
      return [clean({ ...base, type: "prose", body }) as Block];
    }

    case "interactive": {
      // 降级:每个 section 拼成 `### 标题 + body` markdown → prose
      const body = b.sections
        .map((s) => `### ${s.title}\n\n${s.body}`)
        .join("\n\n");
      return [clean({ ...base, type: "prose", body }) as Block];
    }

    default:
      return [clean({ ...base, type: "prose", body: "" }) as Block];
  }
}

// ─────────────────────────────────────────────────────────────
// V32 S8 · 入口
// ─────────────────────────────────────────────────────────────

export function dslToDocument(source: string): Document {
  const { front, blocks: v2blocks } = parseDsl(source ?? "");
  const meta = toMeta(front);
  const deck = meta.defaultMode === "present";

  const blocks: Block[] = [];
  v2blocks.forEach((b, i) => {
    const produced = v2BlockToBlocks(b, makeId(i), deck);
    for (const p of produced) blocks.push(p);
  });

  return { meta, blocks };
}
