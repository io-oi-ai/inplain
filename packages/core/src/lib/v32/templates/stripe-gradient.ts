/**
 * V32 S5 · Stripe Gradient 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/stripe-gradient.ts(旧 924 行,三入口 14 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 stripe 视觉 DNA(near-white 底 + Stripe 蓝紫 anchor + tint 软卡片
 *      token + Inter 排版 t-* 类 + 蓝紫气氛渐变)搬过来,并把 stripe 色映射到
 *      --plain-* token,让"没覆盖的兜底块"自动吃到 stripe 底色/圆角/tint 边框;
 *   2) blocks:只覆盖 stripe 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer + 下面 themeCss 对 .v32-* 的重绘(Inter / 24px 圆角 / 蓝紫 em)。
 *
 * DNA(照搬旧模板注释):极浅 near-white 底(#FAFAFC)· Stripe 蓝紫(#635BFF)单 anchor
 * + 浅 tint 卡片 · Inter 全家族纯 sans-serif · 大留白小内容 · 24px 大圆角 · 无 border
 * + 仅 soft shadow(蓝紫 tint)· 优雅克制 · 强调文字直接用蓝紫。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "stripe-gradient",
  name: "Stripe Gradient",
  tagline:
    "Fintech 优雅 · 极浅白底 + Stripe 蓝紫 anchor + tint 软卡片 + 24px 圆角无边框 · Inter · 大留白",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Fintech pitch · payment platform · B2B enterprise · investor deck · compliance report · API product",
};

// V32 S5 · fonts:搬旧 fontLinks(Inter 全家族 + Noto Sans SC 中文)
const fonts = fontLinks([
  "Inter:wght@400;500;600;700;800",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块
// 吃到 stripe 底色/圆角/tint 边框;再把关键 .v32-* 类重绘成 stripe 观感。
const themeCss = `
:root {
  /* ── stripe 原 token(照搬旧模板 :root)── */
  --paper: #FAFAFC;
  --paper-alt: #F2F1FC;
  --ink: #1A1A2E;
  --mute: #6B6B8A;
  --hint: #A0A0BE;
  --indigo: #635BFF;
  --tint-border: rgba(99,91,255,0.14);

  --font-ui: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'Inter', 'Noto Sans SC', system-ui, sans-serif;

  /* ── 把 stripe 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 stripe 观感 ──
     WCAG AA:ink(#1A1A2E) on paper(#FAFAFC) 对比≈15:1;mute(#6B6B8A) on paper≈4.9:1 达标 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-alt);
  --plain-text: var(--ink);
  --plain-text-mute: var(--mute);
  --plain-text-faint: var(--hint);
  --plain-border: var(--tint-border);
  --plain-border-strong: color-mix(in oklab, var(--indigo) 30%, var(--paper));
  --plain-accent: var(--indigo);
  --plain-accent-strong: var(--indigo);
  --plain-accent-bg: var(--paper-alt);
  --plain-success: #2E8B57;
  --plain-warn: #C79A3D;
  --plain-danger: #C0492F;
  --plain-danger-bg: rgba(192,73,47,0.08);

  --stage-bg: #EFEEF8;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 24px; /* stripe 铁律:大圆角柔和系 */
  --v32-gap: 40px;    /* stripe 大留白 */
}

/* ── stripe 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-ui); font-weight: 700; font-size: clamp(64px, min(9.5vw, 16vh), 200px); line-height: 0.98; letter-spacing: -0.02em; color: var(--ink); }
.t-h1 { font-family: var(--font-ui); font-weight: 600; font-size: clamp(44px, min(5.2vw, 9vh), 110px); line-height: 1.08; letter-spacing: -0.01em; color: var(--ink); }
.t-h2 { font-family: var(--font-ui); font-weight: 600; font-size: clamp(30px, min(3vw, 5.5vh), 60px); line-height: 1.18; letter-spacing: -0.005em; color: var(--ink); }
.t-h3 { font-family: var(--font-ui); font-weight: 500; font-size: clamp(20px, min(1.9vw, 3.5vh), 36px); line-height: 1.3; color: var(--ink); }
.t-stat { font-family: var(--font-ui); font-weight: 600; font-size: clamp(52px, min(5.5vw, 10vh), 120px); line-height: 1; letter-spacing: -0.02em; color: var(--indigo); }
.t-lead { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.4vw, 26px); line-height: 1.58; color: var(--mute); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 1.05vw, 19px); line-height: 1.65; color: var(--ink); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--indigo); }
.t-mono-meta { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--hint); }

/* stripe 分隔件:蓝紫短横 rule + kicker rail */
.sg-rule { width: 56px; height: 2px; background: var(--indigo); border: none; border-radius: 2px; }
.sg-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 32px; }

/* 蓝紫气氛渐变层(present 舞台绝对定位)· 照搬旧 radial-gradient DNA */
.sg-bloom { position: absolute; pointer-events: none; z-index: 0; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(99,91,255,0.10) 0%, transparent 70%); }
.sg-bloom-tr { width: 60vw; height: 60vw; right: -18vw; top: -20vw; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.sg-cover { position: relative; }
.sg-cover__display { margin: 0; max-width: 20ch; }
.sg-cover__display em { color: var(--indigo); font-style: normal; font-weight: inherit; }
.sg-cover__lead { margin: 48px 0 0; max-width: 900px; }
.sg-cover__byline { display: flex; gap: 48px; margin-top: 80px; }

.sg-statement { position: relative; }
.sg-statement__num { font-size: clamp(120px, min(14vw, 22vh), 300px); margin: 0 0 24px; }
.sg-statement__text { margin: 0; max-width: 22ch; }
.sg-statement__text em { color: var(--indigo); font-style: normal; font-weight: 600; }
.sg-statement__anno { display: flex; align-items: center; gap: 18px; margin-top: 48px; }

.sg-metrics__title { margin: 0 0 48px; max-width: 1400px; }
.sg-metrics__grid { display: grid; gap: 40px; }
.sg-metric { border-top: 1px solid var(--tint-border); padding: 32px 32px 32px 0; }
.sg-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.18em; }
.sg-metric__delta { font-family: var(--font-ui); font-size: 0.26em; font-weight: 500; }
.sg-metric[data-delta="up"] .sg-metric__delta { color: var(--plain-success); }
.sg-metric[data-delta="down"] .sg-metric__delta { color: var(--plain-danger); }
.sg-metric[data-delta="flat"] .sg-metric__delta { color: var(--mute); }
.sg-metric__label { margin-top: 18px; }
.sg-metric__hint { margin-top: 10px; }

.sg-cards__title { margin: 0 0 48px; max-width: 1400px; }
/* numbered / steps → 横排大条目(num | head+body | metric);grid → tint 软卡片网格 */
.sg-cards__list { border-bottom: 1px solid var(--tint-border); }
.sg-card-row { display: grid; grid-template-columns: 100px 1fr 240px; gap: 32px; padding: 32px 0; border-top: 1px solid var(--tint-border); align-items: baseline; }
.sg-card-row__num { font-size: clamp(48px, 4vw, 88px); margin: 0; line-height: 0.9; }
.sg-card-row__head { margin: 0 0 14px; }
.sg-card-row__body { margin: 0; max-width: 720px; }
.sg-card-row__metric { text-align: right; }
.sg-card-row__metric-v { font-size: clamp(48px, 4vw, 88px); margin: 0; }
.sg-card-row__metric-l { margin-top: 8px; }
.sg-cards__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 36px; }
.sg-card { padding: 28px 28px 28px 0; border-top: 1px solid var(--tint-border); }
.sg-card__num { color: var(--indigo); margin-bottom: 14px; }
.sg-card__head { margin: 0 0 12px; }
.sg-card__body { margin: 0; }

.sg-closing { position: relative; }
.sg-closing__display { margin: 0; max-width: 18ch; }
.sg-closing__sub { margin-top: 40px; max-width: 900px; }
.sg-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.sg-cta { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; padding: 16px 32px; text-decoration: none; display: inline-block; border-radius: 999px; }
.sg-cta[data-kind="primary"] { background: var(--indigo); color: #fff; }
.sg-cta[data-kind="secondary"] { border: 1px solid var(--tint-border); color: var(--ink); }

/* ── 兜底块的 stripe 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们拉成 stripe 的 Inter + 24px 圆角 + 蓝紫 em + tint 软卡片)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-ui); font-weight: 600; letter-spacing: -0.005em; color: var(--ink);
}
.v32-prose-body, .v32-body, .v32-quote-text { font-family: var(--font-ui); }
.v32-prose-body em, .v32-quote-text em, .v32-callout-body em { color: var(--indigo); font-style: normal; font-weight: 600; }
/* stripe 铁律:兜底卡片走 24px 圆角 + tint 软阴影(非硬 border) */
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-media-figure {
  border-radius: var(--v32-radius);
  box-shadow: 0 8px 30px rgba(99,91,255,0.06);
}
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; color: var(--indigo); }

/* present 舞台:paper 底 + 大留白内边距(旧 slide-inner 是 60px 144px)· 覆盖块自撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 60px 144px; }
[data-v32-mode="present"] .sg-cover__display { font-size: clamp(80px, 9.5vw, 200px); }
[data-v32-mode="present"] .sg-closing__display { font-size: clamp(60px, 5.2vw, 110px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S3)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(蓝紫 rule kicker + 巨标题 + lead + byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sg-kicker-rail"><span class="sg-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const tail = b.displayTail
    ? ` <em ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead sg-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="sg-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono-meta" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block sg-cover" data-block-id="${b.id}">
  <div class="sg-bloom sg-bloom-tr"></div>
  ${kicker}
  <h1 class="t-display sg-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat sg-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="sg-statement__anno"><span class="sg-rule"></span><span class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block sg-statement" data-block-id="${b.id}">
  <div class="sg-bloom sg-bloom-tr"></div>
  ${big}
  <p class="t-h1 sg-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(tint 顶边 stat-card · 蓝紫大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 sg-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="sg-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-mono-meta sg-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="sg-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat sg-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body sg-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block sg-metrics" data-block-id="${b.id}">
  ${title}
  <div class="sg-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
//   layout=grid           → tint 软卡片网格 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sg-kicker-rail"><span class="sg-rule"></span><span class="t-label">${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 sg-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-mono-meta sg-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="sg-card">
      ${num}
      <div class="t-h3 sg-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body sg-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = Math.min(b.items.length <= 3 ? b.items.length || 1 : Math.ceil(Math.sqrt(b.items.length)), 4);
    return `<section class="v32-block sg-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="sg-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat sg-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono-meta sg-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono-meta">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="sg-card-row">
      <div class="t-stat sg-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 sg-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body sg-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="sg-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block sg-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="sg-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(蓝紫 rule kicker + 巨标题 + CTA pill)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sg-kicker-rail"><span class="sg-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead sg-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="sg-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="sg-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block sg-closing" data-block-id="${b.id}">
  <div class="sg-bloom sg-bloom-tr"></div>
  ${kicker}
  <h2 class="t-h1 sg-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const stripeGradientV32: TemplateV32 = {
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

export default stripeGradientV32;
export { stripeGradientV32, meta, fonts, themeCss };
