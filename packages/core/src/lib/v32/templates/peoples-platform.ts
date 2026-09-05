/**
 * V32 S5 · People's Platform 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/peoples-platform.ts(旧 855 行 · 三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 people's-platform 视觉 DNA(blue/orange/red token + t-* 排版
 *      + grain 气氛层 + 菱形 bullet)搬过来,并把品牌色映射到 --plain-* token,让
 *      "没覆盖的兜底块"(prose/heading/quote/callout/table/compare/quadrant/chart/
 *      media/sequence/group)自动吃到暖纸底 + ink 硬边 + 无圆角观感;
 *   2) blocks:只覆盖有强视觉主张的 5 块 cover/statement/metrics/cards/closing
 *      (旧 renderCover / renderHeroQuestion / renderStats / renderDiagnosis|Proposal|
 *       Features / renderClosing 的视觉在这)。
 *
 * DNA(照搬旧模板):Cobalt blue #2C2CDC + 暖橙 #F2A03A + 热红 #E83A2A(红只做 shadow)
 * + paper #F5F2EA 暖底 + grain overlay · Alfa Slab One UPPERCASE + 重叠红 text-shadow
 * 假凹版印刷 + 6px ink 实线边 + 菱形 bullet(rotate 45deg)· 蓝底套 cream inset frame。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:搬旧 META
const meta = {
  slug: "peoples-platform",
  name: "People's Platform",
  tagline:
    "WPA 海报 / 政治竞选 · Alfa Slab UPPERCASE + 重叠红 shadow + 蓝橙红三色 · 屏印 grain · 6px 黑边",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Manifestos · campaigns · protest decks · union newsletters · loud populist announcements · poster-style declarations",
};

// V32 S5 · fonts:搬旧 fontLinks
const fonts = fontLinks([
  "Alfa Slab One",
  "Caveat Brush",
  "Archivo Narrow:wght@400;500;600;700",
  "DM Mono:wght@300;400;500",
  "Noto Serif SC:wght@400;500;700;900",
  "Noto Sans SC:wght@400;500;700;900",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬 + 把品牌色 override 到 --plain-*
// 让兜底块吃到底色;再重绘关键兜底 .v32-* 类拿回 people's-platform 观感。
const themeCss = `
:root {
  /* ── 品牌原 token(照搬旧 :root)── */
  --blue: #2C2CDC;
  --blue-deep: #1B1BB0;
  --orange: #F2A03A;
  --orange-deep: #E89321;
  --red: #E83A2A;
  --red-deep: #B7281C;
  --cream: #F4E9D6;
  --paper: #F5F2EA;
  --ink: #0E0E14;

  --font-display: 'Alfa Slab One', 'Noto Serif SC', serif;
  --font-script: 'Caveat Brush', cursive;
  --font-body: 'Archivo Narrow', 'Noto Sans SC', sans-serif;
  --font-mono: 'DM Mono', 'Noto Sans SC', monospace;

  --shadow-sm: 3px 3px 0 var(--red);
  --shadow-md: 6px 6px 0 var(--red);
  --shadow-lg: 10px 10px 0 var(--red), 20px 20px 0 var(--red-deep);
  --shadow-jumbo: 12px 12px 0 var(--red), 24px 24px 0 var(--red-deep);

  /* ── 把品牌色映射到 --plain-* token,兜底块自动获得 people's-platform 底色 ──
     WCAG AA:ink(#0E0E14) on paper(#F5F2EA) 对比≈17:1;mute/faint 用 ink 混 paper 仍 ≥4.5:1;
     accent=blue(#2C2CDC) on paper 对比≈8:1;强调背景蓝底配 cream 文本(见下重绘) */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--cream);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 66%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--blue);
  --plain-accent-strong: var(--blue-deep);
  --plain-accent-bg: color-mix(in oklab, var(--orange) 26%, var(--paper) 74%);
  --plain-success: var(--blue);
  --plain-warn: var(--orange-deep);
  --plain-danger: var(--red);
  --plain-danger-bg: color-mix(in oklab, var(--red) 14%, var(--paper) 86%);

  --stage-bg: var(--paper);
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-body);
  --v32-radius: 0px; /* people's-platform 铁律:钝角矩形/无圆角 */
  --v32-gap: 30px;   /* 硬朗系但保留 KPI/卡片间距,靠 6px ink 边分隔 */
}

/* ── 品牌排版工具类(照搬旧 t-* · 由 block renderer 直接用)── */
.pp-jumbo { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, 22vw, 320px); line-height: 0.82; letter-spacing: -0.02em; text-transform: uppercase; color: var(--orange); text-shadow: var(--shadow-jumbo); margin: 0; }
.pp-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, 11vw, 200px); line-height: 0.86; letter-spacing: 0.005em; text-transform: uppercase; color: var(--ink); text-shadow: var(--shadow-lg); margin: 0; }
.pp-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, 6vw, 100px); line-height: 0.9; letter-spacing: 0.005em; text-transform: uppercase; color: var(--ink); text-shadow: var(--shadow-md); margin: 0; }
.pp-lg { font-family: var(--font-display); font-weight: 400; font-size: clamp(44px, 7vw, 110px); line-height: 0.88; letter-spacing: 0.005em; text-transform: uppercase; color: var(--ink); text-shadow: var(--shadow-md); margin: 0; }
.pp-section-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(32px, 3.4vw, 54px); line-height: 1; text-transform: uppercase; color: var(--orange); text-shadow: var(--shadow-sm); margin: 0; }
.pp-kpi { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, 5.2vw, 88px); line-height: 0.9; text-transform: uppercase; color: var(--orange); text-shadow: var(--shadow-md); margin: 0; }
.pp-item-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(24px, 2.4vw, 38px); line-height: 1; text-transform: uppercase; color: var(--ink); margin: 0; }
.pp-card-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(30px, 3vw, 54px); line-height: 1; text-transform: uppercase; color: var(--ink); margin: 0; }
.pp-body-lg { font-family: var(--font-body); font-weight: 500; font-size: clamp(16px, 1.4vw, 30px); line-height: 1.4; color: var(--ink); }
.pp-body-md { font-family: var(--font-body); font-weight: 500; font-size: clamp(15px, 1.2vw, 28px); line-height: 1.35; color: var(--ink); }
.pp-body-sm { font-family: var(--font-body); font-weight: 500; font-size: clamp(14px, 1.05vw, 26px); line-height: 1.4; color: var(--ink); }
.pp-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(12px, 0.95vw, 24px); line-height: 1; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }
.pp-label-wide { font-family: var(--font-mono); font-weight: 400; font-size: clamp(12px, 0.95vw, 24px); line-height: 1; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink); }
.pp-kicker { font-family: var(--font-mono); font-weight: 400; font-size: clamp(13px, 1.05vw, 26px); line-height: 1; letter-spacing: 0.22em; text-transform: uppercase; color: var(--red); margin-bottom: 28px; }
.pp-script { font-family: var(--font-script); font-size: clamp(40px, 4.6vw, 64px); line-height: 1; color: var(--red); transform: rotate(-3deg); display: inline-block; }

/* ── grain overlay(signature 气氛层 · present 舞台 + report 页都吃)── */
[data-v32-mode] .v32-block { position: relative; }
.pp-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(rgba(0,0,0,.06) 1px, transparent 1px), radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
  background-size: 3px 3px, 5px 5px; background-position: 0 0, 1px 2px; mix-blend-mode: multiply; opacity: 0.5; }

/* ── 菱形 bullet 列表(compare 兜底列表 + prose ul 复用)── */
.v32-compare-bullets, .v32-prose-body ul { list-style: none; padding: 0; margin: 0.6em 0; display: flex; flex-direction: column; gap: 14px; }
.v32-compare-bullets li, .v32-prose-body ul li { position: relative; padding-left: 40px; font-family: var(--font-body); font-weight: 500; line-height: 1.35; color: var(--ink); }
.v32-compare-bullets li::before, .v32-prose-body ul li::before { content: ""; position: absolute; left: 0; top: 0.4em; width: 18px; height: 18px; background: var(--red); border-radius: 3px; transform: rotate(45deg); }

/* ── 覆盖块自定义 class(由下面 block renderer 产出)── */
.pp-cover { background: var(--blue); color: var(--cream); }
.pp-cover .pp-cover__frame { position: absolute; inset: 32px; border: 6px solid var(--cream); pointer-events: none; z-index: 1; }
.pp-cover__inner { position: relative; z-index: 2; }
.pp-cover__kicker { color: var(--cream); margin-bottom: 40px; }
.pp-cover__display { color: var(--orange); }
.pp-cover__tail { display: block; margin-top: 0.1em; }
.pp-cover__lead { color: var(--cream); margin: 40px 0 0; max-width: 42ch; }
.pp-cover__byline { display: flex; gap: 32px; margin-top: 40px; flex-wrap: wrap; color: var(--cream); }

.pp-statement__num { color: var(--orange); text-shadow: var(--shadow-lg); margin: 0 0 24px; }
.pp-statement__text { max-width: 20ch; margin: 0; }
.pp-statement__anno { margin-top: 40px; }

.pp-metrics__title { margin: 0 0 40px; }
.pp-metrics__grid { display: grid; gap: 30px; position: relative; z-index: 2; }
.pp-metric { border: 5px solid var(--ink); padding: 28px 30px; background: var(--paper); display: flex; flex-direction: column; gap: 12px; }
.pp-metric[data-delta="up"] { box-shadow: var(--shadow-md); }
.pp-metric[data-delta="down"] .pp-metric__delta { color: var(--red); }
.pp-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.pp-metric__delta { font-family: var(--font-body); font-size: 0.34em; color: var(--blue); }
.pp-metric__hint { opacity: 0.72; }

.pp-cards__title { margin: 0 0 40px; }
.pp-cards__list { border-top: 6px solid var(--ink); position: relative; z-index: 2; }
.pp-card-row { display: grid; grid-template-columns: 100px 1fr 240px; gap: 30px; padding: 32px 0; border-bottom: 3px solid var(--ink); align-items: baseline; }
.pp-card-row__head { margin: 0 0 14px; }
.pp-card-row__body { opacity: 0.85; }
.pp-card-row__metric { text-align: right; }
.pp-card-row__metric-l { margin-top: 10px; opacity: 0.7; }
.pp-cards__grid { display: grid; gap: 30px; position: relative; z-index: 2; }
.pp-card { border: 5px solid var(--ink); padding: 28px 30px; background: var(--paper); display: flex; flex-direction: column; gap: 18px; }
.pp-card__rule { height: 4px; width: 60px; background: var(--ink); }
.pp-card__body { opacity: 0.85; }

.pp-closing { background: var(--blue); color: var(--cream); }
.pp-closing .pp-cover__frame { position: absolute; inset: 32px; border: 6px solid var(--cream); pointer-events: none; z-index: 1; }
.pp-closing__inner { position: relative; z-index: 2; }
.pp-closing__kicker { color: var(--cream); margin-bottom: 40px; }
.pp-closing__display { color: var(--orange); margin: 0; max-width: 18ch; }
.pp-closing__sub { color: var(--cream); margin-top: 40px; max-width: 50ch; }
.pp-closing__cta { display: flex; gap: 28px; margin-top: 48px; flex-wrap: wrap; }
.pp-cta { font-family: var(--font-display); font-weight: 400; font-size: clamp(20px, 2vw, 40px); letter-spacing: 0.02em; text-transform: uppercase; padding: 22px 44px; border: 6px solid var(--ink); text-decoration: none; box-shadow: var(--shadow-md); display: inline-block; }
.pp-cta[data-kind="primary"] { background: var(--orange); color: var(--ink); }
.pp-cta[data-kind="secondary"] { background: var(--cream); color: var(--ink); }

/* ── 兜底块的 people's-platform 重绘:把素模板圆角卡片拉回 Alfa Slab + ink 硬边 + 无圆角 ── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; text-transform: uppercase; letter-spacing: 0.005em; }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-metric-hint { font-family: var(--font-body); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); text-transform: uppercase; font-style: normal; text-shadow: var(--shadow-sm); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-media-img, .v32-media-quote { border-radius: 0; }
.v32-callout, .v32-card, .v32-compare-col { border: 5px solid var(--ink); box-shadow: var(--shadow-sm); background: var(--paper); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.22em; color: var(--red); }

/* present 舞台:大内边距(旧 slide 内 padding 90-130px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 96px 90px; }
[data-v32-mode="present"] .pp-cover, [data-v32-mode="present"] .pp-closing { display: flex; flex-direction: column; justify-content: center; height: 100%; }
[data-v32-mode="present"] .pp-cover__display { font-size: clamp(120px, 13vw, 240px); }
[data-v32-mode="present"] .pp-closing__display { font-size: clamp(96px, 11vw, 200px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|Proposal|Features / renderClosing;字段名对齐 v32 schema。
// renderer 只出 block DOM,不写 slide/pagenum/舞台包裹(那是 render-report 的活)。
// ────────────────────────────────────────────────────────────

const GRAIN = `<div class="pp-grain" aria-hidden="true"></div>`;

// cover ← 旧 renderCover(蓝底 + cream inset frame + 橙色大标题)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="pp-label-wide pp-cover__kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="pp-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="pp-body-lg pp-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="pp-cover__byline">${b.byline
        .map((x, j) => `<div class="pp-label-wide" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block pp-cover" data-block-id="${b.id}">
  ${GRAIN}
  <div class="pp-cover__frame" aria-hidden="true"></div>
  <div class="pp-cover__inner">
    ${kicker}
    <h1 class="pp-title pp-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
    ${lead}
    ${byline}
  </div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(jumbo 大数字 + 论点 + 手写注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="pp-jumbo pp-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="pp-statement__anno"><span class="pp-script" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block pp-statement" data-block-id="${b.id}">
  ${GRAIN}
  ${big}
  <p class="pp-md pp-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(KPI 卡 · 6px ink 边 · 橙色 Alfa Slab 数值)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="pp-md pp-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="pp-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="pp-body-sm pp-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="pp-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="pp-kpi pp-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="pp-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block pp-metrics" data-block-id="${b.id}">
  ${GRAIN}
  ${title}
  <div class="pp-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="pp-kicker" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="pp-lg pp-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(b.items.length || 1, 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="pp-card">
      <div class="pp-section-num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="pp-card__rule" aria-hidden="true"></div>
      <div class="pp-item-title" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="pp-body-sm pp-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block pp-cards" data-block-id="${b.id}" data-layout="grid">
  ${GRAIN}
  ${kicker}${title}
  <div class="pp-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="pp-kpi pp-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="pp-label pp-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="pp-label" style="opacity:0.7;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>— ${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="pp-card-row">
      <div class="pp-section-num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="pp-item-title pp-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="pp-body-md pp-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="pp-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block pp-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${GRAIN}
  ${kicker}${title}
  <div class="pp-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(蓝底 + cream inset + 橙 CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="pp-label-wide pp-closing__kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>— ${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="pp-body-lg pp-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="pp-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="pp-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block pp-closing" data-block-id="${b.id}">
  ${GRAIN}
  <div class="pp-cover__frame" aria-hidden="true"></div>
  <div class="pp-closing__inner">
    ${kicker}
    <h2 class="pp-title pp-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
    ${sub}
    ${cta}
  </div>
</section>`;
};

// V32 S5 · 组装:只覆盖 5 个强视觉块;其余走兜底 renderer + themeCss 重绘
const peoplesPlatformV32: TemplateV32 = {
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

export default peoplesPlatformV32;
export { peoplesPlatformV32, meta, fonts, themeCss };
