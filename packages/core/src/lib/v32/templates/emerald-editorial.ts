/**
 * V32 S5 · Emerald Editorial 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/emerald-editorial.ts(旧 972 行 · 三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 emerald 的视觉 DNA(bg/ink/paper token + t-* 排版 + tile/rule/ornament)
 *      搬过来,并把三色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到 emerald 底色;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/compare/closing)。
 *      其余(prose/heading/quote/callout/table/quadrant/chart/media/sequence/group)走兜底,
 *      靠 themeCss 对 .v32-* 重绘(Bodoni serif / 4px rule / 零圆角 / tile 倒置)拿到 emerald 观感。
 *
 * DNA(照搬旧模板注释):翡翠绿(#3CD896)+ 深海军蓝(#0F1A5C)+ 燕麦奶油(#F1E9D6)三色
 * + Bodoni Moda weight 900 一统 display + Manrope uppercase 宽字距 + 4px solid rule
 * + double-rule ornament(居中 serif word + 两侧双横线)+ 零圆角零阴影 + 色块倒置即 elevation。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:照搬旧 META
const meta = {
  slug: "emerald-editorial",
  name: "Emerald Editorial",
  tagline:
    "时装杂志 + 19 世纪戏剧海报 · Bodoni Moda weight 900 · 翡翠绿 + 海军蓝 + 燕麦奶油 · 零圆角 · double-rule ornament",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Fashion magazine covers · annual flagship reports · brand manifestos · theatrical launches · arts season programs",
};

// V32 S5 · fonts:照搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Bodoni Moda:opsz,wght@6..96,700;6..96,800;6..96,900",
  "Manrope:wght@500;700;800",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,override --plain-* 让兜底块吃到
// emerald 三色;再把关键 .v32-* 类重绘成 Bodoni + 4px rule + 零圆角 + tile 倒置。
const themeCss = `
:root {
  /* ── emerald 原 token(照搬旧模板 :root)── */
  --bg: #3CD896;
  --bg-2: #2DC684;
  --ink: #0F1A5C;
  --ink-2: #1B2774;
  --paper: #F1E9D6;
  --rule: rgba(15, 26, 92, 0.22);

  --font-serif: 'Bodoni Moda', Georgia, serif;
  --font-sans: 'Manrope', system-ui, sans-serif;

  /* ── 把 emerald 三色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 emerald 底色 ──
     WCAG AA:ink(#0F1A5C) on bg(#3CD896) 对比≈8:1;on paper(#F1E9D6)≈12:1;均 ≥4.5:1 */
  --plain-bg: var(--bg);
  --plain-surface: var(--bg);
  --plain-surface-2: var(--paper);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 80%, var(--bg));
  --plain-text-faint: color-mix(in oklab, var(--ink) 64%, var(--bg));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: var(--paper);
  --plain-success: var(--ink);
  --plain-warn: var(--ink);
  --plain-danger: var(--ink);
  --plain-danger-bg: var(--paper);

  --stage-bg: #1a1f3e;
  --slide-bg: var(--bg);
  --doc-page-bg: var(--bg);
  --doc-text: var(--ink);

  --font-body: var(--font-sans);
  --v32-radius: 0px; /* emerald 铁律:零圆角 */
  --v32-gap: 0px;    /* emerald 用 4px rule / tile 拼接而非 gap 分隔 */
}

/* ── emerald 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-numeral-jumbo { font-family: var(--font-serif); font-weight: 900; font-size: clamp(120px, min(20vw, 40vh), 400px); line-height: 0.9; letter-spacing: -0.04em; margin: 0; color: var(--ink); }
.t-display-cover { font-family: var(--font-serif); font-weight: 900; font-size: clamp(72px, min(9.6vw, 17.5vh), 184px); line-height: 0.92; letter-spacing: -0.01em; margin: 0; color: var(--ink); }
.t-display { font-family: var(--font-serif); font-weight: 900; font-size: clamp(56px, min(6.8vw, 12vh), 130px); line-height: 0.96; letter-spacing: -0.015em; margin: 0; color: var(--ink); }
.t-display-sm { font-family: var(--font-serif); font-weight: 900; font-size: clamp(48px, min(6.2vw, 11vh), 120px); line-height: 0.95; letter-spacing: -0.015em; margin: 0; color: var(--ink); }
.t-headline-xl { font-family: var(--font-serif); font-weight: 900; font-size: clamp(44px, min(5.4vw, 9.6vh), 104px); line-height: 0.95; letter-spacing: -0.015em; margin: 0; color: var(--ink); }
.t-headline { font-family: var(--font-serif); font-weight: 900; font-size: clamp(36px, min(4.8vw, 8.5vh), 92px); line-height: 1.0; letter-spacing: -0.02em; margin: 0; color: var(--ink); }
.t-kpi-figure { font-family: var(--font-serif); font-weight: 900; font-size: clamp(56px, min(7vw, 12vh), 132px); line-height: 0.9; letter-spacing: -0.03em; margin: 0; color: var(--ink); }
.t-stat-figure { font-family: var(--font-serif); font-weight: 900; font-size: clamp(40px, min(4.8vw, 8.5vh), 92px); line-height: 1.0; letter-spacing: -0.02em; color: var(--ink); }
.t-title-card { font-family: var(--font-serif); font-weight: 800; font-size: clamp(22px, min(2.5vw, 4.4vh), 48px); line-height: 1.0; letter-spacing: -0.005em; margin: 0; color: var(--ink); }
.t-step-numeral { font-family: var(--font-serif); font-weight: 900; font-size: clamp(36px, min(4.2vw, 7.5vh), 80px); line-height: 1.0; margin: 0; color: var(--ink); }
.t-eyebrow { font-family: var(--font-sans); font-weight: 800; font-size: clamp(13px, 1.5vw, 24px); letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }
.t-label { font-family: var(--font-sans); font-weight: 700; font-size: clamp(12px, 1.35vw, 22px); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }
.t-tag { font-family: var(--font-sans); font-weight: 800; font-size: clamp(11px, 1.25vw, 20px); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); }
.t-body-lg { font-family: var(--font-sans); font-weight: 500; font-size: clamp(15px, 1.5vw, 24px); line-height: 1.5; color: var(--ink); }
.t-body { font-family: var(--font-sans); font-weight: 500; font-size: clamp(14px, 1.35vw, 22px); line-height: 1.5; color: var(--ink); }
.t-body-sm { font-family: var(--font-sans); font-weight: 500; font-size: clamp(13px, 1.25vw, 20px); line-height: 1.45; color: var(--ink); }

/* emerald 结构件:4px rule + tile 倒置 + double-rule ornament(照搬旧模板) */
.ee-rule { height: 4px; background: var(--ink); border: none; width: 100%; }
.ee-tile-ink { background: var(--ink); color: var(--bg); padding: 36px; }
.ee-tile-ink .t-tag, .ee-tile-ink .t-step-numeral, .ee-tile-ink .t-title-card, .ee-tile-ink .t-kpi-figure, .ee-tile-ink .t-stat-figure, .ee-tile-ink .t-body-sm, .ee-tile-ink .t-body, .ee-tile-ink .t-label { color: var(--bg); }
.ee-tile-paper { background: var(--paper); color: var(--ink); padding: 36px; }
.ee-mark-pill { display: inline-block; padding: 10px 22px; background: var(--ink); color: var(--bg); font-family: var(--font-sans); font-weight: 700; font-size: clamp(12px, 1.25vw, 20px); letter-spacing: 0.1em; text-transform: uppercase; }

/* double-rule ornament(签名) */
.ee-ornament { display: flex; align-items: center; gap: 22px; justify-content: center; color: var(--ink); }
.ee-ornament .rules { flex: 1; display: flex; flex-direction: column; gap: 3px; max-width: 320px; }
.ee-ornament .rules > div { height: 4px; background: currentColor; }
.ee-ornament .word { font-family: var(--font-serif); font-weight: 800; font-size: clamp(32px, 4vw, 64px); white-space: nowrap; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.ee-cover { text-align: center; }
.ee-cover__display { margin: 28px 0; }
.ee-cover__lead { max-width: 1100px; margin: 48px auto 0; }
.ee-cover__byline { display: flex; justify-content: center; gap: 14px; margin-top: 32px; flex-wrap: wrap; }

.ee-statement__num { margin: 0 0 32px; }
.ee-statement__text { margin: 0; max-width: 22ch; }
.ee-statement__anno { margin-bottom: 28px; }

.ee-metrics__title { margin: 0 0 36px; }
.ee-metrics__grid { display: grid; gap: 0; border-top: 4px solid var(--ink); border-left: 4px solid var(--ink); }
.ee-metric { display: flex; flex-direction: column; gap: 16px; min-height: 260px; border-right: 4px solid var(--ink); border-bottom: 4px solid var(--ink); }
.ee-metric__value { display: flex; align-items: baseline; gap: 0.15em; }
.ee-metric__delta { font-family: var(--font-sans); font-weight: 800; font-size: 0.32em; }
.ee-metric[data-delta="down"] .ee-metric__delta { opacity: 0.75; }
.ee-metric__hint { margin-top: auto; }

.ee-cards__title { margin: 0 0 24px; }
.ee-cards__list { border-bottom: 4px solid var(--ink); }
.ee-card-row { display: grid; grid-template-columns: 130px 1fr 280px; gap: 32px; align-items: baseline; padding: 30px 0; border-top: 4px solid var(--ink); }
.ee-card-row__head { margin: 0 0 14px; }
.ee-card-row__body { max-width: 760px; }
.ee-card-row__metric { text-align: right; }
.ee-card-row__metric-l { margin-top: 10px; }
.ee-cards__grid { display: grid; gap: 0; }
.ee-card { display: flex; flex-direction: column; gap: 16px; min-height: 300px; }
.ee-card__rule { height: 4px; width: 48px; }
.ee-card__head { margin: 0; }

.ee-compare__title { margin: 0 0 32px; }
.ee-compare__cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.ee-compare__col { display: flex; flex-direction: column; gap: 24px; padding: 48px 44px; }
.ee-compare__label { margin: 0; }
.ee-compare__rule { height: 4px; }
.ee-compare__bullet { padding: 12px 0; }

.ee-closing { background: var(--ink); color: var(--bg); text-align: center; }
.ee-closing .t-eyebrow, .ee-closing .ee-ornament { color: var(--bg); }
.ee-closing__display { color: var(--bg); margin: 48px 0; max-width: 1500px; margin-left: auto; margin-right: auto; }
.ee-closing__sub { color: var(--paper); max-width: 1000px; margin: 48px auto 0; }
.ee-closing__cta { display: flex; justify-content: center; gap: 16px; margin-top: 48px; flex-wrap: wrap; }
.ee-cta { display: inline-block; padding: 18px 36px; text-decoration: none; font-family: var(--font-sans); font-weight: 800; font-size: 15px; letter-spacing: 0.12em; text-transform: uppercase; }
.ee-cta[data-kind="primary"] { background: var(--bg); color: var(--ink); }
.ee-cta[data-kind="secondary"] { border: 4px solid var(--bg); color: var(--bg); }

/* ── 兜底块的 emerald 重绘(prose/heading/quote/callout/table/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 Bodoni + 4px rule + 零圆角 + paper 倒置)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-serif); font-weight: 900; color: var(--ink); }
.v32-prose-body { font-family: var(--font-sans); color: var(--ink); }
.v32-quote { background: var(--ink); color: var(--bg); padding: 32px 36px; }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-serif); font-weight: 900; color: var(--bg); }
.v32-quote-attr { color: var(--paper); font-family: var(--font-sans); text-transform: uppercase; letter-spacing: 0.08em; }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col { border-radius: 0; box-shadow: none; border: 4px solid var(--ink); background: var(--paper); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-sans); font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); }
.v32-table-el th { border-bottom: 4px solid var(--ink); background: var(--bg); text-transform: uppercase; letter-spacing: 0.1em; font-family: var(--font-sans); font-weight: 800; }

/* present 舞台:emerald 大内边距(旧 slide-inner 是 110px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 110px 110px 70px; }
[data-v32-mode="present"] .ee-cover__display { font-size: clamp(88px, 9.6vw, 184px); }
[data-v32-mode="present"] .ee-closing__display { font-size: clamp(72px, 9.6vw, 184px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderCompare / renderClosing。
// ────────────────────────────────────────────────────────────

// double-rule ornament 片段(签名件)
const ornament = (word: string, esc: (s: unknown) => string) =>
  `<div class="ee-ornament"><div class="rules"><div></div><div></div></div><div class="word">${esc(word)}</div><div class="rules"><div></div><div></div></div></div>`;

// cover ← 旧 renderCover(居中 double-rule 夹标题)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div style="margin-bottom:40px;"><span class="ee-mark-pill" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const tail = b.displayTail
    ? `<span style="display:block;" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-lg ee-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="ee-cover__byline">${b.byline
        .map((x, j) => `<span class="ee-mark-pill" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ee-cover" data-block-id="${b.id}">
  ${kicker}
  ${ornament("The", ctx.esc)}
  <h1 class="t-display-cover ee-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${ornament("of the report", ctx.esc)}
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(jumbo numeral + eyebrow + rule + headline)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-numeral-jumbo ee-statement__num" style="font-size:clamp(88px,min(12vw,22vh),240px);" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-eyebrow ee-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ee-statement" data-block-id="${b.id}">
  ${anno}
  ${big}
  <div class="ee-rule" style="max-width:320px;margin:0 0 32px;"></div>
  <p class="t-display ee-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
</section>`;
};

// metrics ← 旧 renderStats(4px rule 网格 · Bodoni 大数字 · tile 倒置)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-display-sm ee-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ee-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body-sm ee-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      const tile = i % 2 === 0 ? "ee-tile-ink" : "ee-tile-paper";
      return `<div class="ee-metric ${tile}" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-tag">${String(i + 1).padStart(2, "0")}</div>
      <div class="t-kpi-figure ee-metric__value" ${ctx.edit(`${p}/items/${i}/value`, "数值")}>${ctx.esc(m.value)}${delta}</div>
      <div class="t-tag" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block ee-metrics" data-block-id="${b.id}">
  ${title}
  <div class="ee-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric)· 旧 diagnosis
//   layout=grid           → tile 倒置网格 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-eyebrow" style="margin-bottom:24px;" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-headline-xl ee-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .map((c: CardItem, i: number) => {
        const tile = i % 2 === 0 ? "ee-tile-ink" : "ee-tile-paper";
        return `<article class="ee-card ${tile}">
      <div class="t-tag">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="ee-card__rule" style="background:var(--ink);"></div>
      <h3 class="t-title-card ee-card__head" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</h3>
      <p class="t-body-sm" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</p>
    </article>`;
      })
      .join("");
    const gcols = b.items.length <= 3 ? b.items.length || 1 : Math.min(Math.ceil(b.items.length / 2), 3);
    return `<section class="v32-block ee-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ee-rule" style="margin-bottom:32px;"></div>
  <div class="ee-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat-figure" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-tag ee-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-tag">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="ee-card-row">
      <div class="t-step-numeral">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-title-card ee-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body ee-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ee-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ee-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="ee-cards__list">${items}</div>
</section>`;
};

// compare ← 旧 renderCompare(左 ink tile / 右 paper tile · 双列)
const compare: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "compare" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline-xl ee-compare__title" ${ctx.edit(`${p}/title`, "对比标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const col = (side: "left" | "right", tagLabel: string) => {
    const c = b[side];
    const dark = side === "left";
    const cls = dark ? "ee-tile-ink" : "ee-tile-paper";
    const ruleColor = dark ? "var(--bg)" : "var(--ink)";
    const borderColor = dark ? "rgba(241,233,214,0.2)" : "rgba(15,26,92,0.15)";
    const bullets = c.bullets
      .map((x, j) => `<div class="t-body-sm ee-compare__bullet" style="border-bottom:1px solid ${borderColor};" ${ctx.edit(`${p}/${side}/bullets/${j}`, "要点")}>${ctx.esc(x)}</div>`)
      .join("");
    return `<div class="ee-compare__col ${cls}">
      <div class="t-tag">${ctx.esc(tagLabel)}</div>
      <div class="t-title-card ee-compare__label" ${ctx.edit(`${p}/${side}/label`, "对比列标题")}>${ctx.esc(c.label)}</div>
      <div class="ee-compare__rule" style="background:${ruleColor};"></div>
      ${bullets}
    </div>`;
  };
  return `<section class="v32-block ee-compare" data-block-id="${b.id}">
  ${title}
  <div class="ee-rule" style="margin-bottom:32px;"></div>
  <div class="ee-compare__cols">${col("left", "A — Before")}${col("right", "B — After")}</div>
</section>`;
};

// closing ← 旧 renderClosing(ink 底 · double-rule 夹标题 · bg CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const sub = b.sub
    ? `<p class="t-body-lg ee-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="ee-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ee-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ee-closing" data-block-id="${b.id}">
  ${ornament("The End", ctx.esc)}
  <h2 class="t-display-cover ee-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${ornament("of " + (b.kicker ?? "the season"), ctx.esc)}
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const emeraldEditorialV32: TemplateV32 = {
  meta,
  fonts,
  themeCss,
  blocks: {
    cover,
    statement,
    metrics,
    cards,
    compare,
    closing,
  },
};

export default emeraldEditorialV32;
export { emeraldEditorialV32, meta, fonts, themeCss };
