/**
 * V32 S5 · Vellum 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/vellum.ts(旧 978 行,三入口 14+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 vellum 视觉 DNA(navy/yellow/teal token + t-* 排版 + hairline)
 *      搬过来,并把 vellum 色映射到 --plain-* token,让"没覆盖的兜底块"自动吃到 navy 底;
 *   2) blocks:只覆盖 vellum 有强视觉主张的块(cover/statement/metrics/cards/quote/closing)。
 *      其余(prose/heading/callout/table/compare/quadrant/chart/media/sequence/group)走兜底
 *      renderer,靠下面 themeCss 对 .v32-* 的重绘(italic Cormorant + hairline + teal accent)拿到 vellum 观感。
 *
 * DNA(照搬旧模板注释):单一深 periwinkle navy 底 + 暖 chartreuse-yellow italic Cormorant 大字
 * + DM Sans body + Courier mono pin-note + dusty teal 第二配 + 0 阴影 0 圆角 + 1px yellow hairline
 * + 中心对齐 sparse。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:搬旧 META
const meta = {
  slug: "vellum",
  name: "Vellum",
  tagline:
    "羊皮纸 essay-on-wall · 深 periwinkle navy + warm chartreuse italic Cormorant + dusty teal pin-note · 0 阴影 0 圆角",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Scholarly synthesis · white papers · academic briefs · longform editorial · founder reflections · advisory deliverables · any deck wanting calm, considered atmosphere",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Cormorant Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500",
  "DM Sans:wght@400;500",
  "Courier Prime:wght@400;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// navy 底 + yellow 文字 + teal accent;再把关键 .v32-* 类重绘成 vellum 观感(italic serif / hairline)。
const themeCss = `
:root {
  /* ── vellum 原 token(照搬旧模板 :root)── */
  --navy: #2A3870;
  --navy-alt: #343F80;
  --navy-deep: #1F2858;
  --navy-mid: #34407A;
  --yellow: #E8D85C;
  --yellow-2: rgba(232, 216, 92, 0.62);
  --yellow-3: rgba(232, 216, 92, 0.32);
  --emphasis-yellow: #F5E168;
  --teal: #3A7878;
  --border: rgba(232, 216, 92, 0.20);

  --font-display: 'Cormorant Garamond', 'Noto Serif SC', Georgia, serif;
  --font-ui: 'DM Sans', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'Courier Prime', 'Courier New', monospace;

  /* ── 把 vellum 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 vellum 底色 ──
     WCAG AA:yellow(#E8D85C) on navy(#2A3870) 对比≈7:1;yellow-2 仍 ≥4.5:1;
     text-faint 用 yellow-3 仅作装饰不承载正文语义。 */
  --plain-bg: var(--navy);
  --plain-surface: var(--navy);
  --plain-surface-2: var(--navy-deep);
  --plain-text: var(--yellow);
  --plain-text-mute: var(--yellow-2);
  --plain-text-faint: var(--yellow-3);
  --plain-border: var(--border);
  --plain-border-strong: var(--yellow-3);
  --plain-accent: var(--teal);
  --plain-accent-strong: var(--emphasis-yellow);
  --plain-accent-bg: var(--navy-deep);
  --plain-success: var(--teal);
  --plain-warn: var(--emphasis-yellow);
  --plain-danger: #E26B4A;
  --plain-danger-bg: var(--navy-deep);

  --stage-bg: #1a1a1a;
  --slide-bg: var(--navy);
  --doc-page-bg: var(--navy);
  --doc-text: var(--yellow);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* vellum 铁律:零圆角 */
  --v32-gap: 24px;   /* sparse 留白系 · 用 gap + hairline 分隔 */
}

/* ── vellum 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(120px, 11vw, 220px); line-height: 0.92; letter-spacing: -0.01em; color: var(--yellow); }
.t-h1 { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(80px, 7vw, 140px); line-height: 0.95; letter-spacing: -0.01em; color: var(--yellow); }
.t-h2 { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(48px, 4vw, 80px); line-height: 1.05; color: var(--yellow); }
.t-h3 { font-family: var(--font-display); font-style: italic; font-weight: 500; font-size: clamp(30px, 2.4vw, 48px); line-height: 1.15; color: var(--yellow); }
.t-quote-text { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(40px, 3.2vw, 64px); line-height: 1.25; color: var(--yellow); }
.t-quote-mark { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(96px, 7vw, 140px); line-height: 0.6; color: var(--teal); }
.t-stat-value { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(72px, 5.5vw, 112px); line-height: 1; letter-spacing: -0.02em; color: var(--yellow); }
.t-lead { font-family: var(--font-ui); font-weight: 400; font-size: clamp(18px, 1.5vw, 28px); line-height: 1.6; color: var(--yellow-2); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(14px, 1.05vw, 20px); line-height: 1.65; color: var(--yellow-2); }
.t-caption { font-family: var(--font-ui); font-weight: 400; font-size: clamp(11px, 0.85vw, 15px); line-height: 1.5; color: var(--yellow-3); }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(11px, 0.72vw, 14px); letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal); }
.t-pin { font-family: var(--font-mono); font-weight: 500; font-size: clamp(14px, 1.15vw, 22px); line-height: 1.5; letter-spacing: 0.01em; color: var(--teal); }

/* vellum 分隔件(照搬旧模板) */
.ve-hairline { height: 1px; background: var(--border); border: none; }
.ve-kicker-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.ve-kicker-row .stub-rule { width: 28px; height: 1px; background: var(--teal); flex: none; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.ve-cover__display { margin: 0; max-width: 20ch; }
.ve-cover__tail { display: block; margin-top: 0.05em; }
.ve-cover__lead { margin: 40px 0 0; max-width: 60ch; }
.ve-cover__byline { display: flex; gap: 28px; margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--border); }

.ve-statement__num { margin: 0 0 24px; }
.ve-statement__text { margin: 0; max-width: 22ch; }
.ve-statement__anno { margin-top: 40px; }

.ve-metrics__title { margin: 0 0 48px; max-width: 24ch; }
.ve-metrics__grid { display: grid; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.ve-metric { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 28px; text-align: center; }
.ve-metric + .ve-metric { border-left: 1px solid var(--border); }
.ve-metric__value { margin: 0; }
.ve-metric__delta { font-family: var(--font-ui); font-size: 0.26em; margin-left: 0.15em; color: var(--teal); }
.ve-metric[data-delta="down"] .ve-metric__delta { color: #E26B4A; }
.ve-metric__label { color: var(--yellow-2); }
.ve-metric__hint { max-width: 18ch; }

.ve-cards__title { margin: 0 0 40px; max-width: 24ch; }
/* numbered / steps → 竖排大条目;grid → 网格 */
.ve-cards__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 32px; }
.ve-card-row { display: flex; gap: 24px; align-items: baseline; text-align: left; }
.ve-card-row__num { flex: none; }
.ve-card-row__head { margin: 0 0 8px; }
.ve-card-row__body { margin: 0; }
.ve-card-row__meta { flex: none; margin-left: auto; text-align: right; min-width: 12ch; }
.ve-cards__grid { display: grid; gap: 0; border-top: 1px solid var(--border); }
.ve-card { display: flex; flex-direction: column; gap: 12px; padding: 28px; text-align: left; border-bottom: 1px solid var(--border); }
.ve-card__head { margin: 0; }
.ve-card__body { margin: 0; }

.ve-quote { text-align: center; }
.ve-quote__mark { margin-bottom: 2vh; }
.ve-quote__text { margin: 0 auto; max-width: 32ch; }
.ve-quote__attr { margin-top: 40px; }

.ve-closing__display { margin: 0; max-width: 20ch; }
.ve-closing__sub { margin-top: 40px; max-width: 56ch; }
.ve-closing__cta { display: flex; gap: 40px; margin-top: 56px; align-items: center; }
.ve-cta { text-decoration: none; }
.ve-cta[data-kind="primary"] { border-bottom: 1px solid var(--teal); padding-bottom: 6px; color: var(--yellow); }
.ve-cta[data-kind="secondary"] { color: var(--yellow-2); }

/* ── 兜底块的 vellum 重绘(prose/heading/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 vellum 的 italic serif + hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-style: italic; font-weight: 400;
}
.v32-prose-body { font-family: var(--font-ui); color: var(--yellow); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; color: var(--yellow); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-media-img, .v32-media-ph {
  border-radius: 0; box-shadow: none;
}
.v32-kicker, .v32-cover-kicker {
  font-family: var(--font-mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal);
}
.v32-seq-dot, .v32-quad-dot { border-radius: 50%; }

/* present 舞台:navy 底 + 大内边距 · 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 6vh 6vw 9vh; text-align: center; }
[data-v32-mode="present"] .ve-cover__display { font-size: clamp(120px, 11vw, 220px); }
[data-v32-mode="present"] .ve-closing__display { font-size: clamp(80px, 7vw, 140px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderPullQuote / renderClosing。
// 字段名从旧 slide.xxx 改成 v32 block.xxx(steps→items · question→text)。
// ────────────────────────────────────────────────────────────

// 公共:teal 双 stub kicker 行(照搬旧 kicker())
const kickerRow = (ctx: Parameters<BlockRenderer>[1], text: string | undefined, path: string, label: string) =>
  text
    ? `<div class="ve-kicker-row"><div class="stub-rule"></div><div class="t-label" ${ctx.edit(path, label)}>${ctx.esc(text)}</div><div class="stub-rule"></div></div>`
    : "";

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const tail = b.displayTail
    ? `<em class="ve-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead ve-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ve-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ve-cover" data-block-id="${b.id}">
  ${kickerRow(ctx, b.kicker, `${p}/kicker`, "封面眉标")}
  <h1 class="t-display ve-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat-value ve-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-label ve-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ve-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-h1 ve-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · italic serif 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 ve-metrics__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ve-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-caption ve-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="ve-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat-value ve-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div class="t-label ve-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block ve-metrics" data-block-id="${b.id}">
  ${title}
  <div class="ve-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 竖排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kick = kickerRow(ctx, b.kicker, `${p}/kicker`, "眉标");
  const title = b.title
    ? `<h2 class="t-h2 ve-cards__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="ve-card">
      <h3 class="t-h3 ve-card__head" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</h3>
      <p class="t-body ve-card__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</p>
    </article>`;
      })
      .join("");
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    return `<section class="v32-block ve-cards" data-block-id="${b.id}" data-layout="grid">
  ${kick}${title}
  <div class="ve-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式竖排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = `<div class="t-stat-value ve-card-row__num" style="font-size: clamp(40px, 3vw, 60px);">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
      const meta = c.metric
        ? `<div class="ve-card-row__meta"><div class="t-stat-value" style="font-size: clamp(36px, 2.8vw, 56px);" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label" style="margin-top: 6px; color: var(--yellow-3);">${ctx.esc(c.metricLabel)}</div>` : ""}</div>`
        : c.when
          ? `<div class="ve-card-row__meta"><div class="t-label" style="color: var(--yellow-3); white-space: nowrap;">${ctx.esc(c.when)}</div></div>`
          : "";
      return `<li class="ve-card-row">
      ${num}
      <div style="flex: 1;">
        <div class="t-h3 ve-card-row__head" style="font-size: clamp(22px, 1.9vw, 34px);" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body ve-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      ${meta}
    </li>`;
    })
    .join("");
  return `<section class="v32-block ve-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kick}${title}
  <ol class="ve-cards__list">${items}</ol>
</section>`;
};

// quote ← 旧 renderPullQuote(teal 引号 + italic serif 大字 · 中心对齐)
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const attr = b.attribution
    ? `<figcaption class="t-label ve-quote__attr" ${ctx.edit(`${p}/attribution`, "出处")}>— ${ctx.esc(b.attribution)}</figcaption>`
    : "";
  return `<figure class="v32-block ve-quote" data-block-id="${b.id}">
  <div class="t-quote-mark ve-quote__mark" aria-hidden="true">&ldquo;</div>
  <blockquote class="t-quote-text ve-quote__text" ${ctx.edit(`${p}/text`, "引言")}>${ctx.esc(b.text)}</blockquote>
  ${attr}
</figure>`;
};

// closing ← 旧 renderClosing(italic serif 大标题 + teal underline CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const sub = b.sub
    ? `<p class="t-lead ve-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    const cls = kind === "primary" ? "t-pin" : "t-label";
    return `<a class="ve-cta ${cls}" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ve-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ve-closing" data-block-id="${b.id}">
  ${kickerRow(ctx, b.kicker, `${p}/kicker`, "结尾眉标")}
  <h2 class="t-h1 ve-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const vellumV32: TemplateV32 = {
  meta,
  fonts,
  themeCss,
  blocks: {
    cover,
    statement,
    metrics,
    cards,
    quote,
    closing,
  },
};

export default vellumV32;
export { vellumV32, meta, fonts, themeCss };
