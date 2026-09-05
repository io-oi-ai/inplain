/**
 * V32 S5 · Blue Professional 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/blue-professional.ts(旧 977 行,三入口 14 slide renderer
 * + doc/sheet 渲染 + 自绘 chart svg)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 blue-professional 的视觉 DNA(cream/cobalt/3 灰阶 token + t-* 排版
 *      + 软 tint card + 100px pill + accent-line)搬过来,并把品牌色映射到 --plain-*
 *      token 让"没覆盖的兜底块"(prose/quote/callout/table/compare/chart/…)自动吃到 cream 底
 *      + cobalt accent + 软圆角卡片,而不用逐块重写。
 *   2) blocks:只覆盖 blue-professional 有强视觉主张的块
 *      (cover / statement / metrics / cards / closing)。
 *
 * DNA(照搬旧模板注释):warm cream(#fdfae7)底(非纯白)· 单一 saturated cobalt(#1e2bfa)
 * 做全部 accent · 3 灰阶 body(#111/#6b6b6b/#9a9a9a)· 软 tint card(cobalt-4% + cobalt-20%
 * 1.5px border + 10-14px 圆角)· 100px pill chrome · Space Grotesk(display/数字)+ Inter(body)
 * · 0 box-shadow · 静 · 高级感 · accent-line 段眉。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "blue-professional",
  name: "Blue Professional",
  tagline:
    "Consulting-grade · warm cream + saturated cobalt 单 accent · 软 tint card + 圆 pill chrome · McKinsey 季度复盘气质",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Executive briefings · investor letters · quarterly business reviews · research deliverables · M&A pitches · board updates · financial dashboards",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Space Grotesk:wght@400;500;600;700",
  "Inter:wght@400;500;600",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,把品牌色映射到 --plain-* /
// --font-body 让兜底块吃到 cream + cobalt + 软卡观感;再把关键 .v32-* 类重绘。
const themeCss = `
:root {
  /* ── blue-professional 原 token(照搬旧 :root)── */
  --bg: #fdfae7;
  --primary: #1e2bfa;
  --text: #111111;
  --text-muted: #6b6b6b;
  --text-light: #9a9a9a;
  --accent-light: rgba(30, 43, 250, 0.08);
  --accent-medium: rgba(30, 43, 250, 0.15);
  --brand-border: rgba(30, 43, 250, 0.2);
  --card-bg: rgba(30, 43, 250, 0.04);
  --positive: #059669;
  --negative: #dc2626;

  --font-display: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  --font-ui: 'Inter', 'Noto Sans SC', sans-serif;

  /* ── 品牌色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 cream 底 + cobalt accent ──
     WCAG AA:text(#111)/muted(#6b6b6b) on cream(#fdfae7) 对比 ≈16:1 / ≈5:1;
     cobalt(#1e2bfa) on cream ≈6.7:1(text/accent 均达标) */
  --plain-bg: var(--bg);
  --plain-surface: var(--card-bg);
  --plain-surface-2: var(--accent-light);
  --plain-text: var(--text);
  --plain-text-mute: var(--text-muted);
  --plain-text-faint: var(--text-light);
  --plain-border: var(--brand-border);
  --plain-border-strong: var(--primary);
  --plain-accent: var(--primary);
  --plain-accent-strong: var(--primary);
  --plain-accent-bg: var(--accent-light);
  --plain-success: var(--positive);
  --plain-warn: var(--negative);
  --plain-danger: var(--negative);
  --plain-danger-bg: rgba(220, 38, 38, 0.08);

  --stage-bg: #ece5cb;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--text);

  --font-body: var(--font-ui);
  --v32-radius: 14px; /* 柔和系:保留软圆角 */
  --v32-gap: 1.5rem;
}

/* ── blue-professional 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-h1 { font-family: var(--font-display); font-weight: 700; font-size: clamp(56px, 5vw, 100px); line-height: 1.1; letter-spacing: -0.02em; color: var(--text); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 600; font-size: clamp(40px, 3vw, 64px); line-height: 1.15; letter-spacing: -0.02em; color: var(--text); margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 500; font-size: clamp(20px, 1.8vw, 32px); line-height: 1.3; letter-spacing: -0.01em; color: var(--text); margin: 0; }
.t-eyebrow { font-family: var(--font-display); font-weight: 600; font-size: clamp(13px, 1.1vw, 18px); line-height: 1.1; letter-spacing: 0.08em; text-transform: uppercase; color: var(--primary); margin: 0; }
.t-body-bp { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.1vw, 20px); line-height: 1.6; color: var(--text-muted); margin: 0; }
.t-metric-v { font-family: var(--font-display); font-weight: 700; font-size: clamp(40px, 3.4vw, 64px); line-height: 1; color: var(--primary); margin: 0; }
.t-metric-l { font-family: var(--font-ui); font-weight: 600; font-size: clamp(15px, 1.3vw, 22px); line-height: 1.3; color: var(--text); }
.t-metric-d { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 0.95vw, 17px); line-height: 1.5; color: var(--text-muted); }
.t-stat-v { font-family: var(--font-display); font-weight: 700; font-size: clamp(30px, 2.4vw, 44px); line-height: 1; color: var(--primary); }
.t-meta-bp { font-family: var(--font-display); font-weight: 400; font-size: clamp(13px, 0.9vw, 16px); line-height: 1.4; letter-spacing: 0.05em; color: var(--text-light); }

/* ── blue-professional 装饰件(照搬旧模板)── */
.bp-card { background: var(--card-bg); border: 1.5px solid var(--brand-border); border-radius: 14px; padding: 1.6rem 1.8rem; }
.accent-line { width: 60px; height: 4px; background: var(--primary); border-radius: 2px; flex: none; }
.tag-pill { display: inline-block; background: var(--accent-light); color: var(--primary); padding: 0.5rem 1.1rem; border-radius: 100px; font-family: var(--font-display); font-weight: 500; font-size: clamp(13px, 0.9vw, 15px); }
.step-circle { width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: var(--bg); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 22px; flex-shrink: 0; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.bp-cover { position: relative; }
.bp-cover__kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 28px; }
.bp-cover__title { max-width: 78%; }
.bp-cover__tail { display: block; margin-top: 0.1em; color: var(--primary); }
.bp-cover__lead { margin-top: 32px; max-width: 720px; }
.bp-cover__byline { display: flex; gap: 24px; margin-top: 40px; flex-wrap: wrap; }
/* cover cream-wedge 装饰(present 舞台绝对定位)· 照搬旧 cover-deco/cover-dots */
.bp-cover__deco { position: absolute; right: 0; top: 0; bottom: 0; width: 38%; background: var(--accent-light); clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%); z-index: 0; pointer-events: none; }
.bp-cover__dots { position: absolute; right: 4%; bottom: 8%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; opacity: 0.25; z-index: 0; pointer-events: none; }
.bp-cover__dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
.bp-cover > *:not(.bp-cover__deco):not(.bp-cover__dots) { position: relative; z-index: 1; }

.bp-statement { text-align: center; display: flex; flex-direction: column; align-items: center; }
.bp-statement__num { color: var(--primary); font-size: clamp(120px, 9vw, 200px); margin-bottom: 24px; }
.bp-statement__text { max-width: 80%; }
.bp-statement__anno { display: flex; align-items: center; gap: 16px; margin-top: 40px; }

.bp-metrics__title { margin: 0 0 4vh; }
.bp-metrics__grid { display: grid; gap: 1.5rem; }
.bp-metric { display: flex; flex-direction: column; gap: 16px; }
.bp-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.bp-metric__delta { font-family: var(--font-ui); font-size: 0.3em; }
.bp-metric[data-delta="down"] .bp-metric__delta { color: var(--negative); }

.bp-cards__kicker { margin-bottom: 3.5vh; }
.bp-cards__title { margin: 0 0 4vh; max-width: 80%; }
/* numbered / steps → 横排大条目(num | head+body | metric/when);grid → 特性网格 */
.bp-cards__list { display: flex; flex-direction: column; gap: 1.2rem; }
.bp-card-row { display: grid; grid-template-columns: 72px 1fr 220px; gap: 28px; align-items: center; }
.bp-card-row[data-layout="steps"] { grid-template-columns: 56px 1fr 200px; }
.bp-card-row__num { line-height: 1; }
.bp-card-row__head { margin-bottom: 8px; }
.bp-card-row__side { text-align: right; }
.bp-card-row__metric-l { margin-top: 6px; }
.bp-cards__grid { display: grid; gap: 1.5rem; }
.bp-card { display: flex; flex-direction: column; gap: 14px; }
.bp-card__body { color: var(--text-muted); }

.bp-closing { text-align: center; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.bp-closing__circle { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border-radius: 50%; border: 1px solid var(--brand-border); opacity: 0.4; z-index: 0; pointer-events: none; }
.bp-closing > *:not(.bp-closing__circle) { position: relative; z-index: 1; }
.bp-closing__kicker-rail { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
.bp-closing__title { max-width: 70%; }
.bp-closing__sub { margin-top: 32px; max-width: 720px; }
.bp-closing__cta { display: flex; gap: 18px; margin-top: 48px; }
.bp-cta { display: inline-block; padding: 1rem 2.4rem; border-radius: 100px; font-family: var(--font-display); font-weight: 600; font-size: clamp(15px, 1vw, 18px); text-decoration: none; }
.bp-cta[data-kind="primary"] { background: var(--primary); color: var(--bg); }
.bp-cta[data-kind="secondary"] { background: transparent; border: 1.5px solid var(--primary); color: var(--primary); }

/* ── 兜底块的 blue-professional 重绘(prose/heading/quote/callout/table/compare/
     sequence/chart/media/quadrant/group 走兜底,这里把它们拉回 cobalt + 软 tint card)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-display); letter-spacing: 0.08em; color: var(--primary); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-scroll, .v32-chart-svg { background: var(--card-bg); border: 1.5px solid var(--brand-border); border-radius: 14px; }
.v32-quote-text { border-left-color: var(--primary); font-family: var(--font-display); font-style: normal; font-weight: 500; }
.v32-table-el th { background: var(--accent-light); color: var(--primary); font-family: var(--font-display); letter-spacing: 0.06em; text-transform: uppercase; }
.v32-seq-dot { background: var(--primary); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 4vw / 8.5vh)· 覆盖块居中的靠自己 */
[data-v32-mode="present"] .v32-slide-inner { padding: 4vw 4vw 8.5vh; }
[data-v32-mode="present"] .bp-cover, [data-v32-mode="present"] .bp-statement, [data-v32-mode="present"] .bp-closing { min-height: 100%; justify-content: center; }
[data-v32-mode="present"] .bp-cover { justify-content: center; display: flex; flex-direction: column; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名从旧 slide.xxx
// 改成 v32 block.xxx(schema 对齐:steps→items · num 可选兜底)。
// 只出 block DOM;slide/pagenum/舞台包裹是 render-report 的活。
// ────────────────────────────────────────────────────────────

const numOf = (raw: string | undefined, i: number) => raw ?? String(i + 1).padStart(2, "0");

// cover ← 旧 renderCover(cream wedge + dots + accent-line kicker)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bp-cover__kicker-rail"><div class="accent-line"></div><div class="t-eyebrow" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div></div>`
    : "";
  const tail = b.displayTail
    ? `<span class="bp-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-bp bp-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="bp-cover__byline">${b.byline
        .map((x, j) => `<div class="t-meta-bp" ${ctx.edit(`${p}/byline/${j}`, "署名")}>· ${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block bp-cover" data-block-id="${b.id}">
  <div class="bp-cover__deco"></div>
  <div class="bp-cover__dots"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
  ${kicker}
  <h1 class="t-h1 bp-cover__title" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(居中大数字 + 大问句 + accent-line 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-h1 bp-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="bp-statement__anno"><div class="accent-line"></div><div class="t-eyebrow" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div></div>`
    : "";
  return `<section class="v32-block bp-statement" data-block-id="${b.id}">
  ${big}
  <h2 class="t-h2 bp-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(软 tint card · cobalt 大数字 · 最多 4 列)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 bp-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="bp-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-metric-d" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>` : "";
      return `<div class="bp-card bp-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-metric-v bp-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-metric-l" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block bp-metrics" data-block-id="${b.id}">
  ${title}
  <div class="bp-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid            → 特性网格卡(旧 features)
//   layout=numbered/steps  → 横排大条目(num/step-circle | head+body | metric or when)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bp-cards__kicker" style="display:flex;align-items:center;gap:16px;"><div class="accent-line"></div><div class="t-eyebrow">${ctx.esc(b.kicker)}</div></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 bp-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="bp-card bp-card">
      <div class="t-eyebrow">${ctx.esc(numOf(c.num, i))}</div>
      <h3 class="t-h3" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</h3>
      <div class="t-body-bp bp-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
    return `<section class="v32-block bp-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="bp-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const steps = b.layout === "steps";
  const items = b.items
    .map((c: CardItem, i: number) => {
      const numCell = steps
        ? `<div class="step-circle" style="opacity:${(1 - i * 0.12).toFixed(2)};">${ctx.esc(numOf(c.num, i))}</div>`
        : `<div class="t-metric-v bp-card-row__num" style="font-size:clamp(36px,2.8vw,56px);">${ctx.esc(numOf(c.num, i))}</div>`;
      const side = c.metric
        ? `<div class="t-stat-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-metric-d bp-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<span class="tag-pill" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</span>`
          : "";
      return `<div class="bp-card bp-card-row" data-layout="${ctx.esc(b.layout)}">
      ${numCell}
      <div>
        <div class="t-h3 bp-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-bp" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="bp-card-row__side">${side}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block bp-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="bp-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(concentric circles + cream 底 + cobalt pill CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bp-closing__kicker-rail"><div class="accent-line"></div><div class="t-eyebrow" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div><div class="accent-line"></div></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-bp bp-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="bp-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="bp-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block bp-closing" data-block-id="${b.id}">
  <div class="bp-closing__circle" style="width:500px;height:500px;"></div>
  <div class="bp-closing__circle" style="width:360px;height:360px;opacity:0.3;"></div>
  ${kicker}
  <h2 class="t-h1 bp-closing__title" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const blueProfessionalV32: TemplateV32 = {
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

export default blueProfessionalV32;
export { blueProfessionalV32, meta, fonts, themeCss };
