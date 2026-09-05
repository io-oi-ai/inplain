/**
 * V32 S5 · Capsule 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/capsule.ts(旧 1035 行,三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 capsule 视觉 DNA(cream/ink/9 色糖果 token + t-* 排版 + grain/glow 气氛)
 *      搬过来,并把 capsule 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到 cream 底 +
 *      pill 观感(2px outline / hard offset shadow / 大圆角);
 *   2) blocks:只覆盖 capsule 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘拿到 capsule 观感(Bodoni serif 大字 +
 *      pill 卡片 + 糖果 accent + grain overlay)。
 *
 * DNA(照搬旧模板注释):暖 cream 底 + 9 色糖果 accent + 全 pill 几何(9999px/32px 圆角)+
 * 2px ink outline + hard offset shadow(永远偏右下)+ Bodoni Moda serif headlines +
 * Space Grotesk sans body + 4% fractal-noise grain overlay + radial candy glows。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "capsule",
  name: "Capsule",
  tagline:
    "胶囊形 Memphis 编辑系统 · 暖 cream + 9 色糖果 + Bodoni Moda + Space Grotesk · 全 pill 几何",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Playful editorial decks · ice-cream-parlor branding · Memphis-revival pitches · fashion / lifestyle launch · candy-palette product reveals",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Bodoni Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900",
  "Space Grotesk:wght@300..700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// cream 底 + pill 观感;再把关键 .v32-* 类重绘成 capsule 观感(Bodoni serif + pill 卡片 + grain)。
const themeCss = `
:root {
  /* ── capsule 原 token(照搬旧 :root)── */
  --cream: #F5F5F0;
  --ink: #1A1A1A;
  --outline: #1E1E1E;
  --white: #FFFFFF;
  --coral: #E85D4E;
  --lime: #C4D94E;
  --lavender: #C5B5E0;
  --sky: #8BB4F7;
  --violet: #A06CE8;
  --yellow: #F2D160;
  --peach: #F5B895;
  --mint: #A8E6CF;
  --shadow: rgba(26, 26, 26, 0.08);

  --font-display: 'Bodoni Moda', Georgia, serif;
  --font-body: 'Space Grotesk', Inter, sans-serif;

  /* ── 把 capsule 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 cream 底 + pill 观感 ──
     WCAG AA:ink(#1A1A1A) on cream(#F5F5F0) 对比≈16:1;mute/faint 混 cream 仍 ≥4.5:1 */
  --plain-bg: var(--cream);
  --plain-surface: var(--white);
  --plain-surface-2: color-mix(in oklab, var(--lavender) 12%, var(--white));
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 80%, var(--cream));
  --plain-text-faint: color-mix(in oklab, var(--ink) 60%, var(--cream));
  --plain-border: var(--outline);
  --plain-border-strong: var(--outline);
  --plain-accent: var(--coral);
  --plain-accent-strong: var(--coral);
  --plain-accent-bg: color-mix(in oklab, var(--yellow) 45%, var(--white));
  --plain-success: color-mix(in oklab, var(--mint) 60%, var(--ink) 40%);
  --plain-warn: color-mix(in oklab, var(--yellow) 40%, var(--ink) 60%);
  --plain-danger: var(--coral);
  --plain-danger-bg: color-mix(in oklab, var(--coral) 30%, var(--white));

  --stage-bg: #1a1a1a;
  --slide-bg: var(--cream);
  --doc-page-bg: var(--cream);
  --doc-text: var(--ink);

  --font-body: var(--font-body);
  --v32-radius: 32px; /* capsule 铁律:大圆角 pill 几何 */
  --v32-gap: 28px;    /* capsule 卡片间距舒朗 */
}

/* ── capsule 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 800; font-size: clamp(96px, min(10vw, 16vh), 200px); line-height: 0.9; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-closing-display { font-family: var(--font-display); font-weight: 800; font-size: clamp(80px, min(8vw, 14vh), 160px); line-height: 0.95; letter-spacing: -0.03em; color: var(--ink); margin: 0; }
.t-section-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(48px, min(5vw, 8vh), 96px); line-height: 1.05; letter-spacing: -0.01em; color: var(--ink); margin: 0; }
.t-card-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(28px, 2.2vw, 44px); line-height: 1.1; color: var(--ink); margin: 0; }
.t-stat-num { font-family: var(--font-display); font-weight: 800; font-size: clamp(64px, min(6vw, 10vh), 120px); line-height: 1; letter-spacing: -0.03em; margin: 0; }
.t-body { font-family: var(--font-body); font-weight: 400; font-size: clamp(15px, 1.2vw, 22px); line-height: 1.6; color: var(--ink); }
.t-body-sm { font-family: var(--font-body); font-weight: 400; font-size: clamp(13px, 1vw, 18px); line-height: 1.55; color: var(--ink); opacity: 0.75; }
.t-label { font-family: var(--font-body); font-weight: 500; font-size: clamp(11px, 0.85vw, 14px); line-height: 1; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.t-mini-label { font-family: var(--font-body); font-weight: 500; font-size: clamp(10px, 0.75vw, 12px); line-height: 1; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); }
.t-pill-text-sm { font-family: var(--font-body); font-weight: 600; font-size: 11px; line-height: 1; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); }

/* ── capsule pill primitives(覆盖块 + 兜底重绘共用)── */
.cap-pill { display: inline-flex; align-items: center; border: 2px solid var(--outline); border-radius: 9999px; padding: 10px 24px; background: var(--white); font-family: var(--font-body); font-weight: 600; }
.cap-pill.shadow-sm { box-shadow: 4px 4px 0 var(--shadow); }
.cap-pill.title-pill { background: var(--yellow); padding: 18px 44px; font-size: 14px; letter-spacing: 0.16em; text-transform: uppercase; }
.cap-card { background: var(--white); border: 2px solid var(--outline); border-radius: 32px; padding: 36px 32px; box-shadow: 8px 8px 0 var(--shadow); }
.cap-accent-line { width: 60px; height: 4px; background: var(--coral); border-radius: 9999px; }
.cap-node { width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--outline); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); flex: none; }

/* ── grain overlay(4% multiply · 照搬旧 .slide::after)· 舞台/长页都挂 ── */
.slide::after, .doc-page::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 9999;
  opacity: 0.04; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>");
}

/* radial candy glows(present 舞台底 · 照搬旧 .slide 背景) */
[data-v32-mode="present"] .slide {
  background:
    radial-gradient(ellipse at 18% 12%, color-mix(in oklab, var(--lavender) 14%, transparent) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 80%, color-mix(in oklab, var(--peach) 12%, transparent) 0%, transparent 55%),
    var(--cream);
}

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.cap-cover__display { max-width: 1500px; }
.cap-cover__display .cap-tail { font-style: italic; display: block; }
.cap-cover__lead { max-width: 880px; margin: 0; }
.cap-cover__byline { margin-top: 56px; display: flex; gap: 16px; flex-wrap: wrap; }

.cap-statement { text-align: center; align-items: center; }
.cap-statement__num { font-size: clamp(120px, 18vw, 300px); color: var(--coral); }
.cap-statement__text { max-width: 1400px; margin-top: 24px; }
.cap-statement__anno { margin-top: 24px; }

.cap-metrics__grid { display: grid; gap: 28px; }
.cap-stat { display: flex; flex-direction: column; gap: 14px; }
.cap-stat__num { font-size: clamp(56px, 5vw, 96px); }
.cap-stat__line { margin-top: auto; }

.cap-cards__list { display: flex; flex-direction: column; gap: 24px; }
.cap-card-row { display: grid; grid-template-columns: 80px 1fr 200px; gap: 32px; align-items: center; }
.cap-card-row__metric { text-align: right; }
.cap-card-row__metric-v { font-size: clamp(36px, 3vw, 56px); }
.cap-card-row__metric-l { margin-top: 8px; }
.cap-cards__grid { display: grid; gap: 28px; }
.cap-feature__head { margin: 24px 0 14px; }

.cap-closing__display { max-width: 1500px; }
.cap-closing__cta { display: flex; gap: 20px; margin-top: 56px; }
.cap-cta { padding: 18px 36px; text-decoration: none; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; }
.cap-cta[data-kind="primary"] { background: var(--yellow); }
.cap-cta[data-kind="secondary"] { background: var(--white); }

/* ── 兜底块的 capsule 重绘(prose/heading/quote/callout/table/compare/… 走兜底,
     这里把它们从"素模板方角卡片"拉回 capsule 的 Bodoni serif + pill 卡片 + 糖果 accent)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 700; }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-metric-label, .v32-compare-bullets { font-family: var(--font-body); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; font-weight: 600; }
/* pill 卡片:兜底容器接管 cream 底 + 2px outline + hard shadow + 大圆角 */
.v32-callout, .v32-card, .v32-compare-col, .v32-table-scroll, .v32-quote, .v32-chart-svg { border: 2px solid var(--outline); border-radius: 32px; background: var(--white); box-shadow: 8px 8px 0 var(--shadow); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-body); letter-spacing: 0.16em; text-transform: uppercase; }
/* accent line 装饰(section 标题下的糖果横条) */
.v32-metric-value, .v32-quad-dot { color: var(--coral); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 72px 96px 96px) */
[data-v32-mode="present"] .v32-slide-inner { padding: 72px 96px 96px; }
[data-v32-mode="present"] .cap-cover__display { font-size: clamp(96px, 10vw, 200px); }
[data-v32-mode="present"] .cap-closing__display { font-size: clamp(80px, 8vw, 160px); }
`.trim();

// V32 S5 · 9 色糖果轮转(照搬旧 CANDY + candyFor)
const CANDY = ["coral", "lime", "sky", "violet", "yellow", "lavender", "peach", "mint"];
function candyFor(i: number): string {
  return CANDY[i % CANDY.length] ?? "coral";
}

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(title-pill kicker + Bodoni display + coral accent line + byline pills)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="cap-pill title-pill" style="align-self: flex-start; margin-bottom: 48px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<em class="cap-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-body cap-cover__lead" style="margin-top: 24px;" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="cap-cover__byline">${b.byline
        .map((x, j) => `<span class="cap-pill shadow-sm"><span class="t-mini-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span></span>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block cap-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display cap-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  <div class="cap-accent-line" style="margin: 36px 0 0;"></div>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(coral 巨数字 + Bodoni 论点 + accent + 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat-num cap-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-label cap-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  const accent = b.annotation ? `<div class="cap-accent-line" style="margin: 24px auto 0;"></div>` : "";
  return `<section class="v32-block cap-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-section-headline cap-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${accent}
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(糖果 stat-pill · Bodoni 大数字 · 底部 accent line)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-section-headline" style="margin: 0 0 48px;" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const c = candyFor(i);
      const hint = m.hint ? `<div class="t-body-sm">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="cap-card cap-stat">
      <div class="t-stat-num cap-stat__num" style="color: var(--${c});">${ctx.esc(m.value)}</div>
      <div class="t-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
      <div class="cap-accent-line cap-stat__line" style="background: var(--${c});"></div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block cap-metrics" data-block-id="${b.id}">
  ${title}
  <div class="cap-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排 pill-card 大条目(node | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → 网格特性卡(node icon 顶 · head · body)· 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="cap-pill" style="align-self: flex-start; margin-bottom: 24px; background: var(--lavender);"><span class="t-pill-text-sm" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-section-headline" style="margin: 0 0 40px; max-width: 1500px;" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const cc = candyFor(i);
        return `<article class="cap-card">
      <div class="cap-node" style="background: var(--${cc});">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-card-headline cap-feature__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block cap-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="cap-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const cc = candyFor(i);
      const right = c.metric
        ? `<div class="t-stat-num cap-card-row__metric-v" style="color: var(--${cc});" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mini-label cap-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<span class="cap-pill shadow-sm" style="background: var(--${cc});"><span class="t-pill-text-sm" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</span></span>`
          : "";
      return `<div class="cap-card cap-card-row">
      <div class="cap-node" style="background: var(--${cc});">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-headline" style="margin-bottom: 12px;" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body" style="max-width: 720px;" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="cap-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block cap-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="cap-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(title-pill kicker + Bodoni display + coral accent + CTA pills)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="cap-pill title-pill" style="align-self: flex-start; margin-bottom: 40px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-body" style="max-width: 900px; margin-top: 24px; font-size: clamp(18px, 1.4vw, 26px);" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="cap-pill shadow-sm cap-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="cap-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block cap-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-closing-display cap-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  <div class="cap-accent-line" style="width: 80px; margin: 36px 0 0;"></div>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const capsuleV32: TemplateV32 = {
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

export default capsuleV32;
export { capsuleV32, meta, fonts, themeCss };
