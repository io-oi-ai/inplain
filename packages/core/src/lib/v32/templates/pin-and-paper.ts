/**
 * V32 S5 · Pin & Paper 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/pin-and-paper.ts(旧 863 行,三入口 ~14 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 pin-paper 视觉 DNA(cadmium 黄纸 + cobalt ink + grain overlay +
 *      三字体 + cream pin-card + 5px hard-offset shadow)搬过来,并把品牌色
 *      映射到 --plain-* token 让"没覆盖的兜底块"自动吃到黄纸底 + cream 卡;
 *   2) blocks:只覆盖 pin-paper 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘拿到 pin-card 观感。
 *
 * DNA(照搬旧模板注释):饱和 cadmium yellow paper(#EFE56A)+ fractal-noise grain
 * + 深 cobalt ink(#1F3A8A)+ cream(#F8F1D6)pin-card(1.5px border + 4px radius +
 * 5px hard offset shadow)+ Space Grotesk / Caveat / DM Mono + cinnabar red 只在 stamp。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "pin-and-paper",
  name: "Pin & Paper",
  tagline:
    "黄色 legal-pad + 钴蓝 ink + 别针手绘 · Space Grotesk + Caveat + DM Mono · 5px hard offset shadow",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Field-notebook reports · lab journal-style pitches · zine-flavored manifestos · independent studio decks · annotated research",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Space Grotesk:wght@400;500;600;700",
  "Caveat:wght@500;600;700",
  "DM Mono:wght@400;500",
]);

// V32 S5 · 别针 SVG symbols(cover/metrics 复用)· 从旧 PIN_SYMBOLS 精简
const PIN_SYMBOLS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="pap-pin" viewBox="0 0 360 110"><path d="M 320 50 a 25 25 0 1 1 -1 1 m -10 -3 q -120 5 -270 8 q -25 0 -30 -8 q -2 -7 6 -9 q 150 -8 290 -10" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="40" cy="46" r="14" fill="none" stroke="currentColor" stroke-width="5"/></symbol>
  <symbol id="pap-mark" viewBox="0 0 32 16"><line x1="0" y1="8" x2="22" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
</defs></svg>`;

// V32 S5 · themeCss = 模板 DNA。旧 :root token + .t-* 原样搬,映射 --plain-* 让兜底块
// 吃到黄纸+cream 卡;再把 .v32-* 重绘成 pin-card 观感(cream 底 / 1.5px ink border /
// 5px hard offset shadow / grain overlay)。
const themeCss = `
:root {
  /* ── pin-paper 原 token(照搬旧 :root)── */
  --paper: #EFE56A;
  --paper-2: #F5ECA0;
  --paper-3: #E8D85A;
  --paper-extra: #FBE6A4;
  --cream: #F8F1D6;
  --ink: #1F3A8A;
  --ink-deep: #0E1430;
  --red: #C2342B;

  --font-display: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
  --font-script: 'Caveat', cursive;
  --font-mono: 'DM Mono', ui-monospace, monospace;

  /* ── 映射到 --plain-* token,让"没覆盖的兜底块"自动获得 pin-paper 底色 ──
     WCAG AA:ink(#1F3A8A) on cream(#F8F1D6) 对比≈8.6:1;on paper(#EFE56A)≈7.9:1;均达标 */
  --plain-bg: var(--paper);
  --plain-surface: var(--cream);
  --plain-surface-2: var(--paper-2);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 64%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: var(--paper-extra);
  --plain-success: var(--ink);
  --plain-warn: var(--red);
  --plain-danger: var(--red);
  --plain-danger-bg: color-mix(in oklab, var(--red) 12%, var(--cream) 88%);

  --stage-bg: #2a2a16;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-display);
  --v32-radius: 4px; /* pin-paper 卡微圆角 */
  --v32-gap: 28px;   /* 卡间距 */
}

/* ── pin-paper 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-mega { font-family: var(--font-display); font-weight: 700; font-size: clamp(120px, min(11vw, 18vh), 196px); line-height: 1.05; letter-spacing: -0.04em; color: var(--ink); margin: 0; }
.t-display-stat { font-family: var(--font-display); font-weight: 700; font-size: clamp(96px, min(9vw, 15vh), 168px); line-height: 0.85; letter-spacing: -0.04em; color: var(--ink); margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 700; font-size: clamp(72px, min(7vw, 12vh), 130px); line-height: 1.05; letter-spacing: -0.035em; color: var(--ink); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(56px, min(5.4vw, 9vh), 96px); line-height: 1.05; letter-spacing: -0.03em; color: var(--ink); margin: 0; }
.t-card-row { font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, min(2.5vw, 4vh), 44px); line-height: 1; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-card-h3 { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px, min(2.1vw, 3.4vh), 38px); line-height: 1.02; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-body { font-family: var(--font-display); font-weight: 400; font-size: clamp(15px, 1.15vw, 22px); line-height: 1.45; color: var(--ink); }
.t-scribble-lg { font-family: var(--font-script); font-weight: 700; font-size: clamp(40px, min(4vw, 6.4vh), 70px); line-height: 0.9; color: var(--ink); }
.t-scribble-md { font-family: var(--font-script); font-weight: 700; font-size: clamp(36px, min(3.4vw, 5.6vh), 60px); line-height: 0.9; color: var(--ink); }
.t-scribble-sm { font-family: var(--font-script); font-weight: 600; font-size: clamp(24px, min(2.2vw, 3.6vh), 38px); line-height: 1.05; color: var(--ink); }
.t-scribble-xs { font-family: var(--font-script); font-weight: 600; font-size: clamp(20px, min(1.9vw, 3vh), 32px); line-height: 1.05; color: var(--ink); }
.t-label-meta { font-family: var(--font-mono); font-weight: 500; font-size: 16px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }

/* ── grain overlay(系统签名 · report 用 body::before,present 用 .slide::before)── */
[data-v32-mode] body::before, [data-v32-mode="present"] .slide::before {
  content: ""; position: fixed; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
  mix-blend-mode: multiply; opacity: 0.28; z-index: 0;
}
[data-v32-mode="present"] .slide::before { position: absolute; }

/* ── pin-card 通用件(覆盖块 + 兜底重绘共用)── */
.pin-card {
  position: relative; background: var(--cream);
  border: 1.5px solid var(--ink); border-radius: 4px;
  box-shadow: 5px 6px 0 0 var(--ink);
  padding: 28px 28px 24px; display: flex; flex-direction: column; gap: 12px;
}
.pin-card.alt { background: var(--paper-2); }
.pin-card.alt2 { background: var(--paper-extra); transform: rotate(0.6deg); }
.pap-stamp {
  display: inline-block; border: 3px solid var(--red); color: var(--red);
  padding: 6px 16px; font-family: var(--font-mono); font-size: 16px; font-weight: 500;
  letter-spacing: 0.18em; text-transform: uppercase; transform: rotate(-4deg); background: transparent;
}
.pap-pin-illust { position: absolute; width: 110px; height: auto; color: var(--ink); z-index: 3; top: -22px; left: 32px; transform: rotate(-10deg); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.pap-cover { align-items: flex-start; }
.pap-cover__pin { width: 280px; height: auto; color: var(--ink); margin-bottom: 16px; transform: rotate(-8deg); }
.pap-cover__lead { margin: 40px 0 0; max-width: 880px; }
.pap-cover__byline { margin-top: 48px; transform: rotate(-2deg); }
.pap-cover__tail { font-family: var(--font-script); font-weight: 700; color: var(--ink); }

.pap-statement { align-items: flex-start; }
.pap-statement__num { margin-bottom: 24px; }
.pap-statement__text { max-width: 20ch; }
.pap-statement__anno { margin-top: 48px; transform: rotate(-2.5deg); }

.pap-metrics__grid { display: grid; gap: 32px; }
.pap-metric__hint { margin-top: 6px; }

.pap-cards__list { display: flex; flex-direction: column; gap: 24px; }
.pap-card-row { display: grid; grid-template-columns: auto 1fr auto; gap: 24px; align-items: baseline; padding: 28px; }
.pap-card-row__body { margin-top: 10px; }
.pap-card-row__metric { text-align: right; }
.pap-card-row__metric-l { font-size: 12px; margin-top: 6px; }
.pap-cards__grid { display: grid; gap: 28px; }
.pap-card__body { margin-top: 10px; opacity: 0.9; }

.pap-closing__cta { display: flex; gap: 24px; margin-top: 56px; }
.pap-cta { padding: 20px 36px; text-decoration: none; font-family: var(--font-display); font-weight: 700; font-size: 18px; border-radius: 4px; display: inline-block; }
.pap-cta[data-kind="primary"] { background: var(--paper); color: var(--ink); border: 1.5px solid var(--paper); box-shadow: 5px 6px 0 0 var(--paper); }
.pap-cta[data-kind="secondary"] { border: 1.5px solid var(--paper); color: var(--paper); }

/* ── 兜底块的 pin-paper 重绘:把素模板卡片拉回 cream pin-card + 手写体 ── */
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table, .v32-chart, .v32-media-figure {
  background: var(--cream); border: 1.5px solid var(--ink); border-radius: 4px;
  box-shadow: 5px 6px 0 0 var(--ink); padding: 26px 28px;
}
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-media-title, .v32-chart-title, .v32-closing-display { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; }
.v32-prose-body, .v32-card-body, .v32-compare-bullets, .v32-media-body { font-family: var(--font-display); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-script); font-weight: 700; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; }
.v32-seq-dot, .v32-quad-dot { background: var(--ink); }

/* present 舞台:黄纸底 + 大内边距(旧 slide-inner 是 110px/64px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 110px 64px 90px; }
[data-v32-mode="present"] .pap-cover__pin { width: 280px; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐样板)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段从旧 slide.xxx → v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(别针 SVG + stamp kicker + 手写署名)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="pap-stamp" style="margin-bottom: 32px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="pap-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}> ${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body pap-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="t-scribble-sm pap-cover__byline">— ${b.byline
        .map((x, j) => `<span ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`)
        .join(" · ")}</div>`
    : "";
  return `<section class="v32-block pap-cover" data-block-id="${b.id}">
  ${PIN_SYMBOLS}
  <svg class="pap-cover__pin" viewBox="0 0 360 110"><use href="#pap-pin"/></svg>
  ${kicker}
  <h1 class="t-display-mega" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(大数字 + 大标题 + 手写注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display-stat pap-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-scribble-md pap-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block pap-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-h1 pap-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(pinned cream 卡 · 交替底色 · 首卡钉别针)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2" style="margin: 0 0 48px;" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const alt = i % 3 === 1 ? "alt" : i % 3 === 2 ? "alt2" : "";
      const pin = i === 0 ? `${PIN_SYMBOLS}<svg class="pap-pin-illust" viewBox="0 0 360 110"><use href="#pap-pin"/></svg>` : "";
      const hint = m.hint ? `<div class="t-scribble-xs pap-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="pin-card ${alt}" style="padding: 32px 26px;">
      ${pin}
      <div class="t-card-row">${ctx.esc(m.value)}</div>
      <div class="t-label-meta" style="font-size: 13px;" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block pap-metrics" data-block-id="${b.id}">
  ${title}
  <div class="pap-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid            → 网格特性卡 · 旧 features
//   layout=numbered/steps  → 横排大条目(手写编号 | head+body | metric/when)· 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="pap-stamp" style="margin-bottom: 24px;" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2" style="margin: 0 0 36px;" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cgap = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const alt = i % 3 === 0 ? "" : i % 3 === 1 ? "alt" : "alt2";
        return `<div class="pin-card ${alt}" style="padding: 28px;">
      <div class="t-scribble-md">${ctx.esc(c.num ?? String(i + 1))}</div>
      <div class="t-card-h3" style="margin-top: 6px;" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body pap-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block pap-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="pap-cards__grid" style="grid-template-columns: repeat(${cgap}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const alt = i % 2 === 1 ? "alt" : "";
      const right = c.metric
        ? `<div class="t-card-row" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-meta pap-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label-meta" style="font-size: 13px; opacity: 0.7;">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="pin-card ${alt} pap-card-row">
      <div class="t-scribble-lg">${ctx.esc(c.num ?? String(i + 1))}</div>
      <div>
        <div class="t-card-h3" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body pap-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="pap-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block pap-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="pap-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(ink-deep 底 · 黄纸 CTA + hard-offset shadow)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-scribble-md" style="color: var(--paper); margin-bottom: 32px; transform: rotate(-2deg);" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-body" style="color: var(--paper); opacity: 0.85; margin-top: 32px; max-width: 800px;" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="pap-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="pap-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block pap-closing" data-block-id="${b.id}" style="background: var(--ink-deep); color: var(--paper);">
  ${kicker}
  <h2 class="t-h1" style="color: var(--paper); max-width: 1500px;" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const pinAndPaperV32: TemplateV32 = {
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

export default pinAndPaperV32;
export { pinAndPaperV32, meta, fonts, themeCss };
