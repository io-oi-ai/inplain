/**
 * V32 S5 · Creative Mode 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/creative-mode.ts(旧 997 行,三入口 ~25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Creative Mode 的视觉 DNA(cream/ink/4色 token + Archivo Black 排版
 *      + 4px ink border + hard offset shadow + t-* 类)搬过来,并把品牌色映射到 --plain-*
 *      让"没覆盖的兜底块"自动吃到 cream 底 + ink border + hard shadow 的野兽派观感;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/compare/closing)。
 *      其余(prose/heading/quote/callout/table/sequence/quadrant/chart/media/group)走兜底
 *      renderer,靠下面 themeCss 对 .v32-* 的重绘拿到 Creative Mode 观感。
 *
 * DNA(照搬旧模板注释):暖 cream 底(#EFE9D9)· 4 accent(green/pink/orange/yellow · 不混搭)
 * · Archivo Black uppercase line-height 0.92 · 4px solid ink border · hard offset shadow
 * · 0 圆角 · 0 blur · JetBrains Mono metadata · 旋转 badge/stamp。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "creative-mode",
  name: "Creative Mode",
  tagline:
    "新野兽派 · cream + 4色 + Archivo Black + 4px ink border + hard offset shadow · Bauhaus / 朋克 zine / Swiss editorial",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Neo-brutalist studio decks · punk zine launches · activist editorial · loud product announcements · creative-team kickoff",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Archivo Black",
  "Space Grotesk:wght@300..700",
  "JetBrains Mono:wght@400..500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 cream 底 + ink border + hard shadow;再把关键 .v32-* 类
// 重绘成 Creative Mode 观感(Archivo Black serif / 4px border / hard offset shadow / 无圆角)。
const themeCss = `
:root {
  /* ── Creative Mode 原 token(照搬旧模板 :root)── */
  --cream: #EFE9D9;
  --cream-2: #E4DCC4;
  --ink: #0F0F0F;
  --ink-2: #2A2A2A;
  --green: #1F8A4C;
  --green-dark: #136636;
  --pink: #F06CA8;
  --pink-dark: #D14E8B;
  --orange: #E85A1F;
  --yellow: #F5C518;

  --font-display: 'Archivo Black', sans-serif;
  --font-ui: 'Space Grotesk', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ── 把 Creative Mode 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得野兽派底色 ──
     WCAG AA:ink(#0F0F0F)on cream(#EFE9D9)对比≈16:1;mute 用 ink 混 cream 仍 ≥7:1 */
  --plain-bg: var(--cream);
  --plain-surface: var(--cream);
  --plain-surface-2: var(--cream-2);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--cream));
  --plain-text-faint: color-mix(in oklab, var(--ink) 66%, var(--cream));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--pink);
  --plain-accent-strong: var(--pink-dark);
  --plain-accent-bg: var(--yellow);
  --plain-success: var(--green);
  --plain-warn: var(--orange);
  --plain-danger: var(--pink);
  --plain-danger-bg: color-mix(in oklab, var(--pink) 24%, var(--cream) 76%);

  --stage-bg: #0a0a0a;
  --slide-bg: var(--cream);
  --doc-page-bg: var(--cream);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* Creative Mode 铁律:零圆角(除极少数 pill) */
  --v32-gap: 28px;   /* 野兽派靠间隙 + 硬阴影分隔,保留 gap */
}

/* ── Creative Mode 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-jumbo { font-family: var(--font-display); font-weight: 400; font-size: clamp(120px, 12vw, 220px); line-height: 0.92; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, 9vw, 160px); line-height: 0.92; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-lg { font-family: var(--font-display); font-weight: 400; font-size: clamp(64px, 5.5vw, 100px); line-height: 0.92; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-md { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, 5vw, 96px); line-height: 0.92; letter-spacing: -0.01em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-stat-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, 5vw, 96px); line-height: 0.9; color: var(--ink); margin: 0; }
.t-step-num { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, 5vw, 100px); line-height: 0.85; color: var(--ink); margin: 0; }
.t-step-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(22px, 1.8vw, 36px); line-height: 1; letter-spacing: 0; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-body-lg { font-family: var(--font-ui); font-weight: 400; font-size: clamp(18px, 1.5vw, 28px); line-height: 1.4; color: var(--ink); }
.t-body-md { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.25vw, 24px); line-height: 1.3; color: var(--ink); }
.t-mono { font-family: var(--font-mono); font-weight: 400; font-size: clamp(14px, 1.05vw, 22px); line-height: 1; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }
.t-mono-kicker { font-family: var(--font-mono); font-weight: 400; font-size: clamp(14px, 1.05vw, 22px); line-height: 1; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); }

/* ── Creative Mode 分隔件 · cell / badge / stamp(照搬旧模板)── */
.cm-cell { border: 4px solid var(--ink); padding: 32px; }
.cm-cell.pink { background: var(--pink); color: var(--ink); }
.cm-cell.yellow { background: var(--yellow); color: var(--ink); }
.cm-cell.green { background: var(--green); color: var(--cream); }
.cm-cell.green .t-stat-num, .cm-cell.green .t-step-title, .cm-cell.green .t-step-num, .cm-cell.green .t-mono, .cm-cell.green .t-body-md { color: var(--cream); }
.cm-cell.orange { background: var(--orange); color: var(--cream); }
.cm-cell.orange .t-stat-num, .cm-cell.orange .t-step-title, .cm-cell.orange .t-step-num, .cm-cell.orange .t-mono, .cm-cell.orange .t-body-md { color: var(--cream); }
.cm-badge { background: var(--yellow); border: 4px solid var(--ink); padding: 14px 24px; transform: rotate(-4deg); font-family: var(--font-display); font-size: clamp(18px, 1.4vw, 28px); letter-spacing: 0; text-transform: uppercase; display: inline-block; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.cm-cover { position: relative; }
.cm-cover__display { max-width: 1300px; }
.cm-cover__tail { color: var(--orange); }
.cm-cover__lead { margin: 56px 0 0; max-width: 900px; }
.cm-cover__byline { margin-top: 48px; display: flex; gap: 24px; flex-wrap: wrap; }

.cm-statement { text-align: center; }
.cm-statement__num { color: var(--orange); font-size: clamp(140px, 16vw, 300px); margin: 0 0 24px; line-height: 0.85; }
.cm-statement__text { max-width: 1400px; margin: 0 auto; }
.cm-statement__anno { display: inline-block; margin-top: 48px; background: var(--yellow); border: 4px solid var(--ink); padding: 22px 28px; box-shadow: 12px 12px 0 var(--ink); }

.cm-metrics__title { margin: 0 0 48px; }
.cm-metrics__grid { display: grid; gap: 28px; }
.cm-metric { display: flex; flex-direction: column; gap: 16px; }
.cm-metric__hint { font-size: clamp(13px, 1vw, 18px); }

.cm-cards__kicker { margin-bottom: 20px; }
.cm-cards__title { margin: 0 0 40px; max-width: 1500px; }
.cm-cards__list { display: flex; flex-direction: column; gap: 24px; }
.cm-card-row { display: grid; grid-template-columns: 120px 1fr 200px; gap: 24px; align-items: baseline; }
.cm-card-row__num { font-size: clamp(56px, 5vw, 100px); }
.cm-card-row__head { font-size: clamp(22px, 1.8vw, 36px); margin-bottom: 14px; }
.cm-card-row__body { max-width: 720px; }
.cm-card-row__metric { text-align: right; }
.cm-card-row__metric-v { font-size: clamp(32px, 2.6vw, 56px); }
.cm-card-row__metric-l { margin-top: 10px; font-size: clamp(11px, 0.85vw, 16px); }
.cm-cards__grid { display: grid; gap: 28px; }
.cm-card { display: flex; flex-direction: column; gap: 18px; }
.cm-card__num { font-size: clamp(48px, 4.4vw, 84px); }
.cm-card__head { font-size: clamp(22px, 1.8vw, 36px); }

.cm-compare__title { margin: 0 0 40px; }
.cm-compare__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.cm-compare__col { display: flex; flex-direction: column; }
.cm-compare__label { margin-bottom: 28px; letter-spacing: 0.18em; }
.cm-compare__bullets { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; }
.cm-compare__col.pink .cm-compare__bullets li { border-bottom: 3px solid var(--ink); }
.cm-compare__col.green .cm-compare__bullets li { border-bottom: 3px solid var(--cream); }
.cm-compare__bullets li { padding: 14px 0; }

.cm-closing { background: var(--green); color: var(--cream); position: relative; }
.cm-closing__display { color: var(--cream); max-width: 1300px; font-size: clamp(96px, 10vw, 200px); }
.cm-closing__sub { color: var(--cream); margin: 48px 0 0; max-width: 1000px; opacity: 0.95; }
.cm-closing__cta { display: flex; gap: 20px; margin-top: 56px; }
.cm-cta { padding: 22px 36px; text-decoration: none; font-family: var(--font-display); font-size: clamp(18px, 1.4vw, 28px); text-transform: uppercase; border: 4px solid var(--ink); display: inline-block; }
.cm-cta[data-kind="primary"] { background: var(--yellow); color: var(--ink); }
.cm-cta[data-kind="secondary"] { background: transparent; color: var(--cream); border-color: var(--cream); }

/* ── 兜底块的 Creative Mode 重绘(prose/heading/quote/callout/table/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回野兽派:Archivo Black 标题 + 4px ink border + hard shadow + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; text-transform: uppercase; letter-spacing: -0.01em; }
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-media-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-ui); font-weight: 500; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table-scroll { border-radius: 0; }
.v32-callout, .v32-quote, .v32-table-scroll { border: 4px solid var(--ink); box-shadow: 12px 12px 0 var(--ink); }
.v32-callout[data-tone="ok"] { background: var(--green); color: var(--cream); }
.v32-callout[data-tone="warn"] { background: var(--orange); color: var(--cream); }
.v32-callout[data-tone="danger"] { background: var(--pink); color: var(--ink); }
.v32-callout[data-tone="info"], .v32-callout[data-tone="tip"], .v32-callout[data-tone="note"] { background: var(--yellow); color: var(--ink); }
.v32-quote { background: var(--pink); box-shadow: 18px 18px 0 var(--orange), 18px 18px 0 4px var(--ink); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 144/96/120)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 144px 96px 120px; }
[data-v32-mode="present"] .cm-cover__display { font-size: clamp(96px, 9vw, 160px); }
[data-v32-mode="present"] .cm-closing__display { font-size: clamp(96px, 10vw, 200px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderCompare / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

const CELL_COLORS = ["pink", "yellow", "green", "orange"];
const cellColor = (i: number): string => CELL_COLORS[i % CELL_COLORS.length] ?? "pink";

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-mono-kicker v32-cover-kicker cm-cards__kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<br/><span class="cm-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-lg cm-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="cm-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block cm-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-hero cm-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-jumbo cm-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="cm-statement__anno"><div class="t-mono-kicker" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div></div>`
    : "";
  return `<section class="v32-block cm-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-lg cm-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(4色 cell 网格 · Archivo Black 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-md cm-metrics__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const hint = m.hint
        ? `<div class="t-body-md cm-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="cm-cell ${cellColor(i)} cm-metric">
      <div class="t-stat-num" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}</div>
      <div class="t-mono" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block cm-metrics" data-block-id="${b.id}">
  ${title}
  <div class="cm-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 网格特性卡 · 旧 features
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-mono-kicker cm-cards__kicker" ${ctx.edit(`${p}/kicker`, "眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-md cm-cards__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="cm-cell ${cellColor(i)} cm-card">
      <div class="t-step-num cm-card__num">${ctx.esc(c.num ?? String(i + 1))}</div>
      <div class="t-step-title cm-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-md" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    return `<section class="v32-block cm-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="cm-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat-num cm-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono cm-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="cm-cell ${cellColor(i)} cm-card-row">
      <div class="t-step-num cm-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-step-title cm-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-md cm-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="cm-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block cm-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="cm-cards__list">${items}</div>
</section>`;
};

// compare ← 旧 renderCompare(pink | green 双 cell · bullets 硬线分隔)
const compare: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "compare" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-md cm-compare__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const col = (side: "left" | "right", color: string, tag: string) => {
    const c = b[side];
    const bullets = c.bullets
      .map((x, j) => `<li class="t-body-md" ${ctx.edit(`${p}/${side}/bullets/${j}`, "要点")}>${ctx.esc(x)}</li>`)
      .join("");
    return `<div class="cm-cell ${color} cm-compare__col ${color}">
      <div class="t-mono cm-compare__label">${tag} — <span ${ctx.edit(`${p}/${side}/label`, "对比标签")}>${ctx.esc(c.label)}</span></div>
      <ul class="cm-compare__bullets">${bullets}</ul>
    </div>`;
  };
  return `<section class="v32-block cm-compare" data-block-id="${b.id}">
  ${title}
  <div class="cm-compare__cols">${col("left", "pink", "A")}${col("right", "green", "B")}</div>
</section>`;
};

// closing ← 旧 renderClosing(green 底 · yellow CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const sub = b.sub
    ? `<p class="t-body-lg cm-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    return `<a class="cm-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="cm-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block cm-closing" data-block-id="${b.id}">
  <h2 class="t-jumbo cm-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const creativeModeV32: TemplateV32 = {
  meta,
  fonts,
  themeCss,
  blocks: {
    cover,
    statement,
    metrics,
    cards,
    compare,
    closing,
  },
};

export default creativeModeV32;
export { creativeModeV32, meta, fonts, themeCss };
