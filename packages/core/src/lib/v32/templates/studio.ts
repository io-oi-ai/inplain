/**
 * V32 S5 · Studio 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/studio.ts(旧 853 行,三入口 · deck 14 renderer + doc/sheet)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 studio 的视觉 DNA(near-black/acid-yellow token + t-* 排版 + chrome)
 *      搬过来,并把二元色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色;
 *   2) blocks:只覆盖 studio 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘(Barlow 900 uppercase / 2px 黄线 /
 *      无圆角无阴影)拿到 studio 观感。
 *
 * DNA(照搬旧模板注释):near-black(#1C1C1C)+ acid yellow(#F5D200)二元 palette;
 * 没第三色,muted 用同色 opacity;Barlow weight 900 uppercase 一手包办从 body 到 cover;
 * 巨大字号 · 负 tracking;IBM Plex Mono 只做 metadata/chrome;0 rounded / 0 shadow / 2px solid 分区。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "studio",
  name: "Studio",
  tagline:
    "Boring Studios manifesto · Barlow 900 uppercase 巨大字号 + acid yellow / near-black 二元 + IBM Plex Mono 三栏 lockup",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Design-studio decks · agency proposals · architecture portfolio · type-led manifestos · brand identity walk-throughs",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Barlow:wght@400;500;700;900",
  "IBM Plex Mono:wght@400;500",
  "Noto Sans SC:wght@400;500;700;900",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 studio 底色;再把关键 .v32-* 类重绘成 studio 观感。
const themeCss = `
:root {
  /* ── studio 原 token(照搬旧模板 :root)── */
  --near-black: #1C1C1C;
  --near-black-alt: #242422;
  --acid-yellow: #F5D200;
  --acid-yellow-alt: #F0CC00;
  --text-on-dark-2: rgba(245,210,0,0.58);
  --text-on-dark-3: rgba(245,210,0,0.32);
  --border-dark: #2E2E2C;

  --font-display: 'Barlow', 'Noto Sans SC', sans-serif;
  --font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;

  /* ── 把 studio 二元色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 studio 底色 ──
     WCAG AA:acid-yellow(#F5D200)on near-black(#1C1C1C)对比≈13:1;
     mute 用 yellow 58% 混底仍 ≥4.5:1;accent-bg 用 yellow 底 + near-black 文本(倒置)。 */
  --plain-bg: var(--near-black);
  --plain-surface: var(--near-black);
  --plain-surface-2: var(--near-black-alt);
  --plain-text: var(--acid-yellow);
  --plain-text-mute: var(--text-on-dark-2);
  --plain-text-faint: var(--text-on-dark-3);
  --plain-border: var(--border-dark);
  --plain-border-strong: var(--acid-yellow);
  --plain-accent: var(--acid-yellow);
  --plain-accent-strong: var(--acid-yellow);
  --plain-accent-bg: var(--acid-yellow);
  --plain-accent-fg: var(--near-black);
  --plain-success: #6FA56F;
  --plain-warn: #F09D2D;
  --plain-danger: #D45A3B;
  --plain-danger-bg: color-mix(in oklab, #D45A3B 16%, var(--near-black) 84%);

  --stage-bg: #0A0A0A;
  --slide-bg: var(--near-black);
  --doc-page-bg: var(--near-black);
  --doc-text: var(--acid-yellow);

  --font-body: var(--font-display);
  --v32-radius: 0px; /* studio 铁律:零圆角 */
  --v32-gap: 40px;   /* studio 用宽 gap + 2px 黄线分区 */
}

/* ── studio 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 900; font-size: clamp(140px, min(12vw, 22vh), 280px); line-height: 0.9; letter-spacing: -0.02em; text-transform: uppercase; color: var(--acid-yellow); }
.t-h1 { font-family: var(--font-display); font-weight: 900; font-size: clamp(80px, min(7.5vw, 13.5vh), 168px); line-height: 0.92; letter-spacing: -0.02em; text-transform: uppercase; color: var(--acid-yellow); }
.t-h2 { font-family: var(--font-display); font-weight: 900; font-size: clamp(48px, min(4.8vw, 8.4vh), 104px); line-height: 0.95; letter-spacing: -0.01em; text-transform: uppercase; color: var(--acid-yellow); }
.t-h3 { font-family: var(--font-display); font-weight: 700; font-size: clamp(24px, min(2.4vw, 4.2vh), 52px); line-height: 1.1; text-transform: uppercase; color: var(--acid-yellow); }
.t-stat { font-family: var(--font-display); font-weight: 900; font-size: clamp(60px, min(5.5vw, 10vh), 132px); line-height: 0.9; letter-spacing: -0.03em; text-transform: uppercase; color: var(--acid-yellow); }
.t-quote { font-family: var(--font-display); font-weight: 900; font-size: clamp(40px, min(3.8vw, 6.8vh), 84px); line-height: 1.05; letter-spacing: -0.02em; text-transform: uppercase; color: var(--acid-yellow); }
.t-lead { font-family: var(--font-display); font-weight: 500; font-size: clamp(16px, 1.6vw, 30px); line-height: 1.45; color: var(--acid-yellow); }
.t-body { font-family: var(--font-display); font-weight: 400; font-size: clamp(13px, 1.15vw, 22px); line-height: 1.6; color: var(--acid-yellow); }
.t-caption { font-family: var(--font-display); font-weight: 400; font-size: clamp(11px, 0.85vw, 16px); line-height: 1.5; color: var(--acid-yellow); }
.t-mono { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.72vw, 14px); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-on-dark-2); }

/* ── studio 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.st-cover__display { margin: 0; max-width: 1700px; }
.st-cover__tail { color: var(--text-on-dark-2); }
.st-cover__lead { margin-top: 48px; max-width: 1200px; color: var(--text-on-dark-2); }
.st-cover__byline { display: flex; gap: 32px; margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(245,210,0,0.25); }

.st-statement { text-align: left; }
.st-statement__num { font-size: clamp(120px, 14vw, 280px); margin: 0 0 24px; }
.st-statement__text { margin: 0; max-width: 1600px; }
.st-statement__anno { margin-top: 48px; }

.st-chrome-bar { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 14px; border-bottom: 1px solid var(--border-dark); margin-bottom: 32px; }

.st-metrics__title { margin: 0 0 48px; max-width: 1400px; }
.st-metrics__grid { display: grid; gap: 48px; }
.st-metric { border-top: 2px solid var(--acid-yellow); padding: 28px 28px 28px 0; }
.st-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.16em; }
.st-metric__delta { font-family: var(--font-display); font-size: 0.3em; }
.st-metric[data-delta="down"] .st-metric__delta { color: var(--plain-danger); }
.st-metric__label { margin-top: 18px; }
.st-metric__hint { margin-top: 10px; }

.st-cards__title { margin: 0 0 40px; max-width: 1500px; }
/* grid → 网格特性卡(旧 features);numbered/steps → 横排大条目(旧 diagnosis)*/
.st-cards__grid { display: grid; gap: 0 40px; }
.st-card { border-top: 2px solid var(--acid-yellow); padding: 28px 28px 28px 0; }
.st-card__num { margin-bottom: 18px; }
.st-card__head { margin: 0 0 14px; }
.st-card__body { margin: 0; }
.st-cards__list { }
.st-card-row { display: grid; grid-template-columns: 120px 1fr 220px; gap: 40px; padding: 36px 0; border-top: 2px solid var(--acid-yellow); align-items: baseline; }
.st-card-row__num { font-size: clamp(48px, 4vw, 96px); line-height: 0.9; margin: 0; }
.st-card-row__head { margin: 0 0 14px; }
.st-card-row__body { margin: 0; max-width: 760px; }
.st-card-row__metric { text-align: right; }
.st-card-row__metric-v { font-size: clamp(48px, 4vw, 96px); margin: 0; }
.st-card-row__metric-l { margin-top: 8px; }

.st-closing { background: var(--acid-yellow); color: var(--near-black); }
.st-closing .t-h1, .st-closing__display { color: var(--near-black); margin: 0; max-width: 1700px; }
.st-closing .t-mono { color: rgba(28,28,28,0.62); }
.st-closing__sub { margin-top: 40px; max-width: 1100px; color: rgba(28,28,28,0.62); font-family: var(--font-display); font-weight: 500; font-size: clamp(16px, 1.6vw, 30px); line-height: 1.45; }
.st-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.st-cta { font-family: var(--font-display); font-weight: 900; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; padding: 20px 36px; text-decoration: none; display: inline-block; }
.st-cta[data-kind="primary"] { color: var(--acid-yellow); background: var(--near-black); }
.st-cta[data-kind="secondary"] { color: var(--near-black); border: 2px solid var(--near-black); padding: 18px 36px; }

/* ── 兜底块的 studio 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 studio 的 Barlow 900 uppercase + 2px 黄线 + 无圆角无阴影)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: -0.015em; color: var(--acid-yellow);
}
.v32-prose-body, .v32-callout-body, .v32-card-body, .v32-media-body { font-family: var(--font-display); }
.v32-quote-text, .v32-media-quote blockquote {
  font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; color: var(--acid-yellow);
}
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-quote, .v32-chart-svg {
  border-radius: 0; box-shadow: none;
}
.v32-callout { border: 2px solid var(--acid-yellow); }
.v32-quote { border-left: 2px solid var(--acid-yellow); padding-left: 28px; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-on-dark-2); }
.v32-table-el th { border-bottom: 2px solid var(--acid-yellow); text-transform: uppercase; letter-spacing: 0.08em; }

/* present 舞台:near-black 底 + 大内边距(旧 slide-inner 是 60px 96px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 60px 96px; }
[data-v32-mode="present"] .slide { background: var(--near-black); }
[data-v32-mode="present"] .st-cover__display { font-size: clamp(140px, 12vw, 280px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐兜底)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(三栏 lockup 简化成 byline hairline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-mono" style="margin-bottom:32px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? ` <span class="st-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead st-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="st-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block st-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display st-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation · 居中大字)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display st-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-mono st-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>— ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block st-statement" data-block-id="${b.id}">
  ${big}
  <h2 class="t-h1 st-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(2px 黄线 stat-card · Barlow 900 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 st-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="st-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-mono st-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="st-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat st-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-h3 st-metric__label" style="font-weight:500;" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block st-metrics" data-block-id="${b.id}">
  ${title}
  <div class="st-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 网格特性卡(旧 features)
//   layout=numbered/steps → 横排大条目 num|head+body|metric(旧 diagnosis)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ? `<div class="t-mono">${ctx.esc(b.kicker)}</div>` : "";
  const title = b.title
    ? `<h2 class="t-h2 st-cards__title" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = b.items.length <= 3 ? b.items.length || 1 : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<div class="st-card">
      <div class="t-mono st-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-h3 st-card__head" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body st-card__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block st-cards" data-block-id="${b.id}" data-layout="grid">
  <div class="st-chrome-bar">${kicker || "<span></span>"}</div>
  ${title}
  <div class="st-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat st-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono st-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="st-card-row">
      <div class="t-stat st-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 st-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body st-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="st-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block st-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  <div class="st-chrome-bar">${kicker || "<span></span>"}</div>
  ${title}
  <div class="st-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(acid-yellow 底翻转 · near-black CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-mono" style="margin-bottom:40px;" ${ctx.edit(`${p}/kicker`, "kicker")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="st-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    return `<a class="st-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="st-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block st-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-h1 st-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const studioV32: TemplateV32 = {
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

export default studioV32;
export { studioV32, meta, fonts, themeCss };
