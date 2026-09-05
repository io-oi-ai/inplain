/**
 * V32 S5 · Long Table 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/long-table.ts(旧 849 行 · 三入口 15+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Long Table 的视觉 DNA(rust ink on cream paper + 4px dot 纹理
 *      + Bricolage 大写 + Fraunces italic + 1.5px outline-only 卡片)搬过来,
 *      并把品牌色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色;
 *   2) blocks:只覆盖 Long Table 有强视觉主张的块
 *      (cover / statement / metrics / cards / closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/
 *      sequence/group)走兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘
 *      (Bricolage 大写 + Fraunces italic + 无阴影 + 1.5px hairline)拿到观感。
 *
 * DNA(照搬旧模板注释):
 *   - 单 ink 色 warm rust terracotta(#B53D2A)on cream paper(#FAF1E2),没有第二色
 *   - 只有 opacity 变化(78% / 32% / 10%)· 4px radial-dot 纸张纹理
 *   - Bricolage Grotesque 700-800 大写做所有 display
 *   - Fraunces italic 400 做所有 body / metadata
 *   - 1.5px solid ink 边 · 卡片 / pill / badge 都是 outline-only · 零圆角(pill 除外)
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "long-table",
  name: "Long Table",
  tagline:
    "Risograph 节目册 · 单色 rust ink + cream paper + 4px dot 纹理 · Bricolage 大写 + Fraunces italic",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Supper-club programs · zines · curatorial menus · small-press editions · single-ink editorial reports · poster-style decks",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Bricolage Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800",
  "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600",
  "Noto Serif SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 cream/rust 底色;再把 .v32-* 类重绘成 Long Table 观感。
const themeCss = `
:root {
  /* ── Long Table 原 token(照搬旧模板 :root)── */
  --paper: #FAF1E2;
  --paper-d: #F2E5CF;
  --paper-vd: #E8D7B6;
  --ink: #B53D2A;
  --ink-dp: #8E2D1F;
  --ink-78: rgba(181, 61, 42, 0.78);
  --ink-50: rgba(181, 61, 42, 0.5);
  --ink-32: rgba(181, 61, 42, 0.32);

  --font-display: 'Bricolage Grotesque', 'Noto Serif SC', sans-serif;
  --font-serif: 'Fraunces', 'Noto Serif SC', Georgia, serif;

  /* ── 品牌色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 cream/rust 底色 ──
     WCAG AA:ink(#B53D2A)on paper(#FAF1E2)对比≈4.9:1;mute 用 ink-78 仍 ≥4.5:1。
     单色系:accent = success = ink 本身;danger 走更深的 ink-dp。 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-d);
  --plain-text: var(--ink);
  --plain-text-mute: var(--ink-78);
  --plain-text-faint: var(--ink-50);
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink-dp);
  --plain-accent-bg: var(--paper-d);
  --plain-success: var(--ink);
  --plain-warn: var(--ink-dp);
  --plain-danger: var(--ink-dp);
  --plain-danger-bg: var(--paper-vd);

  --stage-bg: var(--paper);
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-serif);
  --v32-radius: 0px; /* Long Table 铁律:outline-only 无圆角(pill 单独给) */
  --v32-gap: 24px;   /* Riso 节目册用中等间隔 */
}

/* ── Long Table 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-jumbo-num { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(120px, min(18vw, 32vh), 360px); line-height: 0.86; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-display-cover { font-family: var(--font-display); font-weight: 800; font-size: clamp(82px, min(8.8vw, 15vh), 180px); line-height: 0.92; letter-spacing: -0.012em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-display { font-family: var(--font-display); font-weight: 800; font-size: clamp(72px, min(7.6vw, 13vh), 160px); line-height: 0.9; letter-spacing: -0.012em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 800; font-size: clamp(56px, min(6vw, 10vh), 120px); line-height: 0.9; letter-spacing: -0.012em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-headline-md { font-family: var(--font-display); font-weight: 800; font-size: clamp(40px, min(4.6vw, 8vh), 88px); line-height: 0.92; letter-spacing: -0.012em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-card-title { font-family: var(--font-display); font-weight: 800; font-size: clamp(28px, 2.4vw, 44px); line-height: 0.98; letter-spacing: -0.008em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-course-name { font-family: var(--font-display); font-weight: 700; font-size: clamp(20px, 1.5vw, 28px); line-height: 1.05; letter-spacing: -0.005em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-info-value { font-family: var(--font-display); font-weight: 700; font-size: clamp(48px, 4.4vw, 88px); line-height: 0.95; letter-spacing: -0.005em; text-transform: uppercase; color: var(--ink); margin: 0; }
.t-ed-tracked { font-family: var(--font-display); font-weight: 700; font-size: clamp(15px, 1.1vw, 18px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }

.t-body-it { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(17px, 1.2vw, 22px); line-height: 1.5; color: var(--ink); }
.t-body-ro { font-family: var(--font-serif); font-weight: 400; font-size: clamp(15px, 1vw, 17px); line-height: 1.45; color: var(--ink); }
.t-ed-label { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(20px, 1.6vw, 30px); line-height: 1; color: var(--ink); }
.t-tagline { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(18px, 1.4vw, 26px); line-height: 1.35; color: var(--ink); }
.t-info-key { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(14px, 0.95vw, 16px); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.t-meta-tag { font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(14px, 0.95vw, 16px); line-height: 1.4; color: var(--ink); }

/* ── Long Table 分隔件(照搬旧模板)── */
.lt-topbar { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 22px; border-bottom: 1.5px solid var(--ink); margin-bottom: 48px; gap: 24px; }
.lt-badge { display: inline-flex; align-items: center; justify-content: center; width: clamp(34px, 2.6vw, 44px); height: clamp(34px, 2.6vw, 44px); border: 1.5px solid var(--ink); border-radius: 50%; font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(15px, 1.1vw, 20px); color: var(--ink); flex-shrink: 0; }
.lt-rect-tag { display: inline-flex; align-items: center; border: 1.5px solid var(--ink); padding: 10px 22px; font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(14px, 0.95vw, 16px); color: var(--ink); }
.lt-pill { display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid var(--ink); border-radius: 999px; padding: 12px 28px; font-family: var(--font-serif); font-style: italic; font-weight: 400; font-size: clamp(15px, 1.1vw, 20px); color: var(--ink); text-decoration: none; }
.lt-divider-solid { height: 1px; background: var(--ink-32); border: none; }
.lt-divider-dashed { height: 0; border: none; border-top: 1px dashed var(--ink-32); }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.lt-cover { position: relative; }
.lt-cover__ed { display: flex; align-items: baseline; gap: 18px; margin-bottom: 24px; }
.lt-cover__grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 60px; align-items: end; }
.lt-cover__kicker { margin-bottom: 32px; }
.lt-cover__lead { margin: 32px 0 0; max-width: 600px; }
.lt-cover__byline { display: flex; gap: 16px; align-items: center; margin-top: 40px; flex-wrap: wrap; }
.lt-cover__aside { display: flex; flex-direction: column; align-items: center; gap: 18px; }

.lt-statement { position: relative; }
.lt-statement__num { font-size: clamp(120px, 16vw, 320px); margin-bottom: 32px; }
.lt-statement__text { max-width: 20ch; }
.lt-statement__anno { margin-top: 48px; }

.lt-metrics__grid { display: grid; border-top: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink); }
.lt-metric { display: flex; flex-direction: column; gap: 16px; padding: 28px 24px; }
.lt-metric + .lt-metric { border-left: 1px solid var(--ink-32); }
.lt-metric__hint { opacity: 0.75; }
.lt-metric[data-delta="down"] .lt-metric__value { color: var(--ink-dp); }

.lt-cards__list { border-top: 1.5px solid var(--ink); }
.lt-card-row { display: grid; grid-template-columns: 56px 1.6fr auto; padding: 18px 0; border-bottom: 1px solid var(--ink-32); align-items: baseline; gap: 24px; }
.lt-card-row__body { margin-top: 6px; opacity: 0.85; }
.lt-cards__grid { display: grid; gap: 28px; }
.lt-card { border: 1.5px solid var(--ink); padding: 28px; display: flex; flex-direction: column; gap: 18px; }
.lt-card__badge-rail { display: flex; align-items: center; gap: 14px; }

.lt-closing { position: relative; }
.lt-closing__ed { display: flex; align-items: baseline; gap: 16px; margin-bottom: 36px; }
.lt-closing__sub { margin-top: 40px; max-width: 900px; }
.lt-closing__cta { display: flex; gap: 16px; margin-top: 56px; flex-wrap: wrap; }
.lt-cta-primary { background: var(--ink); color: var(--paper); }

/* ── 兜底块的 Long Table 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 Bricolage 大写 + Fraunces italic + outline-only)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: -0.008em; color: var(--ink); }
.v32-prose-body, .v32-card-body, .v32-callout-body, .v32-media-body, .v32-compare-bullets { font-family: var(--font-serif); font-style: italic; color: var(--ink); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; letter-spacing: -0.012em; color: var(--ink); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col { border-radius: 0; box-shadow: none; border: 1.5px solid var(--ink); }
.v32-table-el th { border-bottom: 1.5px solid var(--ink); }
.v32-table-el td { border-bottom: 1px solid var(--ink-32); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-serif); font-style: italic; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 是 110px/90px/130px)+ 4px dot 纹理 */
[data-v32-mode="present"] .v32-slide-inner { padding: 110px 90px 130px; }
[data-v32-mode="present"] .v32-slide::before {
  content: ""; position: absolute; inset: 0;
  background-image: radial-gradient(circle at 1px 1px, var(--ink-50) 0.5px, transparent 1px);
  background-size: 4px 4px; opacity: 0.1; pointer-events: none; z-index: 1;
}
[data-v32-mode="present"] .lt-cover__display { font-size: clamp(82px, 8.8vw, 180px); }
[data-v32-mode="present"] .lt-closing__display { font-size: clamp(72px, 7.6vw, 160px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderStats / renderDiagnosis|features|proposal /
// renderHeroQuestion / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(ed-badge + 双栏 + jumbo-num vol)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-ed-tracked lt-cover__kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<div ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</div>`
    : "";
  const lead = b.lead
    ? `<p class="t-tagline lt-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="lt-cover__byline">${b.byline
        .map((x, j) => `<span class="lt-rect-tag" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block lt-cover" data-block-id="${b.id}">
  <div class="lt-cover__ed">
    <div class="lt-badge">·</div>
    <div class="t-ed-label">Edition</div>
  </div>
  <div class="lt-cover__grid">
    <div>
      ${kicker}
      <h1 class="t-display-cover lt-cover__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
      ${lead}
      ${byline}
    </div>
    <div class="lt-cover__aside">
      <div class="t-jumbo-num">${ctx.esc(b.displayTail ? "·" : "01")}</div>
      <div class="t-ed-tracked">Vol</div>
    </div>
  </div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(jumbo-num + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-jumbo-num lt-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-tagline lt-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block lt-statement" data-block-id="${b.id}">
  ${big}
  <p class="t-headline lt-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(topbar + 竖 hairline 分栏 · Bricolage 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const cols = Math.min(b.items.length || 1, 4);
  const title = b.title
    ? `<h2 class="t-headline-md" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : `<h2 class="t-headline-md">Numbers</h2>`;
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? " ▲" : m.delta === "down" ? " ▼" : m.delta === "flat" ? " →" : "";
      const hint = m.hint
        ? `<div class="t-meta-tag lt-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="lt-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-info-value lt-metric__value">${ctx.esc(m.value)}<span aria-hidden="true">${glyph}</span></div>
      <div class="t-info-key" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block lt-metrics" data-block-id="${b.id}">
  <div class="lt-topbar">${title}<div class="t-ed-label">— Figures</div></div>
  <div class="lt-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 网格 outlined 卡片(旧 features / diagnosis)
//   layout=numbered/steps → ledger 横排行(num | head+body | when/metric · 旧 proposal)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker ?? "Index";
  const title = b.title
    ? `<div class="lt-topbar"><h2 class="t-headline-md" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2><div class="t-ed-label">— ${ctx.esc(kicker)}</div></div>`
    : "";

  if (b.layout === "grid") {
    const cols = Math.min(b.items.length || 1, 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = c.num ?? String(i + 1).padStart(2, "0");
        return `<article class="lt-card">
      <div class="lt-card__badge-rail"><div class="lt-badge">${ctx.esc(num)}</div><div class="t-info-key">Item</div></div>
      <hr class="lt-divider-solid" />
      <div class="t-card-title" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-it" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      ${c.metric ? `<hr class="lt-divider-dashed" /><div class="lt-rect-tag" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}${c.metricLabel ? ` · ${ctx.esc(c.metricLabel)}` : ""}</div>` : ""}
    </article>`;
      })
      .join("");
    return `<section class="v32-block lt-cards" data-block-id="${b.id}" data-layout="grid">
  ${title}
  <div class="lt-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → ledger 横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = c.num ?? String(i + 1);
      const trailing = c.when
        ? `<div class="lt-rect-tag" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
        : c.metric
          ? `<div class="lt-rect-tag" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>`
          : "<div></div>";
      return `<div class="lt-card-row">
      <div class="lt-badge">${ctx.esc(num)}</div>
      <div>
        <div class="t-course-name" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-it lt-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      ${trailing}
    </div>`;
    })
    .join("");
  return `<section class="v32-block lt-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${title}
  <div class="lt-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(ed-badge + display + tagline + pill CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const sub = b.sub
    ? `<div class="t-tagline lt-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    const cls = kind === "primary" ? "lt-pill lt-cta-primary" : "lt-pill";
    return `<a class="${cls}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="lt-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block lt-closing" data-block-id="${b.id}">
  <div class="lt-closing__ed">
    <div class="lt-badge">·</div>
    <div class="t-ed-label" ${ctx.edit(`${p}/kicker`, "眉标")}>${ctx.esc(b.kicker ?? "Closing")}</div>
  </div>
  <h2 class="t-display lt-closing__display" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const longTableV32: TemplateV32 = {
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

export default longTableV32;
export { longTableV32, meta, fonts, themeCss };
