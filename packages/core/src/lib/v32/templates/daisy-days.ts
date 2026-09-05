/**
 * V32 S5 · Daisy Days 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/daisy-days.ts(旧 1114 行,三入口 14 slide renderer + 全套 doc/sheet)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 daisy 视觉 DNA(cream/ink/pastel token + t-* 排版 + card/pill/disc/dot-list
 *      + SVG sticker 气氛层)搬过来,并把 daisy 色映射到 --plain-* token 让"没覆盖的兜底块"
 *      自动吃到 cream 底 + 3px charcoal outline + 圆角 + hard shadow;
 *   2) blocks:只覆盖 daisy 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘(Fredoka + 圆角 + outline + shadow)拿到观感。
 *
 * DNA(照搬旧模板注释):cream paper 底 + 单一 charcoal ink + 8 色 pastel surface
 * + 3px solid charcoal outline + hard offset shadow(6px 6px 0)+ 圆角狂魔 + zero blur/gradient
 * + Fredoka One display / Quicksand body + coral 只做小 marker · SVG sticker 装饰角落。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "daisy-days",
  name: "Daisy Days",
  tagline:
    "雏菊日子 · Fredoka One + Quicksand · cream + 8 色 pastel · 3px charcoal outline + 6px 偏移阴影 · 童书 sticker 装饰",
  scheme: "light" as const,
  density: "low" as const,
  bestFor:
    "Storybook decks · kids workshops · friendly onboarding · brand cheer slides · classroom recap",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks(["Fredoka One", "Quicksand:wght@400;500;600;700"]);

// V32 S5 · SVG sticker(照搬旧模板 · 气氛层用)· 只留 daisy/star/sun 三种够撑角落
const SVG_DAISY = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="#2D2D2D" stroke-width="2.4" stroke-linejoin="round"><circle cx="50" cy="22" r="12" fill="#FFFFFF"/><circle cx="78" cy="50" r="12" fill="#FFFFFF"/><circle cx="50" cy="78" r="12" fill="#FFFFFF"/><circle cx="22" cy="50" r="12" fill="#FFFFFF"/><circle cx="70" cy="30" r="11" fill="#FFFFFF"/><circle cx="70" cy="70" r="11" fill="#FFFFFF"/><circle cx="30" cy="70" r="11" fill="#FFFFFF"/><circle cx="30" cy="30" r="11" fill="#FFFFFF"/><circle cx="50" cy="50" r="13" fill="#FDE68A"/></g></svg>`;
const SVG_STAR = (fill: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 8 L62 38 L94 42 L70 64 L78 96 L50 78 L22 96 L30 64 L6 42 L38 38 Z" fill="${fill}" stroke="#2D2D2D" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
const SVG_SUN = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="#2D2D2D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="#FDE68A"><line x1="50" y1="6" x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="94"/><line x1="6" y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="94" y2="50"/><line x1="18" y1="18" x2="28" y2="28"/><line x1="72" y1="72" x2="82" y2="82"/><line x1="18" y1="82" x2="28" y2="72"/><line x1="72" y1="28" x2="82" y2="18"/><circle cx="50" cy="50" r="22" fill="#FDE68A"/><circle cx="43" cy="48" r="2" fill="#2D2D2D"/><circle cx="57" cy="48" r="2" fill="#2D2D2D"/><path d="M42 56 Q50 62 58 56" fill="none"/></g></svg>`;

// 角落 sticker cluster(present/report 皆用 · 绝对定位在 block 上,pointer-events:none)
const daisyStickers = `<div class="dd-deco" aria-hidden="true">
  <div class="dd-sticker" style="top:-26px;right:-18px;width:132px;height:132px;">${SVG_DAISY}</div>
  <div class="dd-sticker" style="bottom:-24px;left:-22px;width:120px;height:120px;">${SVG_STAR("#F7C8D4")}</div>
  <div class="dd-sticker" style="top:24px;left:36px;width:72px;height:72px;">${SVG_SUN}</div>
</div>`;

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --v32-radius 让兜底块吃到 daisy(cream 底 + 3px outline + 圆角 + hard shadow);
// 再把关键 .v32-* 类重绘成 daisy 观感(Fredoka + pill/card + dot bullet)。
const themeCss = `
:root {
  /* ── daisy 原 token(照搬旧模板 :root)── */
  --cream: #F5F0E6;
  --white: #FFFFFF;
  --turquoise: #7ECDC0;
  --soft-pink: #F7C8D4;
  --butter: #FDE68A;
  --mint: #A8E6CF;
  --lavender: #D4A5E8;
  --peach: #FFCBA4;
  --sky: #A8D8F0;
  --coral: #F8635F;
  --ink: #2D2D2D;
  --ink-muted: #6B6B6B;

  --font-display: 'Fredoka One', cursive;
  --font-body: 'Quicksand', system-ui, sans-serif;

  --shadow-default: 6px 6px 0 var(--ink);
  --shadow-small: 4px 4px 0 var(--ink);

  /* ── 把 daisy 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 daisy 观感 ──
     WCAG AA:ink(#2D2D2D) on cream(#F5F0E6) 对比≈11:1;ink-muted(#6B6B6B) on cream≈4.9:1 ≥4.5 */
  --plain-bg: var(--cream);
  --plain-surface: var(--white);
  --plain-surface-2: var(--butter);
  --plain-text: var(--ink);
  --plain-text-mute: var(--ink-muted);
  --plain-text-faint: var(--ink-muted);
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--coral);
  --plain-accent-strong: var(--coral);
  --plain-accent-bg: var(--butter);
  --plain-success: #2E7D5B;
  --plain-warn: var(--peach);
  --plain-danger: var(--coral);
  --plain-danger-bg: var(--soft-pink);

  --stage-bg: #e9e2cf;
  --slide-bg: var(--cream);
  --doc-page-bg: var(--cream);
  --doc-text: var(--ink);

  --v32-radius: 20px; /* daisy 铁律:圆角狂魔 */
  --v32-gap: 28px;    /* sticker zine 呼吸感 */
}

/* ── daisy 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(72px, min(7.6vw, 13vh), 160px); line-height: 1.05; letter-spacing: 0.02em; color: var(--ink); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(5.4vw, 9vh), 108px); line-height: 1.05; letter-spacing: 0.02em; color: var(--ink); margin: 0; }
.t-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, min(3.8vw, 6.4vh), 72px); line-height: 1.1; letter-spacing: 0.02em; color: var(--ink); margin: 0; }
.t-subtitle { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, min(2.4vw, 4.2vh), 44px); line-height: 1.15; letter-spacing: 0.02em; color: var(--ink); margin: 0; }
.t-body { font-family: var(--font-body); font-weight: 500; font-size: clamp(18px, min(1.55vw, 2.4vh), 26px); line-height: 1.6; color: var(--ink); margin: 0; }
.t-body-strong { font-family: var(--font-body); font-weight: 600; font-size: clamp(18px, min(1.6vw, 2.4vh), 26px); line-height: 1.55; color: var(--ink); margin: 0; }
.t-meta { font-family: var(--font-body); font-weight: 600; font-size: clamp(14px, 1.15vw, 18px); line-height: 1.45; color: var(--ink-muted); margin: 0; }

/* ── daisy 组件(card / pill / disc / dot-list)· 覆盖块 + 兜底重绘共用 ── */
.dd-card { background: var(--white); border: 3px solid var(--ink); border-radius: 20px; box-shadow: var(--shadow-default); padding: 32px 36px; color: var(--ink); }
.dd-card-lg { background: var(--white); border: 3px solid var(--ink); border-radius: 28px; box-shadow: var(--shadow-default); padding: 44px 48px; color: var(--ink); }
.dd-pill { display: inline-block; padding: 8px 22px; border-radius: 50px; border: 3px solid var(--ink); background: var(--butter); font-family: var(--font-display); font-size: clamp(13px, 1vw, 16px); letter-spacing: 0.04em; color: var(--ink); box-shadow: var(--shadow-small); }
.dd-disc { width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--ink); background: var(--coral); color: var(--white); font-family: var(--font-display); font-size: 40px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-small); flex: none; }
.dd-disc[data-tint="0"] { background: var(--coral); }
.dd-disc[data-tint="1"] { background: var(--mint); }
.dd-disc[data-tint="2"] { background: var(--sky); }
.dd-disc[data-tint="3"] { background: var(--lavender); }
.dd-disc[data-tint="4"] { background: var(--butter); color: var(--ink); }
.dd-disc[data-tint="5"] { background: var(--soft-pink); }
.dd-disc[data-tint="6"] { background: var(--peach); }

/* SVG sticker 气氛层(绝对定位在 block · pointer-events:none) */
.dd-deco { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.dd-sticker { position: absolute; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.dd-cover { position: relative; text-align: center; }
.dd-cover__display { max-width: 1400px; margin: 0 auto; }
.dd-cover__tail { display: block; }
.dd-cover__lead { margin: 44px auto 0; max-width: 820px; }
.dd-cover__byline { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-top: 32px; }
.dd-cover__byline .dd-pill { background: var(--white); }

.dd-statement { position: relative; text-align: center; }
.dd-statement__num { width: 180px; height: 180px; font-size: 88px; margin: 0 auto 36px; }
.dd-statement__text { max-width: 1200px; margin: 0 auto; }
.dd-statement__anno { margin-top: 36px; }

.dd-metrics { position: relative; }
.dd-metrics__title { margin: 0 0 36px; }
.dd-metrics__grid { display: grid; gap: 28px; }
.dd-metric { text-align: center; }
.dd-metric .dd-disc { margin: 0 auto 18px; width: 64px; height: 64px; font-size: 28px; }
.dd-metric__value { font-size: 48px; }
.dd-metric__label { margin-top: 8px; }
.dd-metric__hint { margin-top: 10px; }
.dd-metric__delta { font-family: var(--font-body); font-size: 0.4em; margin-left: 0.2em; }
.dd-metric[data-delta="down"] .dd-metric__delta { color: var(--coral); }

.dd-cards { position: relative; }
.dd-cards__title { margin: 0 0 32px; max-width: 1400px; }
.dd-cards__grid { display: grid; gap: 28px; }
.dd-cards__rows { display: flex; flex-direction: column; gap: 22px; }
/* numbered / steps → 横排大条目 */
.dd-card-row { display: grid; grid-template-columns: 96px 1fr 200px; gap: 28px; align-items: center; }
.dd-card-row__head { font-size: 38px; margin: 0 0 10px; }
.dd-card-row__body { max-width: 740px; }
.dd-card-row__metric { text-align: right; }
.dd-card-row__metric-v { font-size: 48px; }
.dd-card-row__metric-l { margin-top: 6px; }
/* grid → 特性卡 */
.dd-card-grid-item .dd-disc { width: 64px; height: 64px; font-size: 28px; margin-bottom: 20px; }
.dd-card-grid-item__head { font-size: 36px; margin: 0 0 14px; }

.dd-closing { position: relative; text-align: center; }
.dd-closing__display { max-width: 1400px; margin: 0 auto; }
.dd-closing__cta { display: flex; gap: 24px; margin-top: 48px; flex-wrap: wrap; justify-content: center; }
.dd-cta { display: inline-block; padding: 18px 32px; border-radius: 50px; border: 3px solid var(--ink); text-decoration: none; font-family: var(--font-display); font-size: 20px; box-shadow: var(--shadow-default); }
.dd-cta[data-kind="primary"] { background: var(--coral); color: var(--white); }
.dd-cta[data-kind="secondary"] { background: var(--white); color: var(--ink); }

/* ── 兜底块的 daisy 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板方角卡片"拉回 daisy 的 Fredoka + 圆角 + 3px outline + hard shadow)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em; }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-media-body { font-family: var(--font-body); font-weight: 500; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 400; }
.v32-callout, .v32-card, .v32-compare-col, .v32-table-scroll, .v32-quote, .v32-metric { border: 3px solid var(--ink); border-radius: 20px; box-shadow: var(--shadow-default); background: var(--white); }
.v32-callout[data-tone="ok"] { background: var(--mint); }
.v32-callout[data-tone="tip"], .v32-callout[data-tone="info"], .v32-callout[data-tone="note"] { background: var(--sky); }
.v32-callout[data-tone="warn"] { background: var(--peach); }
.v32-callout[data-tone="danger"] { background: var(--soft-pink); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-display); letter-spacing: 0.04em; color: var(--ink); }
.v32-table-el th { font-family: var(--font-display); font-weight: 400; background: var(--butter); color: var(--ink); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 80px 96px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 80px 96px; }
[data-v32-mode="present"] .dd-cover__display { font-size: clamp(72px, 7.6vw, 160px); }
[data-v32-mode="present"] .dd-closing__display { font-size: clamp(72px, 7.6vw, 160px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐样板)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(butter pill kicker + Fredoka display + card lead + byline pills)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="dd-pill" style="margin-bottom:32px;background:var(--white);" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="dd-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<div class="dd-card-lg dd-cover__lead"><div class="t-body-strong" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</div></div>`
    : "";
  const byline = b.byline?.length
    ? `<div class="dd-cover__byline">${b.byline
        .map((x, j) => `<div class="dd-pill" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block dd-cover" data-block-id="${b.id}">
  ${daisyStickers}
  ${kicker}
  <h1 class="t-display dd-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(coral 大 disc + Fredoka headline + pill annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="dd-disc dd-statement__num" data-tint="0" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="dd-pill dd-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block dd-statement" data-block-id="${b.id}">
  ${daisyStickers}
  ${big}
  <h2 class="t-headline dd-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(pastel disc 序号 + card + Fredoka 大数值)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline dd-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="dd-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-meta dd-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="dd-card dd-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="dd-disc" data-tint="${i % 7}">${String(i + 1).padStart(2, "0")}</div>
      <div class="t-title dd-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body-strong dd-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block dd-metrics" data-block-id="${b.id}">
  ${daisyStickers}
  ${title}
  <div class="dd-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal(numbered/steps 横排) + renderFeatures(grid)
//   layout=numbered/steps → 横排大条目(disc | head+body | metric/when)
//   layout=grid           → 网格特性卡
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="dd-pill" style="margin-bottom:24px;">${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-headline dd-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="dd-card-lg dd-card-grid-item">
      <div class="dd-disc" data-tint="${i % 7}">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-title dd-card-grid-item__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? b.items.length || 1 : Math.min(Math.ceil(b.items.length / 2), 3);
    return `<section class="v32-block dd-cards" data-block-id="${b.id}" data-layout="grid">
  ${daisyStickers}
  ${kicker}${title}
  <div class="dd-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const right = c.metric
        ? `<div class="t-title dd-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-meta dd-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="dd-pill" style="background:var(--white);" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="dd-card dd-card-row">
      <div class="dd-disc" data-tint="${i % 7}">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-title dd-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body dd-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="dd-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block dd-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${daisyStickers}
  ${kicker}${title}
  <div class="dd-cards__rows">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(butter 底味 + Fredoka display + coral CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="dd-pill" style="margin-bottom:32px;background:var(--white);" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="dd-card-lg dd-cover__lead"><div class="t-body-strong" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div></div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="dd-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="dd-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block dd-closing" data-block-id="${b.id}">
  ${daisyStickers}
  ${kicker}
  <h2 class="t-display dd-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const daisyDaysV32: TemplateV32 = {
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

export default daisyDaysV32;
export { daisyDaysV32, meta, fonts, themeCss };
