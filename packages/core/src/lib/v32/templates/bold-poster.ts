/**
 * V32 S5 · Bold Poster 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/bold-poster.ts(旧 918 行,三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 bold-poster 视觉 DNA(4 色 token + Shrikhand/Baskerville/Grotesk
 *      三字体分役 + 旋转签名 + 双 ink border + 红 leftbar + em-dash bullet)搬过来,
 *      并把 4 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到印刷底色;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/sequence/...)走兜底 renderer,
 *      靠 themeCss 里对 .v32-* 的重绘(Shrikhand 标题 / 红 leftbar / 无圆角 / em-dash)拿到观感。
 *
 * DNA(照搬旧模板注释):white/ink(#1C1410 温暖深棕黑)/red(#D8000F 番茄红)/light(#F5F2EF);
 * Shrikhand display 唯一 weight 400 靠尺寸+旋转+颜色表达层级;-6°/-5°/-4°/+2° 旋转是 movement 签名;
 * 3px outer + 1.5px inner 双 ink border;4px red leftbar editorial card;红 em-dash bullet;0 圆角。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "bold-poster",
  name: "Bold Poster",
  tagline:
    "意大利体育杂志 poster · Shrikhand 倾斜 chunky display + Libre Baskerville 文学 body + 红番茄单 accent · 双 ink border 印刷网格",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Editorial annual reports · brand retrospectives · wine merchant catalogues · sports / culture magazine launches · populist manifestos with print energy",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Shrikhand",
  "Libre Baskerville:ital,wght@0,400;0,700;1,400",
  "Space Grotesk:wght@400;500;600;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 bold-poster 底色;再把关键 .v32-* 类重绘成 poster 观感。
const themeCss = `
:root {
  /* ── bold-poster 原 token(照搬旧 :root)── */
  --bg: #FFFFFF;
  --dark: #1C1410;
  --red: #D8000F;
  --light: #F5F2EF;

  --font-display: 'Shrikhand', cursive;
  --font-body: 'Libre Baskerville', 'Noto Serif SC', serif;
  --font-label: 'Space Grotesk', 'Noto Sans SC', sans-serif;

  /* ── 把 4 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得印刷底色 ──
     WCAG AA:dark(#1C1410) on bg(#FFF) 对比≈16:1;red(#D8000F) on bg≈5.7:1(≥4.5 达标);
     mute 用 dark 混 bg 仍 ≥4.5:1 */
  --plain-bg: var(--bg);
  --plain-surface: var(--bg);
  --plain-surface-2: var(--light);
  --plain-text: var(--dark);
  --plain-text-mute: color-mix(in oklab, var(--dark) 82%, var(--bg));
  --plain-text-faint: color-mix(in oklab, var(--dark) 62%, var(--bg));
  --plain-border: var(--dark);
  --plain-border-strong: var(--dark);
  --plain-accent: var(--red);
  --plain-accent-strong: var(--red);
  --plain-accent-bg: color-mix(in oklab, var(--red) 10%, var(--bg) 90%);
  --plain-success: var(--dark);
  --plain-warn: var(--red);
  --plain-danger: var(--red);
  --plain-danger-bg: color-mix(in oklab, var(--red) 12%, var(--bg) 88%);

  --stage-bg: #1a1a1a;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--dark);

  --v32-radius: 0px; /* bold-poster 铁律:0 圆角 */
  --v32-gap: 24px;   /* 印刷网格间距 */
}

/* ── bold-poster 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, 12vw, 200px); line-height: 0.88; letter-spacing: 1px; color: var(--dark); margin: 0; }
.t-hero-red { font-family: var(--font-display); font-weight: 400; font-size: clamp(110px, 13vw, 220px); line-height: 0.85; color: var(--red); transform: rotate(-4deg); display: inline-block; margin: 0; }
.t-close-big { font-family: var(--font-display); font-weight: 400; font-size: clamp(100px, 12vw, 220px); line-height: 0.88; color: var(--red); transform: rotate(-5deg); display: inline-block; margin: 0; }
.t-stat-big { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, 16vw, 260px); line-height: 0.82; color: var(--red); transform: rotate(-6deg); display: inline-block; margin: 0; }
.t-section-lg { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, 5.5vw, 84px); line-height: 1; color: var(--dark); margin: 0; }
.t-card-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(30px, 2.8vw, 44px); line-height: 1.1; color: var(--dark); margin: 0; }
.t-pillar-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, 4.8vw, 72px); line-height: 1; color: var(--red); margin: 0; }
.t-cell-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(36px, 3.5vw, 56px); line-height: 1; color: var(--red); margin: 0; }
.t-stat-item-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, 4vw, 64px); line-height: 1; color: var(--dark); margin: 0; }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(15px, 1.2vw, 20px); line-height: 1.75; color: var(--dark); margin: 0; }
.t-body-card { font-family: var(--font-body); font-weight: 400; font-size: clamp(14px, 1.1vw, 18px); line-height: 1.6; color: var(--dark); }
.t-body-cell { font-family: var(--font-body); font-weight: 400; font-size: clamp(13px, 1vw, 16px); line-height: 1.55; color: var(--dark); }
.t-label-red { font-family: var(--font-label); font-weight: 600; font-size: clamp(11px, 0.9vw, 14px); letter-spacing: 0.2em; text-transform: uppercase; color: var(--red); }
.t-label-dark { font-family: var(--font-label); font-weight: 600; font-size: clamp(10px, 0.8vw, 12px); letter-spacing: 0.2em; text-transform: uppercase; color: var(--dark); }
.t-rm-label { font-family: var(--font-label); font-weight: 600; font-size: clamp(10px, 0.8vw, 13px); letter-spacing: 0.3em; text-transform: uppercase; color: var(--red); }

/* ── 核心 pattern(照搬旧模板)── */
.lb-card { border-left: 4px solid var(--red); padding-left: 22px; }
.t-grid { border: 3px solid var(--dark); display: grid; }
.t-grid-cell { border: 1.5px solid var(--dark); padding: 24px 22px; }
/* 红底 panel 上 stacked text-shadow — 全系统唯一阴影 */
.t-red-quote { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, 5vw, 80px); line-height: 1.15; color: var(--bg); text-shadow: 2px 2px 0 rgba(28, 20, 16, 0.25), 4px 4px 0 rgba(28, 20, 16, 0.2), 6px 6px 0 rgba(28, 20, 16, 0.15); margin: 0; }
.dark-panel { background: var(--dark); color: var(--bg); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.bp-cover { position: relative; padding-top: 2vh; }
.bp-cover__stack { display: flex; flex-direction: column; gap: 0.05em; align-items: flex-start; }
.bp-cover__lead { margin-top: 40px; max-width: 720px; }
.bp-cover__byline { display: flex; gap: 24px; margin-top: 40px; padding-top: 16px; border-top: 3px solid var(--dark); }

.bp-statement { text-align: center; display: flex; flex-direction: column; align-items: center; }
.bp-statement__num { margin: 0 0 24px; }
.bp-statement__text { max-width: 80%; }
.bp-statement__anno { margin-top: 32px; padding: 8px 16px; border: 1px solid color-mix(in oklab, var(--dark) 40%, transparent); display: inline-block; }

.bp-metrics__title { margin: 0 0 32px; }
.bp-metric { display: flex; flex-direction: column; gap: 14px; }
.bp-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.bp-metric[data-delta="down"] .bp-metric__value { color: var(--red); }
.bp-metric__hint { opacity: 0.72; }

.bp-cards__title { margin: 0 0 40px; max-width: 82%; }
/* numbered / steps → 横排大条目(红 leftbar);grid → leftbar 特性卡网格 */
.bp-card-row { border-left: 4px solid var(--red); padding-left: 22px; display: grid; grid-template-columns: 90px 1fr 200px; gap: 24px; align-items: baseline; }
.bp-card-row__head { margin: 0 0 10px; }
.bp-card-row__body { margin: 0; max-width: 720px; }
.bp-card-row__metric { text-align: right; }
.bp-card-row__metric-l { margin-top: 8px; }
.bp-cards__grid { display: grid; gap: 4vh 5vw; }
.bp-card { border-left: 4px solid var(--red); padding-left: 22px; }
.bp-card__head { margin: 14px 0; }

.bp-closing { background: var(--dark); color: var(--bg); position: relative; justify-content: center; }
.bp-closing__display { margin: 0; }
.bp-closing__sub { margin-top: 5vh; max-width: 720px; font-family: var(--font-body); font-size: clamp(16px, 1.4vw, 22px); line-height: 1.6; color: var(--bg); }
.bp-closing__cta { display: flex; gap: 32px; margin-top: 6vh; }
.bp-cta { font-family: var(--font-label); font-weight: 600; font-size: clamp(11px, 0.9vw, 14px); letter-spacing: 0.2em; text-transform: uppercase; color: var(--bg); text-decoration: none; border-bottom: 2px solid var(--red); padding-bottom: 4px; }

/* ── 兜底块的 bold-poster 重绘(prose/heading/quote/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 Shrikhand + 红 leftbar + 无圆角 + em-dash)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; color: var(--dark); }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-media-body { font-family: var(--font-body); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-label); font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--red); }
/* 全系 0 圆角 0 阴影(唯一阴影是 .t-red-quote)*/
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table-el, .v32-chart-svg { border-radius: 0; box-shadow: none; }
/* 引语 → Shrikhand italic 大字 */
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-body); font-style: italic; }
.v32-quote-attr { font-family: var(--font-label); color: var(--red); }
/* callout → 红 leftbar editorial card */
.v32-callout { border: none; border-left: 4px solid var(--red); padding-left: 22px; background: transparent; }
/* compare 右列 → dark-panel 印刷对照 */
.v32-compare-col[data-side="right"] { background: var(--dark); color: var(--bg); }
.v32-compare-col[data-side="right"] .v32-compare-label { color: var(--bg); }
/* prose 列表 em-dash bullet(红) */
.v32-prose-body ul { list-style: none; padding-left: 0; }
.v32-prose-body ul li { position: relative; padding-left: 18px; }
.v32-prose-body ul li::before { content: "—"; position: absolute; left: 0; color: var(--red); font-weight: 700; }

/* present 舞台:大内边距(旧 slide-inner 是 48px/56px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 48px 56px; }
[data-v32-mode="present"] .bp-statement, [data-v32-mode="present"] .bp-closing { min-height: 78vh; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(Shrikhand hero 堆叠 + -4° 红旋转续行)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-red" style="margin-bottom: 24px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<div class="t-hero-red" style="margin-top: -0.15em;" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</div>`
    : "";
  const lead = b.lead
    ? `<p class="t-body bp-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="bp-cover__byline">${b.byline
        .map((x, j) => `<div class="t-body-cell" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block bp-cover" data-block-id="${b.id}">
  ${kicker}
  <div class="bp-cover__stack">
    <div class="t-hero" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}</div>
    ${tail}
  </div>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(红底大数字 + Shrikhand 大字论点 + 注解框)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat-big bp-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="bp-statement__anno"><span class="t-label-dark" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block bp-statement dark-panel" data-block-id="${b.id}">
  ${big}
  <p class="t-close-big bp-statement__text" style="transform: none; color: var(--red);" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(双 ink border tabular 网格 · Shrikhand 红数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-section-lg bp-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const cells = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span aria-hidden="true" style="font-family: var(--font-label); font-size: 0.4em;">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-body-cell bp-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="t-grid-cell bp-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-cell-num bp-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label-dark" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block bp-metrics" data-block-id="${b.id}">
  ${title}
  <div class="t-grid" style="grid-template-columns: repeat(${cols}, 1fr);">${cells}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid            → 红 leftbar 特性卡网格 · 旧 features
//   layout=numbered/steps  → 红 leftbar 横排大条目(num | head+body | metric)· 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-red" style="margin-bottom: 18px;" ${ctx.edit(`${p}/kicker`, "眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-section-lg bp-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : 2;
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-label-red">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="bp-card">
      ${num}
      <div class="t-card-title bp-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-card" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block bp-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="bp-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式红 leftbar 横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat-item-num" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-dark bp-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<span class="t-label-red" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</span>`
          : "";
      return `<div class="bp-card-row">
      <div class="t-pillar-num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-title bp-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-card bp-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="bp-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block bp-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div style="display: flex; flex-direction: column; gap: 3.5vh;">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(dark 底 · -5° 红大字 · 红下划线 CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-rm-label" style="margin-bottom: 32px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="bp-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="bp-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="bp-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block bp-closing" data-block-id="${b.id}">
  ${kicker}
  <div class="t-close-big bp-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</div>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const boldPosterV32: TemplateV32 = {
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

export default boldPosterV32;
export { boldPosterV32, meta, fonts, themeCss };
