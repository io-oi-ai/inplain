/**
 * V32 S5 · Apple Studio 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/apple-studio.ts(旧 916 行,三入口 14 slide renderer +
 * doc/sheet 各一套 CSS)。V32 模式:一份 block DOM,present/report 只在 CSS 层不同 →
 * 模板只需
 *   1) themeCss:把 apple 的视觉 DNA(纯白底 / 纯黑字 / 单科技蓝 accent / SF Pro-Inter
 *      大字 / flat 无阴影边框圆角 / 深留白)搬过来,并把 apple 色映射到 --plain-* token,
 *      让"没覆盖的兜底块"自动吃到 apple 底色 + flat 观感;
 *   2) blocks:只覆盖 apple 有强视觉主张的块(cover / statement / metrics / cards / closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘拿到 apple 观感。
 *
 * DNA(照搬旧模板注释):纯白底(#FFFFFF)+ 纯黑字(#1D1D1F)+ 深灰次要(#6E6E73)
 * + Inter/SF Pro weight 600-700 大字 + 深留白居中 + flat(0 阴影 0 边框 0 圆角)
 * + 单一科技蓝 accent(#0071E3)"呼吸"色不滥用。颜色对比即层次。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "apple-studio",
  name: "Apple Studio",
  tagline:
    "极简产品发布 · 纯白底 + 纯黑大字 + 深留白 · Inter/SF Pro · 居中 · 单科技蓝 accent · 0 阴影边框",
  scheme: "light" as const,
  density: "low" as const,
  bestFor:
    "Product launch · hardware intro · brand story · founder letter · minimalist narrative · keynote",
};

// V32 S5 · fonts:搬旧 fontLinks
const fonts = fontLinks([
  "Inter:wght@400;500;600;700;800",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 apple 白底黑字 flat 观感;再把关键 .v32-* 类重绘。
const themeCss = `
:root {
  /* ── apple 原 token(照搬旧模板 :root)── */
  --ink: #1D1D1F;
  --text-warm: #1D1D1F;
  --text-mute: #6E6E73;
  --text-hint: #AEAEB2;
  --paper: #FFFFFF;
  --paper-alt: #F5F5F7;
  --blue: #0071E3;
  --hairline: #E5E5EA;

  --font-ui: 'Inter', -apple-system, 'SF Pro Display', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'Inter', -apple-system, 'Noto Sans SC', system-ui, sans-serif;

  /* ── 把 apple 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 apple 观感 ──
     WCAG AA:ink(#1D1D1F) on paper(#FFFFFF) 对比≈16:1;mute(#6E6E73) 对比≈5.3:1;
     blue(#0071E3) on white 对比≈4.6:1 均 ≥4.5:1 达标 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-alt);
  --plain-text: var(--ink);
  --plain-text-mute: var(--text-mute);
  --plain-text-faint: var(--text-hint);
  --plain-border: var(--hairline);
  --plain-border-strong: var(--hairline);
  --plain-accent: var(--blue);
  --plain-accent-strong: var(--blue);
  --plain-accent-bg: color-mix(in oklab, var(--blue) 8%, var(--paper) 92%);
  --plain-success: var(--blue);
  --plain-warn: #C79A3D;
  --plain-danger: #A64B3F;
  --plain-danger-bg: color-mix(in oklab, #A64B3F 8%, var(--paper) 92%);

  --stage-bg: #F5F5F7;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* apple 铁律:flat 零圆角 */
  --v32-gap: 40px;   /* apple 靠深留白而非分隔线 */
}

/* ── apple 排版工具类(block renderer 直接用 · 由旧 t-* 收敛)── */
.t-display { font-family: var(--font-ui); font-weight: 700; font-size: clamp(64px, min(9.5vw, 16vh), 220px); line-height: 0.96; letter-spacing: -0.02em; color: var(--ink); }
.t-h1 { font-family: var(--font-ui); font-weight: 600; font-size: clamp(44px, min(5.2vw, 9vh), 120px); line-height: 1.08; letter-spacing: -0.01em; color: var(--ink); }
.t-h2 { font-family: var(--font-ui); font-weight: 600; font-size: clamp(30px, min(3vw, 5.5vh), 68px); line-height: 1.18; color: var(--ink); }
.t-h3 { font-family: var(--font-ui); font-weight: 500; font-size: clamp(20px, min(1.9vw, 3.5vh), 40px); line-height: 1.3; color: var(--ink); }
.t-stat { font-family: var(--font-ui); font-weight: 600; font-size: clamp(56px, min(5.5vw, 10vh), 128px); line-height: 1; letter-spacing: -0.02em; color: var(--blue); }
.t-lead { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.4vw, 28px); line-height: 1.58; color: var(--text-mute); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 1.05vw, 20px); line-height: 1.65; color: var(--ink); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--blue); }
.t-mono-meta { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-hint); }

/* apple accent 文字:科技蓝 · 非斜体加重(旧 .slide em 规则) */
.as-em { color: var(--blue); font-style: normal; font-weight: 600; }

/* apple 分隔件:gold rule → blue rule / hairline */
.as-rule { width: 56px; height: 1px; background: var(--blue); display: block; }
.as-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 36px; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.as-cover { position: relative; }
.as-cover__display { margin: 0; max-width: 1500px; }
.as-cover__lead { margin: 48px 0 0; max-width: 1000px; }
.as-cover__byline { display: flex; gap: 48px; margin-top: 88px; }

.as-statement { position: relative; }
.as-statement__num { font-size: clamp(88px, min(14vw, 22vh), 320px); margin-bottom: 32px; }
.as-statement__text { margin: 0; max-width: 1500px; }
.as-statement__anno { margin-top: 48px; }

.as-metrics__title { margin: 0 0 48px; max-width: 1400px; }
.as-metrics__grid { display: grid; gap: 40px; }
.as-metric { border-top: 1px solid var(--hairline); padding: 32px 32px 0 0; }
.as-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.2em; }
.as-metric__delta { font-family: var(--font-ui); font-size: 0.28em; }
.as-metric[data-delta="down"] .as-metric__delta { color: var(--plain-danger); }
.as-metric__label { margin-top: 18px; }
.as-metric__hint { margin-top: 10px; }

.as-cards__title { margin: 0 0 40px; max-width: 1400px; }
/* numbered / steps → 横排大条目(num | head+body | metric)· 旧 diagnosis */
.as-cards__list { border-bottom: 1px solid var(--hairline); }
.as-card-row { display: grid; grid-template-columns: 100px 1fr 240px; gap: 32px; padding: 32px 0; border-top: 1px solid var(--hairline); align-items: baseline; }
.as-card-row__num { font-size: clamp(40px, 4vw, 88px); line-height: 1; margin: 0; }
.as-card-row__head { margin: 0 0 14px; }
.as-card-row__body { margin: 0; max-width: 720px; }
.as-card-row__metric { text-align: right; }
.as-card-row__metric-v { font-size: clamp(40px, 4vw, 88px); margin: 0; }
.as-card-row__metric-l { margin-top: 8px; }
/* grid → 特性卡 · 旧 features */
.as-cards__grid { display: grid; gap: 0 36px; }
.as-card { border-top: 1px solid var(--hairline); padding: 28px 28px 28px 0; }
.as-card__num { color: var(--blue); margin-bottom: 14px; }
.as-card__head { margin: 0 0 12px; }
.as-card__body { margin: 0; }

.as-closing { position: relative; }
.as-closing__display { margin: 0; max-width: 1400px; }
.as-closing__sub { margin-top: 40px; max-width: 1000px; }
.as-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.as-cta { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; padding: 16px 32px; text-decoration: none; display: inline-block; }
.as-cta[data-kind="primary"] { color: var(--blue); border: 1px solid var(--blue); }
.as-cta[data-kind="secondary"] { color: var(--ink); border: 1px solid var(--hairline); }

/* ── 兜底块的 apple 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 apple 的 Inter + flat + 深留白 + 蓝 accent)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title { font-family: var(--font-ui); font-weight: 600; letter-spacing: -0.01em; }
.v32-prose-body, .v32-body, .v32-card-body, .v32-callout-body { font-family: var(--font-ui); }
.v32-quote-text { font-family: var(--font-ui); font-weight: 400; letter-spacing: -0.01em; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; color: var(--blue); }
.v32-card-num, .v32-seq-when, .v32-metric-value { color: var(--blue); }

/* present 舞台:白底 + 大内边距(旧 slide-inner 是 60px 144px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 60px 144px; }
[data-v32-mode="present"] .as-cover__display { font-size: clamp(100px, 9.5vw, 220px); }
[data-v32-mode="present"] .as-closing__display { font-size: clamp(60px, 5.2vw, 120px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx(旧 stats.items→metrics.items;diagnosis→cards numbered 等)。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="as-kicker-rail"><span class="as-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const tail = b.displayTail
    ? ` <span class="as-em" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead as-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="as-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono-meta" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block as-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display as-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation · 居中大字)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat as-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="as-kicker-rail as-statement__anno"><span class="as-rule"></span><span class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block as-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-h1 as-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 顶边 stat-card · 科技蓝大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 as-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="as-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-mono-meta as-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="as-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat as-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body as-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block as-metrics" data-block-id="${b.id}">
  ${title}
  <div class="as-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="as-kicker-rail"><span class="as-rule"></span><span class="t-label">${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 as-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="as-card">
      <div class="t-mono-meta as-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-h3 as-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body as-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block as-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="as-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat as-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono-meta as-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono-meta">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="as-card-row">
      <div class="t-stat as-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 as-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body as-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="as-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block as-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="as-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(白底 · 蓝描边 CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="as-kicker-rail"><span class="as-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead as-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="as-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="as-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block as-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-h1 as-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const appleStudioV32: TemplateV32 = {
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

export default appleStudioV32;
export { appleStudioV32, meta, fonts, themeCss };
