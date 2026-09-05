/**
 * V32 S2 · 16 块兜底渲染器
 *
 * 每种 block 一个 `(block, ctx) => string` 函数,产出语义 class(.v32-*)+
 * CSS 变量 token 的 DOM 片段。模板没覆盖某 block 时 renderReport 回退到这里。
 *
 * 铁律(项目 WEB-RULES):
 *   - 禁硬编码颜色/字号 —— 只用 token(var(--plain-*) / 自定义 --v32-*)
 *   - WCAG AA:文本用 --plain-text / 弱化用 --plain-text-mute,均对 surface 达标
 *   - 每个可编辑文本元素打 editAttrs(`/blocks/<id>/<field>`, label)
 *
 * present / report 差异全在 CSS 层(present.ts 的 CSS),这里只出一份 block DOM。
 */
import type { Block, BlockType, GroupBlock, Mark, CardItem } from "../content/schema";
import type { BlockRenderer, RenderCtx } from "../templates/types";
import { renderMiniChart } from "./util";

// V32 S2 · block 根元素统一属性:语义 class + span/emphasis 数据钩子(CSS 用)
function blockAttrs(b: Block, semantic: string): string {
  const span = b.span ? ` data-span="${b.span}"` : "";
  const emph = b.emphasis ? ` data-emphasis="${b.emphasis}"` : "";
  return `class="v32-block ${semantic}"${span}${emph} data-block-id="${b.id}"`;
}

// V32 S2 · delta 箭头(趋势)· 纯 token 上色
function deltaMark(delta: Mark["delta"], esc: RenderCtx["esc"]): string {
  if (!delta) return "";
  const glyph = delta === "up" ? "▲" : delta === "down" ? "▼" : "→";
  return `<span class="v32-delta" data-delta="${esc(delta)}" aria-hidden="true">${glyph}</span>`;
}

// ── cover ────────────────────────────────────────────────────
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="v32-cover-kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="v32-cover-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="v32-cover-lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="v32-cover-byline">${b.byline.map((x) => `<span>${ctx.esc(x)}</span>`).join("")}</div>`
    : "";
  return `<section ${blockAttrs(b, "v32-cover")}>
  ${kicker}
  <h1 class="v32-cover-display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)} ${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// ── statement ────────────────────────────────────────────────
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="v32-statement-num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="v32-statement-anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section ${blockAttrs(b, "v32-statement")}>
  ${big}
  <p class="v32-statement-text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// ── prose ────────────────────────────────────────────────────
const prose: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "prose" }>;
  const tone = b.tone ? ` data-tone="${ctx.esc(b.tone)}"` : "";
  // markdown 主体:contenteditable 会破坏 md 结构,故只可点选(text:false)
  return `<section ${blockAttrs(b, "v32-prose")}${tone}>
  <div class="v32-prose-body" ${ctx.edit(`${ctx.pathPrefix}/body`, "正文", { text: false })}>${ctx.md(b.body)}</div>
</section>`;
};

// ── heading ──────────────────────────────────────────────────
const heading: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "heading" }>;
  const tag = `h${b.level}`;
  return `<section ${blockAttrs(b, "v32-heading")} data-level="${b.level}">
  <${tag} class="v32-heading-text" ${ctx.edit(`${ctx.pathPrefix}/text`, "小标题")}>${ctx.esc(b.text)}</${tag}>
</section>`;
};

// ── quote ────────────────────────────────────────────────────
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const attr = b.attribution
    ? `<figcaption class="v32-quote-attr" ${ctx.edit(`${p}/attribution`, "出处")}>— ${ctx.esc(b.attribution)}</figcaption>`
    : "";
  return `<figure ${blockAttrs(b, "v32-quote")}>
  <blockquote class="v32-quote-text" ${ctx.edit(`${p}/text`, "引语")}>${ctx.esc(b.text)}</blockquote>
  ${attr}
</figure>`;
};

// ── callout ──────────────────────────────────────────────────
const callout: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "callout" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<div class="v32-callout-title" ${ctx.edit(`${p}/title`, "提示标题")}>${ctx.esc(b.title)}</div>`
    : "";
  return `<aside ${blockAttrs(b, "v32-callout")} data-tone="${ctx.esc(b.tone)}" role="note">
  ${title}
  <div class="v32-callout-body" ${ctx.edit(`${p}/body`, "提示正文", { text: false })}>${ctx.md(b.body)}</div>
</aside>`;
};

// ── metrics ──────────────────────────────────────────────────
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h3 class="v32-metrics-title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const items = b.items
    .map((m: Mark, i: number) => {
      const hint = m.hint ? `<div class="v32-metric-hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="v32-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="v32-metric-value">${ctx.esc(m.value)}${deltaMark(m.delta, ctx.esc)}</div>
      <div class="v32-metric-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section ${blockAttrs(b, "v32-metrics")}>
  ${title}
  <div class="v32-metrics-grid">${items}</div>
</section>`;
};

// ── cards ────────────────────────────────────────────────────
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ? `<div class="v32-kicker">${ctx.esc(b.kicker)}</div>` : "";
  const title = b.title
    ? `<h3 class="v32-cards-title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = c.num ? `<div class="v32-card-num" aria-hidden="true">${ctx.esc(c.num)}</div>` : "";
      const icon = c.icon ? `<div class="v32-card-icon" aria-hidden="true">${ctx.esc(c.icon)}</div>` : "";
      const when = c.when ? `<div class="v32-card-when">${ctx.esc(c.when)}</div>` : "";
      const metric = c.metric
        ? `<div class="v32-card-metric"><span class="v32-card-metric-v">${ctx.esc(c.metric)}</span>${c.metricLabel ? `<span class="v32-card-metric-l">${ctx.esc(c.metricLabel)}</span>` : ""}</div>`
        : "";
      return `<article class="v32-card">
      ${num}${icon}
      <h4 class="v32-card-head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</h4>
      <p class="v32-card-body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</p>
      ${when}${metric}
    </article>`;
    })
    .join("");
  return `<section ${blockAttrs(b, "v32-cards")} data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="v32-cards-grid">${items}</div>
</section>`;
};

// ── sequence ─────────────────────────────────────────────────
const sequence: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "sequence" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ? `<div class="v32-kicker">${ctx.esc(b.kicker)}</div>` : "";
  const title = b.title
    ? `<h3 class="v32-seq-title" ${ctx.edit(`${p}/title`, "序列标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const items = b.items
    .map((s, i: number) => {
      const when = s.when ? `<div class="v32-seq-when">${ctx.esc(s.when)}</div>` : "";
      const hint = s.hint ? `<div class="v32-seq-hint">${ctx.esc(s.hint)}</div>` : "";
      return `<li class="v32-seq-item">
      <div class="v32-seq-dot" aria-hidden="true"></div>
      ${when}
      <div class="v32-seq-label" ${ctx.edit(`${p}/items/${i}/label`, "序列节点")}>${ctx.esc(s.label)}</div>
      ${hint}
    </li>`;
    })
    .join("");
  return `<section ${blockAttrs(b, "v32-sequence")} data-flow="${ctx.esc(b.flow)}">
  ${kicker}${title}
  <ol class="v32-seq-list">${items}</ol>
</section>`;
};

// ── compare ──────────────────────────────────────────────────
const compare: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "compare" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h3 class="v32-compare-title" ${ctx.edit(`${p}/title`, "对比标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const col = (side: "left" | "right") => {
    const c = b[side];
    const bullets = c.bullets.map((x) => `<li>${ctx.esc(x)}</li>`).join("");
    return `<div class="v32-compare-col" data-side="${side}">
      <div class="v32-compare-label" ${ctx.edit(`${p}/${side}/label`, "对比列标题")}>${ctx.esc(c.label)}</div>
      <ul class="v32-compare-bullets">${bullets}</ul>
    </div>`;
  };
  return `<section ${blockAttrs(b, "v32-compare")}>
  ${title}
  <div class="v32-compare-cols">${col("left")}${col("right")}</div>
</section>`;
};

// ── quadrant ─────────────────────────────────────────────────
const quadrant: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quadrant" }>;
  // x/y 归一到 0..100 (假设输入 0..100 或任意范围 → clamp)
  const pts = b.points
    .map((pt) => {
      const px = Math.max(0, Math.min(100, pt.x));
      const py = Math.max(0, Math.min(100, pt.y));
      const focal = pt.focal ? " data-focal=\"true\"" : "";
      return `<div class="v32-quad-point"${focal} style="left:${px}%;bottom:${py}%;">
      <span class="v32-quad-dot" aria-hidden="true"></span>
      <span class="v32-quad-plabel">${ctx.esc(pt.label)}</span>
    </div>`;
    })
    .join("");
  const [q1, q2, q3, q4] = b.quadrantLabels;
  return `<section ${blockAttrs(b, "v32-quadrant")}>
  <div class="v32-quad-plot">
    <div class="v32-quad-axis-x" aria-hidden="true"></div>
    <div class="v32-quad-axis-y" aria-hidden="true"></div>
    <div class="v32-quad-q" data-q="tl">${ctx.esc(q1)}</div>
    <div class="v32-quad-q" data-q="tr">${ctx.esc(q2)}</div>
    <div class="v32-quad-q" data-q="bl">${ctx.esc(q3)}</div>
    <div class="v32-quad-q" data-q="br">${ctx.esc(q4)}</div>
    ${pts}
    <div class="v32-quad-xlabel">${ctx.esc(b.xLabel)}</div>
    <div class="v32-quad-ylabel">${ctx.esc(b.yLabel)}</div>
  </div>
</section>`;
};

// ── table ────────────────────────────────────────────────────
const table: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "table" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h3 class="v32-table-title" ${ctx.edit(`${p}/title`, "表格标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const head = `<thead><tr>${b.headers.map((h) => `<th>${ctx.esc(h)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${b.rows
    .map((r) => `<tr>${r.map((cell) => `<td>${ctx.esc(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<section ${blockAttrs(b, "v32-table")}>
  ${title}
  <div class="v32-table-scroll"><table class="v32-table-el">${head}${body}</table></div>
</section>`;
};

// ── chart(复用 util.renderMiniChart · token 上色)───────────────
const chart: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "chart" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h3 class="v32-chart-title" ${ctx.edit(`${p}/title`, "图表标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const caption = b.caption
    ? `<div class="v32-chart-caption">${ctx.esc(b.caption)}</div>`
    : "";
  // 颜色走 currentColor / token · 图元素外层用 color:var(--plain-accent) 供 SVG 取
  const svg = renderMiniChart({
    variant: b.variant,
    x: b.x,
    series: b.series,
    width: 640,
    height: 360,
    stroke: "currentColor",
    fill: "currentColor",
    axis: "currentColor",
    text: "currentColor",
  });
  return `<section ${blockAttrs(b, "v32-chart")}>
  ${title}
  <div class="v32-chart-svg" role="img" aria-label="${ctx.esc(b.title ?? "chart")}">${svg}</div>
  ${caption}
</section>`;
};

// ── media(文/媒体分栏)────────────────────────────────────────
const media: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "media" }>;
  const p = ctx.pathPrefix;
  const kicker = b.text.kicker ? `<div class="v32-kicker">${ctx.esc(b.text.kicker)}</div>` : "";
  const body = b.text.body
    ? `<p class="v32-media-body" ${ctx.edit(`${p}/text/body`, "媒体正文")}>${ctx.esc(b.text.body)}</p>`
    : "";
  let mediaEl = "";
  if (b.media.kind === "image" && b.media.src) {
    mediaEl = `<img class="v32-media-img" src="${ctx.esc(b.media.src)}" alt="${ctx.esc(b.text.title)}" loading="lazy" />`;
  } else if (b.media.kind === "quote" && b.media.quote) {
    mediaEl = `<figure class="v32-media-quote"><blockquote>${ctx.esc(b.media.quote.text)}</blockquote>${b.media.quote.attribution ? `<figcaption>— ${ctx.esc(b.media.quote.attribution)}</figcaption>` : ""}</figure>`;
  } else {
    mediaEl = `<div class="v32-media-ph" aria-hidden="true"></div>`;
  }
  return `<section ${blockAttrs(b, "v32-media")} data-side="${ctx.esc(b.side)}">
  <div class="v32-media-text">
    ${kicker}
    <h3 class="v32-media-title" ${ctx.edit(`${p}/text/title`, "媒体标题")}>${ctx.esc(b.text.title)}</h3>
    ${body}
  </div>
  <div class="v32-media-figure">${mediaEl}</div>
</section>`;
};

// ── closing ──────────────────────────────────────────────────
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="v32-cover-kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="v32-closing-sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="v32-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}</a>`;
  };
  const cta = b.cta ? `<div class="v32-closing-cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section ${blockAttrs(b, "v32-closing")}>
  ${kicker}
  <h2 class="v32-closing-display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// ── group(递归容器)──────────────────────────────────────────
const group: BlockRenderer = (block, ctx) => {
  const b = block as GroupBlock;
  const title = b.title
    ? `<h3 class="v32-group-title" ${ctx.edit(`${ctx.pathPrefix}/title`, "组标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  // 递归:children 由 renderReport 注入的 renderChild 挑模板覆盖或兜底
  const children = b.children.map((child) => ctx.renderChild(child)).join("\n");
  return `<section ${blockAttrs(b, "v32-group")} data-layout="${ctx.esc(b.layout)}">
  ${title}
  <div class="v32-group-inner" data-layout="${ctx.esc(b.layout)}">${children}</div>
</section>`;
};

/** V32 S2 · 16 块兜底 renderer 表(renderReport 缺模板覆盖时回退到此) */
export const FALLBACK_RENDERERS: Record<BlockType, BlockRenderer> = {
  cover,
  statement,
  prose,
  heading,
  quote,
  callout,
  metrics,
  cards,
  sequence,
  compare,
  quadrant,
  table,
  chart,
  media,
  closing,
  group,
};
