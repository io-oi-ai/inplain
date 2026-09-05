/**
 * V32 S5 · Editorial Tri-Tone 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/editorial-tri-tone.ts(旧 999 行,三入口 20+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 tri-tone 的视觉 DNA(pink/butter/burgundy token + t-* 排版 +
 *      pill/card 细节)搬过来,并把三色映射到 --plain-* token 让"没覆盖的兜底块"
 *      自动吃到 butter 底 / burgundy 字 / pink accent 的观感;
 *   2) blocks:只覆盖 tri-tone 有强视觉主张的块(cover/statement/metrics/cards/quote/closing)。
 *      其余(prose/heading/callout/table/compare/sequence/quadrant/chart/media/group)走兜底
 *      renderer + 下面 themeCss 对 .v32-* 的重绘(Bricolage 主 face / 28px 圆角 / burgundy hairline)。
 *
 * DNA(照搬旧模板注释):
 *   - 三色绝对约束 · blush pink + golden butter + deep burgundy
 *   - Bricolage Grotesque 主 face(500/600/700/800)· negative tracking 在 display
 *   - Instrument Serif italic 只接 chapter num / 引号 / signature / em 切换
 *   - JetBrains Mono 包揽所有 label · § NN — Title section marker
 *   - 零 box-shadow · 深度靠 surface contrast + 28-32px 大圆角 · 999px pill
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "editorial-tri-tone",
  name: "Editorial Tri-Tone",
  tagline:
    "独立文艺杂志 · 三色 blush + butter + burgundy · Bricolage Grotesque + Instrument Serif italic · § NN section marker",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Independent magazine issues · arts pamphlets · literary criticism · curated collections · colophon-style closing",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Bricolage Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800",
  "Instrument Serif:ital@0;1",
  "JetBrains Mono:wght@400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 tri-tone 观感;再把关键 .v32-* 类重绘。
const themeCss = `
:root {
  /* ── tri-tone 原 token(照搬旧模板 :root)── */
  --pink: #F2B6C6;
  --butter: #F2D86A;
  --burgundy: #7A1F35;
  --on-dark: rgba(246,237,220,0.92);
  --rule-dark: rgba(246,237,220,0.25);
  --rule-light: rgba(122,31,53,0.22);

  --font-sans: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── 把三色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 tri-tone 观感 ──
     WCAG AA:burgundy(#7A1F35) on butter(#F2D86A) 对比≈6.4:1;on pink(#F2B6C6)≈5.7:1 均达标 */
  --plain-bg: var(--butter);
  --plain-surface: var(--butter);
  --plain-surface-2: var(--pink);
  --plain-text: var(--burgundy);
  --plain-text-mute: color-mix(in oklab, var(--burgundy) 82%, var(--butter));
  --plain-text-faint: color-mix(in oklab, var(--burgundy) 66%, var(--butter));
  --plain-border: var(--rule-light);
  --plain-border-strong: var(--burgundy);
  --plain-accent: var(--burgundy);
  --plain-accent-strong: var(--burgundy);
  --plain-accent-bg: var(--pink);
  --plain-success: var(--burgundy);
  --plain-warn: var(--burgundy);
  --plain-danger: var(--burgundy);
  --plain-danger-bg: var(--pink);

  --stage-bg: #1f0b13;
  --slide-bg: var(--butter);
  --doc-page-bg: var(--butter);
  --doc-text: var(--burgundy);

  --font-body: var(--font-sans);
  --v32-radius: 28px; /* tri-tone 柔和系:保留大圆角 */
  --v32-gap: 24px;
}

/* ── tri-tone 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-wordmark { font-family: var(--font-sans); font-weight: 800; font-size: clamp(64px, min(12vw, 22vh), 300px); line-height: 0.82; letter-spacing: -0.04em; margin: 0; color: var(--burgundy); }
.t-closer { font-family: var(--font-sans); font-weight: 700; font-size: clamp(64px, min(13vw, 24vh), 320px); line-height: 0.82; letter-spacing: -0.05em; margin: 0; }
.t-stat { font-family: var(--font-sans); font-weight: 700; font-size: clamp(72px, min(16vw, 34vh), 540px); line-height: 0.8; letter-spacing: -0.06em; margin: 0; }
.t-display-lg { font-family: var(--font-sans); font-weight: 700; font-size: clamp(36px, min(4vw, 7vh), 76px); line-height: 0.95; letter-spacing: -0.02em; margin: 0; color: var(--burgundy); }
.t-quote-heading { font-family: var(--font-sans); font-weight: 600; font-size: clamp(28px, min(3vw, 5.4vh), 56px); line-height: 1.0; letter-spacing: -0.02em; margin: 0; }
.t-lede { font-family: var(--font-sans); font-weight: 500; font-size: clamp(20px, min(2.9vw, 5.4vh), 56px); line-height: 1.05; letter-spacing: -0.02em; margin: 0; }
.t-card-title { font-family: var(--font-sans); font-weight: 600; font-size: clamp(20px, 2.1vw, 40px); line-height: 1.0; letter-spacing: -0.02em; margin: 0; }
.t-chapter-num { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: clamp(40px, min(6vw, 12vh), 240px); line-height: 0.9; }
.t-quote-mark { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: clamp(80px, min(9.5vw, 17vh), 200px); line-height: 0.6; }
.t-signature { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: clamp(24px, 3.2vw, 64px); line-height: 1.0; margin: 0; }
.t-subhead-serif { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: clamp(22px, 2.5vw, 48px); line-height: 1.1; margin: 0; }
.t-body { font-family: var(--font-sans); font-weight: 400; font-size: clamp(14px, 1.35vw, 26px); line-height: 1.4; }
.t-body-sm { font-family: var(--font-sans); font-weight: 400; font-size: clamp(13px, 1.25vw, 24px); line-height: 1.45; }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(12px, 1.1vw, 22px); letter-spacing: 0.15em; text-transform: uppercase; }
.t-label-tight { font-family: var(--font-mono); font-weight: 400; font-size: clamp(12px, 1.1vw, 22px); letter-spacing: 0.10em; text-transform: uppercase; }

/* em rule · 任意 t- heading 内 em 切 Instrument Serif italic(照搬旧 DNA) */
.t-wordmark em, .t-closer em, .t-display-lg em, .t-lede em, .t-quote-heading em, .t-card-title em {
  font-family: var(--font-serif); font-weight: 400; font-style: italic; letter-spacing: 0; color: inherit;
}

/* § section marker · 顶部惯例 */
.et-marker { font-family: var(--font-mono); font-size: clamp(12px, 1.1vw, 22px); letter-spacing: 0.15em; text-transform: uppercase; color: var(--burgundy); margin-bottom: 28px; }

/* pills · 999px */
.et-pill { display: inline-flex; align-items: center; padding: 12px 30px; border-radius: 999px; font-family: var(--font-sans); font-weight: 500; font-size: clamp(14px, 1.6vw, 30px); line-height: 1.0; text-decoration: none; }
.et-pill[data-tone="butter"] { background: var(--butter); color: var(--burgundy); }
.et-pill[data-tone="pink"] { background: var(--pink); color: var(--burgundy); }
.et-pill[data-tone="burgundy"] { background: var(--burgundy); color: var(--pink); }

/* value card 轮换配色 · 28px radius · 零阴影 */
.et-card { border-radius: 28px; padding: 30px 30px 32px; display: flex; flex-direction: column; gap: 14px; }
.et-card[data-tone="dark"] { background: var(--burgundy); color: var(--butter); }
.et-card[data-tone="light"] { background: var(--butter); color: var(--burgundy); border: 1px solid var(--rule-light); }
.et-card[data-tone="pink"] { background: var(--pink); color: var(--burgundy); }

/* ── 覆盖块自定义样式 ────────────────────────────────────── */
.et-cover { background: var(--burgundy); color: var(--butter); border-radius: 28px; padding: 64px; display: flex; flex-direction: column; }
.et-cover .t-wordmark { color: var(--butter); max-width: 20ch; }
.et-cover__lead { color: var(--pink); margin: 48px 0 0; max-width: 40ch; }
.et-cover__pills { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 48px; }

.et-statement { background: var(--burgundy); color: var(--butter); border-radius: 28px; padding: 64px; }
.et-statement__num { color: var(--butter); margin-bottom: 40px; }
.et-statement__text { color: var(--butter); max-width: 22ch; }
.et-statement__anno { color: var(--pink); margin-top: 36px; }

.et-metrics__title { color: var(--burgundy); margin: 0 0 32px; }
.et-metrics__grid { display: grid; gap: 24px; }
.et-metric { border-radius: 28px; padding: 30px; display: flex; flex-direction: column; justify-content: space-between; min-height: 200px; }
.et-metric__value { font-family: var(--font-sans); font-weight: 700; font-size: clamp(48px, 7vw, 130px); line-height: 0.9; letter-spacing: -0.04em; display: flex; align-items: baseline; gap: 0.12em; }
.et-metric__delta { font-family: var(--font-serif); font-style: italic; font-size: 0.34em; letter-spacing: 0; }
.et-metric__label { margin-top: 16px; }
.et-metric__hint { margin-top: 14px; opacity: 0.85; }

.et-cards__title { color: var(--burgundy); margin: 0 0 32px; max-width: 24ch; }
.et-cards__grid { display: grid; gap: 24px; }
/* numbered / steps → 横排大条目;grid → 网格卡 */
.et-row { display: grid; grid-template-columns: 100px 1fr 220px; gap: 32px; padding: 28px 0; border-top: 1px solid var(--rule-light); align-items: baseline; }
.et-cards__list { border-bottom: 1px solid var(--rule-light); }
.et-row__num { color: var(--burgundy); }
.et-row__head { margin: 0 0 12px; }
.et-row__body { max-width: 60ch; }
.et-row__metric { text-align: right; }
.et-row__metric-v { font-family: var(--font-sans); font-weight: 700; font-size: clamp(28px, 4vw, 64px); line-height: 1; letter-spacing: -0.03em; }
.et-row__metric-l { margin-top: 8px; }

.et-quote { background: var(--burgundy); color: var(--butter); border-radius: 28px; padding: 64px; }
.et-quote__mark { color: var(--pink); margin-bottom: -32px; }
.et-quote__text { color: var(--butter); max-width: 24ch; }
.et-quote__cite { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--rule-dark); display: flex; align-items: center; gap: 18px; }
.et-quote__avatar { width: 64px; height: 64px; border-radius: 999px; background: var(--pink); color: var(--burgundy); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-style: italic; font-size: 28px; flex: none; }
.et-quote__attr { color: var(--pink); }

.et-closing { background: var(--burgundy); color: var(--butter); border-radius: 28px; padding: 64px; display: flex; flex-direction: column; }
.et-closing .t-closer { color: var(--butter); max-width: 18ch; }
.et-closing__sub { color: var(--pink); margin: 48px 0 0; max-width: 40ch; }
.et-closing__cta { display: flex; gap: 18px; margin-top: 48px; flex-wrap: wrap; }
.et-closing__sig { color: var(--pink); margin-top: 48px; }

/* ── 兜底块的 tri-tone 重绘(prose/heading/callout/table/compare/sequence 等走兜底,
     从"素模板"拉回 tri-tone 的 Bricolage + 28px 圆角 + serif 引号 + burgundy hairline)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-media-title { font-family: var(--font-sans); font-weight: 700; letter-spacing: -0.02em; color: var(--burgundy); }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-media-body { font-family: var(--font-sans); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); font-style: italic; }
.v32-kicker, .v32-cover-kicker, .v32-card-num, .v32-card-when, .v32-seq-when, .v32-metric-label, .v32-quote-attr { font-family: var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; }
.v32-callout, .v32-card, .v32-compare-col, .v32-table-el, .v32-chart, .v32-media-quote { border-radius: 28px; box-shadow: none; }
.v32-callout[data-tone="danger"], .v32-callout[data-tone="warn"] { background: var(--pink); color: var(--burgundy); }
.v32-compare-col[data-side="left"] { background: var(--burgundy); color: var(--butter); }
.v32-compare-col[data-side="right"] { background: var(--butter); color: var(--burgundy); }

/* present 舞台:大内边距(旧 slide-inner 是 96px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 64px 64px 88px; }
[data-v32-mode="present"] .et-cover, [data-v32-mode="present"] .et-statement,
[data-v32-mode="present"] .et-quote, [data-v32-mode="present"] .et-closing { flex: 1; justify-content: center; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderPullQuote / renderClosing。
// ────────────────────────────────────────────────────────────

// V32 S5 · value card 配色轮换(照搬旧 CARD_ROTATION)
const CARD_TONES = ["dark", "light", "pink", "light"] as const;
const cardTone = (i: number) => CARD_TONES[i % CARD_TONES.length];

const marker = (label: string) => `<div class="et-marker">§ — ${label}</div>`;

// cover ← 旧 renderCover(burgundy 底 · wordmark · pill byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const tail = b.displayTail
    ? `<em style="display:block;" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-lede et-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const kickerPill = b.kicker
    ? `<span class="et-pill" data-tone="butter" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span>`
    : "";
  const bylinePills = b.byline?.length
    ? b.byline
        .map((x, j) => `<span class="et-pill" data-tone="${j % 2 === 0 ? "pink" : "butter"}" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`)
        .join("")
    : "";
  return `<section class="v32-block et-cover" data-block-id="${b.id}">
  ${marker("Cover")}
  <div style="margin-top:auto;">
    <h1 class="t-wordmark" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
    ${lead}
  </div>
  <div class="et-cover__pills">${kickerPill}${bylinePills}</div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(burgundy 底 · big stat + display-xl + serif 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat et-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-subhead-serif et-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block et-statement" data-block-id="${b.id}">
  ${marker("Question")}
  ${big}
  <p class="t-display-lg et-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(value card 轮换 · 大 stat 数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-display-lg et-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="et-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-sm et-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="et-card et-metric" data-tone="${cardTone(i)}">
      <div>
        <div class="et-metric__value">${ctx.esc(m.value)}${delta}</div>
        <div class="t-card-title et-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      </div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block et-metrics" data-block-id="${b.id}">
  ${marker(b.title ?? "Numbers")}
  ${title}
  <div class="et-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid          → value card 网格(旧 features/proposal)
//   layout=numbered/steps → 横排大条目(旧 diagnosis:num | head+body | metric)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-display-lg et-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const mk = marker(b.kicker ?? b.title ?? "Cards");

  if (b.layout === "grid") {
    const cols = b.items.length <= 3 ? b.items.length : Math.min(Math.ceil(b.items.length / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-label-tight" style="opacity:0.85;">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="et-card" data-tone="${cardTone(i)}">
      ${num}
      <div class="t-card-title" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-sm" style="opacity:0.9;" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block et-cards" data-block-id="${b.id}" data-layout="grid">
  ${mk}${title}
  <div class="et-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="et-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-tight et-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label-tight">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="et-row">
      <div class="t-chapter-num et-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-title et-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body et-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="et-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block et-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${mk}${title}
  <div class="et-cards__list">${items}</div>
</section>`;
};

// quote ← 旧 renderPullQuote(burgundy 底 · serif 引号 · avatar + signature)
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const cite = b.attribution
    ? `<div class="et-quote__cite">
      <div class="et-quote__avatar" aria-hidden="true">${ctx.esc((b.attribution[0] ?? "Q").toUpperCase())}</div>
      <div class="t-signature et-quote__attr" ${ctx.edit(`${p}/attribution`, "署名")}>${ctx.esc(b.attribution)}</div>
    </div>`
    : "";
  return `<figure class="v32-block et-quote" data-block-id="${b.id}">
  ${marker("Quote")}
  <div class="t-quote-mark et-quote__mark" aria-hidden="true">&ldquo;</div>
  <blockquote class="t-display-lg et-quote__text" ${ctx.edit(`${p}/text`, "引语")}>${ctx.esc(b.text)}</blockquote>
  ${cite}
</figure>`;
};

// closing ← 旧 renderClosing(burgundy 底 · t-closer · pill CTA · serif signature)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const sub = b.sub
    ? `<p class="t-lede et-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="et-pill" data-tone="${kind === "primary" ? "butter" : "pink"}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="et-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  const sig = b.kicker
    ? `<div class="t-signature et-closing__sig" ${ctx.edit(`${p}/kicker`, "落款")}>— ${ctx.esc(b.kicker)}</div>`
    : "";
  return `<section class="v32-block et-closing" data-block-id="${b.id}">
  ${marker("Colophon")}
  <div style="margin-top:auto;">
    <h2 class="t-closer" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
    ${sub}
  </div>
  ${cta}
  ${sig}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const editorialTriToneV32: TemplateV32 = {
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

export default editorialTriToneV32;
export { editorialTriToneV32, meta, fonts, themeCss };
