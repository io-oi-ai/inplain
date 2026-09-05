/**
 * V32 S5 · Pink Script (After Hours) 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/pink-script.ts(旧 969 行,三入口 ~14 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 pink-script 的视觉 DNA(ink/pink/paper token + t-* 排版 + film grain
 *      + 1px interior frame 气氛层)搬过来,并把 pink 色映射到 --plain-* token 让
 *      "没覆盖的兜底块"自动吃到黑底热粉观感;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/quote/closing)。
 *      其余(prose/heading/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 对 .v32-* 的重绘(DM Serif + 热粉 + pink hairline)拿到观感。
 *
 * DNA(照搬旧模板注释):深 warm-black surface + radial gradient lit upper-left +
 * 8% film-grain screen overlay + 1px paper-blush 14% interior frame + 单一 hot fuchsia
 * (#ED3D8C)accent + DM Serif Display 单 weight + pink halo text-shadow + Inter 300 body。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "pink-script",
  name: "Pink Script (After Hours)",
  tagline:
    "深夜杂志 · 黑底热粉 + DM Serif italic + film grain + 1px interior frame · 单一 fuchsia accent",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Fashion brand decks · beauty/perfume product reveals · late-night editorial · couture lookbooks · poetic creative pitches",
};

// V32 S5 · fonts:搬旧 fontLinks(含 SC 兜底)
const fonts = fontLinks([
  "DM Serif Display",
  "Inter:wght@300;400;500;600",
  "JetBrains Mono:wght@400;500",
  "Noto Serif SC:wght@400;500;700;900",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到黑底热粉底色;再把关键 .v32-* 类重绘成 pink-script 观感。
const themeCss = `
:root {
  /* ── pink-script 原 token(照搬旧模板 :root)── */
  --ink-deep: #060507;
  --ink-violet: #0F0D11;
  --paper-blush: #F5EDF1;
  --pink: #ED3D8C;
  --pink-light: #FF66A8;
  --pink-deep: #B81D67;
  --line-pink: rgba(237, 61, 140, 0.32);
  --mute-paper: rgba(245, 237, 241, 0.55);
  --hair-paper: rgba(245, 237, 241, 0.14);

  --font-display: 'DM Serif Display', 'Noto Serif SC', serif;
  --font-body: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Noto Sans SC', monospace;

  /* ── 把 pink-script 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得黑底热粉底色 ──
     WCAG AA:paper-blush(#F5EDF1) on ink-deep(#060507) 对比≈18:1;
     mute-paper(55% paper on ink)≈9:1;pink(#ED3D8C) on ink≈5:1 均达标 */
  --plain-bg: var(--ink-deep);
  --plain-surface: color-mix(in oklab, var(--paper-blush) 4%, var(--ink-deep));
  --plain-surface-2: color-mix(in oklab, var(--pink) 8%, var(--ink-deep));
  --plain-text: var(--paper-blush);
  --plain-text-mute: var(--mute-paper);
  --plain-text-faint: color-mix(in oklab, var(--paper-blush) 40%, var(--ink-deep));
  --plain-border: var(--line-pink);
  --plain-border-strong: var(--pink);
  --plain-accent: var(--pink);
  --plain-accent-strong: var(--pink);
  --plain-accent-bg: color-mix(in oklab, var(--pink) 10%, var(--ink-deep) 90%);
  --plain-success: var(--pink);
  --plain-warn: var(--pink-light);
  --plain-danger: var(--pink);
  --plain-danger-bg: color-mix(in oklab, var(--pink) 12%, var(--ink-deep) 88%);

  --stage-bg: #060507;
  --slide-bg: var(--ink-deep);
  --doc-page-bg: var(--ink-deep);
  --doc-text: var(--paper-blush);

  --v32-radius: 0px; /* pink-script 铁律:零圆角 · 靠 hairline 分隔 */
  --v32-gap: 0px;
}

/* ── pink-script 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-script-cover { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, 14vw, 260px); line-height: 1.02; letter-spacing: -0.015em; color: var(--pink); margin: 0; text-shadow: 0 0 80px rgba(237, 61, 140, 0.18); padding-bottom: 0.12em; }
.t-script-large { font-family: var(--font-display); font-weight: 400; font-size: clamp(100px, 11vw, 220px); line-height: 1.04; color: var(--pink); margin: 0; text-shadow: 0 0 80px rgba(237, 61, 140, 0.18); padding-bottom: 0.1em; }
.t-script-med { font-family: var(--font-display); font-weight: 400; font-size: clamp(72px, 8vw, 156px); line-height: 1.04; color: var(--pink); margin: 0; padding-bottom: 0.1em; }
.t-serif-h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, 6vw, 112px); line-height: 1.06; color: var(--paper-blush); margin: 0; padding-bottom: 0.1em; }
.t-serif-quote { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, 4.6vw, 88px); line-height: 1.05; letter-spacing: -0.005em; color: var(--paper-blush); margin: 0; padding-bottom: 0.1em; }
.t-serif-stat { font-family: var(--font-display); font-weight: 400; font-size: clamp(64px, 6vw, 116px); line-height: 0.9; color: var(--pink); margin: 0; }
.t-serif-row { font-family: var(--font-display); font-weight: 400; font-size: clamp(30px, 2.8vw, 48px); line-height: 1.06; color: var(--paper-blush); margin: 0; padding-bottom: 0.08em; }
.t-body { font-family: var(--font-body); font-weight: 300; font-size: clamp(15px, 1.1vw, 20px); line-height: 1.55; color: var(--paper-blush); }
.t-body-muted { font-family: var(--font-body); font-weight: 300; font-size: clamp(14px, 1vw, 18px); line-height: 1.5; color: var(--mute-paper); }
.t-kicker { font-family: var(--font-mono); font-weight: 400; font-size: clamp(12px, 0.85vw, 18px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--pink); }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(11px, 0.8vw, 16px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--paper-blush); }

/* em color switch inside paper-blush headlines · 系统 emphasis */
.t-serif-h2 em, .t-serif-row em, .t-serif-quote em { color: var(--pink); font-style: normal; }

/* pink hairline / rail */
.ps-pink-rule { height: 1px; background: var(--pink); opacity: 0.5; border: none; }
.ps-rail { border-left: 1px solid var(--pink); padding-left: 24px; }

/* ── film grain + interior frame 气氛层(present 舞台绝对定位)· 照搬旧模板 ── */
[data-v32-mode="present"] .v32-slide {
  background: radial-gradient(ellipse 90% 70% at 30% 30%, #1A1218 0%, #0A0709 55%, #050306 100%);
  color: var(--paper-blush);
}
[data-v32-mode="present"] .v32-slide::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)' opacity='0.5'/></svg>");
  opacity: 0.08; mix-blend-mode: screen;
}
[data-v32-mode="present"] .v32-slide::after {
  content: ""; position: absolute; inset: 36px;
  border: 1px solid var(--hair-paper); pointer-events: none; z-index: 2;
}
[data-v32-mode="present"] .v32-slide-inner { padding: 96px 80px 108px; position: relative; z-index: 3; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.ps-cover { position: relative; }
.ps-cover__issue { margin-bottom: 32px; letter-spacing: 0.42em; color: var(--paper-blush); }
.ps-cover__display { }
.ps-cover__tail { display: block; padding-left: 0.4em; color: var(--paper-blush); text-shadow: none; font-family: var(--font-display); font-size: clamp(56px, 6vw, 120px); line-height: 1.02; }
.ps-cover__lead { margin: 48px 0 0; max-width: 880px; }
.ps-cover__byline { margin-top: 56px; display: flex; gap: 32px; flex-wrap: wrap; }

.ps-statement { position: relative; text-align: center; }
.ps-statement__num { margin: 0 0 24px; }
.ps-statement__text { margin: 0 auto; max-width: 24ch; }
.ps-statement__rule { width: 80px; margin: 48px auto 20px; }
.ps-statement__anno { }

.ps-metrics__title { margin: 0 0 48px; }
.ps-metric { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 32px; padding: 28px 0; border-bottom: 1px solid var(--hair-paper); align-items: baseline; }
.ps-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.ps-metric__delta { font-family: var(--font-body); font-size: 0.3em; }
.ps-metric[data-delta="down"] .ps-metric__delta { color: var(--pink-light); }
.ps-metric__label { margin-bottom: 12px; }
.ps-metric__hint { max-width: 720px; }

.ps-cards__kicker { margin-bottom: 24px; }
.ps-cards__title { margin: 0 0 48px; max-width: 1400px; }
/* numbered / steps → 横排大条目;grid → 竖排 rail 卡 */
.ps-card-row { display: grid; grid-template-columns: 120px 1fr 220px; gap: 28px; padding: 28px 0; border-top: 1px solid var(--line-pink); align-items: baseline; }
.ps-card-row__head { margin: 0 0 14px; }
.ps-card-row__body { max-width: 720px; }
.ps-card-row__aside { text-align: right; }
.ps-card-row__metric-l { margin-top: 8px; }
.ps-cards__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 32px; }
.ps-card { padding: 24px 24px 24px 28px; }
.ps-card__num { margin-bottom: 16px; }
.ps-card__head { margin: 0 0 16px; }

.ps-quote { position: relative; }
.ps-quote__mark { font-family: var(--font-display); font-size: clamp(120px, 14vw, 200px); color: var(--pink); line-height: 0.6; height: 0.5em; }
.ps-quote__text { max-width: 1500px; margin-top: 24px; }
.ps-quote__attr { margin-top: 56px; }

.ps-closing { text-align: left; }
.ps-closing__kicker { margin-bottom: 32px; }
.ps-closing__sub { margin-top: 48px; max-width: 1000px; }
.ps-closing__cta { display: flex; gap: 28px; margin-top: 64px; flex-wrap: wrap; }
.ps-cta { display: inline-block; padding: 18px 32px; text-decoration: none; font-family: var(--font-mono); font-size: clamp(13px, 0.9vw, 15px); letter-spacing: 0.1em; text-transform: uppercase; border: 1px solid var(--pink); }
.ps-cta[data-kind="primary"] { background: var(--pink); color: var(--ink-deep); }
.ps-cta[data-kind="secondary"] { color: var(--pink); }

/* ── 兜底块的 pink-script 重绘(prose/heading/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回黑底热粉 + DM Serif + pink hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-weight: 400; color: var(--paper-blush);
}
.v32-prose-body { font-family: var(--font-body); font-weight: 300; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); color: var(--paper-blush); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; color: var(--pink); }
.v32-table-el thead th { border-color: var(--pink); color: var(--pink); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderPullQuote / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。renderer 只出 block DOM,
// 不写 slide/pagenum/舞台包裹(那是 render-report 的活)。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const tail = b.displayTail
    ? `<span class="ps-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-muted ps-cover__lead" ${ctx.edit(`${p}/lead`, "封面引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ps-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  const kicker = b.kicker
    ? `<div class="t-kicker ps-cover__issue" ${ctx.edit(`${p}/kicker`, "封面眉标")}>— ${ctx.esc(b.kicker)} —</div>`
    : `<div class="t-kicker ps-cover__issue">— After Hours —</div>`;
  return `<section class="v32-block ps-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-script-cover ps-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}</h1>${tail}
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation · 居中大 script)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-script-med ps-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="ps-pink-rule ps-statement__rule"></div><div class="t-kicker ps-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ps-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-serif-quote ps-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · DM Serif 大 stat)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-serif-h2 ps-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ps-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-body-muted ps-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="ps-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-serif-stat ps-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div>
        <div class="t-kicker ps-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
        ${hint}
      </div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ps-metrics" data-block-id="${b.id}">
  <div class="t-kicker" style="margin-bottom:24px;">Numerical</div>
  ${title}
  <div>${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)
//   layout=grid           → pink-rail 特性卡网格
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker ps-cards__kicker" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-serif-h2 ps-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<div class="ps-rail ps-card">
      <div class="t-kicker ps-card__num" aria-hidden="true">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-serif-row ps-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-muted" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block ps-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ps-cards__grid">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis / proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const aside = c.metric
        ? `<div class="t-serif-stat" style="font-size:clamp(40px,4vw,64px);" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-kicker ps-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<span class="ps-cta" data-kind="secondary" style="padding:8px 18px;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</span>`
          : "";
      return `<div class="ps-card-row">
      <div class="t-serif-stat" style="font-size:clamp(48px,5vw,80px);">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-serif-row ps-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-muted ps-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ps-card-row__aside">${aside}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ps-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div>${items}</div>
</section>`;
};

// quote ← 旧 renderPullQuote(巨号 pink 引号 + serif-quote + pink rail 署名)
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const attr = b.attribution
    ? `<figcaption class="ps-rail ps-quote__attr"><div class="t-kicker">— <span ${ctx.edit(`${p}/attribution`, "署名")}>${ctx.esc(b.attribution)}</span></div></figcaption>`
    : "";
  return `<figure class="v32-block ps-quote" data-block-id="${b.id}">
  <div class="ps-quote__mark" aria-hidden="true">&ldquo;</div>
  <blockquote class="t-serif-quote ps-quote__text" ${ctx.edit(`${p}/text`, "引言")}>${ctx.esc(b.text)}</blockquote>
  ${attr}
</figure>`;
};

// closing ← 旧 renderClosing(大 script 结语 + pill CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker ps-closing__kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-body-muted ps-closing__sub" style="font-size:clamp(18px,1.4vw,24px);" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="ps-cta" data-kind="${kind}"${href} ${ctx.edit(`${p}/cta/${kind}/label`, kind === "primary" ? "主按钮" : "次按钮")}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ps-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ps-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-script-large" ${ctx.edit(`${p}/display`, "结语标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const pinkScriptV32: TemplateV32 = {
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

export default pinkScriptV32;
export { pinkScriptV32, meta, fonts, themeCss };
