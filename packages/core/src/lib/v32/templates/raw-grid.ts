/**
 * V32 S5 · Raw Grid 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/raw-grid.ts(旧 775 行,三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 raw-grid 视觉 DNA(black/pink/green token + t-* 排版 +
 *      label-pill / border-3 / shadow-6 / wallpaper-num 装饰件)搬过来,并把品牌色
 *      映射到 --plain-* token,让"没覆盖的兜底块"自动吃到白底 + 3px 黑边观感;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/
 *      sequence/group)走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘拿到
 *      neobrutalist 观感(3px 黑边 / 零圆角 / hard offset shadow / pink-green 交替)。
 *
 * DNA(照搬旧模板注释):白底 + 3px 黑边即布局 + 两种 muted pastel(blush pink /
 * sage green)+ native system sans + 全大写 weight 900 负字距 display +
 * hard offset shadow 6/4px 0 black(0 blur)+ 零圆角零模糊 + 黑色 label pill +
 * → arrow CTA + 装饰性大数字 wallpaper + 区域间不留 gap 用 3px 黑线相接。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "raw-grid",
  name: "Raw Grid",
  tagline:
    "Neobrutalist · 3px 黑边即布局 + native system sans + pink/green pastel · hard offset shadow",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Brutalist editorial · zine layouts · protest posters · indie product mockups · system-native dashboards",
};

// V32 S5 · fonts:只加载 Noto Sans SC 作 CJK 兜底 · Latin 走 system stack(照搬旧 FONTS)
const fonts = fontLinks(["Noto Sans SC:wght@500;700;800;900"]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 raw-grid 底色;再把关键 .v32-* 类重绘成 neobrutalist 观感。
const themeCss = `
:root {
  /* ── raw-grid 原 token(照搬旧模板 :root)── */
  --black: #0A0A0A;
  --white: #FFFFFF;
  --pink: #F2D4CF;
  --green: #E5EDD6;
  --gray: #F5F5F5;
  --darkgray: #333333;

  --font-stack: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, 'Noto Sans SC', sans-serif;

  /* ── 把 raw-grid 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得白底 + 3px 黑边观感 ──
     WCAG AA:black(#0A0A0A) on white(#FFF) ≈ 20:1;mute 用 darkgray(#333) on white ≈ 12.6:1 均达标 */
  --plain-bg: var(--white);
  --plain-surface: var(--white);
  --plain-surface-2: var(--gray);
  --plain-text: var(--black);
  --plain-text-mute: var(--darkgray);
  --plain-text-faint: color-mix(in oklab, var(--black) 60%, var(--white));
  --plain-border: var(--black);
  --plain-border-strong: var(--black);
  --plain-accent: var(--black);
  --plain-accent-strong: var(--black);
  --plain-accent-bg: var(--pink);
  --plain-success: var(--black);
  --plain-warn: var(--black);
  --plain-danger: var(--black);
  --plain-danger-bg: var(--pink);

  --stage-bg: #2a2a2a;
  --slide-bg: var(--white);
  --doc-page-bg: var(--white);
  --doc-text: var(--black);

  --font-body: var(--font-stack);
  --v32-radius: 0px; /* raw-grid 铁律:零圆角 */
  --v32-gap: 0px;    /* raw-grid 用 3px 黑线相接而非 gap */
}

/* ── raw-grid 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-stack); font-weight: 900; font-size: clamp(72px, min(8vw, 13vh), 144px); line-height: 1.05; letter-spacing: -0.02em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-headline { font-family: var(--font-stack); font-weight: 900; font-size: clamp(48px, min(5.4vw, 9vh), 96px); line-height: 1.1; letter-spacing: -0.01em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-title { font-family: var(--font-stack); font-weight: 800; font-size: clamp(28px, min(2.4vw, 4vh), 44px); line-height: 1.2; letter-spacing: 0.01em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-subtitle { font-family: var(--font-stack); font-weight: 700; font-size: clamp(18px, 1.5vw, 26px); line-height: 1.3; letter-spacing: 0.04em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-body { font-family: var(--font-stack); font-weight: 500; font-size: clamp(16px, 1.3vw, 22px); line-height: 1.6; letter-spacing: 0; color: var(--black); margin: 0; }
.t-caption { font-family: var(--font-stack); font-weight: 700; font-size: clamp(12px, 1vw, 14px); line-height: 1.2; letter-spacing: 0.08em; text-transform: uppercase; color: var(--black); margin: 0; }
.t-num { font-family: var(--font-stack); font-weight: 900; font-size: clamp(96px, min(11vw, 18vh), 196px); line-height: 1; letter-spacing: -0.04em; color: var(--black); margin: 0; }
.t-num-lg { font-family: var(--font-stack); font-weight: 900; font-size: clamp(56px, min(7vw, 11vh), 120px); line-height: 1; letter-spacing: -0.02em; color: var(--black); margin: 0; }
.t-num-md { font-family: var(--font-stack); font-weight: 900; font-size: clamp(40px, min(4.4vw, 7vh), 80px); line-height: 1; letter-spacing: -0.02em; color: var(--black); margin: 0; }

/* ── Label pill(signature 小部件)── */
.label-pill { display: inline-block; background: var(--black); color: var(--white); padding: 7px 16px; font-family: var(--font-stack); font-weight: 800; font-size: 12px; line-height: 1; letter-spacing: 0.08em; text-transform: uppercase; }

/* ── Hard offset shadow / border-as-layout / wallpaper numeral / arrow CTA ── */
.shadow-6 { box-shadow: 6px 6px 0 var(--black); }
.shadow-4 { box-shadow: 4px 4px 0 var(--black); }
.border-3 { border: 3px solid var(--black); }
.wallpaper-num { position: absolute; font-family: var(--font-stack); font-weight: 900; line-height: 1; letter-spacing: -0.04em; color: var(--black); opacity: 0.18; pointer-events: none; z-index: 0; }
.icon-box { width: 56px; height: 56px; border: 3px solid var(--black); background: var(--white); display: flex; align-items: center; justify-content: center; font-family: var(--font-stack); font-size: 22px; font-weight: 900; text-transform: uppercase; }

/* ── 覆盖块自定义 class(由下面 block renderer 产出)────────── */
.rg-cover { position: relative; display: flex; flex-direction: column; justify-content: center; }
.rg-cover__wall { top: -40px; left: 36px; font-size: clamp(280px, 30vw, 600px); opacity: 0.08; }
.rg-cover__kicker { align-self: flex-start; margin-bottom: 32px; }
.rg-cover__display { max-width: 1600px; z-index: 1; }
.rg-cover__lead { margin: 40px 0 0; max-width: 1100px; z-index: 1; }
.rg-cover__byline { display: flex; gap: 24px; margin-top: 48px; padding-top: 20px; border-top: 3px solid var(--black); z-index: 1; }

.rg-statement { position: relative; display: flex; flex-direction: column; justify-content: center; }
.rg-statement__wall { top: 0; right: 0; font-size: clamp(200px, 30vw, 600px); opacity: 0.12; }
.rg-statement__num { margin-bottom: 40px; }
.rg-statement__text { max-width: 1500px; z-index: 1; }
.rg-statement__anno { margin-top: 48px; z-index: 1; }

.rg-metrics__head { display: flex; align-items: center; gap: 24px; margin-bottom: 0; padding-bottom: 28px; border-bottom: 3px solid var(--black); }
.rg-metrics__grid { display: grid; border-bottom: 3px solid var(--black); }
.rg-metric { padding: 48px 36px; border-right: 3px solid var(--black); position: relative; min-height: 320px; display: flex; flex-direction: column; justify-content: flex-end; }
.rg-metric:last-child { border-right: none; }
.rg-metric[data-tone="pink"] { background: var(--pink); }
.rg-metric[data-tone="green"] { background: var(--green); }
.rg-metric[data-tone="white"] { background: var(--white); }
.rg-metric__wall { top: 28px; right: 28px; font-size: 80px; opacity: 0.2; }
.rg-metric__label { margin-top: 16px; }
.rg-metric__hint { margin-top: 12px; font-size: 16px; }
.rg-metric__delta { font-size: 0.4em; margin-left: 0.15em; }

.rg-cards__head { display: flex; align-items: center; gap: 24px; padding-bottom: 28px; border-bottom: 3px solid var(--black); }
.rg-cards__list { border-bottom: 3px solid var(--black); }
.rg-card-row { padding: 32px 40px; border-bottom: 3px solid var(--black); display: grid; grid-template-columns: 100px 1fr 200px; gap: 32px; align-items: baseline; }
.rg-card-row:last-child { border-bottom: none; }
.rg-card-row[data-tone="pink"] { background: var(--pink); }
.rg-card-row[data-tone="green"] { background: var(--green); }
.rg-card-row__body { margin-top: 12px; }
.rg-card-row__metric { text-align: right; }
.rg-card-row__metric-l { margin-top: 8px; }
.rg-cards__grid { display: grid; }
.rg-card { padding: 36px 32px; border-right: 3px solid var(--black); border-bottom: 3px solid var(--black); position: relative; }
.rg-card__wall { top: 16px; right: 16px; font-size: 60px; }
.rg-card[data-tone="pink"] { background: var(--pink); }
.rg-card[data-tone="green"] { background: var(--green); }
.rg-card__head { z-index: 1; position: relative; }
.rg-card__body { margin-top: 12px; z-index: 1; position: relative; }

.rg-closing { background: var(--black); color: var(--white); position: relative; display: flex; flex-direction: column; justify-content: center; }
.rg-closing__wall { top: 40px; right: 40px; font-size: clamp(200px, 26vw, 540px); color: var(--white); opacity: 0.1; }
.rg-closing__kicker { background: var(--pink); color: var(--black); align-self: flex-start; margin-bottom: 40px; z-index: 1; }
.rg-closing__display { color: var(--white); max-width: 1500px; z-index: 1; }
.rg-closing__sub { color: var(--white); opacity: 0.9; margin-top: 32px; max-width: 900px; z-index: 1; }
.rg-closing__cta { display: flex; gap: 18px; margin-top: 56px; z-index: 1; }
.rg-cta { padding: 22px 36px; text-decoration: none; font-family: var(--font-stack); font-weight: 900; font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase; display: inline-block; }
.rg-cta[data-kind="primary"] { background: var(--pink); color: var(--black); border: 3px solid var(--black); box-shadow: 6px 6px 0 var(--white); }
.rg-cta[data-kind="secondary"] { background: var(--black); color: var(--white); border: 3px solid var(--white); }
.rg-cta[data-kind="primary"]::before { content: "→\\00a0"; font-weight: 900; }

/* ── 兜底块的 raw-grid 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 raw-grid 的 uppercase + 3px 黑边 + 零圆角 + 交替 pastel)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-stack); font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; }
.v32-prose-body { font-family: var(--font-stack); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-stack); font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-table-el, .v32-media-figure { border-radius: 0 !important; }
.v32-callout { border: 3px solid var(--black); box-shadow: 4px 4px 0 var(--black); background: var(--pink); }
.v32-quote { border: 3px solid var(--black); box-shadow: 6px 6px 0 var(--black); background: var(--green); padding: 28px 32px; }
.v32-card, .v32-metric { border: 3px solid var(--black); box-shadow: none; }
.v32-compare-col { border: 3px solid var(--black); }
.v32-compare-col[data-side="left"] { background: var(--pink); }
.v32-compare-col[data-side="right"] { background: var(--green); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-stack); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }

/* present 舞台:白底 + 大内边距(对齐 biennale 的 .v32-slide-inner 约定)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 64px 64px 72px; }
[data-v32-mode="present"] .rg-cover__display { font-size: clamp(72px, 8vw, 144px); }
[data-v32-mode="present"] .rg-closing__display { font-size: clamp(56px, 6vw, 120px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S3)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx;renderer 只出 block DOM,不写 slide/pagenum 包裹。
// ────────────────────────────────────────────────────────────

// raw-grid 三色交替(照搬旧模板 i%3 逻辑)
const TONE_3 = ["white", "pink", "green"] as const;
const TONE_4 = ["white", "pink", "green", "white"] as const;
const pad2 = (n: number) => String(n).padStart(2, "0");

// cover ← 旧 renderCover(label-pill kicker + wallpaper 大数字 + 3px 分隔的 byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="label-pill rg-cover__kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail ? ` <span ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>` : "";
  const lead = b.lead
    ? `<p class="t-body rg-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="rg-cover__byline">${b.byline
        .map((x, j) => `<div class="t-caption" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block rg-cover" data-block-id="${b.id}">
  <div class="wallpaper-num rg-cover__wall" aria-hidden="true">01</div>
  ${kicker}
  <h1 class="t-display rg-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(label-pill + wallpaper 大数字 + → 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const wall = b.bigNumber
    ? `<div class="wallpaper-num rg-statement__wall" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-subtitle rg-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>→ ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block rg-statement" data-block-id="${b.id}">
  ${wall}
  <div class="label-pill rg-statement__num">STATEMENT</div>
  <h2 class="t-headline rg-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(3px 分栏 · 三色交替 · wallpaper 序号 · weight-900 大数值)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const head = b.title
    ? `<div class="rg-metrics__head"><div class="label-pill">STATS</div><h2 class="t-title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2></div>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="rg-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-body rg-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="rg-metric" data-tone="${TONE_4[i % 4]}">
      <div class="wallpaper-num rg-metric__wall" aria-hidden="true">${pad2(i + 1)}</div>
      <div class="t-num-md">${ctx.esc(m.value)}${delta}</div>
      <div class="t-caption rg-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block rg-metrics" data-block-id="${b.id}">
  ${head}
  <div class="rg-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid          → 网格特性卡(icon-box + wallpaper 序号)· 旧 features
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const head = `<div class="rg-cards__head"><div class="label-pill">${ctx.esc(b.kicker ?? "SECTION")}</div>${
    b.title ? `<h2 class="t-headline" style="font-size: clamp(36px, 4vw, 60px);" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>` : ""
  }</div>`;

  if (b.layout === "grid") {
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const glyph = ctx.esc((c.icon ?? c.head.charAt(0)).slice(0, 2)).toUpperCase();
        return `<article class="rg-card" data-tone="${TONE_3[i % 3]}">
      <div class="wallpaper-num rg-card__wall" aria-hidden="true">${ctx.esc(c.num ?? pad2(i + 1))}</div>
      <div class="icon-box" style="margin-bottom: 22px;" aria-hidden="true">${glyph}</div>
      <div class="t-title rg-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body rg-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block rg-cards" data-block-id="${b.id}" data-layout="grid">
  ${head}
  <div class="rg-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-num-md" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${
            c.metricLabel ? `<div class="t-caption rg-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""
          }`
        : c.when
          ? `<div class="label-pill" style="justify-self: end;" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="rg-card-row" data-tone="${TONE_3[i % 3]}">
      <div class="t-num-md">${ctx.esc(c.num ?? pad2(i + 1))}</div>
      <div>
        <div class="t-title" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body rg-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="rg-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block rg-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${head}
  <div class="rg-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(black 底 · wallpaper END · pink primary CTA + hard shadow)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="label-pill rg-closing__kicker" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-body rg-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="rg-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}</a>`;
  };
  const cta = b.cta ? `<div class="rg-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block rg-closing" data-block-id="${b.id}">
  <div class="wallpaper-num rg-closing__wall" aria-hidden="true">END</div>
  ${kicker}
  <h2 class="t-display rg-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const rawGridV32: TemplateV32 = {
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

export default rawGridV32;
export { rawGridV32, meta, fonts, themeCss };
