/**
 * V32 S5 · Playful 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/playful.ts(旧 820 行,三入口 20+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 playful 视觉 DNA(peach-clay/ink token + t-* 排版 + rough-box
 *      双线描边 + blob/pebble + ghost-blob 气氛 + 涂鸦)搬过来,并把 peach 色映射到
 *      --plain-* token 让"没覆盖的兜底块"自动吃到 peach 底色 + rough-box 观感;
 *   2) blocks:只覆盖 playful 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘(rough-box 双线 + Syne + 微旋转)拿到观感。
 *
 * DNA(照搬旧模板注释):暖 peach-clay 底(#F0C8A0)+ 单一 charcoal ink(#1A1A1A)
 * + Syne 700-800 显示 / Space Grotesk body + 双线偏移描边(rough-box)+ 微旋转(±0.6~1.5°)
 * + 有机 blob 圆角 + 2px stroke 涂鸦 + ghost-blob 0.08 watermark + 0 web shadow。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "playful",
  name: "Playful",
  tagline:
    "暖 peach-clay + charcoal ink · Syne + Space Grotesk · 双线描边 + 涂鸦 + 微旋转",
  scheme: "light" as const,
  density: "low" as const,
  bestFor:
    "Independent studio decks · creative pitches · sketchbook-flavored presentations · risograph zines · warm editorial moments",
};

// V32 S5 · fonts:搬旧 fontLinks
const fonts = fontLinks(["Syne:wght@700;800", "Space Grotesk:wght@400;500;600;700"]);

// V32 S5 · 内联涂鸦 SVG(旧 scribble 助手 → 常量,themeCss/renderer 复用)
const SVG_STAR =
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M 50 8 L 58 36 L 88 36 L 64 54 L 72 82 L 50 64 L 28 82 L 36 54 L 12 36 L 42 36 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
const SVG_SQUIGGLE =
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M 4 30 Q 14 8, 24 30 T 44 30 T 64 30 T 84 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const SVG_ARROW =
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M 6 50 L 80 50 M 64 32 L 80 50 L 64 68" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 peach 底色 + rough-box 观感。
const themeCss = `
:root {
  /* ── playful 原 token(照搬旧模板 :root)── */
  --bg: #F0C8A0;
  --bg-alt: #E8B88E;
  --light: #F7DEC6;
  --ink: #1A1A1A;

  --font-display: 'Syne', 'Helvetica Neue', sans-serif;
  --font-body: 'Space Grotesk', sans-serif;

  /* ── 把 peach-clay 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 playful 底色 ──
     WCAG AA:ink(#1A1A1A) on peach(#F0C8A0) 对比≈9:1;mute/faint 混底仍 ≥4.5:1 */
  --plain-bg: var(--bg);
  --plain-surface: var(--bg);
  --plain-surface-2: var(--bg-alt);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--bg));
  --plain-text-faint: color-mix(in oklab, var(--ink) 66%, var(--bg));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: var(--light);
  --plain-success: var(--ink);
  --plain-warn: var(--ink);
  --plain-danger: var(--ink);
  --plain-danger-bg: var(--bg-alt);

  --stage-bg: #2a1a0c;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--ink);

  --v32-radius: 0px; /* playful 铁律:0 中间圆角(圆角只出现在 blob/pebble 有机形上) */
  --v32-gap: 32px;   /* rough-box 之间留呼吸的手绘间距 */
}

/* ── playful 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-hero { font-family: var(--font-display); font-weight: 800; font-size: clamp(72px, min(9vw, 14vh), 160px); line-height: 0.9; letter-spacing: -0.03em; color: var(--ink); margin: 0; }
.t-display { font-family: var(--font-display); font-weight: 800; font-size: clamp(56px, min(7vw, 11vh), 120px); line-height: 0.9; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(40px, min(5vw, 8vh), 88px); line-height: 1; letter-spacing: -0.015em; color: var(--ink); margin: 0; }
.t-title-sm { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px, 1.6vw, 32px); line-height: 1.2; color: var(--ink); margin: 0; }
.t-num-md { font-family: var(--font-display); font-weight: 800; font-size: clamp(40px, 3vw, 60px); line-height: 1; color: var(--ink); margin: 0; }
.t-num-sm { font-family: var(--font-display); font-weight: 800; font-size: clamp(28px, 2vw, 42px); line-height: 1; color: var(--ink); margin: 0; }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(15px, 1.05vw, 20px); line-height: 1.7; color: var(--ink); }
.t-body-md { font-family: var(--font-body); font-weight: 500; font-size: clamp(17px, 1.25vw, 26px); line-height: 1.6; color: var(--ink); }
.t-label { font-family: var(--font-body); font-weight: 600; font-size: clamp(12px, 0.9vw, 16px); line-height: 1.2; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
.t-caption { font-family: var(--font-body); font-weight: 500; font-size: clamp(11px, 0.85vw, 14px); line-height: 1.4; color: var(--ink); opacity: 0.75; }

/* ── Rough-box:招牌双线偏移描边(照搬旧模板)── */
.rough-box { position: relative; border: 3px solid var(--ink); background: var(--bg); padding: 32px; border-radius: 0; box-shadow: none; }
.rough-box::before { content: ""; position: absolute; inset: 0; border: 2.5px solid var(--ink); transform: translate(7px, 7px); pointer-events: none; z-index: -1; }
.rough-box.inverted { background: var(--ink); color: var(--bg); }
.rough-box.inverted .t-body, .rough-box.inverted .t-title-sm, .rough-box.inverted .t-label, .rough-box.inverted .t-num-md { color: var(--bg); }
.rough-box.rot-l { transform: rotate(-1.5deg); }
.rough-box.rot-r { transform: rotate(1.5deg); }
.rough-box.rot-l-sm { transform: rotate(-0.6deg); }
.rough-box.rot-r-sm { transform: rotate(0.8deg); }

/* ── ghost-blob 气氛水印(present 舞台绝对定位)· 照搬旧模板 ── */
.ghost-blob { position: absolute; background: var(--ink); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; opacity: 0.08; pointer-events: none; z-index: 0; }
.ghost-blob.tl { top: -160px; left: -180px; width: 46vw; height: 46vw; }
.ghost-blob.br { bottom: -180px; right: -180px; width: 52vw; height: 52vw; }
.ghost-blob.tr { top: -200px; right: -160px; width: 44vw; height: 44vw; }

/* ── 涂鸦定位(renderer 产出 .pf-doodle 包裹)── */
.pf-doodle { position: absolute; color: var(--ink); pointer-events: none; z-index: 1; }
.pf-doodle svg { width: 100%; height: 100%; display: block; }

/* ── step-node(cards numbered/steps 用)── */
.pf-node { width: 72px; height: 72px; border: 3px solid var(--ink); border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--ink); flex: none; }
.pf-node.filled { background: var(--ink); color: var(--bg); }

/* ── kicker rail ── */
.pf-kicker { margin-bottom: 24px; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.pf-cover { position: relative; }
.pf-cover__lead { margin: 40px 0 0; max-width: 900px; }
.pf-cover__byline { display: flex; gap: 40px; margin-top: 56px; align-items: baseline; flex-wrap: wrap; }

.pf-statement { position: relative; }
.pf-statement__num { margin: 0 0 24px; transform: rotate(-0.5deg); }
.pf-statement__text { margin: 0; max-width: 24ch; }
.pf-statement__anno { margin-top: 48px; }

.pf-metrics__title { margin: 0 0 40px; }
.pf-metrics__grid { display: grid; gap: 36px; }
.pf-metric { padding: 26px 24px; }
.pf-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.18em; transform: rotate(-0.8deg); }
.pf-metric__delta { font-family: var(--font-body); font-size: 0.32em; font-weight: 700; }
.pf-metric[data-delta="down"] .pf-metric__delta { opacity: 0.6; }
.pf-metric__label { margin-top: 14px; }
.pf-metric__hint { margin-top: 10px; }

.pf-cards__title { margin: 0 0 36px; }
.pf-cards__list { display: flex; flex-direction: column; gap: 24px; }
.pf-card-row { display: grid; grid-template-columns: auto 1fr auto; gap: 28px; align-items: baseline; padding: 26px 28px; }
.pf-card-row__head { margin: 0; }
.pf-card-row__body { margin-top: 10px; }
.pf-card-row__metric { text-align: right; }
.pf-card-row__metric-l { margin-top: 6px; }
.pf-cards__grid { display: grid; gap: 32px; }
.pf-card { padding: 28px; }
.pf-card__num { opacity: 0.6; }
.pf-card__head { margin-top: 14px; }
.pf-card__body { margin-top: 12px; }

.pf-closing { position: relative; }
.pf-closing__sub { margin-top: 32px; max-width: 1000px; }
.pf-closing__cta { display: flex; gap: 24px; margin-top: 56px; flex-wrap: wrap; }
.pf-cta { display: inline-flex; padding: 22px 40px; text-decoration: none; font-family: var(--font-display); font-weight: 700; font-size: clamp(18px, 1.4vw, 24px); letter-spacing: -0.01em; border: 3px solid var(--ink); }
.pf-cta[data-kind="primary"] { background: var(--ink); color: var(--bg); }
.pf-cta[data-kind="secondary"] { background: var(--bg); color: var(--ink); }

/* ── 兜底块的 playful 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 playful 的 Syne + rough-box 双线 + 微旋转)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.015em; }
.v32-prose-body, .v32-callout-body { font-family: var(--font-body); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }
/* rough-box 双线套到兜底卡片类 */
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table-scroll {
  position: relative; border: 3px solid var(--ink); background: var(--bg); border-radius: 0; box-shadow: none;
}
.v32-callout::before, .v32-metric::before, .v32-card::before, .v32-compare-col::before, .v32-quote::before, .v32-table-scroll::before {
  content: ""; position: absolute; inset: 0; border: 2.5px solid var(--ink); transform: translate(6px, 6px); pointer-events: none; z-index: -1;
}
.v32-callout[data-tone="danger"], .v32-callout[data-tone="warn"] { background: var(--ink); color: var(--bg); }
.v32-callout[data-tone="danger"] .v32-callout-body, .v32-callout[data-tone="warn"] .v32-callout-body,
.v32-callout[data-tone="danger"] .v32-callout-title, .v32-callout[data-tone="warn"] .v32-callout-title { color: var(--bg); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-body); font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; }

/* present 舞台:peach 底 + 大内边距(旧 slide-inner 是 72px 90px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 72px 90px; }
[data-v32-mode="present"] .pf-cover__display { font-size: clamp(96px, 10vw, 196px); }
[data-v32-mode="present"] .pf-closing__display { font-size: clamp(72px, 8vw, 144px); }
/* present 下涂鸦/水印更张扬;report 下收敛避免与滚动流干扰 */
[data-v32-mode="report"] .ghost-blob { opacity: 0.05; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐兜底)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// V32 S5 · cover ← 旧 renderCover(ghost-blob + 星/波浪涂鸦 + hero 大字)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label pf-kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span style="font-style: italic;" ${ctx.edit(`${p}/displayTail`, "标题续行")}> ${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-md pf-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="pf-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block pf-cover" data-block-id="${b.id}">
  <div class="ghost-blob br"></div>
  <div class="pf-doodle" style="top:6%;right:10%;width:96px;height:96px;">${SVG_STAR}</div>
  <div class="pf-doodle" style="bottom:14%;left:6%;width:140px;height:44px;">${SVG_SQUIGGLE}</div>
  ${kicker}
  <h1 class="t-display-hero pf-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// V32 S5 · statement ← 旧 renderHeroQuestion(bigNumber + 大问句 + 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display pf-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-label pf-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block pf-statement" data-block-id="${b.id}">
  <div class="ghost-blob tl"></div>
  <div class="pf-doodle" style="bottom:16%;right:8%;width:120px;height:44px;">${SVG_ARROW}</div>
  ${big}
  <p class="t-headline pf-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// V32 S5 · metrics ← 旧 renderStats(rough-box 交替旋转/反色 · Syne 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline pf-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const rot = i % 4 === 0 ? "rot-l-sm" : i % 4 === 1 ? "rot-r-sm" : i % 4 === 2 ? "rot-r" : "rot-l";
      const inverted = i === 1 ? "inverted" : "";
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="pf-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-caption pf-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="rough-box pf-metric ${rot} ${inverted}" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-num-md pf-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label pf-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block pf-metrics" data-block-id="${b.id}">
  <div class="ghost-blob tr"></div>
  ${title}
  <div class="pf-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// V32 S5 · cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → step-node 横排大条目(diagnosis/proposal 式)
//   layout=grid           → rough-box 网格特性卡(features 式)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ? `<div class="t-label pf-kicker">${ctx.esc(b.kicker)}</div>` : "";
  const title = b.title
    ? `<h2 class="t-headline pf-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const rot = i % 4 === 0 ? "rot-l-sm" : i % 4 === 1 ? "rot-r-sm" : i % 4 === 2 ? "rot-r" : "rot-l";
        const inverted = i % 5 === 2 ? "inverted" : "";
        return `<article class="rough-box pf-card ${rot} ${inverted}">
      <div class="t-num-sm pf-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-title-sm pf-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body pf-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block pf-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="pf-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目(step-node | head+body | metric/when)
  const items = b.items
    .map((c: CardItem, i: number) => {
      const rot = i % 2 === 0 ? "rot-l-sm" : "rot-r-sm";
      const filled = i % 2 === 1 ? "filled" : "";
      const right = c.metric
        ? `<div class="t-num-md" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-caption pf-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label" style="opacity:0.7;">${ctx.esc(c.when)}</div>`
          : "<div></div>";
      return `<div class="rough-box pf-card-row ${rot}">
      <div class="pf-node ${filled}">${ctx.esc(c.num ?? String(i + 1))}</div>
      <div>
        <div class="t-title-sm pf-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body pf-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="pf-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block pf-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  <div class="ghost-blob br"></div>
  ${kicker}${title}
  <div class="pf-cards__list">${items}</div>
</section>`;
};

// V32 S5 · closing ← 旧 renderClosing(ghost-blob + 星/箭头涂鸦 + rough-box CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label pf-kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-md pf-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="pf-cta ${kind === "primary" ? "rot-l-sm" : "rot-r-sm"}" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="pf-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block pf-closing" data-block-id="${b.id}">
  <div class="ghost-blob tl"></div>
  <div class="ghost-blob br"></div>
  <div class="pf-doodle" style="top:10%;right:11%;width:100px;height:100px;">${SVG_STAR}</div>
  <div class="pf-doodle" style="bottom:18%;left:7%;width:140px;height:44px;">${SVG_ARROW}</div>
  ${kicker}
  <h2 class="t-display pf-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const playfulV32: TemplateV32 = {
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

export default playfulV32;
export { playfulV32, meta, fonts, themeCss };
