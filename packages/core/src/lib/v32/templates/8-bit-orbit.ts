/**
 * V32 S5 · 8-Bit Orbit 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/8-bit-orbit.ts(旧 1060 行,三入口 14 slide renderer +
 * DOC/SHEET 两套 CSS)。V32 模式:一份 block DOM,present/report 只在 CSS 层不同 →
 *   1) themeCss:把 8-bit-orbit 视觉 DNA(cosmic navy + 三霓虹 token + 4px 像素栅格 +
 *      scanline/grain/vignette 气氛层 + corner bracket + pixel shadow + t-* 排版)搬过来,
 *      并把品牌色映射到 --plain-* token,让没覆盖的兜底块(prose/heading/quote/callout/
 *      table/compare/quadrant/chart/media/sequence/group)自动获得 navy 底 + neon accent 观感;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/metrics/cards/closing)——旧模板里
 *      renderCover(pixel-hero)/renderHeroQuestion(jumbo numeral)/renderStats(stat-block)/
 *      renderDiagnosis|Features|Proposal(feature-card + bracket)/renderClosing(pixel-btn)精心设计过的几个。
 *
 * DNA(照搬旧注释):深 cosmic navy 底 · cyan/pink/yellow 三霓虹 + 紫薰衣草 pastel ·
 * 4px pixel-unit · 硬边 0-blur 阶梯 offset shadow · 40px cyan-on-navy grid wallpaper ·
 * scanlines + grain + CRT vignette 三层大气 · L 形 corner bracket 替 border ·
 * Tektur(display) + Chakra Petch(body) + Space Mono(HUD label)。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:搬旧 META
const meta = {
  slug: "8-bit-orbit",
  name: "8-Bit Orbit",
  tagline:
    "CRT 启动屏 · pixel-art neon arcade · 深 navy 底 + 霓虹绿/紫 · 4px 像素栅格 + scanline + 玻璃 CRT 光晕",
  scheme: "dark" as const,
  density: "both" as const,
  bestFor:
    "Retro-tech decks · game launch · arcade-style pitch · gen-Z product reveal · cyberpunk thesis · maker showcase",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体(含中文兜底 Noto Sans SC)
const fonts = fontLinks([
  "Tektur:wght@400;700;900",
  "Chakra Petch:wght@400;500;700",
  "Space Mono:wght@400;700",
  "Noto Sans SC:wght@400;500;700;900",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,把品牌色映射到 --plain-* /
// --v32-* 让兜底块吃到 8-bit 底色;再把关键 .v32-* 类重绘成 arcade 观感 + 气氛层。
const themeCss = `
:root {
  /* ── 8-bit-orbit 原 token(照搬旧 :root)── */
  --dark-void: #0A0E27;
  --deep-navy: #0F1B3D;
  --neon-cyan: #5EDCF4;
  --neon-pink: #F0A6CA;
  --neon-yellow: #F4D03F;
  --soft-lavender: #E2D5F2;
  --paper: #FFFFFF;

  --font-display: 'Tektur', 'Noto Sans SC', cursive, sans-serif;
  --font-ui: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  --font-mono: 'Space Mono', 'Noto Sans SC', monospace;

  /* ── 把 8-bit 色映射到 --plain-* token,让兜底块自动获得 arcade 底色 ──
     WCAG AA:paper(#FFF) on dark-void(#0A0E27) 对比≈18:1;neon-cyan(#5EDCF4) on
     deep-navy(#0F1B3D)≈9:1;text-mute 用 88% 白仍 ≥12:1 → 全部达标 */
  --plain-bg: var(--dark-void);
  --plain-surface: var(--deep-navy);
  --plain-surface-2: #16264d;
  --plain-text: var(--paper);
  --plain-text-mute: color-mix(in oklab, var(--paper) 82%, var(--dark-void));
  --plain-text-faint: color-mix(in oklab, var(--paper) 60%, var(--dark-void));
  --plain-border: rgba(94, 220, 244, 0.28);
  --plain-border-strong: var(--neon-cyan);
  --plain-accent: var(--neon-cyan);
  --plain-accent-strong: var(--neon-yellow);
  --plain-accent-bg: rgba(94, 220, 244, 0.08);
  --plain-success: var(--neon-cyan);
  --plain-warn: var(--neon-yellow);
  --plain-danger: var(--neon-pink);
  --plain-danger-bg: rgba(240, 166, 202, 0.10);

  --stage-bg: var(--dark-void);
  --slide-bg: var(--dark-void);
  --doc-page-bg: var(--dark-void);
  --doc-text: var(--paper);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* 8-bit 铁律:零圆角(像素硬边)*/
  --v32-gap: 24px;   /* 4px 像素单位的倍数 */
}

/* ── navy + cyan grid wallpaper(report 页面底 · 旧 DOC body 底图)── */
[data-v32-mode="report"] body {
  background-color: var(--dark-void);
  background-image:
    linear-gradient(rgba(94, 220, 244, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 220, 244, 0.07) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── 8-bit 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-pixel-hero { font-family: var(--font-display); font-weight: 900; font-size: clamp(56px, min(8.6vw, 14vh), 168px); line-height: 1.05; letter-spacing: 0.04em; color: var(--neon-cyan); text-shadow: 4px 4px 0 var(--neon-yellow), 8px 8px 0 var(--deep-navy); margin: 0; }
.t-headline { font-family: var(--font-display); font-weight: 700; font-size: clamp(28px, min(3.4vw, 5.6vh), 60px); line-height: 1.12; color: var(--neon-cyan); text-shadow: 3px 3px 0 var(--deep-navy); }
.t-subhead { font-family: var(--font-display); font-weight: 700; font-size: clamp(20px, min(2vw, 3.2vh), 32px); line-height: 1.15; color: var(--paper); }
.t-stat { font-family: var(--font-display); font-weight: 900; font-size: clamp(40px, min(5vw, 8vh), 88px); line-height: 1; color: var(--neon-cyan); text-shadow: 3px 3px 0 var(--deep-navy); }
.t-numeral-jumbo { font-family: var(--font-display); font-weight: 900; font-size: clamp(96px, min(16vw, 28vh), 320px); line-height: 0.95; letter-spacing: 0.02em; color: var(--neon-yellow); text-shadow: 4px 4px 0 var(--neon-pink), 8px 8px 0 var(--deep-navy); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.05vw, 19px); line-height: 1.7; color: color-mix(in oklab, var(--paper) 82%, var(--dark-void)); }
.t-label-pill { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; background: var(--deep-navy); color: var(--neon-yellow); padding: 8px 16px; }
.t-eyebrow { font-family: var(--font-mono); font-weight: 400; font-size: 14px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--neon-yellow); }
.t-meta { font-family: var(--font-mono); font-weight: 400; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: color-mix(in oklab, var(--paper) 55%, var(--dark-void)); }
.t-hero-badge { display: inline-block; font-family: var(--font-mono); font-weight: 400; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; border: 2px solid var(--neon-yellow); color: var(--neon-yellow); padding: 8px 16px; }

/* ── L 形 pixel corner bracket(替 border · 照搬旧 .bracket)── */
.ob-bracket { position: absolute; width: 24px; height: 24px; pointer-events: none; }
.ob-bracket.tl { top: -2px; left: -2px; border-top: 4px solid var(--neon-cyan); border-left: 4px solid var(--neon-cyan); }
.ob-bracket.br { bottom: -2px; right: -2px; border-bottom: 4px solid var(--neon-cyan); border-right: 4px solid var(--neon-cyan); }

/* ── feature-card / stat-block(覆盖块 + 兜底块重绘共用)── */
.ob-card { position: relative; background: rgba(255, 255, 255, 0.06); border: 2px solid rgba(94, 220, 244, 0.2); padding: 32px 28px; }
.ob-stat { position: relative; background: rgba(94, 220, 244, 0.08); border: 2px solid rgba(94, 220, 244, 0.2); padding: 36px 24px; text-align: center; }

/* ── pixel button(CTA · 阶梯 offset shadow · 照搬旧 .pixel-btn)── */
.ob-btn { display: inline-block; font-family: var(--font-display); font-weight: 700; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; background: var(--neon-cyan); color: var(--deep-navy); padding: 18px 32px; text-decoration: none;
  box-shadow: 4px 0 0 0 var(--deep-navy), 0 4px 0 0 var(--deep-navy), 4px 4px 0 0 var(--deep-navy), 8px 4px 0 0 var(--neon-yellow), 4px 8px 0 0 var(--neon-yellow), 8px 8px 0 0 var(--neon-yellow); }
.ob-btn[data-kind="secondary"] { background: transparent; color: var(--neon-cyan); border: 2px solid var(--neon-cyan); box-shadow: 4px 4px 0 0 var(--neon-pink); }

/* ── 覆盖块自定义结构 ── */
.ob-cover__tail { display: block; margin-top: 0.2em; color: var(--neon-pink); text-shadow: 4px 4px 0 var(--neon-yellow), 8px 8px 0 var(--deep-navy); }
.ob-cover__lead { margin: 40px 0 0; max-width: 1100px; font-size: 20px; }
.ob-cover__badges { margin-top: 48px; display: flex; flex-wrap: wrap; gap: 12px; }

.ob-statement { text-align: center; }
.ob-statement__num { margin-bottom: 24px; }
.ob-statement__text { margin: 0 auto; max-width: 22ch; }
.ob-statement__anno { margin-top: 48px; }

.ob-metrics__title { margin: 0 0 48px; }
.ob-metrics__grid { display: grid; gap: 24px; }
.ob-metric__value { margin: 0; }
.ob-metric__value .ob-delta { font-size: 0.4em; margin-left: 0.15em; }
.ob-metric[data-delta="down"] .ob-delta { color: var(--neon-pink); }
.ob-metric__label { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--neon-pink); margin-top: 14px; }
.ob-metric__hint { margin-top: 12px; font-size: 14px; }

.ob-cards__title { margin: 0 0 36px; max-width: 1500px; }
.ob-cards__list { display: flex; flex-direction: column; gap: 20px; }
.ob-card-row { display: grid; grid-template-columns: 90px 1fr 200px; gap: 24px; align-items: center; }
.ob-card-row__num { margin: 0; }
.ob-card-row__head { margin: 0 0 12px; }
.ob-card-row__side { text-align: right; }
.ob-card-row__metric { margin: 0; font-size: 56px; }
.ob-cards__grid { display: grid; gap: 24px; }
.ob-card__num { margin-bottom: 16px; color: var(--neon-yellow); }
.ob-card__head { margin: 0 0 12px; }

.ob-closing__display { margin: 0; }
.ob-closing__sub { margin-top: 32px; font-size: 22px; max-width: 1100px; }
.ob-closing__cta { display: flex; gap: 36px; margin-top: 64px; }

/* ── 兜底块的 8-bit 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 arcade 的 display 字体 + neon accent + 硬边)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-weight: 700; color: var(--neon-cyan); text-shadow: 2px 2px 0 var(--deep-navy);
}
.v32-prose-body, .v32-card-body, .v32-callout-body, .v32-media-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-ui); font-weight: 500; font-style: normal; border-left-color: var(--neon-pink); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-mono); letter-spacing: 0.2em; color: var(--neon-yellow); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col { border-radius: 0; box-shadow: none; }
.v32-card-num, .v32-card-metric-v { color: var(--neon-yellow); }
.v32-seq-dot { border-radius: 0; background: var(--neon-cyan); border: 4px solid var(--deep-navy); }
.v32-table-el thead th { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.16em; color: var(--neon-cyan); border-bottom: 2px solid var(--neon-cyan); }

/* ── present 舞台:navy grid + scanline/grain/vignette 三层大气(旧 .slide + ::before/::after)── */
[data-v32-mode="present"] .slide {
  background: var(--dark-void);
  background-image:
    linear-gradient(rgba(94, 220, 244, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 220, 244, 0.07) 1px, transparent 1px);
  background-size: 40px 40px;
  cursor: crosshair;
  color: var(--paper);
}
[data-v32-mode="present"] .slide::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='0.5'/></svg>");
  opacity: 0.04; mix-blend-mode: screen;
}
[data-v32-mode="present"] .slide::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 2;
  background:
    repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(10, 14, 39, 0.18) 2px, rgba(10, 14, 39, 0.18) 4px),
    radial-gradient(ellipse at center, transparent 50%, rgba(10, 14, 39, 0.45) 100%);
}
[data-v32-mode="present"] .v32-slide-inner { position: relative; z-index: 10; padding: 64px 72px 88px; }
[data-v32-mode="present"] .ob-cover__display { font-size: clamp(80px, 8.6vw, 168px); }
[data-v32-mode="present"] .ob-closing__display { font-size: clamp(80px, 8.6vw, 168px); }

/* present pagenum:霓虹 HUD(旧 .pagenum)*/
[data-v32-mode="present"] .pagenum {
  font-family: var(--font-mono); font-size: 14px; letter-spacing: 0.15em;
  color: var(--neon-cyan); background: rgba(15, 27, 61, 0.85); padding: 6px 12px;
}
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|Features|Proposal / renderClosing;字段名改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// 旧模板按 index 轮转三霓虹给数字上色
const neonAt = (i: number) =>
  i % 3 === 0 ? "var(--neon-cyan)" : i % 3 === 1 ? "var(--neon-pink)" : "var(--neon-yellow)";

const brackets = `<span class="ob-bracket tl"></span><span class="ob-bracket br"></span>`;

// cover ← 旧 renderCover(pixel-hero + hero-badge byline)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-pill" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="ob-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body ob-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const badges = b.byline?.length
    ? `<div class="ob-cover__badges">${b.byline
        .slice(0, 4)
        .map((x, j) => `<span class="t-hero-badge" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block ob-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-pixel-hero ob-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${badges}
</section>`;
};

// statement ← 旧 renderHeroQuestion(jumbo numeral + question + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-numeral-jumbo ob-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-eyebrow ob-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>▷ ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block ob-statement" data-block-id="${b.id}">
  ${big}
  <h2 class="t-headline ob-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(stat-block + bracket · Tektur 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-headline ob-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="ob-delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-body ob-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="ob-stat ob-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      ${brackets}
      <div class="t-stat ob-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="ob-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block ob-metrics" data-block-id="${b.id}">
  ${title}
  <div class="ob-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis/renderProposal(numbered/steps 横排大条目)/ renderFeatures(grid 网格卡)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-pill" ${ctx.edit(`${p}/kicker`, "卡片组眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-headline ob-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    // features 式网格卡
    const cols = b.items.length <= 3 ? Math.max(1, b.items.length) : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        return `<article class="ob-card">
      ${brackets}
      <div class="t-meta ob-card__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div class="t-subhead ob-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block ob-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="ob-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目(num | head+body | metric/when)
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = c.num ?? String(i + 1).padStart(2, "0");
      const side = c.metric
        ? `<div class="t-stat ob-card-row__metric" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${
            c.metricLabel ? `<div class="t-meta" style="margin-top:8px;" ${ctx.edit(`${p}/items/${i}/metricLabel`, "指标标签")}>${ctx.esc(c.metricLabel)}</div>` : ""
          }`
        : c.when
          ? `<div class="t-meta" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="ob-card ob-card-row">
      ${brackets}
      <div class="t-stat ob-card-row__num" style="color:${neonAt(i)};">${ctx.esc(num)}</div>
      <div>
        <div class="t-subhead ob-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="ob-card-row__side">${side}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block ob-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="ob-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(pixel-hero + pixel-btn CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-label-pill" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body ob-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    return `<a class="ob-btn" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " ▶" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="ob-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block ob-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-pixel-hero ob-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const eightBitOrbitV32: TemplateV32 = {
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

export default eightBitOrbitV32;
export { eightBitOrbitV32, meta, fonts, themeCss };
