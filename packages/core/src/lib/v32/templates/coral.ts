/**
 * V32 S5 · Coral 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/coral.ts(旧 962 行,三入口 25+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 coral 的视觉 DNA(coral/ink/cream 三 surface token + Bebas
 *      排版 t-* + 45° hatch 气氛)搬过来,并把 coral 色映射到 --plain-* token
 *      让"没覆盖的兜底块"自动吃到 cream 底 + coral accent + ink border;
 *   2) blocks:只覆盖 coral 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘(Bebas uppercase / coral
 *      accent / 无圆角 / 硬边)拿到 coral 观感。
 *
 * DNA(照搬旧模板注释):三 surface(coral 火焰 #E85D5D / ink 黑 #1A1A1A / cream 纸
 * #F5F0E8)硬色边相遇 + Bebas Neue uppercase heavy tracking + Inter body +
 * 4-5px solid accent border + 零圆角零阴影零渐变 + 45° hatch 6% ink 气氛。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "coral",
  name: "Coral",
  tagline:
    "杂志海报 · coral fire + ink + cream · Bebas Neue uppercase + 45° hatch · 三 surface 硬边相遇",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Sport magazine covers · activist editorial · Saul Bass-flavored film titles · poster-grade product launches · bold travel/lifestyle reveals",
};

// V32 S5 · fonts:搬旧 fontLinks(Bebas Neue + Inter)
const fonts = fontLinks(["Bebas Neue", "Inter:wght@300..700"]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 coral 底色;再把关键 .v32-* 类重绘成 coral 观感。
const themeCss = `
:root {
  /* ── coral 原 token(照搬旧模板 :root)── */
  --coral: #E85D5D;
  --coral-dark: #D44A4A;
  --cream: #F5F0E8;
  --cream-dark: #E8E0D4;
  --ink: #1A1A1A;
  --gray: #6B6B6B;
  --light-gray: #B0B0B0;
  --white: #FFFFFF;

  --font-display: 'Bebas Neue', 'Arial Narrow', sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* ── 把 coral 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 coral 底色 ──
     WCAG AA:ink(#1A1A1A) on cream(#F5F0E8) 对比≈14:1;gray(#6B6B6B) on cream≈5.1:1 达标 */
  --plain-bg: var(--cream);
  --plain-surface: var(--white);
  --plain-surface-2: var(--cream-dark);
  --plain-text: var(--ink);
  --plain-text-mute: var(--gray);
  --plain-text-faint: var(--light-gray);
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--coral);
  --plain-accent-strong: var(--coral-dark);
  --plain-accent-bg: color-mix(in oklab, var(--coral) 14%, var(--cream) 86%);
  --plain-success: #4F7A4F;
  --plain-warn: #B07A2A;
  --plain-danger: var(--coral);
  --plain-danger-bg: color-mix(in oklab, var(--coral) 12%, var(--cream) 88%);

  --stage-bg: #0a0a0a;
  --slide-bg: var(--cream);
  --doc-page-bg: var(--cream);
  --doc-text: var(--ink);

  --v32-radius: 0px; /* coral 铁律:零圆角(nav-dot 除外,此处不涉及)*/
  --v32-gap: 24px;   /* coral 硬边网格用中等 gap 分隔白卡 */
}

/* ── coral 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, min(11vw, 18vh), 220px); line-height: 0.9; letter-spacing: 4px; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-jumbo { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, min(13vw, 22vh), 280px); line-height: 1; letter-spacing: 12px; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(7vw, 12vh), 140px); line-height: 1; letter-spacing: 2px; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-section { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, min(6vw, 10vh), 120px); line-height: 1; letter-spacing: 2px; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-stat { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(7vw, 12vh), 128px); line-height: 1; letter-spacing: 1px; text-transform: uppercase; color: var(--coral); margin: 0; }
.t-card-stat { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, 4vw, 72px); line-height: 1; letter-spacing: 1px; text-transform: uppercase; color: var(--coral); margin: 0; }
.t-card-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, 2.5vw, 48px); line-height: 1.1; letter-spacing: 1px; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-body-light { font-family: var(--font-body); font-weight: 300; font-size: clamp(20px, 2.2vw, 36px); line-height: 1.5; color: var(--ink); }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(15px, 1.2vw, 22px); line-height: 1.7; color: var(--gray); }
.t-section-label { font-family: var(--font-body); font-weight: 700; font-size: clamp(12px, 0.95vw, 16px); line-height: 1; letter-spacing: 0.36em; text-transform: uppercase; color: var(--coral); }
.t-section-label-on-coral { font-family: var(--font-body); font-weight: 700; font-size: clamp(12px, 0.95vw, 16px); line-height: 1; letter-spacing: 0.36em; text-transform: uppercase; color: var(--ink); }
.t-meta-label { font-family: var(--font-body); font-weight: 600; font-size: clamp(11px, 0.85vw, 14px); line-height: 1; letter-spacing: 0.24em; text-transform: uppercase; color: var(--gray); }
.t-meta-mono { font-family: var(--font-body); font-weight: 600; font-size: clamp(14px, 1.05vw, 18px); line-height: 1; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink); }

/* ── 45° diagonal hatch 气氛层(照搬旧 hatch-45)· coral surface 签名 texture ── */
.co-hatch { position: relative; }
.co-hatch::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: repeating-linear-gradient(45deg,
    transparent, transparent 20px,
    rgba(0, 0, 0, 0.06) 20px, rgba(0, 0, 0, 0.06) 40px);
}
.co-hatch > * { position: relative; z-index: 1; }
.co-accent-line { width: 80px; height: 4px; background: var(--coral); }
.co-coral-block {
  background: var(--coral); color: var(--white);
  width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 22px;
}

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.co-cover { position: relative; padding: 0; overflow: hidden; }
.co-cover__top { background: var(--coral); color: var(--ink); padding: 56px 64px; display: flex; flex-direction: column; gap: 28px; }
.co-cover__display { max-width: 1700px; }
.co-cover__bottom { padding: 48px 64px; display: flex; flex-direction: column; gap: 28px; }
.co-cover__rule { height: 3px; background: var(--ink); opacity: 0.15; }
.co-cover__lead { max-width: 1200px; margin: 0; }
.co-cover__byline { display: flex; gap: 56px; flex-wrap: wrap; }
.co-cover__byline .lbl { margin-bottom: 8px; }

.co-statement { background: var(--coral); color: var(--ink); text-align: center; padding: 72px 64px; display: flex; flex-direction: column; align-items: center; }
.co-statement__num { font-size: clamp(120px, 18vw, 360px); margin-bottom: 24px; }
.co-statement__text { max-width: 20ch; margin: 0; }
.co-statement__anno { margin-top: 32px; }

.co-metrics__grid { display: grid; gap: var(--v32-gap); }
.co-metric { background: var(--white); padding: 22px 28px; border-left: 4px solid var(--coral); display: flex; flex-direction: column; gap: 12px; }
.co-metric__value { display: flex; align-items: baseline; gap: 0.18em; }
.co-metric__delta { font-family: var(--font-body); font-size: 0.28em; font-weight: 700; }
.co-metric[data-delta="up"] .co-metric__delta { color: #4F7A4F; }
.co-metric[data-delta="down"] .co-metric__delta { color: var(--coral); }
.co-metric__hint { font-size: clamp(13px, 1vw, 16px); }

.co-cards__grid { display: grid; gap: var(--v32-gap); }
.co-card { background: var(--white); padding: 32px 28px; border-top: 5px solid var(--coral); display: flex; flex-direction: column; gap: 16px; }
.co-card__body { margin: 0; }
/* numbered / steps → 横排大条目(num | head+body | metric)· 旧 diagnosis */
.co-card-row { display: grid; grid-template-columns: 120px 1fr 240px; gap: 36px; padding: 36px 0; border-bottom: 1px solid rgba(0,0,0,0.12); align-items: baseline; }
.co-card-row__num { font-size: clamp(56px, 5vw, 96px); color: var(--coral); }
.co-card-row__head { margin: 0 0 14px; }
.co-card-row__body { max-width: 720px; margin: 0; }
.co-card-row__metric { text-align: right; }
.co-card-row__metric-l { margin-top: 10px; }

.co-closing { background: var(--ink); color: var(--cream); position: relative; overflow: hidden; }
.co-closing__display { color: var(--cream); max-width: 1500px; margin: 0; }
.co-closing__sub { color: var(--cream); max-width: 1000px; margin: 0; font-weight: 400; font-size: clamp(18px, 1.6vw, 28px); }
.co-closing .co-accent-line { margin: 40px 0 24px; }
.co-closing__cta { display: flex; gap: 20px; margin-top: 56px; }
.co-cta { padding: 20px 40px; text-decoration: none; font-family: var(--font-display); font-size: 18px; letter-spacing: 0.2em; text-transform: uppercase; display: inline-block; }
.co-cta[data-kind="primary"] { background: var(--coral); color: var(--ink); }
.co-cta[data-kind="secondary"] { border: 3px solid var(--cream); color: var(--cream); }

/* ── 兜底块的 coral 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 coral 的 Bebas uppercase + coral accent + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px; color: var(--ink); }
.v32-prose-body { font-family: var(--font-body); color: var(--ink); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-body); font-weight: 300; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-chart-svg { border-radius: 0; box-shadow: none; }
.v32-callout { border-left: 5px solid var(--coral); }
.v32-card { border-top: 5px solid var(--coral); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-body); font-weight: 700; letter-spacing: 0.36em; text-transform: uppercase; color: var(--coral); }
.v32-table-el th { font-family: var(--font-display); font-weight: 400; letter-spacing: 2px; text-transform: uppercase; background: var(--coral); color: var(--ink); }
.v32-seq-dot, .v32-quad-dot { background: var(--coral); border-radius: 50%; }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 64px/80px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 64px 80px; }
[data-v32-mode="present"] .co-cover .v32-slide-inner,
[data-v32-mode="present"] .co-statement,
[data-v32-mode="present"] .co-closing { padding: 0; }
[data-v32-mode="present"] .co-cover__display { font-size: clamp(96px, 11vw, 220px); }
[data-v32-mode="present"] .co-closing__display { font-size: clamp(56px, 7vw, 140px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐兜底)
// 视觉照搬旧 renderCover / renderHeroQuestion(→statement)/ renderStats(→metrics)/
// renderDiagnosis|features|proposal(→cards)/ renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx。renderer 只出 block DOM,不写 slide/pagenum/舞台包裹。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(coral hatch 顶 + cream 底 byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const tail = b.displayTail ? ` ${ctx.esc(b.displayTail)}` : "";
  const kicker = b.kicker
    ? `<div class="t-section-label-on-coral" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-light co-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="co-cover__byline">${b.byline
        .map(
          (x, j) =>
            `<div><div class="t-meta-label co-cover__byline .lbl">By</div><div class="t-meta-mono" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div></div>`,
        )
        .join("")}</div>`
    : "";
  return `<section class="v32-block co-cover" data-block-id="${b.id}">
  <div class="co-cover__top co-hatch">
    ${kicker}
    <h1 class="t-hero co-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  </div>
  <div class="co-cover__bottom">
    <div class="co-cover__rule"></div>
    ${lead}
    ${byline}
  </div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(coral hatch 满屏 · 大数字 + 居中论点 + 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-jumbo co-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="co-accent-line" style="margin: 0 auto 18px; background: var(--ink);"></div><div class="t-section-label-on-coral co-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block co-statement co-hatch" data-block-id="${b.id}">
  ${big}
  <p class="t-display co-statement__text" style="font-size: clamp(48px, 5vw, 96px);" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(白卡 coral-left border · Bebas coral 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const label = `<div class="t-section-label" style="margin-bottom: 24px;">By the Numbers</div>`;
  const title = b.title
    ? `<h2 class="t-section" style="margin: 0 0 40px; max-width: 1500px;" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="co-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body co-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="co-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-card-stat co-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-meta-label" style="letter-spacing: 0.2em;" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block co-metrics" data-block-id="${b.id}">
  ${label}
  ${title}
  <div class="co-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 白卡网格(coral-top border + coral-block 序号)· 旧 features
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-section-label" style="margin-bottom: 24px;" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-section" style="margin: 0 0 40px; max-width: 1500px;" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const numTxt = c.num ?? String(i + 1);
        return `<article class="co-card">
      <div class="co-coral-block">${ctx.esc(numTxt)}</div>
      <div class="t-card-title" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body co-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = Math.min(Math.max(Math.ceil((b.items.length || 1) / 2), 2), 3);
    return `<section class="v32-block co-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="co-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-card-stat" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-meta-label co-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-meta-label" style="color: var(--coral);">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="co-card-row">
      <div class="t-display co-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-title co-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body co-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="co-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block co-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div style="border-top: 1px solid rgba(0,0,0,0.12);">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(ink 底 · coral 巨型箭头背景 · coral CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-section-label" style="margin-bottom: 32px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-light co-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="co-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="co-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block co-closing" data-block-id="${b.id}" style="padding: 80px;">
  <div class="t-jumbo" aria-hidden="true" style="position: absolute; right: -40px; bottom: -40px; color: var(--coral); opacity: 0.4; font-size: clamp(200px, 32vw, 540px); line-height: 1;">→</div>
  ${kicker}
  <h2 class="t-display co-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  <div class="co-accent-line"></div>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const coralV32: TemplateV32 = {
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

export default coralV32;
export { coralV32, meta, fonts, themeCss };
