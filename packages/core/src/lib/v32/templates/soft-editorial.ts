/**
 * V32 S5 · Soft Editorial 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/soft-editorial.ts(旧 912 行,三入口 14 slide + doc + sheet renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 soft-editorial 视觉 DNA(cream paper + 5 色 pastel + 半透 card 圆角
 *      + Cormorant Garamond serif + 罗马数字 step)搬过来,并把品牌色映射到 --plain-*
 *      token 让"没覆盖的兜底块"自动吃到 cream 底 + pastel 强调;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 对 .v32-* 的重绘(serif + 圆角 pastel card + drop cap)。
 *
 * DNA(照搬旧模板注释):cream paper(#F2EEDF)永远做底 · 5 色 pastel 只做 card 填充 ·
 * 半透白 card 圆角 28px 浮在 cream 上 · Cormorant Garamond 一手包办 headline/kicker ·
 * Work Sans 退居 body · mix roman + italic · 0 shadow · 0 square corners · 罗马数字 step ordinal。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "soft-editorial",
  name: "Soft Editorial",
  tagline:
    "温暖杂志 spread · Cormorant Garamond + Work Sans · cream paper + 5 色 pastel · 半透 card 圆角 + 罗马数字 step",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Literary quarterly decks · design-research notebooks · brand books · soft-launch storytelling · annual letters",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体(含 italic 轴)
const fonts = fontLinks([
  "Cormorant Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500",
  "Work Sans:wght@400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 cream 底 + pastel;再把关键 .v32-* 类重绘成 soft-editorial 观感。
const themeCss = `
:root {
  /* ── soft-editorial 原 token(照搬旧 :root)── */
  --paper: #F2EEDF;
  --paper-2: #ECE6D2;
  --ink: #2A241B;
  --ink-soft: #5C5345;
  --c-pink: #E1A4C2;
  --c-lemon: #D6DD63;
  --c-blush: #E8C9B6;
  --c-sage: #B7C7A8;
  --c-lilac: #C9BEDC;
  --card-fill: rgba(255,255,255,0.55);
  --rule-soft: rgba(42,36,27,0.18);
  --rule-medium: rgba(42,36,27,0.35);

  --font-serif: 'Cormorant Garamond', 'Garamond', serif;
  --font-sans: 'Work Sans', system-ui, sans-serif;

  /* ── 把 soft-editorial 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 cream 底 + pastel ──
     WCAG AA:ink(#2A241B) on paper(#F2EEDF) 对比≈11:1;ink-soft(#5C5345) on paper ≈6:1(达标) */
  --plain-bg: var(--paper);
  --plain-surface: var(--card-fill);
  --plain-surface-2: var(--paper-2);
  --plain-text: var(--ink);
  --plain-text-mute: var(--ink-soft);
  --plain-text-faint: color-mix(in oklab, var(--ink) 55%, var(--paper));
  --plain-border: var(--rule-soft);
  --plain-border-strong: var(--rule-medium);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: var(--c-blush);
  --plain-success: var(--c-sage);
  --plain-warn: var(--c-lemon);
  --plain-danger: var(--c-pink);
  --plain-danger-bg: var(--c-pink);

  --stage-bg: #d8d2bf;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-sans);
  --v32-radius: 28px; /* soft-editorial 柔和系:保留大圆角 */
  --v32-gap: 28px;
}

/* ── soft-editorial 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-serif); font-weight: 500; font-size: clamp(96px, min(10vw, 17vh), 232px); line-height: 0.92; letter-spacing: -0.02em; color: var(--ink); }
.t-title { font-family: var(--font-serif); font-weight: 500; font-size: clamp(80px, min(8vw, 14vh), 188px); line-height: 0.95; letter-spacing: -0.015em; color: var(--ink); }
.t-closer { font-family: var(--font-serif); font-weight: 500; font-size: clamp(72px, min(7.2vw, 12vh), 168px); line-height: 0.95; letter-spacing: -0.015em; color: var(--ink); }
.t-numeral-hero { font-family: var(--font-serif); font-weight: 500; font-size: clamp(140px, min(15vw, 26vh), 320px); line-height: 0.9; letter-spacing: -0.02em; color: var(--ink); }
.t-numeral-lg { font-family: var(--font-serif); font-weight: 500; font-size: clamp(72px, 6.5vw, 140px); line-height: 0.9; letter-spacing: -0.02em; color: var(--ink); }
.t-section-headline { font-family: var(--font-serif); font-weight: 500; font-size: clamp(48px, min(4.8vw, 8.5vh), 96px); line-height: 0.98; letter-spacing: -0.01em; color: var(--ink); }
.t-card-headline { font-family: var(--font-serif); font-weight: 500; font-size: clamp(32px, min(3.6vw, 6.5vh), 72px); line-height: 1; letter-spacing: -0.01em; color: var(--ink); }
.t-subhead-md { font-family: var(--font-serif); font-weight: 500; font-size: clamp(28px, 2.2vw, 44px); line-height: 1.05; color: var(--ink); }
.t-subhead-sm { font-family: var(--font-serif); font-weight: 500; font-size: clamp(24px, 1.9vw, 38px); line-height: 1.05; color: var(--ink); }
.t-kicker { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: clamp(24px, 1.9vw, 38px); line-height: 1.2; color: var(--ink-soft); }
.t-marker { font-family: var(--font-serif); font-weight: 400; font-style: italic; font-size: 22px; line-height: 1.3; color: var(--ink-soft); }
.t-numeral-step { font-family: var(--font-serif); font-weight: 500; font-style: italic; font-size: clamp(56px, 4.6vw, 92px); line-height: 0.9; color: var(--ink); }
.t-numeral-card { font-family: var(--font-serif); font-weight: 500; font-style: italic; font-size: clamp(40px, 3.2vw, 64px); line-height: 1; color: var(--ink-soft); }
.t-body { font-family: var(--font-sans); font-weight: 400; font-size: clamp(16px, 1.4vw, 26px); line-height: 1.5; color: var(--ink); }
.t-body-md { font-family: var(--font-sans); font-weight: 400; font-size: clamp(15px, 1.25vw, 24px); line-height: 1.5; color: var(--ink); }
.t-opener { font-family: var(--font-serif); font-weight: 500; font-style: italic; font-size: clamp(34px, 2.9vw, 56px); line-height: 1.1; color: var(--ink); }

/* soft-editorial card 件(照搬旧 card-soft / card-color) */
.se-card-soft { background: var(--card-fill); border-radius: 28px; padding: 40px 44px; }
.se-card-color { border-radius: 28px; padding: 44px 36px; color: var(--ink); }
.se-card-pink { background: var(--c-pink); }
.se-card-lemon { background: var(--c-lemon); }
.se-card-blush { background: var(--c-blush); }
.se-card-sage { background: var(--c-sage); }
.se-card-lilac { background: var(--c-lilac); }
.se-swatch-dot { width: 56px; height: 56px; border-radius: 50%; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.se-cover { position: relative; justify-content: flex-end; }
.se-cover__swatches { display: flex; gap: 14px; margin-bottom: 40px; }
.se-cover__title { margin: 0; max-width: 1700px; }
.se-cover__lead { margin: 48px 0 0; max-width: 1100px; }
.se-cover__byline { display: flex; gap: 28px; margin-top: 40px; }

.se-statement { justify-content: center; }
.se-statement__num { margin: 0 0 32px; }
.se-statement__text { margin: 0; max-width: 1600px; }
.se-statement__anno { margin-top: 48px; }

.se-metrics__title { margin: 0 0 48px; max-width: 1400px; }
.se-metrics__grid { display: grid; gap: 28px; }
.se-metric { padding: 56px 40px; }
.se-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.2em; }
.se-metric__delta { font-family: var(--font-sans); font-size: 0.28em; }
.se-metric[data-delta="down"] .se-metric__delta { color: #b85c5c; }
.se-metric__label { margin-top: 18px; }
.se-metric__hint { margin-top: 12px; color: var(--ink-soft); }

.se-cards__title { margin: 0 0 40px; max-width: 1500px; }
.se-cards__list { display: flex; flex-direction: column; gap: 24px; }
/* numbered / steps → 横排大条目(罗马数字 | head+body | metric)· 旧 diagnosis */
.se-card-row { display: grid; grid-template-columns: 120px 1fr 220px; gap: 32px; align-items: center; padding: 40px 44px; }
.se-card-row__num { color: var(--ink); }
.se-card-row__head { margin: 0 0 12px; }
.se-card-row__body { color: var(--ink-soft); max-width: 720px; }
.se-card-row__metric { text-align: right; }
.se-card-row__metric-v { margin: 0; color: var(--ink); font-size: clamp(40px, 3.2vw, 72px); }
.se-card-row__metric-l { margin-top: 8px; }
/* grid → 网格 pastel 特性卡 · 旧 features/proposal */
.se-cards__grid { display: grid; gap: 28px; }
.se-card__num { margin: 0 0 14px; }
.se-card__head { margin: 0 0 14px; }
.se-card__body { color: var(--ink-soft); }

.se-closing { background: var(--c-pink); color: var(--ink); justify-content: center; }
.se-closing__display { color: var(--ink); margin: 0; max-width: 1500px; }
.se-closing__sub { margin-top: 48px; max-width: 1100px; }
.se-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.se-cta { padding: 14px 32px; text-decoration: none; font-family: var(--font-serif); font-size: 22px; border-radius: 999px; display: inline-block; }
.se-cta[data-kind="primary"] { background: var(--ink); color: var(--paper); }
.se-cta[data-kind="secondary"] { background: rgba(255,255,255,0.7); color: var(--ink); }

/* ── 兜底块的 soft-editorial 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板"拉回 soft-editorial 的 serif + pastel 圆角 card + 无边框硬线)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title, .v32-closing-display { font-family: var(--font-serif); font-weight: 500; letter-spacing: -0.01em; }
.v32-prose-body, .v32-body, .v32-card-body, .v32-metric-hint { font-family: var(--font-sans); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); font-style: italic; font-weight: 500; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-serif); font-style: italic; color: var(--ink-soft); letter-spacing: 0; text-transform: none; }
/* 凡兜底 container 都圆角 pastel · 0 阴影 0 直角(soft-editorial 铁律) */
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table-scroll { border-radius: 28px; box-shadow: none; }
.v32-callout { padding: 28px 32px; }
.v32-callout[data-tone="info"], .v32-callout[data-tone="note"] { background: var(--c-lilac); }
.v32-callout[data-tone="ok"], .v32-callout[data-tone="tip"] { background: var(--c-sage); }
.v32-callout[data-tone="warn"] { background: var(--c-lemon); }
.v32-callout[data-tone="danger"] { background: var(--c-pink); }
.v32-card, .v32-metric { background: var(--card-fill); }
/* prose drop cap · 照搬旧 doc-prose::first-letter */
.v32-prose-body > p:first-of-type::first-letter { font-family: var(--font-serif); font-weight: 500; float: left; font-size: clamp(80px, 6.8vw, 132px); line-height: 0.85; padding: 8px 14px 0 0; color: var(--ink); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 120px 80px 110px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 120px 80px 110px; display: flex; flex-direction: column; }
[data-v32-mode="present"] .se-metrics__grid,
[data-v32-mode="present"] .se-cards__grid { --se-cols: 3; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// V32 S5 · 罗马数字 step ordinal(照搬旧 ROMAN · CardItem.num 缺时兜底)
const ROMAN = ["i.", "ii.", "iii.", "iv.", "v.", "vi.", "vii.", "viii."];
const PASTELS = ["se-card-pink", "se-card-lemon", "se-card-blush", "se-card-sage", "se-card-lilac"];
const pastel = (i: number) => PASTELS[i % PASTELS.length];

// cover ← 旧 renderCover(cream 底 · swatch dots · 底对齐大标题)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker" style="margin-bottom:28px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? ` <em ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-opener se-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="se-cover__byline">${b.byline
        .map((x, j) => `<div class="t-marker" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block se-cover" data-block-id="${b.id}">
  <div class="se-cover__swatches" aria-hidden="true">
    <div class="se-swatch-dot se-card-pink"></div>
    <div class="se-swatch-dot se-card-lemon"></div>
    <div class="se-swatch-dot se-card-sage"></div>
  </div>
  ${kicker}
  <h1 class="t-title se-cover__title" ${ctx.edit(`${p}/display`, "封面标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(hero 大数字 + display 论点 + italic 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-numeral-hero se-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-kicker se-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>— ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block se-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-display se-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(pastel card 大数字 · serif numeral)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-section-headline se-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="se-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-md se-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="se-card-color ${pastel(i)} se-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-numeral-lg se-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div class="t-subhead-sm se-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block se-metrics" data-block-id="${b.id}">
  ${title}
  <div class="se-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(罗马数字 | head+body | metric)· 旧 diagnosis
//   layout=grid           → 网格 pastel 特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker" style="margin-bottom:16px;">${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-section-headline se-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-numeral-card se-card__num">${ctx.esc(c.num ?? ROMAN[i] ?? String(i + 1) + ".")}</div>`;
        return `<div class="se-card-soft se-card">
      ${num}
      <div class="t-subhead-sm se-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-md se-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
    return `<section class="v32-block se-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="se-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目(罗马数字 · metric 靠右)
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-numeral-card se-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-kicker se-card-row__metric-l" style="font-size:22px;" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-marker" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="se-card-soft se-card-row">
      <div class="t-numeral-step se-card-row__num">${ctx.esc(c.num ?? ROMAN[i] ?? String(i + 1) + ".")}</div>
      <div>
        <div class="t-subhead-md se-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-md se-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="se-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block se-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="se-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(full-pink 底 · pill CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker" style="margin-bottom:28px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-opener se-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="se-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="se-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block se-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-closer se-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const softEditorialV32: TemplateV32 = {
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

export default softEditorialV32;
export { softEditorialV32, meta, fonts, themeCss };
