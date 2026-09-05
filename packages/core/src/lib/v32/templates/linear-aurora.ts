/**
 * V32 S5 · Linear Aurora 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/linear-aurora.ts(旧 938 行,三入口 14 slide + doc/sheet renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Linear Aurora 的视觉 DNA(navy/aurora/blue-purple accent token + t-* 排版
 *      + aurora 光晕气氛层)搬过来,并把品牌色映射到 --plain-* token,让"没覆盖的兜底块"
 *      自动吃到深色底色;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘拿到 aurora 观感。
 *
 * DNA(照搬旧模板注释):深海军底 #0A0E27 + 蓝→紫 aurora radial glow + Inter display/body
 * + JetBrains Mono kicker/chrome/数字 + 12px 圆角 + 1px 半透 border + 渐变 accent。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "linear-aurora",
  name: "Linear Aurora",
  tagline:
    "SaaS 精致深色 · 深海军 + 蓝紫 aurora 渐变光晕 + 12px 圆角 · Inter + JetBrains Mono · 科技产品气质",
  scheme: "dark" as const,
  density: "high" as const,
  bestFor:
    "SaaS pitch · AI product launch · developer tools · enterprise software · startup fundraise · technical roadmap",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Inter:wght@400;500;600;700;800",
  "JetBrains Mono:wght@400;500;600",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// aurora 深色底;再把关键 .v32-* 类重绘成 aurora 观感(Inter + 蓝紫 accent + 12px 圆角)。
const themeCss = `
:root {
  /* ── Linear Aurora 原 token(照搬旧模板 :root)── */
  --navy: #0E1330;
  --navy-alt: #161D42;
  --slide-bg: #0A0E27;
  --text-warm: #E8EAF6;
  --text-muted-dark: #9098C0;
  --text-hint-dark: #5560A0;
  --blue: #5B8CFF;
  --purple: #9B5DE5;
  --gold: #8B7BF7; /* 旧模板的 accent(蓝紫)· 沿用变量名 */

  --font-display: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-ui: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ── 把 Aurora 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得深海军底 ──
     WCAG AA:text-warm(#E8EAF6) on slide-bg(#0A0E27) 对比≈15:1;
     text-muted-dark(#9098C0) 仍 ≥4.5:1;accent 蓝紫仅用于强调非正文 */
  --plain-bg: var(--slide-bg);
  --plain-surface: var(--navy);
  --plain-surface-2: var(--navy-alt);
  --plain-text: var(--text-warm);
  --plain-text-mute: var(--text-muted-dark);
  --plain-text-faint: var(--text-hint-dark);
  --plain-border: rgba(255,255,255,0.10);
  --plain-border-strong: rgba(255,255,255,0.18);
  --plain-accent: var(--blue);
  --plain-accent-strong: var(--purple);
  --plain-accent-bg: color-mix(in oklab, var(--blue) 16%, var(--slide-bg) 84%);
  --plain-success: #4d8b5e;
  --plain-warn: #c79a3d;
  --plain-danger: #d16a5a;
  --plain-danger-bg: color-mix(in oklab, #d16a5a 14%, var(--slide-bg) 86%);

  --stage-bg: #060818;
  --doc-page-bg: var(--slide-bg);
  --doc-text: var(--text-warm);

  --font-body: var(--font-ui);
  --v32-radius: 12px; /* aurora 铁律:12px 柔和圆角 */
  --v32-gap: 32px;    /* SaaS 舒展留白 */
}

/* ── aurora 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 700; font-size: clamp(100px, min(9.5vw, 16vh), 220px); line-height: 0.96; letter-spacing: -0.02em; color: var(--text-warm); }
.t-h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(60px, min(5.2vw, 9vh), 120px); line-height: 1.08; letter-spacing: -0.01em; color: var(--text-warm); }
.t-h2 { font-family: var(--font-display); font-weight: 600; font-size: clamp(36px, min(3vw, 5.5vh), 68px); line-height: 1.18; color: var(--text-warm); }
.t-h3 { font-family: var(--font-display); font-weight: 500; font-size: clamp(22px, min(1.9vw, 3.5vh), 40px); line-height: 1.3; color: var(--text-warm); }
.t-stat { font-family: var(--font-display); font-weight: 600; font-size: clamp(64px, min(5.5vw, 10vh), 128px); line-height: 1; letter-spacing: -0.02em; color: var(--gold); }
.t-lead { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.4vw, 28px); line-height: 1.58; color: var(--text-muted-dark); }
.t-cover-subtitle { font-family: var(--font-ui); font-weight: 500; font-size: clamp(20px, min(2.2vw, 3.6vh), 38px); line-height: 1.4; color: var(--blue); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 1.05vw, 20px); line-height: 1.65; color: var(--text-warm); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
.t-mono-meta { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-hint-dark); }

/* aurora 分隔件 */
.la-rule { width: 56px; height: 1px; background: var(--gold); display: block; flex: none; }
.la-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 32px; }

/* aurora 渐变光晕气氛层(present 舞台绝对定位)· 从旧 .slide 背景抽出 */
.la-bloom { position: absolute; pointer-events: none; border-radius: 50%; z-index: 0; }
.la-bloom-tr { width: 46vw; height: 46vw; right: -10vw; top: -14vh;
  background: radial-gradient(closest-side, rgba(91,140,255,0.22), transparent 62%); }
.la-bloom-bl { width: 42vw; height: 42vw; left: -12vw; bottom: -16vh;
  background: radial-gradient(closest-side, rgba(155,93,229,0.18), transparent 60%); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.la-cover { position: relative; }
.la-cover__display { margin: 0; max-width: 22ch; }
.la-cover__display em { color: var(--blue); font-style: normal; font-weight: 700; }
.la-cover__lead { margin: 48px 0 0; max-width: 60ch; }
.la-cover__byline { display: flex; gap: 48px; margin-top: 72px; }

.la-statement { position: relative; }
.la-statement__num { font-size: clamp(140px, min(14vw, 22vh), 320px); margin: 0 0 32px; }
.la-statement__text { margin: 0; max-width: 26ch; }
.la-statement__anno { margin-top: 48px; }

.la-metrics__title { margin: 0 0 48px; max-width: 30ch; }
.la-metrics__grid { display: grid; gap: 40px; }
.la-metric { border-top: 1px solid var(--plain-border); padding: 32px 32px 0 0; }
.la-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.24em; }
.la-metric__delta { font-family: var(--font-ui); font-size: 0.26em; font-weight: 600; }
.la-metric[data-delta="up"] .la-metric__delta { color: var(--blue); }
.la-metric[data-delta="down"] .la-metric__delta { color: var(--plain-danger); }
.la-metric__label { margin-top: 18px; }
.la-metric__hint { margin-top: 10px; }

.la-cards__title { margin: 0 0 48px; max-width: 34ch; }
/* numbered / steps → 横排大条目;grid → 网格特性卡(旧 features/proposal/diagnosis)*/
.la-cards__list { border-bottom: 1px solid var(--plain-border); }
.la-card-row { display: grid; grid-template-columns: 100px 1fr 240px; gap: 32px; padding: 32px 0; border-top: 1px solid var(--plain-border); align-items: baseline; }
.la-card-row__num { font-size: clamp(48px, 4vw, 88px); line-height: 0.9; margin: 0; }
.la-card-row__head { margin: 0 0 14px; }
.la-card-row__body { margin: 0; max-width: 720px; }
.la-card-row__metric { text-align: right; }
.la-card-row__metric-v { font-size: clamp(48px, 4vw, 88px); margin: 0; }
.la-card-row__metric-l { margin-top: 8px; }
.la-cards__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 36px; }
.la-card { border-top: 2px solid var(--gold); padding: 28px 28px 28px 0; }
.la-card__num { margin-bottom: 14px; color: var(--gold); }
.la-card__head { margin: 0 0 12px; }
.la-card__body { margin: 0; }

.la-closing { position: relative; }
.la-closing__display { margin: 0; max-width: 26ch; }
.la-closing__sub { margin-top: 40px; max-width: 60ch; }
.la-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.la-cta { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; padding: 16px 32px; text-decoration: none; display: inline-block; border-radius: var(--v32-radius); }
.la-cta[data-kind="primary"] { color: var(--slide-bg); background: var(--blue); }
.la-cta[data-kind="secondary"] { color: var(--text-warm); border: 1px solid var(--plain-border-strong); }

/* ── 兜底块的 aurora 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板默认样式"拉回 aurora 的 Inter + 蓝紫 accent + 12px 圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 600; }
.v32-prose-body, .v32-body, .v32-card-body { font-family: var(--font-ui); }
.v32-prose-body em, .v32-media-body em { color: var(--blue); font-style: normal; font-weight: 600; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 400; }
.v32-callout, .v32-card, .v32-compare-col, .v32-table-el, .v32-chart-svg { border-radius: var(--v32-radius); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; color: var(--gold); }
.v32-seq-dot, .v32-quad-dot[data-focal] { background: var(--blue); }

/* present 舞台:navy 底 + aurora glow + 大内边距(旧 slide-inner 是 60px 144px)*/
[data-v32-mode="present"] .v32-slide-inner { padding: 60px 144px; }
[data-v32-mode="present"] .la-cover__display { font-size: clamp(100px, 9.5vw, 220px); }
[data-v32-mode="present"] .la-closing__display { font-size: clamp(60px, 5.2vw, 120px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段名对齐 v32 schema。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(aurora glow + 蓝色 inline em + mono byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="la-kicker-rail"><span class="la-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  // displayTail 短(≤24 字)→ 内联 <em> 蓝色强调跟主标题;长 → 独立副标题块(克制字号)
  const tail = (b.displayTail ?? "").trim();
  const tailLong = tail.length > 24;
  const tailInline = tail && !tailLong
    ? ` <em ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(tail)}</em>`
    : "";
  const tailBlock = tail && tailLong
    ? `<p class="t-cover-subtitle la-cover__lead" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(tail)}</p>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead la-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="la-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono-meta" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block la-cover" data-block-id="${b.id}">
  <div class="la-bloom la-bloom-tr"></div>
  <div class="la-bloom la-bloom-bl"></div>
  ${kicker}
  <h1 class="t-display la-cover__display" ${ctx.edit(`${p}/display`, "封面大标题", { text: false })}>${ctx.esc(b.display)}${tailInline}</h1>
  ${tailBlock}
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(超大数字 + h1 论点 + rail 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat la-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="la-kicker-rail la-statement__anno"><span class="la-rule"></span><span class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block la-statement" data-block-id="${b.id}">
  <div class="la-bloom la-bloom-bl"></div>
  ${big}
  <p class="t-h1 la-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 顶边分栏 · 蓝紫大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 la-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="la-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-mono-meta la-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="la-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat la-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div class="t-body la-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block la-metrics" data-block-id="${b.id}">
  ${title}
  <div class="la-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered → diagnosis 式横排大条目(num | head+body | metric)
//   layout=grid/steps → features/proposal 式网格卡(gold 顶边)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="la-kicker-rail"><span class="la-rule"></span><span class="t-label">${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 la-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "numbered") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const metric = c.metric
          ? `<div class="t-stat la-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono-meta la-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
          : c.when
            ? `<div class="t-mono-meta">${ctx.esc(c.when)}</div>`
            : "";
        return `<div class="la-card-row">
      <div class="t-stat la-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 la-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body la-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="la-card-row__metric">${metric}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block la-cards" data-block-id="${b.id}" data-layout="numbered">
  ${kicker}${title}
  <div class="la-cards__list">${items}</div>
</section>`;
  }

  // grid / steps → 网格特性卡
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = `<div class="t-mono-meta la-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
      const when = c.when ? `<div class="t-mono-meta" style="margin-top:14px;">${ctx.esc(c.when)}</div>` : "";
      return `<article class="la-card">
      ${num}
      <div class="t-h3 la-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body la-card__body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
      ${when}
    </article>`;
    })
    .join("");
  const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
  return `<section class="v32-block la-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="la-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(aurora glow + 蓝色主 CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="la-kicker-rail"><span class="la-rule"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead la-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="la-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="la-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block la-closing" data-block-id="${b.id}">
  <div class="la-bloom la-bloom-tr"></div>
  ${kicker}
  <h2 class="t-h1 la-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const linearAuroraV32: TemplateV32 = {
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

export default linearAuroraV32;
export { linearAuroraV32, meta, fonts, themeCss };
