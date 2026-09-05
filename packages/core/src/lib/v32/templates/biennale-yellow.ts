/**
 * V32 S3 · Biennale Yellow 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/biennale-yellow.ts(旧 896 行,三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 biennale 的视觉 DNA(paper/ink/sun token + t-* 排版 + 各 block 样式)
 *      搬过来,并把 biennale 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色;
 *   2) blocks:只覆盖 biennale 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/...)走兜底 renderer,
 *      靠下面 themeCss 里对 .v32-* 的重绘(hairline / Instrument Serif / 无圆角)拿到 biennale 观感。
 *
 * DNA(照搬旧模板注释):暖羊皮纸底 + 单一深 indigo ink + 太阳黄 + Instrument Serif italic 大字
 * + Archivo uppercase 宽字距 + 零阴影零圆角零 border-card + 1px hairline + sun-bloom 气氛。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S3 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "biennale-yellow",
  name: "Biennale Yellow",
  tagline:
    "美术馆 biennale 海报 · Instrument Serif italic + sun-glow + 1px hairline · 禁圆角阴影",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Exhibition decks · arts-institution announcements · design conference brochures · curatorial pitches · studio retrospectives",
};

// V32 S3 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Instrument Serif:ital@0;1",
  "Archivo:wght@400;500;600;700;800",
  "JetBrains Mono:wght@400;500",
]);

// V32 S3 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 biennale 底色;再把关键 .v32-* 类重绘成 biennale 观感。
const themeCss = `
:root {
  /* ── biennale 原 token(照搬旧模板 :root)── */
  --paper: #E9E5DB;
  --paper-deep: #DCD6C4;
  --sun: #F1EE2E;
  --sun-soft: #F8F39B;
  --haze: #F0DA7C;
  --ink: #1B2566;
  --ember: #E26B4A;

  --font-display: 'Instrument Serif', Georgia, serif;
  --font-ui: 'Archivo', 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;

  /* ── 把 biennale 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 biennale 底色 ──
     WCAG AA:ink(#1B2566) on paper(#E9E5DB) 对比≈10:1;mute 用 ink 混 paper 仍 ≥4.5:1 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-deep);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 78%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 62%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: color-mix(in oklab, var(--sun) 30%, var(--paper) 70%);
  --plain-success: var(--ink);
  --plain-warn: var(--ember);
  --plain-danger: var(--ember);
  --plain-danger-bg: color-mix(in oklab, var(--ember) 14%, var(--paper) 86%);

  --stage-bg: #1a1a1a;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* biennale 铁律:零圆角 */
  --v32-gap: 0px;    /* biennale 用 hairline 而非 gap 分隔 */
}

/* ── biennale 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, min(14.6vw, 22vh), 240px); line-height: 0.86; letter-spacing: -0.018em; color: var(--ink); }
.t-display-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(80px, min(10vw, 16vh), 200px); line-height: 0.86; letter-spacing: -0.018em; color: var(--ink); }
.t-display-it { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: clamp(56px, min(7vw, 11vh), 120px); line-height: 1.04; letter-spacing: -0.005em; color: var(--ink); }
.t-numeral-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(6vw, 10vh), 120px); line-height: 0.92; letter-spacing: -0.01em; color: var(--ink); }
.t-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, min(4.6vw, 7vh), 88px); line-height: 1.06; letter-spacing: -0.005em; color: var(--ink); }
.t-headline-sm { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, min(3.2vw, 5vh), 48px); line-height: 1.05; color: var(--ink); }
.t-body-lede { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.05vw, 18px); line-height: 1.55; color: var(--ink); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 0.92vw, 16px); line-height: 1.6; color: var(--ink); }
.t-label { font-family: var(--font-ui); font-weight: 600; font-size: clamp(11px, 0.78vw, 14px); line-height: 1; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink); }
.t-label-tight { font-family: var(--font-ui); font-weight: 600; font-size: clamp(10px, 0.7vw, 13px); line-height: 1; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.t-label-wide { font-family: var(--font-ui); font-weight: 600; font-size: clamp(11px, 0.78vw, 14px); line-height: 1; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink); }
.t-meta-mono { font-family: var(--font-mono); font-weight: 500; font-size: clamp(11px, 0.78vw, 13px); line-height: 1; letter-spacing: 0.06em; color: var(--ink); }

/* biennale 分隔件 */
.by-hairline { height: 1px; background: var(--ink); border: none; }
.by-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
.by-kicker-rail .bar { width: 2px; height: 18px; background: var(--ink); flex: none; }

/* sun-bloom 气氛层(present 舞台绝对定位)· 照搬旧模板 */
.by-bloom { position: absolute; pointer-events: none; border-radius: 50%; z-index: 0;
  background: radial-gradient(closest-side, var(--sun) 0%, color-mix(in oklab, var(--sun) 50%, transparent) 40%, transparent 70%); opacity: 0.7; }
.by-bloom-tr { width: 46vw; height: 46vw; right: -12vw; top: -12vw; }
.by-bloom-bl { width: 40vw; height: 40vw; left: -14vw; bottom: -14vw; }
.by-ember { background: radial-gradient(closest-side, color-mix(in oklab, var(--ember) 60%, transparent) 0%, transparent 70%); opacity: 0.22; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.by-cover { position: relative; }
.by-cover__display { margin: 0; }
.by-cover__display .by-tail { display: block; margin-top: 0.14em; }
.by-cover__lead { margin: 36px 0 0; max-width: 720px; }
.by-cover__byline { display: flex; gap: 28px; margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--ink); }

.by-statement { position: relative; }
.by-statement__num { margin: 0 0 24px; }
.by-statement__text { margin: 0; max-width: 20ch; }
.by-statement__anno { margin-top: 40px; }

.by-metrics__title { margin: 0 0 40px; }
.by-metrics__grid { display: grid; gap: 0; border-bottom: 1px solid var(--ink); }
.by-metric { display: flex; flex-direction: column; gap: 14px; padding: 40px 32px; border-top: 1px solid var(--ink); }
.by-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.2em; }
.by-metric__delta { font-family: var(--font-ui); font-size: 0.28em; }
.by-metric[data-delta="up"] .by-metric__delta { color: var(--ink); }
.by-metric[data-delta="down"] .by-metric__delta { color: var(--ember); }
.by-metric__hint { opacity: 0.7; }

.by-cards__title { margin: 0 0 40px; max-width: 1400px; }
.by-cards__list { border-bottom: 1px solid var(--ink); }
/* numbered / steps → 横排大条目;grid → 网格 */
.by-card-row { display: grid; grid-template-columns: 80px 1fr 200px; gap: 28px; padding: 28px 0; border-top: 1px solid var(--ink); align-items: baseline; }
.by-card-row__num { line-height: 0.9; }
.by-card-row__head { margin: 0 0 12px; }
.by-card-row__body { margin: 0; max-width: 720px; }
.by-card-row__metric { text-align: right; }
.by-card-row__metric-v { margin: 0; }
.by-card-row__metric-l { margin-top: 8px; opacity: 0.7; }
.by-cards__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0; border-bottom: 1px solid var(--ink); }
.by-card { display: flex; flex-direction: column; gap: 12px; padding: 24px; border-top: 1px solid var(--ink); }
.by-card__num { opacity: 0.6; }
.by-card__head { margin: 0; }
.by-card__body { margin: 0; opacity: 0.78; }

.by-closing { background: var(--ink); color: var(--paper); position: relative; }
.by-closing__display { color: var(--paper); margin: 0; }
.by-closing__sub { color: color-mix(in oklab, var(--paper) 80%, transparent); margin-top: 32px; max-width: 800px; }
.by-closing .by-kicker-rail .bar { background: var(--sun); }
.by-closing .t-label { color: var(--paper); }
.by-closing__cta { display: flex; gap: 24px; margin-top: 56px; }
.by-cta { padding: 18px 32px; text-decoration: none; font-family: var(--font-ui); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; font-size: 13px; display: inline-block; }
.by-cta[data-kind="primary"] { background: var(--sun); color: var(--ink); }
.by-cta[data-kind="secondary"] { border: 1px solid var(--paper); color: var(--paper); }

/* ── 兜底块的 biennale 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 biennale 的 serif + hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title { font-family: var(--font-display); font-weight: 400; }
.v32-prose-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-ui); letter-spacing: 0.22em; }

/* present 舞台:paper 底 + 大内边距(旧 slide-inner 是 76px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 76px 76px 88px; }
[data-v32-mode="present"] .by-cover__display { font-size: clamp(120px, 14vw, 240px); }
[data-v32-mode="present"] .by-closing__display { font-size: clamp(80px, 10vw, 200px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S3 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderStats / renderDiagnosis|features|proposal /
// renderHeroQuestion / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="by-kicker-rail"><div class="bar"></div><div class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const tail = b.displayTail
    ? `<em class="t-display-it by-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-lede by-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="by-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label-tight" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block by-cover" data-block-id="${b.id}">
  <div class="by-bloom by-bloom-tr"></div>
  <div class="by-bloom by-ember by-bloom-bl"></div>
  ${kicker}
  <h1 class="t-display by-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display-md by-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-label-wide by-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block by-statement" data-block-id="${b.id}">
  <div class="by-bloom by-bloom-bl"></div>
  ${big}
  <p class="t-display-it by-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · Instrument Serif 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline by-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="by-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body by-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="by-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-numeral-md by-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label-tight" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block by-metrics" data-block-id="${b.id}">
  <div class="by-bloom by-ember by-bloom-tr" style="width:22vw;height:22vw;right:6vw;top:8vh;"></div>
  ${title}
  <div class="by-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="by-kicker-rail"><div class="bar"></div><div class="t-label">${ctx.esc(b.kicker)}</div></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-headline by-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-meta-mono by-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="by-card">
      ${num}
      <div class="t-headline-sm by-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body by-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 4);
    return `<section class="v32-block by-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="by-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-numeral-md by-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-tight by-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label-tight" style="opacity:0.7;">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="by-card-row">
      <div class="t-numeral-md by-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-headline-sm by-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body by-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="by-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block by-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="by-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(ink 底 · sun CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="by-kicker-rail"><div class="bar"></div><div class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-lede by-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="by-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="by-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block by-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-display-md by-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S3 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const biennaleYellowV32: TemplateV32 = {
  meta,
  fonts,
  themeCss,
  blocks: {
    cover,
    statement,
    metrics,
    cards,
    closing,
  },
};

export default biennaleYellowV32;
export { biennaleYellowV32, meta, fonts, themeCss };
