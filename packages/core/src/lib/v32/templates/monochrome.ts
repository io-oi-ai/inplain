/**
 * V32 S5 · Monochrome (Ivory Ledger) 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/monochrome.ts(旧 924 行,三入口 renderDeck/renderDoc/renderSheet)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Ivory Ledger 视觉 DNA(cream/ink token + t-* 排版 + 36px hairline + em-dash)
 *      搬过来,并把该配色映射到 --plain-* token,让"没覆盖的兜底块"自动吃到 ivory 底色;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘(serif italic / hairline / 无圆角)拿到观感。
 *
 * DNA(照搬旧模板注释):单一 cream paper(#FAFADF)· 纯 olive-black(#1A1A16)· 零 chromatic accent
 * + Jost weight 200/300 超细几何 sans + Lora italic serif(只 quote/insight 用)+ JetBrains Mono label
 * + 36px 短 hairline 系统签名 + 1px 全黑 hairline 分隔 + em-dash bullet。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "monochrome",
  name: "Monochrome (Ivory Ledger)",
  tagline:
    "手排活字账本 · 纯 olive-black + Jost weight 200 + Lora italic · 36px hairline · 零 chromatic accent",
  scheme: "light" as const,
  density: "low" as const,
  bestFor:
    "Research reports · scholarly monographs · independent publications · quiet editorial pieces · long-form essays",
};

// V32 S5 · fonts:搬旧 fontLinks(含中文 Noto 兜底)
const fonts = fontLinks([
  "Jost:wght@200;300;400;500;600",
  "Lora:ital,wght@0,400;0,500;0,600;1,400;1,500",
  "JetBrains Mono:wght@300;400;500",
  "Noto Sans SC:wght@300;400;500;700;900",
  "Noto Serif SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// ivory 底色 + olive-black 文字;再把关键 .v32-* 类重绘成 Ivory Ledger 观感。
const themeCss = `
:root {
  /* ── Ivory Ledger 原 token(照搬旧模板 :root)── */
  --cream-paper: #FAFADF;
  --cream-warm: #F5F0E4;
  --cream-deep: #F0F0D4;
  --ink-black: #1A1A16;
  --ink-graphite: #5E5E54;
  --ink-graphite-light: #8A8A80;

  --font-display: 'Jost', 'Noto Sans SC', system-ui, sans-serif;
  --font-serif: 'Lora', 'Noto Serif SC', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ── 把 Ivory Ledger 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 ivory 底色 ──
     WCAG AA:ink-black(#1A1A16) on cream-paper(#FAFADF) 对比≈13:1;graphite(#5E5E54) 仍 ≥5:1 */
  --plain-bg: var(--cream-paper);
  --plain-surface: var(--cream-paper);
  --plain-surface-2: var(--cream-warm);
  --plain-text: var(--ink-black);
  --plain-text-mute: var(--ink-graphite);
  --plain-text-faint: var(--ink-graphite-light);
  --plain-border: var(--ink-black);
  --plain-border-strong: var(--ink-black);
  --plain-accent: var(--ink-black);
  --plain-accent-strong: var(--ink-black);
  --plain-accent-bg: var(--cream-warm);
  --plain-success: var(--ink-black);
  --plain-warn: var(--ink-graphite);
  --plain-danger: var(--ink-black);
  --plain-danger-bg: var(--cream-deep);

  --stage-bg: #FAFADF;
  --slide-bg: var(--cream-paper);
  --doc-page-bg: var(--cream-paper);
  --doc-text: var(--ink-black);

  --font-body: var(--font-display);
  --v32-radius: 0px; /* Ivory Ledger 铁律:仅 insight-card 用圆角,其余零圆角 */
  --v32-gap: 32px;   /* hairline 为主分隔,gap 撑网格间距 */
}

/* ── Ivory Ledger 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 200; font-size: clamp(80px, min(9vw, 16vh), 168px); line-height: 0.96; letter-spacing: -0.02em; color: var(--ink-black); margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 200; font-size: clamp(48px, min(5.2vw, 9vh), 100px); line-height: 1.1; letter-spacing: -0.01em; color: var(--ink-black); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 300; font-size: clamp(32px, min(3.4vw, 5.6vh), 64px); line-height: 1.2; color: var(--ink-black); margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 400; font-size: clamp(20px, min(2.1vw, 3.4vh), 40px); line-height: 1.3; color: var(--ink-black); margin: 0; }
.t-stat { font-family: var(--font-display); font-weight: 200; font-size: clamp(64px, min(5.8vw, 10vh), 110px); line-height: 1; letter-spacing: -0.03em; color: var(--ink-black); margin: 0; }
.t-jumbo { font-family: var(--font-display); font-weight: 200; font-size: clamp(140px, min(14vw, 22vh), 280px); line-height: 1; letter-spacing: -0.04em; color: var(--ink-black); margin: 0; }
.t-insight-serif { font-family: var(--font-serif); font-weight: 400; font-size: clamp(28px, min(2.9vw, 5vh), 56px); line-height: 1.15; color: var(--ink-black); margin: 0; }
.t-lead { font-family: var(--font-display); font-weight: 300; font-size: clamp(15px, min(1.5vw, 2.4vh), 30px); line-height: 1.65; color: var(--ink-graphite); }
.t-body { font-family: var(--font-display); font-weight: 300; font-size: clamp(13px, min(1.1vw, 1.7vh), 22px); line-height: 1.7; color: var(--ink-black); }
.t-caption { font-family: var(--font-display); font-weight: 300; font-size: clamp(11px, 0.85vw, 16px); line-height: 1.55; color: var(--ink-graphite); }
.t-label { font-family: var(--font-mono); font-weight: 400; font-size: clamp(10px, 0.78vw, 14px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-graphite-light); }
.t-kicker { font-family: var(--font-mono); font-weight: 400; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-graphite-light); display: inline-block; }

/* ── 36px short rule · 系统签名 ── */
.iv-rule-short { width: 36px; height: 1px; background: var(--ink-black); margin: 24px 0; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.iv-cover { position: relative; justify-content: center; }
.iv-cover__display { max-width: 1500px; }
.iv-cover__tail { font-style: italic; font-family: var(--font-serif); font-weight: 400; }
.iv-cover__lead { margin: 36px 0 0; max-width: 800px; }
.iv-cover__byline { margin-top: 80px; display: flex; gap: 56px; align-items: baseline; }
.iv-cover__byline .t-body { margin-top: 6px; }

.iv-statement { position: relative; justify-content: center; }
.iv-statement__num { margin-bottom: 32px; }
.iv-statement__text { max-width: 1400px; font-style: italic; font-family: var(--font-serif); font-weight: 400; }
.iv-statement__anno { margin-top: 56px; }

.iv-metrics__title { margin: 0 0 56px; }
.iv-metrics__grid { display: grid; gap: 32px; }
.iv-metric { border-top: 1px solid var(--ink-black); padding: 24px 24px 24px 0; display: flex; flex-direction: column; gap: 14px; }
.iv-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.iv-metric__delta { font-family: var(--font-mono); font-size: 0.22em; letter-spacing: 0; }
.iv-metric[data-delta="down"] .iv-metric__delta { color: var(--ink-graphite); }
.iv-metric__label { color: var(--ink-graphite); }
.iv-metric__hint { }

.iv-cards__kicker { margin-bottom: 24px; }
.iv-cards__title { margin: 0 0 36px; }
/* numbered / steps → 横排大条目账本行;grid → insight-card 特性卡 */
.iv-cards__list { border-bottom: 1px solid var(--ink-black); }
.iv-card-row { display: grid; grid-template-columns: 1.4em 80px 1fr 200px; gap: 0.5em; padding: 28px 0; border-top: 1px solid var(--ink-black); align-items: baseline; }
.iv-card-row__dash { font-family: var(--font-mono); color: var(--ink-graphite-light); }
.iv-card-row__num { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-black); }
.iv-card-row__head { margin: 0 0 12px; }
.iv-card-row__body { max-width: 740px; }
.iv-card-row__metric { text-align: right; }
.iv-card-row__metric-v { font-size: 56px; }
.iv-card-row__metric-l { margin-top: 8px; }
.iv-cards__grid { display: grid; gap: 24px; }
.iv-card { background: var(--cream-warm); border-radius: 16px; padding: 48px 40px; display: flex; flex-direction: column; justify-content: space-between; min-height: 240px; }
.iv-card__num { margin-bottom: 18px; }
.iv-card__head { font-size: 38px; font-style: italic; }
.iv-card__body { margin-top: 24px; color: var(--ink-graphite); }

.iv-closing { background: var(--cream-warm); justify-content: center; position: relative; }
.iv-closing__display { max-width: 1500px; font-style: italic; font-family: var(--font-serif); font-weight: 400; }
.iv-closing__sub { margin-top: 32px; max-width: 880px; }
.iv-closing__cta { display: flex; gap: 32px; margin-top: 64px; }
.iv-cta { padding: 16px 28px; text-decoration: none; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; display: inline-block; }
.iv-cta[data-kind="primary"] { background: var(--ink-black); color: var(--cream-paper); }
.iv-cta[data-kind="secondary"] { border: 1px solid var(--ink-black); color: var(--ink-black); }

/* ── 兜底块的 Ivory Ledger 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 serif italic quote + hairline + 无圆角 + em-dash)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title { font-family: var(--font-display); font-weight: 300; }
.v32-prose-body { font-family: var(--font-display); font-weight: 300; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); font-style: italic; font-weight: 400; }
.v32-metric, .v32-card, .v32-compare-col, .v32-table-el { border-radius: 0; box-shadow: none; }
.v32-callout { border-radius: 16px; box-shadow: none; background: var(--cream-warm); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; }
/* em-dash bullet · 唯一 list marker */
.v32-compare-bullets, .v32-prose-body ul { list-style: none; padding: 0; }
.v32-compare-bullets li::before, .v32-prose-body ul li::before { content: "— "; font-family: var(--font-mono); color: var(--ink-graphite-light); }

/* ── present 舞台:cream 底 + 大内边距(旧 slide-inner 是 96px 124px)· 覆盖块自己撑满 ── */
[data-v32-mode="present"] .v32-slide-inner { padding: 96px 124px; }
[data-v32-mode="present"] .iv-cover__display { font-size: clamp(80px, 9vw, 168px); }
[data-v32-mode="present"] .iv-statement__num { font-size: clamp(140px, 14vw, 280px); }
[data-v32-mode="present"] .iv-closing__display { font-size: clamp(48px, 5.2vw, 100px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2/S3)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|renderProposal|renderFeatures / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(Jost 200 大标题 + serif italic 续行 + 36px rule + byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="iv-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}> ${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead iv-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="iv-cover__byline">${b.byline
        .map((x, j) => `<div class="t-body" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block iv-cover" data-block-id="${b.id}">
  ${kicker}
  <div class="iv-rule-short"></div>
  <h1 class="t-display iv-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(t-jumbo 大数字 + serif italic 论点 + 36px rule + 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-jumbo iv-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="iv-statement__anno"><div class="iv-rule-short"></div><div class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div></div>`
    : "";
  return `<section class="v32-block iv-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-h1 iv-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 顶边分栏 · Jost 200 大数字 · mono label)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 iv-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="iv-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-caption iv-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="iv-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat iv-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label iv-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block iv-metrics" data-block-id="${b.id}">
  ${title}
  <div class="iv-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → insight-card 特性卡(cream-warm 圆角 · serif italic 标题)· 旧 features
//   layout=numbered/steps → em-dash + 编号横排大条目账本行 · 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker iv-cards__kicker">${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 iv-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(b.items.length || 1, 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = c.num ? `<div class="t-label iv-card__num">${ctx.esc(c.num)}</div>` : "";
        return `<article class="iv-card">
      <div>
        ${num}
        <div class="t-insight-serif iv-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      </div>
      <div class="t-body iv-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block iv-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="iv-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式 em-dash 横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat iv-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label iv-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label" style="color: var(--ink-black);">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="iv-card-row">
      <span class="iv-card-row__dash" aria-hidden="true">—</span>
      <div class="iv-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 iv-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body iv-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="iv-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block iv-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="iv-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(cream-warm 底 · serif italic 大标题 · mono CTA 按钮)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-kicker" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead iv-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="iv-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="iv-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block iv-closing" data-block-id="${b.id}">
  ${kicker}
  <div class="iv-rule-short"></div>
  <h2 class="t-h1 iv-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const monochromeV32: TemplateV32 = {
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

export default monochromeV32;
export { monochromeV32, meta, fonts, themeCss };
