/**
 * V32 S5 · Editorial Forest 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/editorial-forest.ts(旧 1061 行,三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 forest 的视觉 DNA(green/pink/cream token + t-* 排版 + tile/hairline)
 *      搬过来,并把 forest 三色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色;
 *   2) blocks:只覆盖 forest 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/sequence/quadrant/chart/media/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Source Serif 500 + 2px hairline
 *      + tile 色块 + 6px radius)拿到 forest 观感。
 *
 * DNA(照搬旧模板注释):三色 editorial palette · 深森林绿 #2e4a2a + 灰玫粉 #e89cb1
 * + 燕麦奶油 #efe7d4 · Source Serif 4 weight 500 一统 display · JetBrains Mono UPPERCASE
 * 0.14-0.18em tracking 包揽 chrome · 零 shadow/gradient/glow · 唯一深度=色块对比 + 2px
 * hairline + filled vs bordered tile · 6px radius tile · 纸面感。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "editorial-forest",
  name: "Editorial Forest",
  tagline:
    "文学季刊 · Source Serif 4 weight 500 · 深森林绿 + 灰玫粉 + 燕麦奶油 · JetBrains Mono UPPERCASE 0.18em · 零阴影",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Literary quarterly issues · annual reports · monographs · curatorial pitches · long-form research summaries",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Source Serif 4:opsz,wght@8..60,400;8..60,500;8..60,600",
  "JetBrains Mono:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* / --font-body
// 让兜底块吃到 forest 底色;再把关键 .v32-* 类重绘成 forest 观感(serif + 2px hairline + tile)。
const themeCss = `
:root {
  /* ── forest 原 token(照搬旧模板 :root)── */
  --green: #2e4a2a;
  --green-deep: #243a21;
  --green-lite: #3a5a36;
  --pink: #e89cb1;
  --pink-deep: #d27e96;
  --cream: #efe7d4;
  --cream-2: #e6dcc4;
  --ink: #1a1a17;

  --font-serif: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;

  /* ── 把 forest 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 forest 底色 ──
     WCAG AA:ink(#1a1a17) on cream(#efe7d4) 对比≈13:1;green(#2e4a2a) on cream≈8:1;
     mute 用 ink 混 cream 仍 ≥4.5:1;accent-bg 用 pink 30% 稀释在 cream 上保持深文本可读 */
  --plain-bg: var(--cream);
  --plain-surface: var(--cream);
  --plain-surface-2: var(--cream-2);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 82%, var(--cream));
  --plain-text-faint: color-mix(in oklab, var(--ink) 64%, var(--cream));
  --plain-border: var(--green);
  --plain-border-strong: var(--green);
  --plain-accent: var(--green);
  --plain-accent-strong: var(--green-deep);
  --plain-accent-bg: color-mix(in oklab, var(--pink) 30%, var(--cream) 70%);
  --plain-success: var(--green-lite);
  --plain-warn: #B07A2A;
  --plain-danger: var(--pink-deep);
  --plain-danger-bg: color-mix(in oklab, var(--pink) 40%, var(--cream) 60%);

  --stage-bg: #d9d1bd;
  --slide-bg: var(--cream);
  --doc-page-bg: var(--cream);
  --doc-text: var(--ink);

  --font-body: var(--font-serif);
  --v32-radius: 6px; /* forest 柔和纸面:tile 保留 6px 圆角 */
  --v32-gap: 28px;   /* forest 用 gap + hairline 分隔 */
}

/* ── forest 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-hero { font-family: var(--font-serif); font-weight: 500; font-size: clamp(96px, min(11.5vw, 20vh), 220px); line-height: 0.92; letter-spacing: -0.02em; margin: 0; color: var(--green); }
.t-display { font-family: var(--font-serif); font-weight: 500; font-size: clamp(64px, min(7.3vw, 13vh), 140px); line-height: 1.02; letter-spacing: -0.02em; margin: 0; color: var(--green); }
.t-headline-xl { font-family: var(--font-serif); font-weight: 500; font-size: clamp(48px, min(5vw, 9vh), 96px); line-height: 0.96; letter-spacing: -0.02em; margin: 0; color: var(--green); }
.t-headline { font-family: var(--font-serif); font-weight: 500; font-size: clamp(44px, min(4.4vw, 8vh), 84px); line-height: 1.0; letter-spacing: -0.02em; margin: 0; color: var(--green); }
.t-title-card { font-family: var(--font-serif); font-weight: 500; font-size: clamp(34px, min(3.5vw, 6.2vh), 68px); line-height: 0.96; letter-spacing: -0.01em; margin: 0; color: var(--green); }
.t-title-card-sm { font-family: var(--font-serif); font-weight: 500; font-size: clamp(28px, min(2.9vw, 5.2vh), 56px); line-height: 0.98; letter-spacing: -0.01em; margin: 0; color: var(--green); }
.t-stat { font-family: var(--font-serif); font-weight: 500; font-size: clamp(96px, min(11.5vw, 20vh), 220px); line-height: 0.92; letter-spacing: -0.03em; margin: 0; color: var(--green); }
.t-body-lg { font-family: var(--font-serif); font-weight: 400; font-size: clamp(16px, min(1.7vw, 2.9vh), 32px); line-height: 1.32; color: var(--ink); }
.t-body-card { font-family: var(--font-serif); font-weight: 400; font-size: clamp(13px, min(1.35vw, 2.4vh), 26px); line-height: 1.34; color: var(--ink); }
.t-name { font-family: var(--font-serif); font-weight: 600; font-size: clamp(24px, 2.3vw, 44px); line-height: 1.0; color: var(--green); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(13px, 1.35vw, 26px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--green); }
.t-caption-mono { font-family: var(--font-mono); font-weight: 500; font-size: clamp(12px, 1.25vw, 24px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--green); }

/* forest 分隔件 & tile */
.ef-rule { height: 2px; background: var(--green); border: none; }
.ef-monogram { width: 130px; height: 130px; border-radius: 50%; border: 2px solid var(--pink); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 28px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
/* cover / statement / closing:深绿满版 · pink 大标题 · cream 副文(照搬旧 surface-green)*/
.ef-hero { background: var(--green); color: var(--cream); position: relative; }
.ef-hero .t-label { color: var(--pink); }
.ef-hero__display { color: var(--pink); max-width: 1500px; }
.ef-hero__display .ef-tail { display: block; color: var(--pink); }
.ef-hero__lead { color: var(--cream); margin: 56px 0 0; max-width: 880px; }
.ef-hero__byline { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 36px; border-top: 2px solid var(--pink); padding-top: 28px; margin-top: 48px; }
.ef-hero__byline .item { font-family: var(--font-serif); font-weight: 500; font-size: 18px; color: var(--cream); }
.ef-hero__num { color: var(--pink); margin: 0 0 36px; }
.ef-hero__anno { color: var(--pink); margin-top: 56px; }
.ef-hero__sub { color: var(--cream); margin: 48px 0 0; max-width: 880px; }
.ef-hero__kicker-rail { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }

.ef-cta { display: flex; gap: 24px; margin-top: 56px; }
.ef-cta a { display: inline-block; padding: 18px 36px; text-decoration: none; font-family: var(--font-mono); font-size: 16px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 6px; }
.ef-cta a[data-kind="primary"] { background: var(--pink); color: var(--green-deep); }
.ef-cta a[data-kind="secondary"] { border: 2px solid var(--pink); color: var(--pink); }

/* metrics ← 旧 renderStats(深绿满版 · pink 大数字 · 2px hairline 顶分栏)*/
.ef-metrics { background: var(--green); color: var(--cream); }
.ef-metrics .t-headline { color: var(--cream); margin: 0 0 60px; }
.ef-metrics__grid { display: grid; gap: 60px; }
.ef-metric { display: flex; flex-direction: column; gap: 18px; padding-top: 28px; border-top: 2px solid var(--pink); }
.ef-metric__value { color: var(--pink); font-size: clamp(64px, 8vw, 144px); display: flex; align-items: baseline; gap: 0.18em; }
.ef-metric__delta { font-family: var(--font-serif); font-size: 0.3em; }
.ef-metric[data-delta="down"] .ef-metric__delta { color: var(--pink-deep); }
.ef-metric__label { color: var(--pink); }
.ef-metric__hint { color: var(--cream); opacity: 0.9; }

/* cards ← 旧 renderDiagnosis(numbered/steps 横排大条目)/ renderFeatures(grid 色块 tile)*/
.ef-cards__title { color: var(--green); margin: 0 0 40px; max-width: 1400px; }
.ef-cards__list { border-bottom: 2px solid var(--green); }
.ef-card-row { display: grid; grid-template-columns: 88px 1fr 220px; gap: 32px; align-items: baseline; padding: 28px 0; border-top: 2px solid var(--green); }
.ef-card-row__num { color: var(--green); }
.ef-card-row__head { color: var(--green); margin: 0 0 12px; }
.ef-card-row__body { color: var(--ink); max-width: 740px; }
.ef-card-row__metric { text-align: right; }
.ef-card-row__metric-v { color: var(--green); font-size: clamp(40px, 4.6vw, 84px); }
.ef-card-row__metric-l { color: var(--green); margin-top: 8px; }
/* grid tile 色轮:green fill / pink fill / green-lite fill / cream bordered */
.ef-cards__grid { display: grid; gap: 28px; }
.ef-card { display: flex; flex-direction: column; gap: 16px; border-radius: 6px; padding: 40px; }
.ef-card[data-fill="0"] { background: var(--green); color: var(--pink); }
.ef-card[data-fill="1"] { background: var(--pink); color: var(--green-deep); }
.ef-card[data-fill="2"] { background: var(--green-lite); color: var(--pink); }
.ef-card[data-fill="3"] { background: var(--cream-2); color: var(--green); border: 2px solid var(--green); }
.ef-card__num { font-family: var(--font-mono); font-weight: 500; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; }
.ef-card__head { font-family: var(--font-serif); font-weight: 500; font-size: clamp(24px, 2.6vw, 40px); line-height: 0.98; margin: 0; color: inherit; }
.ef-card__body { font-family: var(--font-serif); font-weight: 400; font-size: clamp(14px, 1.3vw, 22px); line-height: 1.34; color: inherit; }

/* ── 兜底块的 forest 重绘(prose/heading/quote/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板"拉回 forest 的 serif + 2px hairline + tile 色块)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-quad-q { font-family: var(--font-serif); font-weight: 500; color: var(--green); }
.v32-prose-body, .v32-card-body, .v32-media-body, .v32-callout-body { font-family: var(--font-serif); font-weight: 400; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); font-weight: 500; font-style: normal; color: var(--green); }
.v32-quote { border-top: 2px solid var(--green); border-bottom: 2px solid var(--green); padding: 40px 0; }
.v32-kicker, .v32-cover-kicker, .v32-quote-attr, .v32-metric-label, .v32-seq-when, .v32-chart-caption { font-family: var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--green); }
.v32-callout { border-radius: 0; box-shadow: none; background: var(--cream-2); border-left: 4px solid var(--green); }
.v32-metric, .v32-card, .v32-compare-col { border-radius: 6px; box-shadow: none; }
.v32-compare-col[data-side="left"] { background: var(--green); color: var(--cream); }
.v32-compare-col[data-side="right"] { background: var(--pink); color: var(--green-deep); }
.v32-table-el th { font-family: var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; color: var(--green); border-bottom: 2px solid var(--green); }
.v32-seq-dot { background: var(--pink); border: 1px solid var(--green); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 96px 120px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 96px 120px; }
[data-v32-mode="present"] .ef-hero, [data-v32-mode="present"] .ef-metrics { margin: -96px -120px; padding: 96px 120px; min-height: calc(100% + 192px); box-sizing: border-box; display: flex; flex-direction: column; }
[data-v32-mode="present"] .ef-hero__display { font-size: clamp(96px, 11.5vw, 220px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S3 样板)
// 视觉照搬旧 renderCover / renderStats / renderDiagnosis|features /
// renderHeroQuestion / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// 只出 block DOM,舞台包裹/pagenum 是 render-report 的活。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(深绿满版 · pink hero 大标题)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="ef-hero__kicker-rail"><div class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const tail = b.displayTail
    ? `<span class="ef-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-lg ef-hero__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ef-hero__byline">${b.byline
        .map((x, j) => `<div class="item" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ef-hero" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display-hero ef-hero__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation · 深绿满版)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat ef-hero__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-label ef-hero__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ef-hero" data-block-id="${b.id}">
  ${big}
  <p class="t-display ef-hero__display" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(深绿满版 · pink 大数字 · 2px hairline 顶分栏)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ef-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-card ef-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="ef-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat ef-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-caption-mono ef-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block ef-metrics" data-block-id="${b.id}">
  ${title}
  <div class="ef-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
//   layout=grid           → 色块 tile 网格 · 旧 features(green/pink/green-lite/cream 色轮)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ? `<div class="t-label" style="margin-bottom:24px;">${ctx.esc(b.kicker)}</div>` : "";
  const title = b.title
    ? `<h2 class="t-headline-xl ef-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="ef-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="ef-card" data-fill="${i % 4}">
      ${num}
      <div class="ef-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="ef-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.min(Math.ceil(b.items.length / 2), 3);
    return `<section class="v32-block ef-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ef-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat ef-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-caption-mono ef-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-caption-mono ef-card-row__metric-l">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="ef-card-row">
      <div class="t-caption-mono ef-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-title-card-sm ef-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-card ef-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ef-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ef-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="ef-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(深绿满版 · pink hero 大标题 · pink CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="ef-hero__kicker-rail"><div class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-lg ef-hero__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ef-cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ef-hero" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-display-hero ef-hero__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const editorialForestV32: TemplateV32 = {
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

export default editorialForestV32;
export { editorialForestV32, meta, fonts, themeCss };
