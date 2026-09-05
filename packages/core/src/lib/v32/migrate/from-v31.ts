/**
 * V32 · S1 迁移 adapter
 *
 * V31 三套 content(deck / doc / sheet)→ V32 统一 Document(纯函数)。
 *
 * 契约:
 *   - 纯函数、确定性、无副作用、无随机 —— 同一份输入永远得到同一份输出(含 id)。
 *   - 缺字段 / 未知节点容错降级(不抛),但顶层结构性错误(非对象)可抛。
 *   - 产出必须能过 v32 parseDocument(zod 校验)。
 *
 * 映射规则见 §1.2 收敛表(下方 switch 分支逐条对应)。
 */
import type { Block, CardItem, Document, DocMeta } from "../content/schema";

// ─────────────────────────────────────────────────────────────
// 小工具
// ─────────────────────────────────────────────────────────────

/** 安全取对象(容错:非对象 → 空对象) */
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** 安全取数组(容错:非数组 → 空数组) */
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** 安全取字符串(容错) */
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** 确定性 block id:`${prefix}${index}`(同输入每次同 id) */
function makeId(prefix: string, index: number): string {
  return `${prefix}${index}`;
}

/** 丢掉 undefined key(让产物干净、便于无损断言) */
function clean<T extends Record<string, unknown>>(o: T): T {
  for (const k of Object.keys(o)) {
    if (o[k] === undefined) delete o[k];
  }
  return o;
}

// ─────────────────────────────────────────────────────────────
// meta
// ─────────────────────────────────────────────────────────────

function toMeta(kind: "deck" | "doc" | "sheet", meta: Record<string, unknown>): DocMeta {
  const density = meta.density === "low" || meta.density === "high" ? meta.density : "high";
  const out: Record<string, unknown> = {
    title: str(meta.title) ?? "",
    author: str(meta.author),
    date: str(meta.date),
    description: str(meta.description),
    deck: str(meta.deck),
    density,
    defaultMode: kind === "deck" ? "present" : "report",
  };
  return clean(out) as unknown as DocMeta;
}

// ─────────────────────────────────────────────────────────────
// deck slides → blocks(每 slide 默认 pageBreak:true)
// ─────────────────────────────────────────────────────────────

function deckSlideToBlock(slide: unknown, index: number): Block {
  const s = obj(slide);
  const id = makeId("d", index);
  const base = { id, pageBreak: true };
  const kind = s.kind;

  switch (kind) {
    case "cover":
      return clean({
        ...base,
        type: "cover",
        emphasis: "hero",
        kicker: str(s.kicker),
        display: str(s.display) ?? "",
        displayTail: str(s.displayTail),
        lead: str(s.lead),
        byline: Array.isArray(s.byline) ? (s.byline as string[]) : undefined,
      }) as Block;

    case "hero-question":
      // bigNumber/text=question/annotation
      return clean({
        ...base,
        type: "statement",
        bigNumber: str(s.bigNumber),
        text: str(s.question) ?? "",
        annotation: str(s.annotation),
      }) as Block;

    case "stats":
      return clean({
        ...base,
        type: "metrics",
        title: str(s.title),
        items: arr(s.items).map((it) => {
          const m = obj(it);
          return clean({
            value: str(m.value) ?? "",
            label: str(m.label) ?? "",
            hint: str(m.hint),
            delta: m.delta as "up" | "down" | "flat" | undefined,
          });
        }),
      }) as Block;

    case "diagnosis":
      // cards(layout:numbered),item.metric/metricLabel 保留
      return clean({
        ...base,
        type: "cards",
        layout: "numbered",
        title: str(s.title),
        kicker: str(s.kicker),
        items: arr(s.items).map((it) => cardFrom(it)),
      }) as Block;

    case "compare":
      return clean({
        ...base,
        type: "compare",
        title: str(s.title),
        left: colFrom(s.left),
        right: colFrom(s.right),
      }) as Block;

    case "pull-quote":
      return clean({
        ...base,
        type: "quote",
        text: str(s.text) ?? "",
        attribution: str(s.attribution),
      }) as Block;

    case "proposal":
      // cards(layout:steps)
      return clean({
        ...base,
        type: "cards",
        layout: "steps",
        title: str(s.title),
        kicker: str(s.kicker),
        items: arr(s.steps).map((it) => cardFrom(it)),
      }) as Block;

    case "timeline":
      // sequence(flow:time)
      return clean({
        ...base,
        type: "sequence",
        flow: "time",
        title: str(s.title),
        kicker: str(s.kicker),
        items: arr(s.items).map((it) => seqFrom(it)),
      }) as Block;

    case "pipeline":
      // sequence(flow:arrow)
      return clean({
        ...base,
        type: "sequence",
        flow: "arrow",
        title: str(s.title),
        items: arr(s.items).map((it) => seqFrom(it)),
      }) as Block;

    case "features":
      // cards(layout:grid)
      return clean({
        ...base,
        type: "cards",
        layout: "grid",
        title: str(s.title),
        items: arr(s.items).map((it) => cardFrom(it)),
      }) as Block;

    case "quadrant":
      return clean({
        ...base,
        type: "quadrant",
        xLabel: str(s.xLabel) ?? "",
        yLabel: str(s.yLabel) ?? "",
        quadrantLabels: quadrantLabelsFrom(s.quadrantLabels),
        points: arr(s.points).map((p) => {
          const pt = obj(p);
          return clean({
            label: str(pt.label) ?? "",
            x: typeof pt.x === "number" ? pt.x : 0,
            y: typeof pt.y === "number" ? pt.y : 0,
            focal: typeof pt.focal === "boolean" ? pt.focal : undefined,
          });
        }),
      }) as Block;

    case "media-split": {
      const text = obj(s.text);
      const media = obj(s.media);
      const mKind =
        media.kind === "image" || media.kind === "quote" || media.kind === "chart"
          ? (media.kind as "image" | "quote" | "chart")
          : "image";
      const q = obj(media.quote);
      return clean({
        ...base,
        type: "media",
        text: clean({
          kicker: str(text.kicker),
          title: str(text.title) ?? "",
          body: str(text.body),
        }),
        media: clean({
          kind: mKind,
          src: str(media.src),
          quote:
            media.quote !== undefined
              ? clean({ text: str(q.text) ?? "", attribution: str(q.attribution) })
              : undefined,
        }),
        side: s.side === "right" ? "right" : "left",
      }) as Block;
    }

    case "closing":
      return clean({
        ...base,
        type: "closing",
        kicker: str(s.kicker),
        display: str(s.display) ?? "",
        sub: str(s.sub),
        cta: ctaFrom(s.cta),
      }) as Block;

    case "prose":
    default:
      // prose · 也是未知 kind 的兜底降级
      return clean({
        ...base,
        type: "prose",
        body: proseBodyFrom(s),
      }) as Block;
  }
}

/** 未知/prose slide 的 body:优先 body,退回 title,再退回空串 */
function proseBodyFrom(s: Record<string, unknown>): string {
  const body = str(s.body);
  if (body !== undefined) return body;
  const title = str(s.title);
  return title ?? "";
}

function cardFrom(it: unknown): CardItem {
  const c = obj(it);
  return clean({
    num: str(c.num),
    head: str(c.head) ?? "",
    body: str(c.body) ?? "",
    icon: str(c.icon),
    when: str(c.when),
    metric: str(c.metric),
    metricLabel: str(c.metricLabel),
  }) as CardItem;
}

function seqFrom(it: unknown): { when?: string; label: string; hint?: string } {
  const s = obj(it);
  // v31 timeline 用 when,pipeline 用 num 作序号 → 归一到 when
  return clean({
    when: str(s.when) ?? str(s.num),
    label: str(s.label) ?? "",
    hint: str(s.hint),
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
  return clean({ primary: btn(c.primary), secondary: btn(c.secondary) });
}

// ─────────────────────────────────────────────────────────────
// doc blocks → blocks(不加 pageBreak)
// ─────────────────────────────────────────────────────────────

/**
 * 旧 data-block 每条 bar 的 tone(语义染色)在 v32 Mark 里没有对应字段。
 * 落成 hint 文案 —— 信息保留在内容层,不依赖渲染器支持染色,也不静默消失。
 */
const TONE_HINT: Record<string, string> = {
  positive: "on track",
  warn: "at risk",
  bad: "missed",
};

function docBlockToBlock(block: unknown, index: number): Block {
  const b = obj(block);
  const id = makeId("b", index);
  const base = { id };
  const kind = b.kind;

  switch (kind) {
    case "prose":
      return clean({ ...base, type: "prose", body: str(b.body) ?? "" }) as Block;

    case "heading": {
      const lvl = typeof b.level === "number" ? Math.min(4, Math.max(1, Math.round(b.level))) : 1;
      return clean({ ...base, type: "heading", level: lvl, text: str(b.text) ?? "" }) as Block;
    }

    case "quote":
      return clean({
        ...base,
        type: "quote",
        text: str(b.text) ?? "",
        attribution: str(b.attribution),
      }) as Block;

    case "callout":
      return clean({
        ...base,
        type: "callout",
        tone:
          b.tone === "info" || b.tone === "ok" || b.tone === "warn" || b.tone === "danger"
            ? b.tone
            : "info",
        title: str(b.title),
        body: str(b.body) ?? "",
      }) as Block;

    case "list": {
      // 降级:items 拼成 markdown 列表 → prose.body
      const ordered = b.ordered === true;
      const items = arr(b.items).map((x) => str(x) ?? "");
      const body = items
        .map((line, i) => (ordered ? `${i + 1}. ${line}` : `- ${line}`))
        .join("\n");
      return clean({ ...base, type: "prose", body }) as Block;
    }

    case "data-block": {
      // metrics:bars → items(label/value(display 优先))
      //
      // ⚠ 旧实现是 `title: str(b.title) ?? str(b.headline)` —— title 存在时
      // **headline 被静默丢**,note / 每条 bar 的 tone 也从没读过。实测存量 doc
      // showcase 因此丢了 21 段真文案(headline 是导语、note 是"这些条是进度不是原值"
      // 这类读图必需的说明)。metrics 块只有 title+items 放不下这些,所以:
      //   headline/note → 同级 prose 块,和 metrics 一起装进 group(stack)
      //   bar.tone      → Mark.hint(positive/warn/bad 是语义染色,不能凭空消失)
      const metrics = clean({
        id: `${id}-m`,
        type: "metrics",
        title: str(b.title),
        items: arr(b.bars).map((bar) => {
          const x = obj(bar);
          const display = str(x.display);
          const value =
            display ?? (typeof x.value === "number" ? String(x.value) : str(x.value) ?? "");
          const tone = str(x.tone);
          return clean({
            value,
            label: str(x.label) ?? "",
            hint: tone ? TONE_HINT[tone] ?? tone : undefined,
          });
        }),
      }) as Block;

      const headline = str(b.headline);
      const note = str(b.note);
      if (!headline && !note) return { ...metrics, id } as Block;

      const children: Block[] = [];
      if (headline) children.push(clean({ id: `${id}-h`, type: "prose", body: headline }) as Block);
      children.push(metrics);
      if (note) children.push(clean({ id: `${id}-n`, type: "prose", body: note }) as Block);
      return clean({ ...base, type: "group", layout: "stack", children }) as Block;
    }

    case "table":
      return clean({
        ...base,
        type: "table",
        headers: arr(b.headers).map((h) => str(h) ?? ""),
        rows: arr(b.rows).map((r) => arr(r).map((c) => str(c) ?? "")),
      }) as Block;

    default:
      // 未知 doc block 兜底 → prose
      return clean({ ...base, type: "prose", body: str(b.body) ?? "" }) as Block;
  }
}

// ─────────────────────────────────────────────────────────────
// sheet rows[].panels[] → group{layout:"row", children:[panels]}
// ─────────────────────────────────────────────────────────────

function sheetPanelToBlock(panel: unknown, rowIndex: number, panelIndex: number): Block {
  const p = obj(panel);
  const id = makeId(`p${rowIndex}_`, panelIndex);
  const base = { id };
  const kind = p.kind;

  switch (kind) {
    case "kpi":
      // metrics(单 item);kpi.delta 是字符串,v32 Mark.delta 是枚举 → 丢进 hint 保留可读值
      return clean({
        ...base,
        type: "metrics",
        title: str(p.title),
        items: [
          clean({
            value: str(p.value) ?? "",
            label: str(p.title) ?? "",
            hint: str(p.hint) ?? str(p.delta),
          }),
        ],
      }) as Block;

    case "chart":
      return clean({
        ...base,
        type: "chart",
        variant: chartVariantFrom(p.variant),
        title: str(p.title),
        caption: str(p.caption),
        x: arr(p.x).map((v) => (typeof v === "number" ? v : str(v) ?? "")),
        series: arr(p.series).map((se) => {
          const x = obj(se);
          return {
            name: str(x.name) ?? "",
            data: arr(x.data).map((n) => (typeof n === "number" ? n : Number(n) || 0)),
          };
        }),
      }) as Block;

    case "table":
      return clean({
        ...base,
        type: "table",
        title: str(p.title),
        headers: arr(p.columns).map((c) => str(c) ?? ""),
        rows: arr(p.rows).map((r) => arr(r).map((c) => str(c) ?? "")),
      }) as Block;

    case "insight":
    default:
      // insight → prose(tone 保留);也是未知 panel 兜底
      return clean({
        ...base,
        type: "prose",
        body: str(p.body) ?? "",
        tone: p.tone === "info" || p.tone === "ok" || p.tone === "warn" || p.tone === "danger"
          ? p.tone
          : undefined,
      }) as Block;
  }
}

function chartVariantFrom(
  v: unknown,
): "line" | "bar" | "area" | "bar-stack" | "pie" | "scatter" {
  const allowed = ["line", "bar", "area", "bar-stack", "pie", "scatter"];
  return allowed.includes(v as string)
    ? (v as "line" | "bar" | "area" | "bar-stack" | "pie" | "scatter")
    : "bar";
}

function sheetRowToGroup(row: unknown, rowIndex: number): Block {
  const r = obj(row);
  const panels = arr(r.panels);
  const group = {
    id: makeId("r", rowIndex),
    type: "group" as const,
    title: str(r.title),
    layout: "row" as const,
    children: panels.map((p, pi) => sheetPanelToBlock(p, rowIndex, pi)),
  };
  return clean(group) as unknown as Block;
}

// ─────────────────────────────────────────────────────────────
// 入口
// ─────────────────────────────────────────────────────────────

export function fromV31(kind: "deck" | "doc" | "sheet", v31content: unknown): Document {
  if (!v31content || typeof v31content !== "object") {
    // 结构性错误:允许抛
    throw new Error(`fromV31: v31content must be an object, got ${typeof v31content}`);
  }
  const root = v31content as Record<string, unknown>;
  const meta = toMeta(kind, obj(root.meta));

  let blocks: Block[];
  if (kind === "deck") {
    blocks = arr(root.slides).map((s, i) => deckSlideToBlock(s, i));
  } else if (kind === "doc") {
    blocks = arr(root.blocks).map((b, i) => docBlockToBlock(b, i));
  } else {
    blocks = arr(root.rows).map((r, i) => sheetRowToGroup(r, i));
  }

  return { meta, blocks };
}
