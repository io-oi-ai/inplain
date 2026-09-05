/**
 * V32 S5 · Grove 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/grove.ts(旧 827 行,三入口 ~14 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 grove 的视觉 DNA(bg/fg/accent token + t-* 排版 + coral-rule/
 *      watermark/dash-list 气氛)搬过来,并把 grove 色映射到 --plain-* token 让
 *      "没覆盖的兜底块"自动吃到深森林绿底 + coral 强调;
 *   2) blocks:只覆盖 grove 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Playfair + coral rule +
 *      hairline + 无圆角 + dash-list)拿到 grove 观感。
 *
 * DNA(照搬旧模板注释):深森林绿底(#192B1B)+ 温暖奶白字(#D4CFBF)+ 单一 terracotta
 * coral(#C8524A)· Playfair 400 永不加粗 · Jost 300 body · JetBrains Mono uppercase ·
 * <em> 内嵌 italic coral 是唯一 headline 强调 · em-dash bullet · 完全 flat 零阴影零圆角 ·
 * 1px hairline 是唯一结构语言。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "grove",
  name: "Grove",
  tagline:
    "森林绿文学专著 · Playfair 400 永不加粗 + Jost 300 body + coral italic 强调 · em-dash bullet",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Brand books · literary journals · wellness / nature decks · advisory deliverables · bilingual EN/CN reports · slow patient register",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Playfair Display:ital,wght@0,400;1,400",
  "Jost:wght@300;400",
  "JetBrains Mono:wght@300;400",
  "Noto Serif SC:wght@300;400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 grove 深绿底;再把关键 .v32-* 类重绘成 grove 观感。
const themeCss = `
:root {
  /* ── grove 原 token(照搬旧模板 :root)── */
  --bg: #192B1B;
  --bg-alt: #1E3221;
  --fg: #D4CFBF;
  --fg-2: rgba(212, 207, 191, 0.6);
  --fg-3: rgba(212, 207, 191, 0.32);
  --accent: #C8524A;
  --border: rgba(212, 207, 191, 0.12);
  --watermark: rgba(212, 207, 191, 0.06);

  --font-display: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  --font-ui: 'Jost', 'Noto Serif SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ── 把 grove 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 grove 底色 ──
     WCAG AA:fg(#D4CFBF) on bg(#192B1B) 对比≈9:1;accent(#C8524A) on bg≈4.6:1 达标 */
  --plain-bg: var(--bg);
  --plain-surface: var(--bg);
  --plain-surface-2: var(--bg-alt);
  --plain-text: var(--fg);
  --plain-text-mute: var(--fg-2);
  --plain-text-faint: var(--fg-3);
  --plain-border: var(--border);
  --plain-border-strong: var(--fg-2);
  --plain-accent: var(--accent);
  --plain-accent-strong: var(--accent);
  --plain-accent-bg: color-mix(in oklab, var(--accent) 14%, var(--bg) 86%);
  --plain-success: var(--fg);
  --plain-warn: var(--accent);
  --plain-danger: var(--accent);
  --plain-danger-bg: color-mix(in oklab, var(--accent) 14%, var(--bg) 86%);

  --stage-bg: var(--bg);
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--fg);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* grove 铁律:零圆角 */
  --v32-gap: 0px;    /* grove 用 hairline 而非 gap 分隔 */
}

/* ── grove 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, 10vw, 192px); line-height: 1; letter-spacing: -0.01em; color: var(--fg); margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 400; font-size: clamp(72px, 5.5vw, 106px); line-height: 1.1; color: var(--fg); margin: 0; }
.t-h1-stmt { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(4.5vw, 7.5vh), 88px); line-height: 1.15; color: var(--fg); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(44px, 3.2vw, 62px); line-height: 1.2; color: var(--fg); margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, 2vw, 40px); line-height: 1.3; color: var(--fg); margin: 0; }
.t-stat-value { font-family: var(--font-display); font-weight: 400; font-size: clamp(60px, 4.5vw, 88px); line-height: 1; letter-spacing: -0.02em; color: var(--accent); margin: 0; }
.t-stat-bignum { font-family: var(--font-display); font-weight: 400; font-size: clamp(100px, 9vw, 180px); line-height: 1; letter-spacing: -0.02em; color: var(--accent); margin: 0; }
.t-lead { font-family: var(--font-ui); font-weight: 300; font-size: clamp(18px, 1.45vw, 26px); line-height: 1.65; color: var(--fg); }
.t-body { font-family: var(--font-ui); font-weight: 300; font-size: clamp(15px, 1.05vw, 20px); line-height: 1.75; color: var(--fg); }
.t-caption { font-family: var(--font-ui); font-weight: 300; font-size: clamp(12px, 0.82vw, 15px); line-height: 1.55; color: var(--fg); }
.t-label { font-family: var(--font-mono); font-weight: 300; font-size: clamp(11px, 0.7vw, 13px); letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg); }
.t-kicker { font-family: var(--font-mono); font-weight: 300; font-size: clamp(11px, 0.7vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.t-chapter-num { font-family: var(--font-mono); font-weight: 300; font-size: clamp(11px, 0.7vw, 13px); letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }

/* em inside headlines → italic coral · the signature(照搬旧模板)*/
.t-display em, .t-h1 em, .t-h1-stmt em, .t-h2 em, .t-h3 em,
.t-stat-value em, .t-stat-bignum em { color: var(--accent); font-style: italic; }

/* ── grove 结构件(照搬旧模板)── */
.gr-rule-coral { width: 36px; height: 1px; background: var(--accent); border: none; }
/* kicker + coral rule 节奏拍 */
.gr-kicker-unit { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
/* 18vw watermark 大数字 · chapter / section 之锚 */
.gr-watermark { position: absolute; right: 100px; bottom: -2vh; font-family: var(--font-display); font-weight: 400; font-size: clamp(180px, 18vw, 360px); line-height: 1; letter-spacing: -0.03em; color: var(--watermark); pointer-events: none; user-select: none; z-index: 0; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.gr-cover { position: relative; display: flex; flex-direction: column; }
.gr-cover__display { margin: 40px 0 0; max-width: 1500px; }
.gr-cover__tail { display: block; margin-top: 0.06em; }
.gr-cover__lead { margin: 48px 0 0; max-width: 760px; }
.gr-cover__byline { display: flex; gap: 56px; align-items: flex-end; margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--border); }

.gr-statement { position: relative; }
.gr-statement__num { margin-bottom: 32px; }
.gr-statement__text { max-width: 1500px; }
.gr-statement__anno { margin-top: 56px; }

.gr-metrics__title { margin: 0 0 56px; }
.gr-metrics__grid { display: grid; gap: 0 64px; }
.gr-metric { display: flex; flex-direction: column; gap: 16px; padding: 32px 0; border-bottom: 1px solid var(--border); }
.gr-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.gr-metric__delta { font-family: var(--font-ui); font-size: 0.32em; }
.gr-metric[data-delta="down"] .gr-metric__delta { color: var(--accent); }
.gr-metric__hint { opacity: 0.6; }

.gr-cards__title { margin: 0 0 40px; max-width: 1400px; }
/* numbered / steps → 横排大条目;grid → 网格特性卡 */
.gr-card-row { display: grid; grid-template-columns: 80px 1fr 220px; gap: 32px; padding: 32px 0; border-bottom: 1px solid var(--border); align-items: baseline; }
.gr-card-row__num { font-size: 16px; }
.gr-card-row__head { margin-bottom: 12px; }
.gr-card-row__body { max-width: 760px; }
.gr-card-row__metric { text-align: right; }
.gr-card-row__metric-v { font-size: clamp(40px, 3.5vw, 56px); }
.gr-card-row__metric-l { opacity: 0.6; margin-top: 8px; }
.gr-cards__grid { display: grid; gap: 0 32px; border-bottom: 1px solid var(--border); }
.gr-card { padding: 28px 32px 32px; border-top: 1px solid var(--border); }
.gr-card__num { margin-bottom: 14px; }
.gr-card__head { margin-bottom: 12px; }
.gr-card__body { opacity: 0.85; }

.gr-closing { position: relative; display: flex; flex-direction: column; }
.gr-closing__display { margin: 40px 0 0; max-width: 1500px; }
.gr-closing__sub { margin: 48px 0 0; max-width: 800px; opacity: 0.8; }
.gr-closing__cta { display: flex; gap: 24px; margin-top: 56px; padding-top: 32px; border-top: 1px solid var(--border); }
.gr-cta { padding: 18px 32px; text-decoration: none; font-family: var(--font-mono); font-weight: 300; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; display: inline-block; }
.gr-cta[data-kind="primary"] { border: 1px solid var(--accent); color: var(--accent); }
.gr-cta[data-kind="secondary"] { border: 1px solid var(--border); color: var(--fg); }

/* ── 兜底块的 grove 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 grove 的 serif + coral rule + hairline + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; }
.v32-prose-body, .v32-card-body, .v32-callout-body { font-family: var(--font-ui); font-weight: 300; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; font-weight: 400; }
.v32-quote-attr, .v32-media-quote figcaption { font-family: var(--font-mono); font-weight: 300; color: var(--accent); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-chart-svg, .v32-table-el { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); font-weight: 300; letter-spacing: 0.14em; color: var(--accent); }
/* em-dash bullet:grove 的唯一 bullet 语言(compare/prose 列表)*/
.v32-compare-bullets { list-style: none; padding: 0; }
.v32-compare-bullets li { display: grid; grid-template-columns: 1.4em 1fr; align-items: baseline; }
.v32-compare-bullets li::before { content: "—"; font-family: var(--font-mono); font-weight: 300; color: var(--accent); }

/* present 舞台:深绿底 + 大内边距(旧 slide-inner 是 70px 154px 88px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 70px 154px 88px; }
[data-v32-mode="present"] .gr-cover, [data-v32-mode="present"] .gr-closing { min-height: 100%; }
[data-v32-mode="present"] .gr-cover__display, [data-v32-mode="present"] .gr-closing__display { margin-top: auto; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// V32 S5 · kicker + coral rule 节奏拍(旧 kickerBlock)
function kickerUnit(kicker: string | undefined, ctx: Parameters<BlockRenderer>[1], path: string): string {
  if (!kicker) return "";
  return `<div class="gr-kicker-unit">
    <div class="t-kicker" ${ctx.edit(path, "眉标")}>${ctx.esc(kicker)}</div>
    <div class="gr-rule-coral"></div>
  </div>`;
}

// cover ← 旧 renderCover(watermark + coral kicker + serif display)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-chapter-num" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<em class="gr-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead gr-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="gr-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block gr-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display gr-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
  <div class="gr-watermark" aria-hidden="true">01</div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(bignum coral + serif statement + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat-bignum gr-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-chapter-num gr-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block gr-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-h1-stmt gr-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · coral serif 大数字 · 无填充)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 gr-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="gr-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-caption gr-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="gr-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat-value gr-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block gr-metrics" data-block-id="${b.id}">
  ${title}
  <div class="gr-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid          → 网格特性卡 · 旧 features
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = kickerUnit(b.kicker, ctx, `${p}/kicker`);
  const title = b.title
    ? `<h2 class="t-h2 gr-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="gr-card">
      <div class="t-chapter-num gr-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-h3 gr-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body gr-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(b.items.length / 2);
    return `<section class="v32-block gr-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="gr-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat-value gr-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label gr-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label" style="opacity:0.65;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="gr-card-row">
      <div class="t-chapter-num gr-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 gr-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body gr-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="gr-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block gr-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div>${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(watermark + serif h1 + coral outline CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-chapter-num" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-lead gr-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="gr-cta" data-kind="${kind}"${href}>${kind === "primary" ? "— " : ""}${ctx.esc(c.label)}</a>`;
  };
  const cta = b.cta ? `<div class="gr-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block gr-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-h1 gr-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
  <div class="gr-watermark" aria-hidden="true">→</div>
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const groveV32: TemplateV32 = {
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

export default groveV32;
export { groveV32, meta, fonts, themeCss };
