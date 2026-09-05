/**
 * V32 S5 · Neo-Grid Bold 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/neo-grid-bold.ts(旧 1056 行,三入口 + chart SVG)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 neo-grid 视觉 DNA(paper/ink/lemon token + t-* 排版 + corner/blockmark 气氛)
 *      搬过来,并把 neo-grid 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色;
 *   2) blocks:只覆盖 neo-grid 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Space Grotesk UPPERCASE / 无圆角 / hairline)拿到 neo-grid 观感。
 *
 * DNA(照搬旧模板注释):paper ecru #F5F4EF / ink #0A0A0A / neon lemon #E6FF3D 三色 panel
 * + Space Grotesk 700 UPPERCASE 负字距 + JetBrains Mono UPPERCASE 0.08em tracking
 * + stat 数字占满 panel + 0 圆角 0 阴影 0 渐变 + corner-mark / blockmark 角标 + inline <mark> 黄 highlight。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "neo-grid-bold",
  name: "Neo-Grid Bold",
  tagline:
    "brutalist editorial poster · paper ecru + ink + neon lemon · Space Grotesk 700 UPPERCASE 负字距 · 0 圆角 0 阴影",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Editorial annual reports · design weeks · brand manifestos · curated index decks · brutalist product announcements",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Space Grotesk:wght@400;500;700",
  "JetBrains Mono:wght@400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 neo-grid 底色;再把关键 .v32-* 类重绘成 neo-grid 观感。
const themeCss = `
:root {
  /* ── neo-grid 原 token(照搬旧模板 :root)── */
  --paper: #F5F4EF;
  --bg: #ECECE8;
  --ink: #0A0A0A;
  --lemon: #E6FF3D;
  --muted: #8A8A85;

  --font-display: 'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── 把 neo-grid 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 neo-grid 底色 ──
     WCAG AA:ink(#0A0A0A) on paper(#F5F4EF) 对比≈19:1;mute 用 ink 混 paper 仍 ≥4.5:1 */
  --plain-bg: var(--bg);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 64%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: var(--lemon);
  --plain-success: var(--ink);
  --plain-warn: var(--ink);
  --plain-danger: var(--ink);
  --plain-danger-bg: var(--lemon);

  --stage-bg: #1A1A1A;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--ink);

  --font-body: var(--font-display);
  --v32-radius: 0px; /* neo-grid 铁律:零圆角 */
  --v32-gap: 12px;   /* neo-grid 12px panel gap */
}

/* ── neo-grid 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-stat-num-lg { font-family: var(--font-display); font-weight: 700; font-size: clamp(96px, 16vw, 240px); line-height: 0.85; letter-spacing: -0.04em; color: var(--ink); }
.t-stat-num { font-family: var(--font-display); font-weight: 700; font-size: clamp(72px, 11vw, 156px); line-height: 0.9; letter-spacing: -0.03em; color: var(--ink); }
.t-stat-num-sm { font-family: var(--font-display); font-weight: 700; font-size: clamp(56px, 8vw, 120px); line-height: 0.9; letter-spacing: -0.03em; color: var(--ink); }
.t-display { font-family: var(--font-display); font-weight: 700; font-size: clamp(56px, 9vw, 132px); line-height: 0.92; letter-spacing: -0.02em; text-transform: uppercase; color: var(--ink); }
.t-title { font-family: var(--font-display); font-weight: 700; font-size: clamp(40px, 6vw, 88px); line-height: 0.95; letter-spacing: -0.015em; text-transform: uppercase; color: var(--ink); }
.t-card-h { font-family: var(--font-display); font-weight: 700; font-size: clamp(28px, 3.4vw, 44px); line-height: 1.0; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); }
.t-card-h3 { font-family: var(--font-display); font-weight: 700; font-size: clamp(20px, 2.2vw, 30px); line-height: 1.05; letter-spacing: -0.005em; text-transform: uppercase; color: var(--ink); }
.t-body { font-family: var(--font-display); font-weight: 400; font-size: clamp(16px, 1.4vw, 22px); line-height: 1.4; color: var(--ink); }
.t-body-sm { font-family: var(--font-display); font-weight: 400; font-size: clamp(14px, 1.1vw, 18px); line-height: 1.45; color: var(--ink); }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(13px, 1vw, 18px); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }
.t-label-sm { font-family: var(--font-mono); font-weight: 400; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }

/* ── neo-grid 气氛角标(corner-mark 2×2 · blockmark diagonal)· 照搬旧模板 ── */
.ng-corner { position: absolute; top: 22px; right: 22px; width: 36px; height: 36px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; z-index: 3; }
.ng-corner span { background: currentColor; }
.ng-corner span:nth-child(3) { background: transparent; }
.ng-blockmark { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; }
.ng-blockmark span { background: currentColor; }
.ng-blockmark span:nth-child(2), .ng-blockmark span:nth-child(3) { background: transparent; }
.ng-mark { background: var(--lemon); color: var(--ink); padding: 0 8px; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.ng-card { background: var(--paper); position: relative; overflow: hidden; padding: 32px 36px; }
.ng-card[data-tone="ink"] { background: var(--ink); color: var(--paper); }
.ng-card[data-tone="ink"] .t-stat-num-sm, .ng-card[data-tone="ink"] .t-card-h, .ng-card[data-tone="ink"] .t-card-h3, .ng-card[data-tone="ink"] .t-label, .ng-card[data-tone="ink"] .t-label-sm, .ng-card[data-tone="ink"] .t-body-sm { color: var(--paper); }
.ng-card[data-tone="lemon"] { background: var(--lemon); color: var(--ink); }

.ng-cover { position: relative; display: grid; grid-template-columns: 3fr 1fr; gap: var(--v32-gap); background: var(--bg); }
.ng-cover__main { padding: 40px 44px; }
.ng-cover__display { margin: 0; }
.ng-cover__lead { margin: 32px 0 0; max-width: 40ch; }
.ng-cover__side { display: flex; flex-direction: column; gap: 14px; }
.ng-cover__byline { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }

.ng-statement { position: relative; display: flex; flex-direction: column; gap: var(--v32-gap); background: var(--bg); }
.ng-statement__num { display: flex; align-items: center; justify-content: center; }
.ng-statement__text { margin: 0; max-width: 22ch; }
.ng-statement__anno { margin-top: 32px; }

.ng-metrics__grid { display: grid; gap: var(--v32-gap); }
.ng-metrics__title { margin: 0 0 var(--v32-gap); }
.ng-metric { display: flex; flex-direction: column; justify-content: space-between; min-height: 220px; }
.ng-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.15em; }
.ng-metric__delta { font-family: var(--font-mono); font-size: 0.22em; }
.ng-metric[data-tone="ink"] .ng-metric__delta { color: var(--lemon); }
.ng-metric__foot { margin-top: 20px; }
.ng-metric__hint { margin-top: 10px; opacity: 0.85; }

.ng-cards__kicker { margin-bottom: 12px; }
.ng-cards__title { margin: 0 0 var(--v32-gap); }
.ng-cards__list { display: flex; flex-direction: column; gap: var(--v32-gap); }
.ng-cards__grid { display: grid; gap: var(--v32-gap); }
.ng-card-row { display: grid; grid-template-columns: 120px 1fr 200px; gap: 28px; align-items: center; }
.ng-card-row__head { margin: 0 0 12px; }
.ng-card-row__body { margin: 0; }
.ng-card-row__metric { text-align: right; }
.ng-card-row__metric-l { margin-top: 10px; opacity: 0.7; }
.ng-grid-card { display: flex; flex-direction: column; gap: 14px; }
.ng-grid-card__head { margin: 0; }
.ng-grid-card__body { margin: 0; }

.ng-closing { background: var(--ink); color: var(--paper); position: relative; padding: 48px 52px; display: flex; flex-direction: column; justify-content: center; }
.ng-closing__display { color: var(--paper); margin: 0; }
.ng-closing__kicker { color: var(--lemon); margin-bottom: 32px; }
.ng-closing__sub { color: color-mix(in oklab, var(--paper) 80%, transparent); margin-top: 32px; max-width: 60ch; }
.ng-closing__cta { display: flex; gap: 24px; margin-top: 56px; flex-wrap: wrap; }
.ng-cta { padding: 16px 32px; text-decoration: none; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; font-size: 16px; display: inline-block; }
.ng-cta[data-kind="primary"] { background: var(--lemon); color: var(--ink); }
.ng-cta[data-kind="secondary"] { border: 1.5px solid var(--paper); color: var(--paper); }

/* ── 兜底块的 neo-grid 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 neo-grid 的 UPPERCASE display + hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title, .v32-closing-display { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; }
.v32-prose-body, .v32-quote-text, .v32-callout-body, .v32-media-quote blockquote { font-family: var(--font-display); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-chart-svg { border-radius: 0 !important; box-shadow: none !important; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
/* 表格 hairline + ink 表头(旧 thead/tcell 观感)*/
.v32-table-el th { background: var(--ink); color: var(--paper); font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
.v32-table-el td, .v32-table-el th { border: 1.5px solid var(--ink); }

/* present 舞台:bg 底 + 大内边距 · 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 40px; }
[data-v32-mode="present"] .ng-cover { min-height: 100%; }
[data-v32-mode="present"] .ng-cover__display { font-size: clamp(72px, 9vw, 132px); }
[data-v32-mode="present"] .ng-closing__display { font-size: clamp(72px, 9vw, 132px); }
[data-v32-mode="present"] .ng-metric { min-height: 320px; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · 气氛件 helper(角标只是装饰,纯 currentColor 上色)
// ────────────────────────────────────────────────────────────
const corner = (color = "var(--ink)") =>
  `<div class="ng-corner" style="color:${color};"><span></span><span></span><span></span><span></span></div>`;
const blockmark = (size = 72, color = "var(--ink)") =>
  `<div class="ng-blockmark" style="width:${size}px;height:${size}px;color:${color};"><span></span><span></span><span></span><span></span></div>`;

// tone 轮换调色板(旧模板每个 renderer 用 ["", "lemon", "ink"] 之类循环上色)
const toneAttr = (t: "" | "ink" | "lemon") => (t ? ` data-tone="${t}"` : "");

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderStats / renderDiagnosis|features|proposal /
// renderHeroQuestion / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(3fr main + 1fr ink 侧栏 · lemon <mark> 副标)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label" style="margin-bottom:28px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<div style="margin-top:0.08em;"><mark class="ng-mark" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</mark></div>`
    : "";
  const lead = b.lead
    ? `<p class="t-body ng-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ng-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label-sm" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ng-cover" data-block-id="${b.id}">
  <div class="ng-card ng-cover__main">
    ${corner()}
    ${kicker}
    <h1 class="t-display ng-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
    ${lead}
  </div>
  <div class="ng-card ng-cover__side" data-tone="ink">
    ${blockmark(72, "var(--lemon)")}
    ${byline}
  </div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(lemon bigNumber panel + ink annotation bar)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="ng-card ng-statement__num" data-tone="lemon">
      ${corner()}
      <div class="t-stat-num-lg" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>
    </div>`
    : "";
  const anno = b.annotation
    ? `<div class="ng-card ng-statement__anno" data-tone="ink"><div class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div></div>`
    : "";
  return `<section class="v32-block ng-statement" data-block-id="${b.id}">
  ${big}
  <div class="ng-card" style="position:relative;">
    ${corner()}
    <p class="t-title ng-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  </div>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(tone 轮换 stat panel · 占满大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-title ng-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const tones: ("" | "ink" | "lemon")[] = ["lemon", "", "ink", ""];
  const items = b.items
    .map((m: Mark, i: number) => {
      const tone = tones[i % tones.length];
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ng-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-sm ng-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="ng-card ng-metric"${toneAttr(tone)} data-delta="${ctx.esc(m.delta ?? "flat")}">
      ${corner()}
      <div class="t-stat-num-sm ng-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="ng-metric__foot">
        <div class="t-label-sm" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
        ${hint}
      </div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ng-metrics" data-block-id="${b.id}">
  ${title}
  <div class="ng-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → tone 轮换网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label ng-cards__kicker" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-title ng-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const tones: ("" | "ink" | "lemon")[] = ["", "lemon", "ink", ""];

  if (b.layout === "grid") {
    const gcols = Math.min(b.items.length <= 3 ? b.items.length : Math.ceil(Math.sqrt(b.items.length)), 4) || 1;
    const items = b.items
      .map((c: CardItem, i: number) => {
        const tone = tones[i % tones.length];
        return `<article class="ng-card ng-grid-card"${toneAttr(tone)}>
      ${corner()}
      <div class="t-label-sm">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <h3 class="t-card-h3 ng-grid-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</h3>
      <p class="t-body-sm ng-grid-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</p>
    </article>`;
      })
      .join("");
    return `<section class="v32-block ng-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ng-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const tone = i % 2 === 0 ? "" : "ink";
      const metric = c.metric
        ? `<div class="t-stat-num-sm ng-card-row__metric-v" style="font-size:clamp(40px,5vw,72px);" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-sm ng-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label-sm" style="opacity:0.7;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="ng-card ng-card-row"${toneAttr(tone)}>
      ${corner()}
      <div class="t-stat-num-sm" style="font-size:clamp(48px,7vw,96px);">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-h ng-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-sm ng-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ng-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ng-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="ng-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(ink 底 · lemon blockmark + lemon CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label ng-closing__kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body ng-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="ng-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ng-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ng-closing" data-block-id="${b.id}">
  ${corner("var(--lemon)")}
  <div style="position:absolute;top:40px;left:44px;">${blockmark(96, "var(--lemon)")}</div>
  ${kicker}
  <h2 class="t-display ng-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const neoGridBoldV32: TemplateV32 = {
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

export default neoGridBoldV32;
export { neoGridBoldV32, meta, fonts, themeCss };
