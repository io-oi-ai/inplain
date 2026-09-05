/**
 * V32 S5 · Signal 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/signal.ts(旧 919 行,三入口 deck/doc/sheet)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Signal 的视觉 DNA(navy/cream 双 surface + antique gold accent +
 *      Source Serif/DM Sans/IBM Plex Mono + 80px 隐形栅格 + hairline)搬过来,
 *      并把 Signal 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到 navy 底色;
 *   2) blocks:只覆盖 Signal 有强视觉主张的块(cover/statement/metrics/cards/quote/closing)。
 *      其余(prose/heading/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 对 .v32-* 的重绘(serif + italic-gold em + hairline)。
 *
 * DNA(照搬旧模板注释):
 *   - 双 surface · 深 editorial navy(#1C2644)+ 暖 cream paper(#F0ECE3)
 *   - 单一 hot accent · antique gold(#C8A870)只用于 rules / italic em / 数字
 *   - Source Serif 4 混排 roman + italic gold · DM Sans body · IBM Plex Mono kicker/chrome
 *   - 80px 几乎隐形栅格 · 1px hairline 分区 · 0 rounded · 0 shadow
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "signal",
  name: "Signal",
  tagline:
    "文学情报简报 · Source Serif 4 roman/italic-gold · IBM Plex Mono kicker · navy/cream 双 surface · antique gold accent",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Long-form intelligence briefings · quarterly reviews · thought-leadership decks · curated editorial reads · serious B2B narratives",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Source Serif 4:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600",
  "DM Sans:wght@400;500;700",
  "IBM Plex Mono:wght@400;500",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// navy 底色 + gold accent;再把关键 .v32-* 类重绘成 Signal 观感(serif / italic-gold / hairline)。
const themeCss = `
:root {
  /* ── Signal 原 token(照搬旧 :root)── */
  --navy: #1C2644;
  --navy-alt: #232F55;
  --cream: #F0ECE3;
  --cream-alt: #E6E0D4;
  --text-warm: #E2DCD0;
  --text-muted-dark: #8A96A8;
  --text-hint-dark: #4E5A6E;
  --ink: #1A2030;
  --text-muted-light: #5A6270;
  --text-hint-light: #9AA0A8;
  --gold: #C8A870;
  --border-dark: #2E3D5C;
  --border-light: #CAC4B4;

  --font-serif: 'Source Serif 4', 'Noto Sans SC', Georgia, serif;
  --font-sans: 'DM Sans', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;

  /* ── 把 Signal 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 navy 底色 ──
     WCAG AA:text-warm(#E2DCD0) on navy(#1C2644) 对比≈11:1;gold(#C8A870) on navy≈5.6:1 达 AA */
  --plain-bg: var(--navy);
  --plain-surface: var(--navy);
  --plain-surface-2: var(--navy-alt);
  --plain-text: var(--text-warm);
  --plain-text-mute: var(--text-muted-dark);
  --plain-text-faint: var(--text-hint-dark);
  --plain-border: var(--border-dark);
  --plain-border-strong: var(--gold);
  --plain-accent: var(--gold);
  --plain-accent-strong: var(--gold);
  --plain-accent-bg: color-mix(in oklab, var(--gold) 16%, var(--navy) 84%);
  --plain-success: var(--gold);
  --plain-warn: #C79A3D;
  --plain-danger: #A64B3F;
  --plain-danger-bg: color-mix(in oklab, #A64B3F 16%, var(--navy) 84%);

  --stage-bg: #0B0F1E;
  --slide-bg: var(--navy);
  --doc-page-bg: var(--navy);
  --doc-text: var(--text-warm);

  --font-body: var(--font-sans);
  --v32-radius: 0px; /* Signal 铁律:零圆角 */
  --v32-gap: 40px;   /* Signal 靠 hairline 分区,但块间留呼吸 */
}

/* ── Signal 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-serif); font-weight: 700; font-size: clamp(100px, min(9.5vw, 16vh), 220px); line-height: 0.96; letter-spacing: -0.02em; color: var(--text-warm); }
.t-h1 { font-family: var(--font-serif); font-weight: 600; font-size: clamp(60px, min(5.2vw, 9vh), 120px); line-height: 1.08; letter-spacing: -0.01em; color: var(--text-warm); }
.t-h2 { font-family: var(--font-serif); font-weight: 600; font-size: clamp(36px, min(3vw, 5.5vh), 68px); line-height: 1.18; color: var(--text-warm); }
.t-h3 { font-family: var(--font-serif); font-weight: 500; font-size: clamp(22px, min(1.9vw, 3.5vh), 40px); line-height: 1.3; color: var(--text-warm); }
.t-stat { font-family: var(--font-serif); font-weight: 600; font-size: clamp(64px, min(5.5vw, 10vh), 128px); line-height: 1; letter-spacing: -0.02em; color: var(--gold); }
.t-quote-text { font-family: var(--font-serif); font-weight: 400; font-size: clamp(40px, min(3.6vw, 6.4vh), 84px); line-height: 1.28; letter-spacing: -0.01em; color: var(--text-warm); }
.t-lead { font-family: var(--font-sans); font-weight: 400; font-size: clamp(15px, 1.4vw, 28px); line-height: 1.58; color: var(--text-muted-dark); }
.t-body { font-family: var(--font-sans); font-weight: 400; font-size: clamp(13px, 1.05vw, 20px); line-height: 1.65; color: var(--text-warm); }
.t-caption { font-family: var(--font-sans); font-weight: 400; font-size: clamp(11px, 0.82vw, 15px); line-height: 1.5; color: var(--text-hint-dark); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
.t-mono-meta { font-family: var(--font-mono); font-weight: 500; font-size: clamp(10px, 0.7vw, 13px); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-hint-dark); }

/* italic em = Signal 签名动作(serif italic gold)· 全局 em + 兜底块内 em */
.sig-em, .v32-prose-body em, .v32-quote-text em, .v32-callout-body em { font-style: italic; color: var(--gold); font-family: var(--font-serif); font-weight: inherit; }

/* Signal 分隔件 */
.sig-rule-gold { width: 56px; height: 1px; background: var(--gold); display: block; }
.sig-kicker-rail { display: flex; align-items: center; gap: 18px; margin-bottom: 36px; }

/* 80px 隐形栅格气氛层(present 舞台绝对定位)· 照搬旧 slide::before */
[data-v32-mode="present"] .v32-slide::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 80px 80px;
}
[data-v32-mode="present"] .v32-slide-inner { position: relative; z-index: 1; padding: 60px 144px; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.sig-cover { position: relative; }
.sig-cover__display { margin: 0; max-width: 1500px; }
.sig-cover__display .sig-tail { font-style: italic; color: var(--gold); }
.sig-cover__lead { margin: 48px 0 0; max-width: 1000px; }
.sig-cover__byline { display: flex; gap: 48px; margin-top: 88px; }

.sig-statement { position: relative; }
.sig-statement__num { font-size: clamp(140px, min(14vw, 22vh), 320px); margin-bottom: 32px; }
.sig-statement__text { margin: 0; max-width: 1500px; }
.sig-statement__anno { display: flex; align-items: center; gap: 18px; margin-top: 48px; }

.sig-metrics__title { margin: 0 0 48px; max-width: 1400px; }
.sig-metrics__grid { display: grid; gap: 40px; }
.sig-metric { border-top: 1px solid var(--gold); padding: 32px 32px 32px 0; }
.sig-metric__value { margin: 0; display: flex; align-items: baseline; gap: 0.16em; }
.sig-metric__delta { font-family: var(--font-mono); font-size: 0.24em; letter-spacing: 0.04em; }
.sig-metric[data-delta="down"] .sig-metric__delta { color: var(--plain-danger); }
.sig-metric__label { margin-top: 18px; }
.sig-metric__hint { margin-top: 10px; }

.sig-cards__title { margin: 0 0 40px; max-width: 1400px; }
/* numbered / steps → 横排大条目;grid → 网格 */
.sig-cards__list { border-bottom: 1px solid var(--border-dark); }
.sig-card-row { display: grid; grid-template-columns: 100px 1fr 240px; gap: 32px; padding: 32px 0; border-top: 1px solid var(--border-dark); align-items: baseline; }
.sig-card-row__num { font-size: clamp(48px, 4vw, 88px); margin: 0; }
.sig-card-row__head { margin: 0 0 14px; }
.sig-card-row__body { margin: 0; max-width: 720px; }
.sig-card-row__metric { text-align: right; }
.sig-card-row__metric-v { font-size: clamp(48px, 4vw, 88px); margin: 0; }
.sig-card-row__metric-l { margin-top: 8px; }
.sig-card-row__when { color: var(--text-hint-dark); }
.sig-cards__grid { display: grid; gap: 0 36px; }
.sig-card { padding: 28px 28px 28px 0; border-top: 1px solid var(--border-dark); }
.sig-card__num { color: var(--gold); margin-bottom: 14px; }
.sig-card__head { margin: 0 0 12px; }
.sig-card__body { margin: 0; }

.sig-quote { position: relative; }
.sig-quote__mark { font-family: var(--font-serif); font-weight: 300; font-size: clamp(120px, 8vw, 160px); color: var(--gold); line-height: 0.6; margin-bottom: 24px; }
.sig-quote__text { max-width: 1400px; }
.sig-quote__attr { display: flex; align-items: center; gap: 18px; margin-top: 56px; }

.sig-closing { background: var(--cream); color: var(--ink); position: relative; }
.sig-closing .t-h1, .sig-closing .t-display { color: var(--ink); }
.sig-closing .t-lead { color: var(--text-muted-light); }
.sig-closing__display { margin: 0; max-width: 1400px; }
.sig-closing__sub { margin-top: 40px; max-width: 1000px; }
.sig-closing__cta { display: flex; gap: 24px; margin-top: 64px; }
.sig-cta { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; padding: 16px 32px; text-decoration: none; display: inline-block; }
.sig-cta[data-kind="primary"] { color: var(--gold); border: 1px solid var(--gold); }
.sig-cta[data-kind="secondary"] { color: var(--ink); border: 1px solid var(--border-light); }

/* ── 兜底块的 Signal 重绘(prose/heading/callout/table/compare/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 Signal 的 serif + hairline + 无圆角 + gold accent)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-serif); font-weight: 600; color: var(--text-warm); }
.v32-prose-body { font-family: var(--font-sans); color: var(--text-warm); line-height: 1.65; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
.v32-table-el th { font-family: var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); border-bottom-color: var(--gold); }

/* present 舞台:cover/statement/quote 居中;closing 是 cream 亮屏 */
[data-v32-mode="present"] .sig-cover, [data-v32-mode="present"] .sig-statement, [data-v32-mode="present"] .sig-quote, [data-v32-mode="present"] .sig-closing { display: flex; flex-direction: column; justify-content: center; min-height: 100%; }
[data-v32-mode="present"] .sig-closing { margin: -60px -144px; padding: 60px 144px; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2/S3)
// 视觉照搬旧 renderCover / renderStats / renderDiagnosis|proposal|features /
// renderHeroQuestion / renderPullQuote / renderClosing;字段名从旧 slide.xxx → v32 block.xxx。
// renderer 只出 block DOM,不写 slide/pagenum/舞台包裹(那是 render-report 的活)。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(serif display + italic-gold tail + mono byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sig-kicker-rail"><span class="sig-rule-gold"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const tail = b.displayTail
    ? ` <span class="sig-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead sig-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="sig-cover__byline">${b.byline
        .map((x, j) => `<div class="t-mono-meta" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block sig-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display sig-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(超大 gold 数字 + serif 论点 + gold-rail 注解)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-stat sig-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="sig-statement__anno"><span class="sig-rule-gold"></span><span class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block sig-statement" data-block-id="${b.id}">
  ${big}
  <h2 class="t-h1 sig-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(gold hairline 分栏 · serif gold 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 sig-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="sig-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-mono-meta sig-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="sig-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat sig-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div class="t-body sig-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block sig-metrics" data-block-id="${b.id}">
  ${title}
  <div class="sig-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis
//   layout=grid           → 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sig-kicker-rail"><span class="sig-rule-gold"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 sig-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = `<div class="t-mono-meta sig-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>`;
        return `<article class="sig-card">
      ${num}
      <div class="t-h3 sig-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body sig-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block sig-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="sig-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat sig-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-mono-meta sig-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-mono-meta sig-card-row__when" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="sig-card-row">
      <div class="t-stat sig-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 sig-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body sig-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="sig-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block sig-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="sig-cards__list">${items}</div>
</section>`;
};

// quote ← 旧 renderPullQuote(超大 gold 引号 + serif 大字 + gold-rail 署名)
const quote: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "quote" }>;
  const p = ctx.pathPrefix;
  const attr = b.attribution
    ? `<div class="sig-quote__attr"><span class="sig-rule-gold"></span><span class="t-label" ${ctx.edit(`${p}/attribution`, "署名")}>${ctx.esc(b.attribution)}</span></div>`
    : "";
  return `<figure class="v32-block sig-quote" data-block-id="${b.id}">
  <div class="sig-quote__mark" aria-hidden="true">"</div>
  <blockquote class="t-quote-text sig-quote__text" ${ctx.edit(`${p}/text`, "引语")}>${ctx.esc(b.text)}</blockquote>
  ${attr}
</figure>`;
};

// closing ← 旧 renderClosing(cream 亮屏 · gold 边框 CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="sig-kicker-rail"><span class="sig-rule-gold"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead sig-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="sig-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="sig-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block sig-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-h1 sig-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余(prose/heading/callout/table/compare/quadrant/
// chart/media/sequence/group)走兜底 renderer + themeCss 重绘。
const signalV32: TemplateV32 = {
  meta,
  fonts,
  themeCss,
  blocks: {
    cover,
    statement,
    metrics,
    cards,
    quote,
    closing,
  },
};

export default signalV32;
export { signalV32, meta, fonts, themeCss };
