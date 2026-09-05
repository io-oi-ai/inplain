/**
 * V32 S5 · Mat 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/mat.ts(旧 830 行,三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 mat 的视觉 DNA(dark-forest/cream/wood-glow token + t-* 排版 +
 *      wood atmospheric glow + em-dash/em 强调)搬过来,并把 mat 色映射到 --plain-*
 *      token 让"没覆盖的兜底块"自动吃到深绿底色 + 暖橙强调;
 *   2) blocks:只覆盖 mat 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/sequence/quadrant/chart/media/group)
 *      走兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘拿到 mat 观感。
 *
 * DNA(照搬旧模板注释):深森林绿底(#232E26)+ 暖奶白字(#F0E8D2)+ 木棕辐射光晕(#7A4E24)
 * + 单一暖橙强调(#C07030)· Bricolage Grotesque 700-800 mixed-case · DM Sans body
 * + DM Mono uppercase tracked label · 1px hairline · 零 radius · 零 shadow · 零 italic
 * + em-dash mono 橙 = 唯一 bullet · <em> = upright 橙色 inline 强调。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "mat",
  name: "Mat",
  tagline:
    "工业产品页 · 深绿木棕氛围光 + Bricolage mixed-case + DM Sans body · 暖橙是唯一 inline 强调",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Product launches · industrial design portfolios · hardware decks · material brand books · boutique launches · craft / atelier moments",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Bricolage Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800",
  "DM Sans:wght@400;500;700",
  "DM Mono:wght@400;500",
  "Noto Serif SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 mat 深绿底 + 暖橙强调;再把关键 .v32-* 类重绘成 mat 观感。
const themeCss = `
:root {
  /* ── mat 原 token(照搬旧模板 :root)── */
  --bg-dark: #232E26;
  --bg-dark-alt: #2E3D30;
  --bg-cream: #EDE6D0;
  --bg-cream-alt: #E4DAC4;
  --ink-cream: #F0E8D2;
  --ink-cream-2: rgba(240, 232, 210, 0.58);
  --ink-cream-3: rgba(240, 232, 210, 0.3);
  --ink-dark: #1E2820;
  --ink-dark-2: rgba(30, 40, 32, 0.6);
  --accent: #C07030;
  --border-on-dark: rgba(240, 232, 210, 0.12);
  --border-on-cream: rgba(30, 40, 32, 0.14);
  --wood-glow: #7A4E24;

  --font-display: 'Bricolage Grotesque', 'Noto Serif SC', sans-serif;
  --font-ui: 'DM Sans', 'Noto Serif SC', sans-serif;
  --font-mono: 'DM Mono', 'Noto Serif SC', monospace;

  /* ── 把 mat 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 mat 深绿底 ──
     WCAG AA:ink-cream(#F0E8D2) on bg-dark(#232E26) 对比≈11:1;mute(58%)混底仍 ≥4.5:1;
     accent(#C07030) on bg-dark 对比≈4.6:1(AA 通过) */
  --plain-bg: var(--bg-dark);
  --plain-surface: var(--bg-dark);
  --plain-surface-2: var(--bg-dark-alt);
  --plain-text: var(--ink-cream);
  --plain-text-mute: var(--ink-cream-2);
  --plain-text-faint: var(--ink-cream-3);
  --plain-border: var(--border-on-dark);
  --plain-border-strong: var(--border-on-dark);
  --plain-accent: var(--accent);
  --plain-accent-strong: var(--accent);
  --plain-accent-bg: color-mix(in oklab, var(--accent) 14%, var(--bg-dark) 86%);
  --plain-success: var(--ink-cream);
  --plain-warn: var(--accent);
  --plain-danger: var(--accent);
  --plain-danger-bg: color-mix(in oklab, var(--accent) 14%, var(--bg-dark) 86%);

  --stage-bg: var(--bg-dark);
  --slide-bg: var(--bg-dark);
  --doc-page-bg: var(--bg-dark);
  --doc-text: var(--ink-cream);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* mat 铁律:零圆角 */
  --v32-gap: 0px;    /* mat 用 hairline 而非 gap 分隔 */
}

/* ── mat 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 800; font-size: clamp(140px, 12vw, 230px); line-height: 0.88; letter-spacing: -0.03em; color: var(--ink-cream); margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 800; font-size: clamp(80px, 7vw, 135px); line-height: 0.92; letter-spacing: -0.025em; color: var(--ink-cream); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(52px, 4vw, 80px); line-height: 1; letter-spacing: -0.02em; color: var(--ink-cream); margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 600; font-size: clamp(32px, 2.4vw, 48px); line-height: 1.1; letter-spacing: -0.01em; color: var(--ink-cream); margin: 0; }
.t-stat { font-family: var(--font-display); font-weight: 800; font-size: clamp(72px, 5.5vw, 108px); line-height: 1; letter-spacing: -0.025em; color: var(--ink-cream); margin: 0; }
.t-lead { font-family: var(--font-ui); font-weight: 400; font-size: clamp(20px, 1.5vw, 30px); line-height: 1.55; color: var(--ink-cream); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(14px, 1.05vw, 20px); line-height: 1.65; color: var(--ink-cream); }
.t-caption { font-family: var(--font-ui); font-weight: 400; font-size: clamp(11px, 0.82vw, 15px); line-height: 1.5; color: var(--ink-cream); }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-cream); }
.t-kicker { font-family: var(--font-mono); font-weight: 400; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }

/* em = upright orange inline(照搬旧模板 · mat 唯一 inline 强调) */
.t-display em, .t-h1 em, .t-h2 em, .t-h3 em, .t-stat em, .t-body em, .t-lead em,
.v32-block em {
  color: var(--accent); font-style: normal;
}

/* mat 分隔件:32px 橙色 accent rule + em-dash rail kicker */
.rule-accent { width: 32px; height: 1px; background: var(--accent); border: none; }
.mat-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }

/* wood atmospheric glow 气氛层(present 舞台绝对定位)· 照搬旧 .slide::before */
.mat-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse at 70% 80%, rgba(122, 78, 36, 0.28) 0%, rgba(80, 50, 20, 0.14) 40%, transparent 70%); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.mat-cover { position: relative; display: flex; flex-direction: column; }
.mat-cover__display { max-width: 1620px; margin-top: auto; }
.mat-cover__tail { display: block; margin-top: 0.08em; }
.mat-cover__lead { margin: 56px 0 0; max-width: 880px; color: var(--ink-cream-2); }
.mat-cover__byline { margin-top: 64px; display: flex; gap: 64px; align-items: flex-end; }

.mat-statement { position: relative; display: flex; flex-direction: column; justify-content: center; }
.mat-statement__num { color: var(--accent); margin: 0 0 32px; }
.mat-statement__text { max-width: 1600px; margin: 0; }
.mat-statement__anno { display: flex; align-items: center; gap: 18px; margin-top: 48px; }

.mat-metrics__title { margin: 0 0 56px; }
.mat-metrics__grid { display: grid; gap: 0; }
.mat-metric { padding: 32px 40px 32px 0; border-right: 1px solid var(--border-on-dark); display: flex; flex-direction: column; gap: 14px; }
.mat-metric:last-child { border-right: none; }
.mat-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.mat-metric__delta { font-family: var(--font-ui); font-size: 0.28em; }
.mat-metric[data-delta="down"] .mat-metric__delta { color: var(--accent); }
.mat-metric__label { color: var(--ink-cream-2); }
.mat-metric__hint { color: var(--ink-cream-3); }

.mat-cards__title { margin: 0 0 40px; max-width: 1400px; }
/* numbered / steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal */
.mat-cards__list { border-top: 1px solid var(--border-on-dark); }
.mat-card-row { display: grid; grid-template-columns: 80px 1fr 220px; gap: 28px; padding: 28px 0; border-bottom: 1px solid var(--border-on-dark); align-items: baseline; }
.mat-card-row__num { color: var(--accent); line-height: 0.9; }
.mat-card-row__head { margin: 0 0 10px; }
.mat-card-row__body { margin: 0; max-width: 720px; color: var(--ink-cream-2); }
.mat-card-row__metric { text-align: right; }
.mat-card-row__metric-v { margin: 0; font-size: clamp(36px, 3vw, 56px); }
.mat-card-row__metric-l { margin-top: 8px; color: var(--ink-cream-3); }
/* grid → 网格特性卡 · 旧 features */
.mat-cards__grid { display: grid; gap: 0 32px; border-bottom: 1px solid var(--border-on-dark); }
.mat-card { padding: 28px 32px; border-top: 1px solid var(--border-on-dark); display: flex; flex-direction: column; gap: 12px; }
.mat-card__num { color: var(--accent); }
.mat-card__head { margin: 0; }
.mat-card__body { margin: 0; color: var(--ink-cream-2); }

.mat-closing { position: relative; display: flex; flex-direction: column; }
.mat-closing__display { max-width: 1620px; margin-top: auto; }
.mat-closing__sub { margin-top: 40px; max-width: 880px; color: var(--ink-cream-2); }
.mat-closing__cta { display: flex; gap: 16px; margin-top: 56px; }
.mat-cta { padding: 18px 36px; text-decoration: none; font-family: var(--font-mono); font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.12em; text-transform: uppercase; display: inline-block; }
.mat-cta[data-kind="primary"] { background: var(--accent); color: var(--ink-cream); }
.mat-cta[data-kind="secondary"] { border: 1px solid var(--border-on-dark); color: var(--ink-cream); }

/* ── 兜底块的 mat 重绘(prose/heading/quote/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 mat 的 Bricolage + hairline + 无圆角 + 暖橙)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-media-title, .v32-chart-title { font-family: var(--font-display); font-weight: 700; }
.v32-prose-body, .v32-card-body, .v32-callout-body, .v32-media-body { font-family: var(--font-ui); color: var(--ink-cream-2); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 600; font-style: normal; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-chart-svg { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.12em; color: var(--accent); }
.v32-callout { background: var(--bg-dark-alt); border-left: 3px solid var(--accent); }
.v32-quote-attr { color: var(--accent); font-family: var(--font-mono); }
/* em-dash bullet(mat 唯一 bullet · 照搬 .dash-list li::before) */
.v32-compare-bullets, .v32-prose-body ul { list-style: none; padding: 0; }
.v32-compare-bullets li, .v32-prose-body ul li { display: grid; grid-template-columns: 1.4em 1fr; align-items: baseline; }
.v32-compare-bullets li::before, .v32-prose-body ul li::before { content: "—"; font-family: var(--font-mono); color: var(--accent); }

/* present 舞台:深绿底 + wood glow + 大内边距(旧 slide-inner 是 56px 105px 70px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .slide { position: relative; }
[data-v32-mode="present"] .slide::before {
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse at 70% 80%, rgba(122, 78, 36, 0.28) 0%, rgba(80, 50, 20, 0.14) 40%, transparent 70%);
}
[data-v32-mode="present"] .v32-slide-inner { position: relative; z-index: 1; padding: 56px 105px 70px; }
[data-v32-mode="present"] .mat-cover__display, [data-v32-mode="present"] .mat-cover { min-height: 100%; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐兜底)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="mat-kicker-rail"><div class="rule-accent"></div><div class="t-kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const tail = b.displayTail
    ? `<em class="mat-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead mat-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="mat-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block mat-cover" data-block-id="${b.id}">
  <div class="mat-glow"></div>
  ${kicker}
  <div class="mat-cover__display">
    <h1 class="t-display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
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
    ? `<div class="t-stat mat-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="mat-statement__anno"><div class="rule-accent"></div><div class="t-kicker" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div></div>`
    : "";
  return `<section class="v32-block mat-statement" data-block-id="${b.id}">
  <div class="mat-glow"></div>
  ${big}
  <h2 class="t-h1 mat-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · Bricolage 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 mat-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="mat-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-caption mat-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="mat-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat mat-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body mat-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block mat-metrics" data-block-id="${b.id}">
  ${title}
  <div class="mat-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="mat-kicker-rail"><div class="rule-accent"></div><div class="t-kicker">${ctx.esc(b.kicker)}</div></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 mat-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-kicker mat-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="mat-card">
      ${num}
      <div class="t-h3 mat-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body mat-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? b.items.length || 1 : Math.ceil(b.items.length / 2);
    return `<section class="v32-block mat-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="mat-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat mat-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label mat-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label mat-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="mat-card-row">
      <div class="t-h3 mat-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 mat-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body mat-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="mat-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block mat-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="mat-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(暖橙 CTA · wood glow)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="mat-kicker-rail"><div class="rule-accent"></div><div class="t-kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const sub = b.sub
    ? `<div class="t-lead mat-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="mat-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="mat-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block mat-closing" data-block-id="${b.id}">
  <div class="mat-glow"></div>
  ${kicker}
  <div class="mat-closing__display">
    <h2 class="t-h1" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
    ${sub}
  </div>
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const matV32: TemplateV32 = {
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

export default matV32;
export { matV32, meta, fonts, themeCss };
