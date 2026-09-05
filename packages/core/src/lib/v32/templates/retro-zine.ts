/**
 * V32 S5 · Retro Zine 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/retro-zine.ts(旧 859 行,三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 retro-zine 的视觉 DNA(khaki/green/ink token + t-* 排版 +
 *      grain overlay + card-offset/stamp/ledger 组件)搬过来,并把 zine 品牌色
 *      映射到 --plain-* token 让"没覆盖的兜底块"自动吃到 khaki 底色 + green accent;
 *   2) blocks:只覆盖 zine 有强视觉主张的块(cover/statement/metrics/cards/quote/closing)。
 *      其余(prose/heading/callout/table/compare/sequence/quadrant/chart/media/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Bebas display / 3px 边 / 无圆角 /
 *      green accent)拿到 zine 观感。
 *
 * DNA(照搬旧模板注释):暖 khaki paper(#C8B99A)+ forest green(#008F4D)+ 黑 ink
 * + Bebas Neue uppercase tracked display + Space Grotesk body + Caveat hand-script 旁注
 * + SVG fractal-noise grain overlay(non-optional)+ 3px 黑边 + 12px card-offset green slab
 * + 黑底 stamp-mark(绿字 -8°)+ 0 圆角 + 0 modern shadow。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "retro-zine",
  name: "Retro Zine",
  tagline:
    "Risograph zine · 暖 khaki + forest green + 黑 ink · Bebas Neue + Caveat + 印刷 grain overlay",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Independent press magazines · mid-century activist posters · DIY zines · small-press editorials · curated cultural decks",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Bebas Neue",
  "Space Grotesk:wght@300;400;500;600",
  "Caveat:wght@400;500;600;700",
  "JetBrains Mono:wght@400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 zine 底色;再把关键 .v32-* 类重绘成 zine 观感。
const themeCss = `
:root {
  /* ── retro-zine 原 token(照搬旧模板 :root)── */
  --bg: #C8B99A;
  --bg-dark: #B8A98A;
  --green: #008F4D;
  --green-light: #00A85D;
  --black: #1A1A1A;
  --white: #F4EFE6;
  --red: #C2342B;
  --orange: #D8702A;
  --pink: #C04B7E;
  --blue: #2E5C8A;

  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'Space Grotesk', sans-serif;
  --font-script: 'Caveat', cursive;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── 把 zine 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 zine 底色 ──
     WCAG AA:black(#1A1A1A) on khaki(#C8B99A) 对比≈8:1;green(#008F4D) on khaki≈3.4:1
     只用于大字/装饰不用于小正文;mute 仍以 black 混 bg 保 ≥4.5:1 */
  --plain-bg: var(--bg);
  --plain-surface: var(--white);
  --plain-surface-2: var(--bg-dark);
  --plain-text: var(--black);
  --plain-text-mute: color-mix(in oklab, var(--black) 82%, var(--bg));
  --plain-text-faint: color-mix(in oklab, var(--black) 62%, var(--bg));
  --plain-border: var(--black);
  --plain-border-strong: var(--black);
  --plain-accent: var(--green);
  --plain-accent-strong: var(--green);
  --plain-accent-bg: color-mix(in oklab, var(--green) 16%, var(--bg) 84%);
  --plain-success: var(--green);
  --plain-warn: var(--orange);
  --plain-danger: var(--red);
  --plain-danger-bg: color-mix(in oklab, var(--red) 14%, var(--bg) 86%);

  --stage-bg: #6b613f;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--black);

  --v32-radius: 0px; /* zine 铁律:零圆角 */
  --v32-gap: 28px;   /* zine 用 3px 硬边 + gap 分隔 */
}

/* ── grain overlay(non-optional · 全屏 z-9999)· 照搬旧模板 ── */
[data-v32-root]::after,
.v32-report::after,
[data-v32-mode="present"] .v32-slide::after {
  content: "";
  position: fixed; inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  opacity: 0.07;
  z-index: 9999;
}

/* ── zine 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-cover { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, min(11vw, 18vh), 168px); line-height: 0.88; letter-spacing: 0.04em; text-transform: uppercase; color: var(--green); margin: 0; }
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(80px, min(9vw, 14vh), 140px); line-height: 0.9; letter-spacing: 0.04em; text-transform: uppercase; color: var(--green); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(64px, min(7vw, 11vh), 110px); line-height: 0.95; letter-spacing: 0.03em; text-transform: uppercase; color: var(--green); margin: 0; }
.t-headline-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, min(5.4vw, 9vh), 84px); line-height: 0.95; letter-spacing: 0.03em; text-transform: uppercase; color: var(--green); margin: 0; }
.t-statement { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(6.4vw, 10vh), 100px); line-height: 1.1; letter-spacing: 0.02em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(32px, min(3vw, 5vh), 56px); line-height: 1.1; letter-spacing: 0.04em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-num-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(140px, min(15vw, 26vh), 280px); line-height: 1; letter-spacing: 0.02em; color: var(--green); margin: 0; }
.t-num-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(64px, min(7vw, 12vh), 120px); line-height: 1; letter-spacing: 0.02em; color: var(--green); margin: 0; }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(13px, 1vw, 17px); line-height: 1.7; color: var(--black); }
.t-body-md { font-family: var(--font-body); font-weight: 400; font-size: clamp(14px, 1.1vw, 19px); line-height: 1.6; color: var(--black); }
.t-label-eyebrow { font-family: var(--font-display); font-weight: 400; font-size: clamp(14px, 1vw, 18px); line-height: 1.2; letter-spacing: 0.2em; text-transform: uppercase; color: var(--green); }
.t-label-spaced { font-family: var(--font-body); font-weight: 600; font-size: clamp(11px, 0.9vw, 14px); line-height: 1.2; letter-spacing: 0.25em; text-transform: uppercase; color: var(--black); }
.t-script { font-family: var(--font-script); font-weight: 600; font-size: clamp(22px, 2.2vw, 38px); line-height: 1.3; color: var(--black); }
.t-script-sm { font-family: var(--font-script); font-weight: 400; font-size: clamp(16px, 1.5vw, 24px); line-height: 1.3; color: var(--black); }
.t-script-lg { font-family: var(--font-script); font-weight: 600; font-size: clamp(28px, 2.6vw, 44px); line-height: 1.25; color: var(--black); }

/* ── zine 组件(照搬旧模板 · block renderer 直接用)── */
.rz-card-offset { position: relative; background: var(--white); border: 3px solid var(--black); padding: 32px; }
.rz-card-offset::before { content: ""; position: absolute; inset: 0; background: var(--green); transform: translate(12px, 12px); z-index: -1; }
.rz-line-box { border: 3px solid var(--black); padding: 32px; background: var(--bg); }
.rz-ribbon-bar { display: inline-block; background: var(--green); color: var(--white); padding: 6px 18px; font-family: var(--font-display); font-size: clamp(14px, 1.1vw, 18px); letter-spacing: 0.18em; text-transform: uppercase; }
.rz-stamp-mark { display: inline-block; background: var(--black); color: var(--green); border: 2px solid var(--green); padding: 10px 24px; font-family: var(--font-display); font-size: clamp(16px, 1.4vw, 20px); letter-spacing: 0.12em; text-transform: uppercase; transform: rotate(-8deg); }
.rz-divider-stub { width: 80px; height: 4px; background: var(--green); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.rz-cover { display: flex; flex-direction: column; gap: 40px; }
.rz-cover__top { display: flex; justify-content: space-between; align-items: center; }
.rz-cover__display { max-width: 1700px; }
.rz-cover__display .rz-tail { color: var(--black); }
.rz-cover__lead { margin: 40px 0 0; max-width: 1000px; }
.rz-cover__byline { display: flex; gap: 28px; margin-top: 40px; padding-top: 24px; border-top: 3px solid var(--black); flex-wrap: wrap; }

.rz-statement { display: flex; flex-direction: column; align-items: flex-start; }
.rz-statement__num { margin: 0 0 8px; }
.rz-statement__text { max-width: 24ch; color: var(--black); }
.rz-statement__anno { margin-top: 40px; transform: rotate(-2deg); }

.rz-metrics__title { margin: 0 0 40px; }
.rz-metrics__grid { display: grid; gap: 28px; }
.rz-metric { display: flex; flex-direction: column; gap: 14px; padding: 32px 28px; }
.rz-metric__value { display: flex; align-items: baseline; gap: 0.18em; font-size: clamp(56px, 5vw, 88px); }
.rz-metric[data-delta="up"] .rz-metric__delta { color: var(--green); font-family: var(--font-body); font-size: 0.3em; }
.rz-metric[data-delta="down"] .rz-metric__delta { color: var(--red); font-family: var(--font-body); font-size: 0.3em; }
.rz-metric[data-delta="flat"] .rz-metric__delta { color: var(--black); font-family: var(--font-body); font-size: 0.3em; }
.rz-metric__hint { margin-top: 4px; }

.rz-cards__title { margin: 0 0 40px; }
.rz-cards__grid { display: grid; gap: 28px; }
.rz-card { padding: 28px; display: flex; flex-direction: column; gap: 10px; }
.rz-card__num { color: var(--green); font-family: var(--font-display); font-size: clamp(40px, 3.4vw, 64px); line-height: 0.9; }
/* numbered / steps → 横排大条目(num | head+body | metric/when) */
.rz-cards__list { display: flex; flex-direction: column; gap: 22px; }
.rz-card-row { padding: 28px; display: grid; grid-template-columns: 90px 1fr auto; gap: 24px; align-items: baseline; }
.rz-card-row__num { color: var(--green); font-family: var(--font-display); font-size: clamp(48px, 4vw, 80px); line-height: 0.9; }
.rz-card-row__head { margin: 0; }
.rz-card-row__body { margin: 10px 0 0; }
.rz-card-row__metric { text-align: right; }
.rz-card-row__metric-v { margin: 0; font-size: clamp(36px, 3vw, 56px); }
.rz-card-row__metric-l { margin-top: 6px; }

.rz-quote { background: var(--green); color: var(--white); display: flex; flex-direction: column; align-items: center; text-align: center; }
.rz-quote__mark { font-family: var(--font-script); font-size: clamp(180px, 22vw, 420px); line-height: 0.6; color: var(--white); opacity: 0.85; margin-bottom: -40px; }
.rz-quote__text { color: var(--white); max-width: 26ch; }
.rz-quote__stub { background: var(--white); margin: 40px auto 20px; }
.rz-quote__attr { color: var(--white); transform: rotate(-1deg); }

.rz-closing { background: var(--black); color: var(--bg); display: flex; flex-direction: column; }
.rz-closing .t-label-eyebrow { color: var(--green); }
.rz-closing__stub { background: var(--bg); margin-bottom: 32px; }
.rz-closing__display { color: var(--bg); max-width: 1500px; }
.rz-closing__sub { color: var(--green); margin-top: 32px; max-width: 900px; transform: rotate(-1deg); }
.rz-closing__cta { display: flex; gap: 24px; margin-top: 56px; flex-wrap: wrap; }
.rz-cta { display: inline-block; padding: 18px 36px; text-decoration: none; font-family: var(--font-display); font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; }
.rz-cta[data-kind="primary"] { background: var(--green); color: var(--bg); border: 3px solid var(--green); }
.rz-cta[data-kind="secondary"] { color: var(--bg); border: 3px solid var(--bg); }

/* ── 兜底块的 zine 重绘(prose/heading/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 zine 的 Bebas + 3px 边 + green accent)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; letter-spacing: 0.03em; text-transform: uppercase; color: var(--black); }
.v32-prose-body { font-family: var(--font-body); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.02em; color: var(--black); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-scroll { border: 3px solid var(--black); border-radius: 0; box-shadow: none; background: var(--white); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-display); letter-spacing: 0.2em; text-transform: uppercase; color: var(--green); }
.v32-cover-display, .v32-closing-display { font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.04em; }
.v32-seq-dot, .v32-quad-dot { background: var(--green); }
.v32-cta { border-radius: 0; }

/* present 舞台:khaki 底 + 大内边距(旧 slide-inner 是 64px 80px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 64px 80px; }
[data-v32-mode="present"] .rz-cover { justify-content: space-between; height: 100%; }
[data-v32-mode="present"] .rz-statement, [data-v32-mode="present"] .rz-quote, [data-v32-mode="present"] .rz-closing { justify-content: center; height: 100%; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐样板)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderPullQuote / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const eyebrow = b.kicker
    ? `<div class="t-label-eyebrow" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : `<div class="t-label-eyebrow">ZINE</div>`;
  const tail = b.displayTail
    ? ` <span class="rz-tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-md rz-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="rz-cover__byline">${b.byline
        .map((x, j) => `<div class="t-script" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block rz-cover" data-block-id="${b.id}">
  <div class="rz-cover__top">
    ${eyebrow}
    <div class="rz-stamp-mark">ISSUE 26</div>
  </div>
  <div>
    <h1 class="t-display-cover rz-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
    ${lead}
  </div>
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-num-hero rz-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-script-lg rz-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>— ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block rz-statement" data-block-id="${b.id}">
  ${big}
  <div class="rz-divider-stub" style="margin: 24px 0 32px;"></div>
  <p class="t-statement rz-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(card-offset 首格 · Bebas 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline-md rz-metrics__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="rz-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-script-sm rz-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="${i === 0 ? "rz-card-offset" : "rz-line-box"} rz-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-num-md rz-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label-spaced" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block rz-metrics" data-block-id="${b.id}">
  <div class="t-label-eyebrow" style="margin-bottom: 18px;">Vital Signs</div>
  ${title}
  <div class="rz-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid → 网格特性卡(旧 features)
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)(旧 diagnosis/proposal)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-eyebrow" style="margin-bottom: 18px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-headline-md rz-cards__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="${i === 0 ? "rz-card-offset" : "rz-line-box"} rz-card">
      <div class="rz-card__num" aria-hidden="true">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-title" style="font-size: clamp(22px, 1.9vw, 32px);" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block rz-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="rz-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const trailing = c.metric
        ? `<div class="t-num-md rz-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-spaced rz-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="rz-ribbon-bar" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="${i === 0 ? "rz-card-offset" : "rz-line-box"} rz-card-row">
      <div class="rz-card-row__num" aria-hidden="true">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-title rz-card-row__head" style="font-size: clamp(22px, 1.8vw, 36px);" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body rz-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="rz-card-row__metric">${trailing}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block rz-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="rz-cards__list">${items}</div>
</section>`;
};

// quote ← 旧 renderPullQuote(green 满屏 · 白字 · 巨号 Caveat 引号)
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const attr = b.attribution
    ? `<div class="t-script-lg rz-quote__attr" ${ctx.edit(`${p}/attribution`, "出处")}>— ${ctx.esc(b.attribution)}</div>`
    : "";
  return `<figure class="v32-block rz-quote" data-block-id="${b.id}">
  <div class="rz-quote__mark" aria-hidden="true">&ldquo;</div>
  <blockquote class="t-statement rz-quote__text" ${ctx.edit(`${p}/text`, "引言")}>${ctx.esc(b.text)}</blockquote>
  <div class="rz-divider-stub rz-quote__stub"></div>
  ${attr}
</figure>`;
};

// closing ← 旧 renderClosing(ink 满屏 · green accent · CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-eyebrow" style="margin-bottom: 32px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-script-lg rz-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="rz-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="rz-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block rz-closing" data-block-id="${b.id}">
  ${kicker}
  <div class="rz-divider-stub rz-closing__stub"></div>
  <h2 class="t-display rz-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const retroZineV32: TemplateV32 = {
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

export default retroZineV32;
export { retroZineV32, meta, fonts, themeCss };
