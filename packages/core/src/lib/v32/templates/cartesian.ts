/**
 * V32 S5 · Cartesian 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/cartesian.ts(旧 943 行 · 三入口 · ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 cartesian 视觉 DNA(5-tone warm-stone token + Playfair 400 + t-*
 *      排版 + compass 气氛)搬过来,并把品牌色映射到 --plain-* token 让"没覆盖的
 *      兜底块"自动吃到 sandstone 底色 + hairline;
 *   2) blocks:只覆盖 cartesian 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠 themeCss 里对 .v32-* 的重绘(Playfair serif / 1px hairline /
 *      无圆角无阴影)拿到 cartesian 观感。
 *
 * DNA(照搬旧模板注释):暖 sandstone canvas(#EDE8E0)· 5-tone warm-stone · 无 populist
 * accent · 永远只用 1px hairline(无 thick border/shadow/radius)· Playfair Display 400
 * (绝不 bold serif)· Inter 400/500 · compass-drafted thin+dashed circles · 大量留白 ·
 * 唯一 ink line = 20vw horizontal-accent。
 */
// V32 S5 · import 只取用到的类型(未用会 unused 报错)
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "cartesian",
  name: "Cartesian",
  tagline:
    "博物馆 catalog · Playfair Display 400 + Inter · 5-tone warm-stone + compass arc · 全 1px hairline",
  scheme: "light" as const,
  density: "low" as const,
  bestFor:
    "Museum catalogs · architectural monographs · consulting decks · curatorial briefings · quiet editorial reports",
};

// V32 S5 · fonts:搬旧 fontLinks(Playfair Display italic+weight 轴 · Inter)
const fonts = fontLinks([
  "Playfair Display:ital,wght@0,400..700;1,400..700",
  "Inter:wght@300..600",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 sandstone 底色 + hairline;再把关键 .v32-* 类重绘成
// cartesian 观感(Playfair serif / 无圆角 / 1px line)。
const themeCss = `
:root {
  /* ── cartesian 原 token(照搬旧模板 :root)── */
  --bg-primary: #EDE8E0;
  --bg-secondary: #E2DBD1;
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --accent: #8A8178;
  --line: #B8B0A4;
  --white-overlay: rgba(255, 255, 255, 0.3);

  --font-display: 'Playfair Display', 'Noto Serif SC', serif;
  --font-ui: 'Inter', 'Noto Sans SC', sans-serif;

  /* ── 把 cartesian 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得
     sandstone 底色 + hairline · WCAG AA:text-primary(#1A1A1A) on bg(#EDE8E0)
     对比≈14:1;text-secondary(#5A5A5A) on bg ≈6.4:1;accent(#8A8178) on bg ≈3.2:1
     仅用于 uppercase label(WCAG 大字/装饰,非正文)── */
  --plain-bg: var(--bg-primary);
  --plain-surface: var(--bg-primary);
  --plain-surface-2: var(--bg-secondary);
  --plain-text: var(--text-primary);
  --plain-text-mute: var(--text-secondary);
  --plain-text-faint: var(--accent);
  --plain-border: var(--line);
  --plain-border-strong: var(--text-primary);
  --plain-accent: var(--accent);
  --plain-accent-strong: var(--text-primary);
  --plain-accent-bg: var(--white-overlay);
  --plain-success: #4F7A4F;
  --plain-warn: #B07A2A;
  --plain-danger: #8E3A2C;
  --plain-danger-bg: color-mix(in oklab, #8E3A2C 12%, var(--bg-primary) 88%);

  --stage-bg: #1a1a1a;
  --slide-bg: var(--bg-primary);
  --doc-page-bg: var(--bg-primary);
  --doc-text: var(--text-primary);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* cartesian 铁律:零圆角 */
  --v32-gap: 32px;   /* cartesian 用 hairline + 留白;卡片网格保留 32px 间隙 */
}

/* ── cartesian 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 400; font-size: clamp(96px, min(10vw, 16vh), 200px); line-height: 1.1; color: var(--text-primary); margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 400; font-size: clamp(72px, min(7vw, 12vh), 144px); line-height: 1.1; color: var(--text-primary); margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, min(5vw, 8vh), 96px); line-height: 1.1; color: var(--text-primary); margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, min(2.4vw, 4vh), 48px); line-height: 1.15; color: var(--text-primary); margin: 0; }
.t-stat { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, 3.5vw, 64px); line-height: 1; color: var(--text-primary); margin: 0; }
.t-card-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(22px, 1.8vw, 32px); line-height: 1.15; color: var(--text-primary); margin: 0; }
.t-numeral { font-family: var(--font-display); font-weight: 400; font-size: clamp(28px, 2.2vw, 40px); line-height: 1; color: var(--accent); margin: 0; }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.2vw, 22px); line-height: 1.6; color: var(--text-secondary); }
.t-body-sm { font-family: var(--font-ui); font-weight: 400; font-size: clamp(13px, 1vw, 18px); line-height: 1.6; color: var(--text-secondary); }
.t-subtitle { font-family: var(--font-ui); font-weight: 400; font-size: clamp(16px, 1.3vw, 22px); line-height: 1.5; color: var(--text-secondary); }
.t-attribution { font-family: var(--font-ui); font-weight: 400; font-size: clamp(12px, 0.9vw, 15px); line-height: 1.4; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
.t-label { font-family: var(--font-ui); font-weight: 500; font-size: clamp(11px, 0.85vw, 14px); line-height: 1; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
.t-micro { font-family: var(--font-ui); font-weight: 400; font-size: clamp(10px, 0.7vw, 12px); line-height: 1; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }

/* ── cartesian 装饰件:20vw ink line + compass 气氛(present 舞台绝对定位)── */
.ct-accent-line { width: 20vw; max-width: 320px; height: 1px; background: var(--text-primary); display: inline-block; }
.ct-hairline { border-top: 1px solid var(--line); }
.ct-geo { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
.ct-geo-solid { border: 1px solid var(--line); }
.ct-geo-dashed { border: 1px dashed var(--line); }
.ct-geo-tr { right: -22vw; top: -22vw; width: 44vw; height: 44vw; opacity: 0.45; }
.ct-geo-tr-inner { right: -18vw; top: -18vw; width: 36vw; height: 36vw; opacity: 0.3; }
.ct-geo-center { left: 50%; top: 50%; transform: translate(-50%, -50%); width: 50vw; height: 50vw; opacity: 0.3; }
.ct-geo-center-inner { left: 50%; top: 50%; transform: translate(-50%, -50%); width: 36vw; height: 36vw; opacity: 0.25; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.ct-cover { position: relative; }
.ct-cover__display { max-width: 1500px; }
.ct-cover__display .ct-tail { font-style: italic; }
.ct-cover__lead { margin: 40px 0 0; max-width: 920px; }
.ct-cover__rule { margin-top: 64px; }
.ct-cover__byline { margin-top: 40px; display: flex; gap: 48px; flex-wrap: wrap; }

.ct-statement { position: relative; text-align: center; }
.ct-statement__num { font-size: clamp(120px, 14vw, 260px); margin-bottom: 24px; }
.ct-statement__text { max-width: 1300px; margin: 0 auto; font-style: italic; }
.ct-statement__rule { margin: 56px auto 0; }
.ct-statement__anno { margin-top: 24px; }

.ct-metrics { position: relative; }
.ct-metrics__title { margin: 0 0 48px; max-width: 1200px; }
.ct-metrics__grid { display: grid; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.ct-metric { display: flex; flex-direction: column; gap: 18px; padding: 40px 28px 24px; }
.ct-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.ct-metric__delta { font-family: var(--font-ui); font-size: 0.4em; }
.ct-metric[data-delta="up"] .ct-metric__delta { color: #4F7A4F; }
.ct-metric[data-delta="down"] .ct-metric__delta { color: #8E3A2C; }
.ct-metric__hint { opacity: 0.85; }

.ct-cards { position: relative; }
.ct-cards__kicker { margin-bottom: 24px; }
.ct-cards__title { margin: 0 0 40px; max-width: 1400px; }
/* numbered / steps → hairline 横排大条目;grid → compass-icon 卡片网格 */
.ct-cards__list { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.ct-card-row { display: grid; grid-template-columns: 80px 1fr 220px; gap: 32px; padding: 36px 0 32px; align-items: baseline; border-top: 1px solid var(--line); }
.ct-card-row:first-child { border-top: none; }
.ct-card-row__head { margin-bottom: 14px; }
.ct-card-row__body { max-width: 720px; }
.ct-card-row__side { text-align: right; }
.ct-card-row__metric-l { margin-top: 10px; }
.ct-cards__grid { display: grid; gap: var(--v32-gap); }
.ct-card { border: 1px solid var(--line); background: var(--white-overlay); padding: 36px 32px; display: flex; flex-direction: column; gap: 18px; }
.ct-card__icon { width: 48px; height: 48px; border: 1px solid var(--line); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 400; font-size: 16px; color: var(--accent); }

.ct-closing { position: relative; }
.ct-closing__display { max-width: 1400px; }
.ct-closing__rule { margin: 40px 0 24px; }
.ct-closing__sub { max-width: 880px; }
.ct-closing__cta { display: flex; gap: 24px; margin-top: 56px; flex-wrap: wrap; }
.ct-cta { padding: 16px 32px; text-decoration: none; font-family: var(--font-ui); font-size: 12px; font-weight: 500; letter-spacing: 0.24em; text-transform: uppercase; display: inline-block; }
.ct-cta[data-kind="primary"] { border: 1px solid var(--text-primary); color: var(--text-primary); }
.ct-cta[data-kind="secondary"] { border: 1px solid var(--line); color: var(--accent); }

/* ── 兜底块的 cartesian 重绘(prose/heading/quote/callout/table/compare/quadrant/
     chart/media/sequence/group 走兜底 · 从"素模板圆角卡片"拉回 cartesian:
     Playfair serif 标题 / Inter body / 1px hairline / 无圆角无阴影)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 400; }
.v32-prose-body, .v32-callout-body { font-family: var(--font-ui); color: var(--text-secondary); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: italic; color: var(--text-primary); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-media-figure { border-radius: 0; box-shadow: none; }
.v32-callout { border: 1px solid var(--line); background: var(--white-overlay); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-ui); letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
.v32-seq-dot, .v32-quad-dot { background: var(--accent); }
.v32-table-el th { font-family: var(--font-ui); letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
.v32-table-el td, .v32-table-el th { border-bottom: 1px solid var(--line); }

/* present 舞台:sandstone 底 + 大内边距(旧 slide-inner 是 80px 96px)· 覆盖块自撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 80px 96px; }
[data-v32-mode="present"] .ct-cover__display { font-size: clamp(96px, 10vw, 200px); }
[data-v32-mode="present"] .ct-closing__display { font-size: clamp(72px, 7vw, 144px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing。
// 字段名从旧 slide.xxx 改成 v32 block.xxx;path 用 ctx.pathPrefix。
// ────────────────────────────────────────────────────────────

// V32 S5 · compass 气氛层(present 舞台绝对定位 · report 流里被 overflow 裁掉不碍事)
const geoCorner = `<div class="ct-geo ct-geo-solid ct-geo-tr"></div><div class="ct-geo ct-geo-dashed ct-geo-tr-inner"></div>`;
const geoCenter = `<div class="ct-geo ct-geo-solid ct-geo-center"></div><div class="ct-geo ct-geo-dashed ct-geo-center-inner"></div>`;

// cover ← 旧 renderCover(Playfair display + 20vw ink line + byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label" style="margin-bottom:36px;" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<em class="ct-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}> ${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-subtitle ct-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ct-cover__byline">${b.byline
        .map((x, j) => `<div class="t-attribution" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ct-cover" data-block-id="${b.id}">
  ${geoCorner}
  ${kicker}
  <h1 class="t-display ct-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  <div class="ct-cover__rule"><span class="ct-accent-line"></span></div>
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + italic Playfair text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display ct-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="ct-statement__rule"><span class="ct-accent-line"></span></div><div class="t-label ct-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ct-statement" data-block-id="${b.id}">
  ${geoCenter}
  ${big}
  <h2 class="t-h2 ct-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(hairline 分栏 · Playfair 大数字 · 最多 4 列)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<div class="t-label" style="margin-bottom:18px;">Numerical</div><h3 class="t-h3 ct-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h3>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ct-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-sm ct-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="ct-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat ct-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block ct-metrics" data-block-id="${b.id}">
  ${geoCorner}
  ${title}
  <div class="ct-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → hairline 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → compass-icon 卡片网格 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label ct-cards__kicker" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h3 class="t-h3 ct-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h3>`
    : "";

  if (b.layout === "grid") {
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        // CardItem.num 可选 → ?? 兜底(旧 features 用 String(i+1).padStart)
        return `<article class="ct-card">
      <div class="ct-card__icon" aria-hidden="true">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-card-headline" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block ct-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ct-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const side = c.metric
        ? `<div class="t-stat ct-card-row__metric-v" style="font-size:clamp(28px,2.4vw,44px);" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-micro ct-card-row__metric-l" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-attribution" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="ct-card-row">
      <div class="t-numeral">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-card-headline ct-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body ct-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ct-card-row__side">${side}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ct-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="ct-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(Playfair h1 + 20vw ink line + hairline CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label" style="margin-bottom:36px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-subtitle ct-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : ` href="#"`;
    return `<a class="ct-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ct-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ct-closing" data-block-id="${b.id}">
  ${geoCenter}
  ${kicker}
  <h2 class="t-h1 ct-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  <div class="ct-closing__rule"><span class="ct-accent-line"></span></div>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const cartesianV32: TemplateV32 = {
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

export default cartesianV32;
export { cartesianV32, meta, fonts, themeCss };
