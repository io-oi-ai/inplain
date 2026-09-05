/**
 * V32 S5 · Stencil & Tablet 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/stencil-tablet.ts(旧 906 行,三入口 14+ slide renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 stencil 的视觉 DNA(bone/black/7 色 retro accent + Stardos Stencil 巨大字号
 *      + Barlow Condensed uppercase chrome + rounded card)搬过来,并把 stencil 色映射到 --plain-*
 *      token 让"没覆盖的兜底块"自动吃到底色(rounded card / retro accent);
 *   2) blocks:只覆盖 stencil 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)走
 *      兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘(Stardos Stencil uppercase + 圆角卡片 +
 *      retro accent)拿到 stencil 观感。
 *
 * DNA(照搬旧模板注释):bone(#E2DCC9)/black(#000)底 + 7 色 retro print accent tile card
 * + Stardos Stencil 全场巨大 uppercase(cover 240 / numeral 220)+ Barlow Condensed 800 uppercase
 * 宽字距 chrome/pill + Inter 唯一 sentence-case body + rounded 22-26px 永无方角 + 0 shadow + 0 gradient。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "stencil-tablet",
  name: "Stencil & Tablet",
  tagline:
    "West Coast skate poster + 市政 stencil · Stardos Stencil 220-540px 巨大字号 + Barlow Condensed 800 uppercase · bone/black 底 + 7 色 retro print accent",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Industrial poster decks · workshop signage · music-festival lineup style · poster-loud product launches · maker / studio statements",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Stardos Stencil:wght@400;700",
  "Bowlby One",
  "Barlow Condensed:wght@500;600;700;800;900",
  "Inter:wght@400;500;600",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 stencil 底色(rounded card + retro accent);再把关键 .v32-*
// 类重绘成 stencil 观感(Stardos Stencil uppercase 标题 + 圆角卡片)。
const themeCss = `
:root {
  /* ── stencil 原 token(照搬旧模板 :root)── */
  --bone: #E2DCC9;
  --black: #000000;
  --ink: #0A0A0A;
  --paper: #F4EFE0;
  --c-sienna: #A06A3C;
  --c-magenta: #C73B7A;
  --c-orange: #EE7A2E;
  --c-teal: #2D7E73;
  --c-blue: #3F73B7;
  --c-mustard: #D8A93B;
  --c-olive: #6F7A2E;

  --font-display: 'Stardos Stencil', 'Georgia', serif;
  --font-bowlby: 'Bowlby One', 'Stardos Stencil', cursive;
  --font-condensed: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --font-body: 'Inter', 'system-ui', sans-serif;

  /* ── 把 stencil 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 stencil 底色 ──
     WCAG AA:ink(#0A0A0A) on bone(#E2DCC9) 对比≈13:1;paper 卡底同样深文字 ≥12:1;
     accent-bg 用 mustard 混 bone,配深 ink 文字仍 ≥4.5:1 */
  --plain-bg: var(--bone);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--bone);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--bone));
  --plain-text-faint: color-mix(in oklab, var(--ink) 66%, var(--bone));
  --plain-border: color-mix(in oklab, var(--ink) 28%, var(--bone));
  --plain-border-strong: var(--ink);
  --plain-accent: var(--c-orange);
  --plain-accent-strong: var(--c-magenta);
  --plain-accent-bg: color-mix(in oklab, var(--c-mustard) 34%, var(--paper) 66%);
  --plain-success: var(--c-teal);
  --plain-warn: var(--c-mustard);
  --plain-danger: var(--c-magenta);
  --plain-danger-bg: color-mix(in oklab, var(--c-magenta) 16%, var(--paper) 84%);

  --stage-bg: #1a1a1a;
  --slide-bg: var(--bone);
  --doc-page-bg: var(--bone);
  --doc-text: var(--ink);

  --v32-radius: 22px; /* stencil 铁律:永远圆角 · 22-26px */
  --v32-gap: 24px;    /* stencil tile 之间有间隙 */
}

/* ── stencil 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-cover { font-family: var(--font-display); font-weight: 700; font-size: clamp(120px, min(11vw, 20vh), 240px); line-height: 0.82; letter-spacing: -0.015em; text-transform: uppercase; color: var(--bone); }
.t-mega { font-family: var(--font-display); font-weight: 700; font-size: clamp(160px, min(20vw, 40vh), 400px); line-height: 0.8; text-transform: uppercase; }
.t-tablet-num { font-family: var(--font-display); font-weight: 700; font-size: clamp(120px, min(11vw, 19vh), 220px); line-height: 0.9; letter-spacing: -0.02em; }
.t-stat-num { font-family: var(--font-display); font-weight: 700; font-size: clamp(96px, min(8.4vw, 14vh), 160px); line-height: 0.85; letter-spacing: -0.02em; }
.t-page-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(48px, min(4.8vw, 8.5vh), 92px); line-height: 0.92; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); }
.t-card-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px, 1.8vw, 36px); line-height: 1.1; text-transform: uppercase; letter-spacing: -0.005em; }
.t-card-h3 { font-family: var(--font-display); font-weight: 700; font-size: clamp(20px, 1.6vw, 32px); line-height: 1.1; text-transform: uppercase; letter-spacing: 0.02em; }
.t-eyebrow { font-family: var(--font-condensed); font-weight: 800; font-size: clamp(16px, 1.2vw, 22px); letter-spacing: 0.14em; text-transform: uppercase; }
.t-attr { font-family: var(--font-condensed); font-weight: 800; font-size: clamp(16px, 1.3vw, 24px); letter-spacing: 0.08em; text-transform: uppercase; }
.t-pill-text { font-family: var(--font-condensed); font-weight: 700; font-size: 16px; letter-spacing: 0.08em; text-transform: uppercase; }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(15px, 1.2vw, 22px); line-height: 1.4; color: var(--ink); }
.t-body-sm { font-family: var(--font-body); font-weight: 400; font-size: clamp(13px, 1vw, 18px); line-height: 1.45; }

/* stencil card / accent 填充(照搬旧模板 · retro print 7 色)*/
.st-card { border-radius: 22px; padding: 28px 24px; }
.st-tablet { border-radius: 26px; padding: 36px 28px; display: flex; flex-direction: column; }
.c-sienna { background: var(--c-sienna); color: var(--ink); }
.c-magenta { background: var(--c-magenta); color: var(--bone); }
.c-orange { background: var(--c-orange); color: var(--ink); }
.c-teal { background: var(--c-teal); color: var(--bone); }
.c-blue { background: var(--c-blue); color: var(--bone); }
.c-mustard { background: var(--c-mustard); color: var(--ink); }
.c-olive { background: var(--c-olive); color: var(--bone); }
.c-paper { background: var(--paper); color: var(--ink); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.st-cover { background: var(--black); color: var(--bone); border-radius: var(--v32-radius); position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 40px; }
.st-cover__eyebrow { color: var(--c-mustard); }
.st-cover__display { margin: 0; max-width: 1700px; }
.st-cover__display .st-tail { display: block; color: var(--c-orange); }
.st-cover__lead { margin: 36px 0 0; color: var(--bone); opacity: 0.85; max-width: 1100px; }
.st-cover__byline { display: flex; align-items: center; gap: 28px; margin-top: 40px; padding-top: 20px; border-top: 1px solid color-mix(in oklab, var(--bone) 30%, transparent); }
.st-cover__mark { width: 48px; height: 48px; border-radius: 14px; background: var(--c-orange); flex: none; }
.st-cover__names { display: flex; flex-direction: column; gap: 4px; }
.st-cover__name { color: var(--bone); opacity: 0.75; }

.st-statement { background: var(--black); color: var(--bone); border-radius: var(--v32-radius); display: flex; align-items: center; gap: 56px; flex-wrap: wrap; }
.st-statement__num { color: var(--c-orange); flex: none; }
.st-statement__text { margin: 0; color: var(--bone); max-width: 20ch; }
.st-statement__anno { color: var(--c-mustard); margin-top: 32px; }

.st-metrics__title { margin: 0 0 40px; }
.st-metrics__grid { display: grid; gap: var(--v32-gap); }
.st-metric { border-radius: 22px; padding: 28px 24px; }
.st-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.14em; }
.st-metric__delta { font-family: var(--font-condensed); font-weight: 800; font-size: 0.28em; }
.st-metric[data-delta="down"] .st-metric__delta { color: var(--c-magenta); }
.st-metric__label { margin: 18px 0 8px; }
.st-metric__hint { opacity: 0.85; }

.st-cards__eyebrow { margin-bottom: 20px; color: var(--c-orange); }
.st-cards__title { margin: 0 0 40px; }
.st-cards__grid { display: grid; gap: var(--v32-gap); }
/* grid layout → tile 卡(巨大编号 + head + body) */
.st-tile__num { line-height: 0.9; margin: 0 0 20px; }
.st-tile__head { margin: 0 0 10px; }
.st-tile__body { }
/* numbered / steps → 横排大条目(num | head+body | metric) */
.st-row { border-radius: 22px; display: grid; grid-template-columns: 120px 1fr 200px; gap: 28px; align-items: center; padding: 32px 28px; }
.st-row__num { font-size: clamp(64px, 5.5vw, 120px); margin: 0; line-height: 0.9; }
.st-row__head { margin: 0 0 10px; }
.st-row__body { opacity: 0.9; }
.st-row__metric { text-align: right; }
.st-row__metric-v { font-size: clamp(48px, 4vw, 84px); margin: 0; line-height: 0.9; }
.st-row__metric-l { margin-top: 6px; opacity: 0.85; }
.st-row__when { text-align: right; opacity: 0.85; }

.st-closing { background: var(--black); color: var(--bone); border-radius: var(--v32-radius); display: flex; flex-direction: column; justify-content: center; }
.st-closing__eyebrow { color: var(--c-mustard); margin-bottom: 36px; }
.st-closing__display { color: var(--c-orange); margin: 0; max-width: 1700px; }
.st-closing__sub { color: var(--bone); margin-top: 40px; max-width: 1200px; }
.st-closing__cta { display: flex; gap: 24px; margin-top: 56px; flex-wrap: wrap; }
.st-cta { display: inline-block; border-radius: 999px; padding: 18px 36px; text-decoration: none; font-family: var(--font-condensed); font-weight: 700; font-size: 20px; letter-spacing: 0.08em; text-transform: uppercase; }
.st-cta[data-kind="primary"] { background: var(--c-orange); color: var(--ink); }
.st-cta[data-kind="secondary"] { background: var(--paper); color: var(--ink); }

/* ── 兜底块的 stencil 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板"拉回 stencil 的 Stardos Stencil uppercase + 圆角卡片 + retro accent)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; letter-spacing: -0.005em; }
.v32-prose-body { font-family: var(--font-body); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 400; text-transform: uppercase; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-condensed); font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--c-orange); }
/* 兜底卡片/callout/metric/compare 用 retro accent + 圆角(承接旧 rounded tile 观感)*/
.v32-callout { border-radius: var(--v32-radius); }
.v32-callout[data-tone="info"] { background: var(--c-teal); color: var(--bone); }
.v32-callout[data-tone="ok"] { background: var(--c-olive); color: var(--bone); }
.v32-callout[data-tone="warn"], .v32-callout[data-tone="tip"] { background: var(--c-mustard); color: var(--ink); }
.v32-callout[data-tone="danger"] { background: var(--c-magenta); color: var(--bone); }
.v32-callout[data-tone="note"] { background: var(--paper); color: var(--ink); }
.v32-metric, .v32-card, .v32-compare-col { border-radius: var(--v32-radius); }
.v32-quote { background: var(--c-magenta); color: var(--bone); border-radius: 26px; padding: 40px 48px; }
.v32-quote-text, .v32-quote-attr { color: var(--bone); }

/* present 舞台:大内边距(旧 slide-inner 是 110px 64px 88px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 96px 64px 88px; }
[data-v32-mode="present"] .st-cover, [data-v32-mode="present"] .st-statement, [data-v32-mode="present"] .st-closing { min-height: 100%; padding: 88px 72px; }
[data-v32-mode="present"] .st-cover__display { font-size: clamp(120px, 12vw, 240px); }
[data-v32-mode="present"] .st-closing__display { font-size: clamp(120px, 12vw, 240px); }
/* report 态覆盖块也要有呼吸内边距 */
[data-v32-mode="report"] .st-cover, [data-v32-mode="report"] .st-statement, [data-v32-mode="report"] .st-closing { padding: 56px 48px; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S3 样板)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx(见迁移规则 6)。7 色 retro accent 用取模轮转。
// ────────────────────────────────────────────────────────────

// stencil retro accent 轮转(照搬旧 ACCENTS_ALL / ACCENTS_WARM)
const ACCENTS_ALL = ["c-orange", "c-magenta", "c-teal", "c-mustard", "c-sienna", "c-blue", "c-olive"];
const ACCENTS_WARM = ["c-orange", "c-magenta", "c-mustard", "c-sienna"];
const accentFor = (i: number) => ACCENTS_ALL[i % ACCENTS_ALL.length];
const warmAccent = (i: number) => ACCENTS_WARM[i % ACCENTS_WARM.length];
const pad2 = (n: number) => String(n).padStart(2, "0");

// cover ← 旧 renderCover(black 底 · bone 巨大 stencil 标题 · orange mark)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const eyebrow = b.kicker
    ? `<div class="t-eyebrow st-cover__eyebrow" ${ctx.edit(`${p}/kicker`, "封面眉标")}>// ${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="st-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body st-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="st-cover__byline">
        <div class="st-cover__mark" aria-hidden="true"></div>
        <div class="st-cover__names">${b.byline
          .map((x, j) => `<div class="t-pill-text st-cover__name" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
          .join("")}</div>
      </div>`
    : "";
  return `<section class="v32-block st-cover" data-block-id="${b.id}">
  ${eyebrow}
  <h1 class="t-cover st-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(black 底 · mega orange 数字 + section headline)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-mega st-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-eyebrow st-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>// ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block st-statement" data-block-id="${b.id}">
  ${big}
  <div>
    <p class="t-page-headline st-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
    ${anno}
  </div>
</section>`;
};

// metrics ← 旧 renderStats(warm retro accent tile · Stardos Stencil 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-page-headline st-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="st-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-sm st-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="st-metric ${warmAccent(i)}" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat-num st-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-card-h3 st-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block st-metrics" data-block-id="${b.id}">
  ${title}
  <div class="st-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → tile 卡(巨大编号)· 旧 features
//   layout=numbered/steps → diagnosis 式横排大条目(num | head+body | metric/when)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const eyebrow = b.kicker
    ? `<div class="t-eyebrow st-cards__eyebrow" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>// ${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-page-headline st-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="st-tablet ${accentFor(i)}">
      <div class="t-tablet-num st-tile__num" style="font-size: clamp(96px, 8vw, 160px);">${ctx.esc(c.num ?? pad2(i + 1))}</div>
      <div style="margin-top: auto;">
        <div class="t-card-h3 st-tile__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-sm st-tile__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
      </div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? b.items.length || 1 : Math.ceil(Math.sqrt(b.items.length));
    return `<section class="v32-block st-cards" data-block-id="${b.id}" data-layout="grid">
  ${eyebrow}${title}
  <div class="st-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const right = c.metric
        ? `<div class="t-tablet-num st-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-pill-text st-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-pill-text st-row__when">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="st-row ${accentFor(i)}">
      <div class="t-tablet-num st-row__num">${ctx.esc(c.num ?? pad2(i + 1))}</div>
      <div>
        <div class="t-card-headline st-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body st-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="st-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block st-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${eyebrow}${title}
  <div style="display: flex; flex-direction: column; gap: var(--v32-gap);">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(black 底 · orange 巨大 stencil 标题 · pill CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const eyebrow = b.kicker
    ? `<div class="t-eyebrow st-closing__eyebrow" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>// ${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body st-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="st-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " ▶" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="st-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block st-closing" data-block-id="${b.id}">
  ${eyebrow}
  <h2 class="t-cover st-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const stencilTabletV32: TemplateV32 = {
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

export default stencilTabletV32;
export { stencilTabletV32, meta, fonts, themeCss };
