/**
 * V32 S5 · Sakura Chroma 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/sakura-chroma.ts(旧 1052 行,三入口 25 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 sakura 视觉 DNA(cream paper / warm-brown ink / 六色 primary
 *      + Big Shoulders 900 排版 + 4px halftone-dot 纹理 + ribbon/petal/seal 气氛)
 *      搬过来,并把 sakura 色映射到 --plain-* token,让"没覆盖的兜底块"自动吃到
 *      cream 底 + warm-brown ink + hard-offset 卡片观感;
 *   2) blocks:只覆盖 sakura 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 里对 .v32-* 的重绘拿到 sakura 观感。
 *
 * DNA(照搬旧模板注释):暖 cream paper(#F1E6CB)+ 深 warm-brown ink(#3A2516)+ 六色 primary set;
 * Big Shoulders Display 900 display · Albert Sans body · 4px halftone-dot 16% 纹理;
 * 红色 inline `<em>`(永不 italic)· petal-cluster / ribbon band / rosette seal / red stamp;
 * 8px 8px 0 ink hard-offset shadow · 1.5px border · 0 圆角 · tracked uppercase micro labels。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META(slug/name/tagline/scheme/density/bestFor)
const meta = {
  slug: "sakura-chroma",
  name: "Sakura Chroma",
  tagline:
    "Cassette-package editorial · 暖 cream + warm-brown ink + 六色 primary · Big Shoulders 900 + petal-cluster",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Consumer product catalogues · culture-issue brochures · 70s-flavor product decks · lo-fi music studio decks · curated boutique editorials",
};

// V32 S5 · fonts:搬旧 fontLinks 四字体
const fonts = fontLinks([
  "Big Shoulders Display:wght@700;900",
  "Albert Sans:wght@400;500;600;700",
  "JetBrains Mono:wght@400;500",
  "Noto Sans JP:wght@500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 sakura 底色;再把关键 .v32-* 类重绘成 sakura 观感。
const themeCss = `
:root {
  /* ── sakura 原 token(照搬旧模板 :root)── */
  --paper: #F1E6CB;
  --paper-dk: #E5D6B0;
  --ink: #3A2516;
  --red: #E5392A;
  --pink: #E54489;
  --orange: #F09131;
  --green: #3D9F47;
  --blue: #3F8BC4;
  --yellow: #F0BC2A;

  --font-display: 'Big Shoulders Display', sans-serif;
  --font-ui: 'Albert Sans', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-jp: 'Noto Sans JP', sans-serif;

  /* ── 把 sakura 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 sakura 底色 ──
     WCAG AA:ink(#3A2516) on paper(#F1E6CB) 对比≈9:1;mute 用 ink 混 paper 仍 ≥4.5:1 */
  --plain-bg: var(--paper);
  --plain-surface: var(--paper);
  --plain-surface-2: var(--paper-dk);
  --plain-text: var(--ink);
  --plain-text-mute: color-mix(in oklab, var(--ink) 80%, var(--paper));
  --plain-text-faint: color-mix(in oklab, var(--ink) 64%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--red);
  --plain-accent-strong: var(--red);
  --plain-accent-bg: color-mix(in oklab, var(--yellow) 28%, var(--paper) 72%);
  --plain-success: var(--green);
  --plain-warn: var(--orange);
  --plain-danger: var(--red);
  --plain-danger-bg: color-mix(in oklab, var(--red) 12%, var(--paper) 88%);

  --stage-bg: #7a6840;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 0px; /* sakura 铁律:零圆角(petals/seal 除外) */
  --v32-gap: 24px;   /* cassette 卡片间距 */
}

/* ── sakura 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-disp-hero { font-family: var(--font-display); font-weight: 900; font-size: clamp(96px, min(12vw, 20vh), 240px); line-height: 0.84; letter-spacing: -0.025em; color: var(--ink); margin: 0; }
.t-disp-title { font-family: var(--font-display); font-weight: 900; font-size: clamp(80px, min(9vw, 15vh), 180px); line-height: 0.86; letter-spacing: -0.022em; color: var(--ink); margin: 0; }
.t-disp-statement { font-family: var(--font-display); font-weight: 900; font-size: clamp(64px, min(7vw, 12vh), 140px); line-height: 0.9; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-disp-section { font-family: var(--font-display); font-weight: 900; font-size: clamp(48px, min(5.5vw, 9vh), 100px); line-height: 0.9; letter-spacing: -0.018em; color: var(--ink); margin: 0; }
.t-disp-card-name { font-family: var(--font-display); font-weight: 900; font-size: clamp(28px, min(2.6vw, 4.4vh), 44px); line-height: 0.94; letter-spacing: -0.012em; color: var(--ink); margin: 0; }
.t-num-hero { font-family: var(--font-display); font-weight: 900; font-size: clamp(96px, min(11vw, 18vh), 240px); line-height: 0.86; letter-spacing: -0.025em; color: var(--red); margin: 0; }
.t-num-md { font-family: var(--font-display); font-weight: 900; font-size: clamp(56px, min(6vw, 11vh), 120px); line-height: 0.86; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
.t-ttl-row { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px, 1.8vw, 32px); line-height: 1.1; letter-spacing: -0.005em; color: var(--ink); margin: 0; }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(14px, 1.1vw, 18px); line-height: 1.5; color: var(--ink); }
.t-body-emp { font-family: var(--font-ui); font-weight: 600; font-size: clamp(16px, 1.2vw, 22px); line-height: 1.4; color: var(--ink); }
.t-micro { font-family: var(--font-ui); font-weight: 700; font-size: clamp(12px, 0.92vw, 14px); line-height: 1.2; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.t-micro-lg { font-family: var(--font-ui); font-weight: 700; font-size: clamp(12px, 0.92vw, 14px); line-height: 1.2; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink); }
.t-micro-xl { font-family: var(--font-ui); font-weight: 700; font-size: clamp(12px, 0.92vw, 14px); line-height: 1.2; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink); }
.t-mono { font-family: var(--font-mono); font-weight: 400; font-size: clamp(11px, 0.85vw, 13px); line-height: 1.3; letter-spacing: 0.02em; color: var(--ink); }

/* 红色 inline em(永不 italic)· sakura 铁律 */
em { font-style: normal; color: var(--red); }

/* ── halftone-dot 纹理(non-optional · 16% opacity)· 铺在 flow 与每屏 ── */
.v32-flow, [data-v32-mode="present"] .v32-slide-inner { position: relative; }
.v32-flow::before, [data-v32-mode="present"] .v32-slide-inner::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(58, 37, 22, 0.55) 1px, transparent 1.6px);
  background-size: 4px 4px; opacity: 0.16;
}
.v32-flow > *, [data-v32-mode="present"] .v32-slide-inner > * { position: relative; z-index: 1; }

/* cassette 卡壳:1.5px border + hard-offset shadow(sakura 招牌) */
.sk-card {
  border: 1.5px solid var(--ink); background: var(--paper);
  box-shadow: 8px 8px 0 var(--ink); display: flex; flex-direction: column;
}
.sk-topstrip { height: 28px; }
.sk-topstrip[data-c="r"] { background: var(--red); }
.sk-topstrip[data-c="p"] { background: var(--pink); }
.sk-topstrip[data-c="o"] { background: var(--orange); }
.sk-topstrip[data-c="g"] { background: var(--green); }
.sk-topstrip[data-c="b"] { background: var(--blue); }
.sk-topstrip[data-c="y"] { background: var(--yellow); }

/* red stamp / rosette seal(cover / closing 气氛件)*/
.sk-stamp {
  display: inline-block; background: var(--red); color: var(--paper);
  padding: 10px 22px; font-family: var(--font-display); font-weight: 900;
  font-size: clamp(20px, 1.6vw, 26px); letter-spacing: 0.02em;
  text-transform: uppercase; transform: rotate(-3deg);
}
.sk-seal {
  display: inline-flex; align-items: center; justify-content: center;
  width: 110px; height: 110px; background: var(--ink); color: var(--paper);
  clip-path: polygon(50% 0%, 56% 8%, 64% 4%, 65% 13%, 74% 11%, 71% 20%, 80% 21%, 75% 28%, 84% 32%, 76% 36%, 84% 45%, 75% 45%, 80% 54%, 71% 52%, 75% 61%, 65% 58%, 65% 67%, 56% 62%, 56% 71%, 50% 65%, 44% 71%, 44% 62%, 35% 67%, 35% 58%, 25% 61%, 29% 52%, 20% 54%, 25% 45%, 16% 45%, 24% 36%, 16% 32%, 25% 28%, 20% 21%, 29% 20%, 26% 11%, 35% 13%, 36% 4%, 44% 8%);
  font-family: var(--font-display); font-weight: 900; font-size: 38px; line-height: 0.9; text-align: center;
}

/* petal-cluster(5 重叠完美圆)· cover 气氛 */
.sk-petals { position: relative; width: 220px; height: 220px; flex: none; }
.sk-petal { position: absolute; border-radius: 50%; aspect-ratio: 1/1; }

/* dashed-rule · cassette 分隔 */
.sk-dashed { border: none; border-top: 1px dashed var(--ink); margin: 12px 0; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)────────── */
.sk-cover { position: relative; display: flex; flex-direction: column; gap: 36px; }
.sk-cover__top { display: flex; justify-content: space-between; align-items: flex-start; }
.sk-cover__display { max-width: 1700px; -webkit-text-stroke: 2px var(--paper); paint-order: stroke fill; }
.sk-cover__display em { color: var(--ink); -webkit-text-stroke: 2px var(--paper); paint-order: stroke fill; }
.sk-cover__lead { margin: 0; max-width: 1100px; }
.sk-cover__foot { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid var(--ink); padding-top: 18px; }
.sk-cover__byline { display: flex; gap: 32px; }

.sk-statement { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 40px; }
.sk-statement__box { background: var(--paper); border: 1.5px solid var(--ink); box-shadow: 8px 8px 0 var(--ink); padding: 36px 44px; max-width: 1500px; }
.sk-statement__anno { margin-top: 28px; }

.sk-metrics__head { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; border-bottom: 1.5px solid var(--ink); margin-bottom: 28px; }
.sk-metrics__grid { display: grid; gap: 24px; }
.sk-metric__body { padding: 20px 22px 22px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-metric__value { display: flex; align-items: baseline; gap: 0.2em; }
.sk-metric__delta { font-family: var(--font-ui); font-size: 0.34em; }
.sk-metric[data-delta="down"] .sk-metric__delta { color: var(--red); }

.sk-cards__head { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; border-bottom: 1.5px solid var(--ink); margin-bottom: 28px; }
.sk-cards__grid { display: grid; gap: 24px; }
.sk-cards__list { display: flex; flex-direction: column; gap: 18px; }
.sk-card__body { padding: 20px 24px 24px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.sk-card-row__body { padding: 22px 24px; display: grid; grid-template-columns: 90px 1fr auto; gap: 20px; align-items: baseline; }
.sk-card-row__metric { text-align: right; }
.sk-card-row__metric-l { margin-top: 6px; opacity: 0.75; }

.sk-closing { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 24px; }
.sk-closing__sub { margin: 0; max-width: 1000px; }
.sk-closing__cta { display: flex; gap: 24px; margin-top: 32px; }
.sk-cta { text-decoration: none; display: inline-block; font-family: var(--font-display); font-weight: 900; font-size: clamp(20px, 1.6vw, 26px); letter-spacing: 0.02em; text-transform: uppercase; }
.sk-cta[data-kind="primary"] { background: var(--red); color: var(--paper); padding: 18px 36px; }
.sk-cta[data-kind="secondary"] { border: 2px solid var(--ink); color: var(--ink); padding: 16px 34px; }

/* ── 兜底块的 sakura 重绘(prose/heading/quote/callout/table/compare/... 走兜底,
     这里把它们从"素模板圆角卡片"拉回 sakura 的 Big Shoulders + hard-offset + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title { font-family: var(--font-display); font-weight: 900; letter-spacing: -0.015em; }
.v32-prose-body, .v32-card-body, .v32-callout-body, .v32-compare-bullets, .v32-media-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 900; font-style: normal; color: var(--ink); }
.v32-quote-text em, .v32-quote-text::before { color: var(--red); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-quote, .v32-media-quote { border-radius: 0; }
.v32-callout, .v32-compare-col, .v32-card { border: 1.5px solid var(--ink); box-shadow: 6px 6px 0 var(--ink); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-ui); font-weight: 700; letter-spacing: 0.32em; text-transform: uppercase; }
.v32-seq-dot, .v32-quad-dot { border-radius: 50%; background: var(--red); }

/* present 舞台:cream 底 + 大内边距(旧 slide-inner 56px 64px 90px) */
[data-v32-mode="present"] .v32-slide-inner { padding: 56px 64px 90px; }
[data-v32-mode="present"] .sk-statement { justify-content: center; min-height: 60vh; }
[data-v32-mode="present"] .sk-closing { justify-content: center; min-height: 60vh; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;
// 字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

const CYCLE = ["r", "p", "o", "g", "b", "y"] as const;

// V32 S5 · petal-cluster(照搬旧 petalsCluster · 5 重叠圆)
function petals(style: string): string {
  const c = ["var(--red)", "var(--pink)", "var(--orange)", "var(--green)", "var(--blue)"];
  const spec = [
    [40, 0, 110], [100, 40, 100], [30, 110, 90], [130, 130, 80], [0, 50, 70],
  ];
  const dots = spec
    .map((s, i) => `<div class="sk-petal" style="background:${c[i]};left:${s[0]}px;top:${s[1]}px;width:${s[2]}px;"></div>`)
    .join("");
  return `<div class="sk-petals" style="${style}" aria-hidden="true">${dots}</div>`;
}

// cover ← 旧 renderCover(hero + petal-cluster + rosette seal + red stamp)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-micro-xl" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? ` <em ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</em>`
    : "";
  const lead = b.lead
    ? `<p class="t-body-emp sk-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="sk-cover__byline">${b.byline
        .map((x, j) => `<div class="t-micro" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "<div></div>";
  return `<section class="v32-block sk-cover" data-block-id="${b.id}">
  <div class="sk-cover__top">
    ${kicker}
    ${petals("position:absolute;top:0;right:0;z-index:2;transform:scale(0.7);")}
    <div class="sk-seal">26</div>
  </div>
  <h1 class="t-disp-hero sk-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  <div class="sk-cover__foot">
    ${byline}
    <div class="sk-stamp">限定版 LIMITED</div>
  </div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + hard-offset qbody-box + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-num-hero" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-micro-lg sk-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block sk-statement" data-block-id="${b.id}">
  ${big}
  <div class="sk-statement__box">
    <p class="t-disp-statement" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
    ${anno}
  </div>
</section>`;
};

// metrics ← 旧 renderStats(cassette 卡片 · 六色 topstrip · 首项红数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-disp-section" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="sk-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-body">${ctx.esc(m.hint)}</div>` : "";
      const color = i === 0 ? "var(--red)" : "var(--ink)";
      return `<div class="sk-card sk-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="sk-topstrip" data-c="${CYCLE[i % 6]}"></div>
      <div class="sk-metric__body">
        <div class="t-num-md sk-metric__value" style="color:${color};">${ctx.esc(m.value)}${delta}</div>
        <div class="t-micro" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
        ${hint}
        <hr class="sk-dashed">
        <div class="t-mono">METRIC · ${ctx.esc(m.label.slice(0, 12).toUpperCase())}</div>
      </div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block sk-metrics" data-block-id="${b.id}">
  <div class="sk-metrics__head">
    <div><div class="t-micro" style="margin-bottom:8px;">VITAL SIGNS</div>${title}</div>
  </div>
  <div class="sk-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 网格特性卡(旧 features)
//   layout=numbered/steps → 横排大条目(num | head+body | metric)(旧 diagnosis/proposal)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-micro" style="margin-bottom:8px;" ${ctx.edit(`${p}/kicker`, "眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-disp-section" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const head = `<div class="sk-cards__head"><div>${kicker}${title}</div><div class="t-micro-xl">${String(b.items.length).padStart(2, "0")}</div></div>`;

  if (b.layout === "grid") {
    const cols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = ctx.esc(c.num ?? `${String(i + 1).padStart(2, "0")}`);
        return `<article class="sk-card">
      <div class="sk-topstrip" data-c="${CYCLE[i % 6]}"></div>
      <div class="sk-card__body">
        <div class="t-mono">${num}</div>
        <div class="t-disp-card-name" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
      </div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block sk-cards" data-block-id="${b.id}" data-layout="grid">
  ${head}
  <div class="sk-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = ctx.esc(c.num ?? String(i + 1).padStart(2, "0"));
      const metric = c.metric
        ? `<div class="t-num-md" style="font-size:clamp(28px,2.4vw,44px);" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-micro sk-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-micro" style="opacity:0.75;">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="sk-card">
      <div class="sk-topstrip" data-c="${CYCLE[i % 6]}"></div>
      <div class="sk-card-row__body">
        <div class="t-num-md" style="font-size:clamp(40px,3.4vw,60px);">${num}</div>
        <div>
          <div class="t-ttl-row" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
          <div class="t-body" style="margin-top:6px;" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
        </div>
        <div class="sk-card-row__metric">${metric}</div>
      </div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block sk-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${head}
  <div class="sk-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(rosette seal END + red-stamp CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-micro-xl" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<p class="t-body-emp sk-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="sk-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="sk-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block sk-closing" data-block-id="${b.id}">
  <div class="sk-seal" style="width:160px;height:160px;font-size:52px;">END</div>
  ${kicker}
  <h2 class="t-disp-title" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const sakuraChromaV32: TemplateV32 = {
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

export default sakuraChromaV32;
export { sakuraChromaV32, meta, fonts, themeCss };
