/**
 * V32 S5 · Cobalt Grid 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/cobalt-grid.ts(旧 1022 行,三入口 14+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 cobalt 的视觉 DNA(paper/ink token + graph-paper 底 + t-* 排版 +
 *      hairline / pixel-glitch 气氛)搬过来,并把 cobalt 色映射到 --plain-* token
 *      让"没覆盖的兜底块"自动吃到 cream+cobalt 底色。这是核心,省大量代码。
 *   2) blocks:只覆盖 cobalt 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Newsreader serif / hairline /
 *      无圆角)拿到 cobalt 观感。
 *
 * DNA(照搬旧模板注释):cream paper (#F0EBDE) + electric cobalt (#1F2BE0) 单一两色;
 * 永久 graph-paper grid(10% cobalt)在每张 slide 背后;1.5px cobalt hairline;
 * pixel-glitch column SVG;QR-style 8×8 mosaic;Newsreader serif weight 400 永不加粗;
 * DM Mono chrome;完全 flat · 零 shadow · 零 radius。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "cobalt-grid",
  name: "Cobalt Grid",
  tagline:
    "Japanese 设计研究公报 · graph-paper 永久背景 + Newsreader serif + 单一 cobalt 蓝 · pixel-glitch 装饰列",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Trend reports · design research · architectural briefs · risograph-style monographs · curatorial indices",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Newsreader:ital,opsz,wght@0,6..72,400..500;1,6..72,400..500",
  "Hanken Grotesk:wght@400;600;700",
  "DM Mono:wght@400;500",
  "Noto Serif SC:wght@400;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 cobalt 底色;再把关键 .v32-* 类重绘成 cobalt 观感。
const themeCss = `
:root {
  /* ── cobalt 原 token(照搬旧模板 :root)── */
  --paper: #F0EBDE;
  --paper-2: #E6E0CE;
  --ink: #1F2BE0;
  --ink-soft: #5560E5;
  --grid-line: rgba(31, 43, 224, 0.10);
  --ink-faint: rgba(31, 43, 224, 0.18);

  --font-display: 'Newsreader', 'Noto Serif SC', Georgia, serif;
  --font-ui: 'Hanken Grotesk', 'Noto Serif SC', sans-serif;
  --font-mono: 'DM Mono', ui-monospace, monospace;

  /* ── 把 cobalt 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 cobalt 底色 ──
     WCAG AA:ink(#1F2BE0) on paper(#F0EBDE) 对比≈7:1;mute 混 paper 仍 ≥4.5:1 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-2);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 68%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: color-mix(in oklab, var(--ink) 8%, var(--paper) 92%);
  --plain-success: var(--ink);
  --plain-warn: var(--ink-soft);
  --plain-danger: var(--ink);
  --plain-danger-bg: color-mix(in oklab, var(--ink) 6%, var(--paper) 94%);

  --stage-bg: #F0EBDE;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* cobalt 铁律:零圆角 */
  --v32-gap: 0px;    /* cobalt 用 hairline 而非 gap 分隔 */
}

/* ── graph-paper 气氛底(照搬旧 .slide::before / body 网格)· 铺满 report/present ── */
[data-v32-mode] body,
[data-v32-mode] .v32-stage {
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: 36px 36px;
}

/* ── cobalt 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(80px, min(10vw, 18vh), 180px); line-height: 0.92; letter-spacing: -0.008em; color: var(--ink); margin: 0; }
.t-display-chapter { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(6.4vw, 11vh), 124px); line-height: 1; letter-spacing: -0.005em; color: var(--ink); margin: 0; }
.t-vbig-numeral { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, min(13vw, 22vh), 240px); line-height: 0.92; letter-spacing: -0.015em; color: var(--ink); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, min(4.6vw, 8vh), 84px); line-height: 0.96; color: var(--ink); margin: 0; }
.t-headline-sm { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, min(2.6vw, 4.4vh), 46px); line-height: 1.06; color: var(--ink); margin: 0; }
.t-row-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(24px, 1.9vw, 36px); line-height: 1.05; color: var(--ink); margin: 0; }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 0.95vw, 15px); line-height: 1.5; color: var(--ink); }
.t-body-lede { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1vw, 18px); line-height: 1.55; color: var(--ink); }
.t-micro { font-family: var(--font-ui); font-weight: 600; font-size: clamp(12px, 0.9vw, 14px); letter-spacing: 0.16em; text-transform: uppercase; line-height: 1; color: var(--ink); }
.t-micro-strong { font-family: var(--font-ui); font-weight: 600; font-size: clamp(13px, 1vw, 16px); letter-spacing: 0.18em; text-transform: uppercase; line-height: 1; color: var(--ink); }
.t-mono-tag { font-family: var(--font-mono); font-weight: 400; font-size: clamp(13px, 0.9vw, 15px); letter-spacing: 0.04em; color: var(--ink); }

/* cobalt 分隔件:上下 hairline + topbar-rule */
.cg-topbar { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 16px; border-bottom: 1.5px solid var(--ink); margin-bottom: 36px; }

/* pixel-glitch column(present 舞台绝对定位)· 照搬旧模板签名装饰 */
.cg-glitch { position: absolute; top: 0; right: 0; width: 240px; height: 100%; pointer-events: none; z-index: 0; opacity: 0.7; }
/* QR-block 8×8 mosaic patch */
.cg-qr { position: absolute; width: 72px; height: 72px; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); gap: 1.5px; background: var(--paper); padding: 4px; box-shadow: 0 0 0 1.5px var(--paper); z-index: 3; }
.cg-qr .on { background: var(--ink); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.cg-cover { position: relative; }
.cg-cover__top { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 16px; border-bottom: 1.5px solid var(--ink); }
.cg-cover__display { margin: 0.4em 0 0; max-width: 1300px; }
.cg-cover__display .cg-tail { display: block; font-style: italic; margin-top: 0.1em; }
.cg-cover__lead { margin: 36px 0 0; max-width: 720px; }
.cg-cover__byline { display: flex; gap: 32px; margin-top: 40px; padding-top: 16px; border-top: 1.5px solid var(--ink); }

.cg-statement { position: relative; }
.cg-statement__num { margin: 0 0 24px; }
.cg-statement__text { font-style: italic; margin: 0; max-width: 22ch; }
.cg-statement__anno { margin-top: 48px; }

.cg-metrics__grid { display: grid; gap: 0; border-top: 1.5px solid var(--ink); }
.cg-metric { display: flex; flex-direction: column; padding: 32px 24px; }
.cg-metric + .cg-metric { border-left: 1px solid var(--ink-faint); }
.cg-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.14em; }
.cg-metric__delta { font-family: var(--font-ui); font-size: 0.24em; }
.cg-metric[data-delta="down"] .cg-metric__delta { color: var(--ink-soft); }
.cg-metric__label { margin-top: 16px; }
.cg-metric__hint { margin-top: 8px; opacity: 0.7; }

.cg-cards__list { border-top: 1.5px solid var(--ink); }
/* numbered / steps → 横排大条目;grid → 网格 */
.cg-card-row { display: grid; grid-template-columns: 76px 1fr 220px; gap: 24px; padding: 28px 0; border-bottom: 1px solid var(--ink-faint); align-items: baseline; }
.cg-card-row__num { font-size: 18px; }
.cg-card-row__head { margin: 0 0 8px; }
.cg-card-row__body { max-width: 760px; }
.cg-card-row__metric { text-align: right; }
.cg-card-row__metric-l { margin-top: 8px; opacity: 0.65; }
.cg-cards__grid { display: grid; border-top: 1.5px solid var(--ink); border-left: 1.5px solid var(--ink); }
.cg-card { padding: 24px 28px; border-bottom: 1px solid var(--ink-faint); border-right: 1px solid var(--ink-faint); }
.cg-card__num { margin-bottom: 12px; opacity: 0.6; }
.cg-card__head { margin: 0 0 12px; }
.cg-card__body { opacity: 0.85; }

.cg-closing { position: relative; text-align: right; }
.cg-closing__display { max-width: 1300px; margin-left: auto; }
.cg-closing__sub { margin: 32px 0 0 auto; max-width: 760px; }
.cg-closing__cta { display: flex; gap: 24px; margin-top: 56px; justify-content: flex-end; }
.cg-cta { padding: 16px 32px; text-decoration: none; font-family: var(--font-mono); font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; display: inline-block; }
.cg-cta[data-kind="primary"] { background: var(--ink); color: var(--paper); }
.cg-cta[data-kind="secondary"] { border: 1.5px solid var(--ink); color: var(--ink); }

/* ── 兜底块的 cobalt 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 cobalt 的 serif + hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; }
.v32-prose-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el { border-radius: 0; box-shadow: none; }
.v32-callout { border: 1.5px solid var(--ink); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-ui); letter-spacing: 0.16em; }
.v32-table-el th { font-family: var(--font-mono); font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1.5px solid var(--ink); }
.v32-table-el td { border-bottom: 1px solid var(--ink-faint); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 110px 64px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 92px 64px 96px; }
[data-v32-mode="present"] .cg-cover__display { font-size: clamp(80px, 10vw, 180px); }
[data-v32-mode="present"] .cg-closing__display { font-size: clamp(56px, 8vw, 124px); }
`.trim();

// V32 S5 · 确定性 QR 8×8 图案(照搬旧 qrBlock pattern)
function qrPatch(style: string): string {
  const pattern = [
    1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0,
    1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1,
    0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0,
    0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0,
  ];
  const cells = pattern.map((on) => `<div class="${on ? "on" : ""}"></div>`).join("");
  return `<div class="cg-qr" style="${style}">${cells}</div>`;
}

// V32 S5 · pixel-glitch 竖线列 SVG(照搬旧 pixelGlitchSvg 精简版)
function glitchSvg(): string {
  const lines = Array.from({ length: 30 }, (_, i) =>
    `<line x1="${i * 8 + 4}" y1="0" x2="${i * 8 + 4}" y2="1080" stroke="#1F2BE0" stroke-width="2" />`,
  ).join("");
  return `<svg class="cg-glitch" viewBox="0 0 240 1080" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${lines}</svg>`;
}

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx(steps→items · num 兜底 · path 用 ctx.pathPrefix)。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const tail = b.displayTail
    ? `<span class="cg-tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const kicker = b.kicker
    ? `<div class="t-micro" style="margin-top:24px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-lede cg-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="cg-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono-tag" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block cg-cover" data-block-id="${b.id}">
  ${glitchSvg()}
  ${qrPatch("top:0;right:110px;")}
  <div class="cg-cover__top">
    <div class="t-micro">STUDIO</div>
    <div class="t-mono-tag">DESIGN INDEX</div>
  </div>
  ${kicker}
  <h1 class="t-display-hero cg-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-vbig-numeral cg-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-micro-strong cg-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block cg-statement" data-block-id="${b.id}">
  ${qrPatch("top:0;right:0;")}
  ${big}
  <p class="t-display-chapter cg-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · Newsreader 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<div class="cg-topbar"><h2 class="t-headline" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2><div class="t-mono-tag">DATA</div></div>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="cg-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body cg-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="cg-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-vbig-numeral cg-metric__value" style="font-size:clamp(56px,6vw,96px);">${ctx.esc(m.value)}${delta}</div>
      <div class="t-micro cg-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block cg-metrics" data-block-id="${b.id}">
  ${title}
  <div class="cg-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const tag = ctx.esc(b.kicker ?? (b.layout === "grid" ? "INDEX" : "PROPOSAL"));
  const title = b.title
    ? `<div class="cg-topbar"><h2 class="t-headline" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2><div class="t-mono-tag">${tag}</div></div>`
    : "";

  if (b.layout === "grid") {
    const cgcols = b.items.length <= 3 ? b.items.length : Math.ceil(b.items.length / 2);
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="cg-card">
      <div class="t-mono-tag cg-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-row-headline cg-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body cg-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block cg-cards" data-block-id="${b.id}" data-layout="grid">
  ${title}
  <div class="cg-cards__grid" style="grid-template-columns: repeat(${Math.min(cgcols, 4)}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const aside = c.metric
        ? `<div class="t-headline-sm cg-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-micro cg-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono-tag" style="opacity:0.7;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="cg-card-row">
      <div class="t-mono-tag cg-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-row-headline cg-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body cg-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="cg-card-row__metric">${aside}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block cg-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${title}
  <div class="cg-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(右对齐 · pixel-glitch 左列 · ink CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-micro-strong" style="margin-bottom:24px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-lede cg-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="cg-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="cg-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block cg-closing" data-block-id="${b.id}">
  <svg class="cg-glitch" style="left:0;right:auto;" viewBox="0 0 240 1080" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 8 + 4}" y1="0" x2="${i * 8 + 4}" y2="1080" stroke="#1F2BE0" stroke-width="2" />`).join("")}</svg>
  ${kicker}
  <h2 class="t-display-chapter cg-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const cobaltGridV32: TemplateV32 = {
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

export default cobaltGridV32;
export { cobaltGridV32, meta, fonts, themeCss };
