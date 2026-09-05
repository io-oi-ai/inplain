/**
 * V32 S5 · Scatterbrain 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/scatterbrain.ts(旧 1118 行,三入口 ~14 slide + doc/sheet renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 scatterbrain 视觉 DNA(warm paper bg + grain + post-it sticky + doodle
 *      + Shrikhand/Zilla Slab/Caveat 三字体)搬过来,并把品牌色映射到 --plain-* token,
 *      让"没覆盖的兜底块"(prose/quote/callout/table/compare/sequence...)自动获得米色便签底;
 *   2) blocks:只覆盖 scatterbrain 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *
 * DNA(照搬旧模板注释):warm paper/cork 底 + grain 4% + 多色 sticky note(旋转 + 红图钉 + 半透胶带)
 * + soft drop shadow + 永不方角 + Shrikhand loud serif / Zilla Slab body / Caveat 手写体。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "scatterbrain",
  name: "Scatterbrain",
  tagline:
    "Post-it 创意工坊 · Shrikhand 装饰 serif + Caveat 手写体 + cork board + 多色 sticky note",
  scheme: "light" as const,
  density: "both" as const,
  bestFor:
    "Brainstorming decks · creative workshop pitches · indie-studio mood boards · ideation playback · culture / values decks",
};

// V32 S5 · fonts:搬旧 fontLinks 三字体
const fonts = fontLinks([
  "Shrikhand",
  "Zilla Slab:wght@300;400;500;600;700",
  "Caveat:wght@400;500;600;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token + 排版类原样搬,
// 并把 scatterbrain 色映射到 --plain-* 让兜底块吃到暖纸底 + sticky 观感。
const themeCss = `
:root {
  /* ── scatterbrain 原 token(照搬旧模板 :root)── */
  --yellow: #ffe066;
  --yellow-deep: #ffd43b;
  --blue: #a5d8ff;
  --blue-deep: #74c0fc;
  --pink: #ffc9c9;
  --pink-deep: #ff9f9f;
  --green: #b2f2bb;
  --green-deep: #8ce99a;
  --orange: #ffcc80;
  --purple: #d0bfff;
  --cream: #faf8f3;
  --paper: #f7f5f0;
  --ink: #2d2a26;
  --ink-light: #5c5750;
  --shadow: rgba(45, 42, 38, 0.15);
  --shadow-deep: rgba(45, 42, 38, 0.25);

  --font-display: 'Shrikhand', 'Georgia', cursive;
  --font-ui: 'Zilla Slab', 'Georgia', serif;
  --font-script: 'Caveat', 'Bradley Hand', cursive;

  /* ── 把 scatterbrain 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得暖纸底 ──
     WCAG AA:ink(#2d2a26) on paper(#f7f5f0) 对比≈12:1;ink-light 仍 ≥6:1 */
  --plain-bg: var(--paper);
  --plain-surface: #fff;
  --plain-surface-2: var(--cream);
  --plain-text: var(--ink);
  --plain-text-mute: var(--ink-light);
  --plain-text-faint: color-mix(in oklab, var(--ink) 55%, var(--paper));
  --plain-border: var(--ink);
  --plain-border-strong: var(--ink);
  --plain-accent: var(--ink);
  --plain-accent-strong: var(--ink);
  --plain-accent-bg: color-mix(in oklab, var(--yellow) 40%, var(--paper) 60%);
  --plain-success: #2f9e44;
  --plain-warn: #e8590c;
  --plain-danger: #c92a2a;
  --plain-danger-bg: color-mix(in oklab, var(--pink) 40%, var(--paper) 60%);

  --stage-bg: #2a2520;
  --slide-bg: var(--paper);
  --doc-page-bg: var(--paper);
  --doc-text: var(--ink);

  --font-body: var(--font-ui);
  --v32-radius: 4px;  /* scatterbrain 便签是软直角,保留极小圆角 */
  --v32-gap: 32px;    /* 便签之间留白 */
}

/* ── 暖纸底 + grain overlay(照搬旧 body/slide bg-warm)── */
[data-v32-mode] {
  background:
    radial-gradient(ellipse at 20% 30%, rgba(255, 224, 102, 0.35) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(165, 216, 255, 0.28) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 90%, rgba(255, 201, 201, 0.25) 0%, transparent 50%),
    linear-gradient(135deg, var(--cream) 0%, var(--paper) 100%);
}
[data-v32-mode]::after {
  content: "";
  position: fixed; inset: 0;
  pointer-events: none; z-index: 9999;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='256' height='256' filter='url(%23n)' opacity='0.5'/></svg>");
  opacity: 0.04; mix-blend-mode: multiply;
}

/* ── scatterbrain 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display-hero { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(6.2vw, 11vh), 144px); line-height: 1.1; letter-spacing: 0.02em; color: var(--ink); }
.t-statement { font-family: var(--font-display); font-weight: 400; font-size: clamp(48px, min(5vw, 9vh), 112px); line-height: 1.1; letter-spacing: 0.02em; color: var(--ink); }
.t-headline { font-family: var(--font-display); font-weight: 400; font-size: clamp(40px, min(3.8vw, 7vh), 80px); line-height: 1.1; letter-spacing: 0.02em; color: var(--ink); }
.t-title { font-family: var(--font-display); font-weight: 400; font-size: clamp(24px, min(2.4vw, 4vh), 48px); line-height: 1.1; letter-spacing: 0.02em; color: var(--ink); }
.t-body { font-family: var(--font-ui); font-weight: 400; font-size: clamp(15px, 1.1vw, 22px); line-height: 1.7; color: var(--ink-light); }
.t-body-em { font-family: var(--font-ui); font-weight: 500; font-size: clamp(15px, 1.1vw, 22px); line-height: 1.6; color: var(--ink); }
.t-script { font-family: var(--font-script); font-weight: 500; font-size: clamp(22px, 1.8vw, 36px); line-height: 1.3; color: var(--ink); }
.t-script-sm { font-family: var(--font-script); font-weight: 500; font-size: clamp(18px, 1.4vw, 28px); line-height: 1.2; color: var(--ink); }
.t-eyebrow { font-family: var(--font-script); font-weight: 400; font-size: 16px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
.t-stat-value { font-family: var(--font-display); font-weight: 400; font-size: clamp(56px, min(6vw, 10vh), 120px); line-height: 1; color: var(--ink); }

/* ── Post-it 便签(照搬旧 .post-it + 颜色 + 图钉/胶带/旋转)── */
.post-it { position: relative; padding: 36px 32px; box-shadow: 2px 3px 15px var(--shadow), 0 1px 3px var(--shadow-deep); background: linear-gradient(135deg, var(--yellow) 0%, var(--yellow-deep) 100%); }
.post-it.c-yellow { background: linear-gradient(135deg, var(--yellow) 0%, var(--yellow-deep) 100%); }
.post-it.c-blue { background: linear-gradient(135deg, var(--blue) 0%, var(--blue-deep) 100%); }
.post-it.c-pink { background: linear-gradient(135deg, var(--pink) 0%, var(--pink-deep) 100%); }
.post-it.c-green { background: linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%); }
.post-it.c-orange { background: var(--orange); }
.post-it.c-purple { background: var(--purple); }
.post-it.c-white { background: #fff; border: 2px solid var(--ink); }
.post-it.pinned::before { content: ""; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a); box-shadow: 0 2px 4px var(--shadow-deep), inset -2px -2px 4px rgba(0,0,0,0.2); z-index: 2; }
.post-it.taped::after { content: ""; position: absolute; top: -16px; left: 50%; transform: translateX(-50%) rotate(-2deg); width: 90px; height: 26px; background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(255, 255, 255, 0.4); z-index: 1; }
.rot-l1 { transform: rotate(-1.5deg); }
.rot-l2 { transform: rotate(-3deg); }
.rot-r1 { transform: rotate(1.5deg); }
.rot-r2 { transform: rotate(3deg); }

.feature-icon { width: 60px; height: 60px; border: 3px solid var(--ink); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 400; font-size: 26px; color: var(--ink); background: rgba(255, 255, 255, 0.4); flex: none; }

/* ── 覆盖块自定义 class(由下面 block renderer 产出)── */
.sb-cover { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 40px; }
.sb-cover__note { max-width: 1100px; padding: 64px 88px; }
.sb-cover__tail { display: block; margin-top: 0.2em; font-size: 1.4em; }
.sb-cover__lead { margin: 32px 0 0; }
.sb-cover__byline { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
.sb-cover__byline .post-it { padding: 14px 22px; }

.sb-statement { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 36px; }
.sb-statement__num { padding: 40px 56px; }
.sb-statement__note { max-width: 1100px; padding: 56px 80px; }
.sb-statement__anno { margin: 0; }

.sb-metrics__grid { display: grid; gap: var(--v32-gap); }
.sb-metric { padding: 32px 28px; }
.sb-metric__label { margin-top: 12px; }
.sb-metric__hint { margin-top: 10px; }

.sb-cards__list { display: flex; flex-direction: column; gap: 28px; }
.sb-card-row { display: grid; grid-template-columns: 80px 1fr 200px; gap: 24px; padding: 28px 32px; align-items: center; }
.sb-card-row__body { max-width: 700px; }
.sb-card-row__metric { text-align: right; }
.sb-card-row__metric-l { margin-top: 4px; }
.sb-cards__grid { display: grid; gap: var(--v32-gap); }
.sb-card { padding: 32px 28px; }
.sb-card__head { margin: 18px 0 12px; }

.sb-closing { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 40px; }
.sb-closing__note { max-width: 1100px; padding: 64px 88px; }
.sb-closing__sub { margin: 28px 0 0; }
.sb-closing__cta { display: flex; gap: 32px; flex-wrap: wrap; justify-content: center; }
.sb-cta { padding: 18px 32px; text-decoration: none; display: inline-block; }

/* ── 兜底块的 scatterbrain 重绘(prose/heading/quote/callout/table/compare/sequence 走兜底,
     这里给它们套上 sticky-note 底 + serif/handwritten 字体,拉回 scatterbrain 观感)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em;
}
.v32-prose-body, .v32-callout-body, .v32-media-body { font-family: var(--font-ui); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-style: normal; }
.v32-quote-attr, .v32-media-quote figcaption, .v32-kicker, .v32-cover-kicker,
.v32-seq-when, .v32-card-when { font-family: var(--font-script); }
.v32-callout, .v32-quote, .v32-metric, .v32-card, .v32-compare-col, .v32-table-scroll {
  box-shadow: 2px 3px 15px var(--shadow); border-radius: var(--v32-radius);
}
.v32-callout { background: var(--plain-surface); }
.v32-callout[data-tone="info"] { background: linear-gradient(135deg, var(--blue) 0%, var(--blue-deep) 100%); }
.v32-callout[data-tone="ok"] { background: linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%); }
.v32-callout[data-tone="warn"] { background: var(--orange); }
.v32-callout[data-tone="danger"] { background: linear-gradient(135deg, var(--pink) 0%, var(--pink-deep) 100%); }
.v32-quote { background: linear-gradient(135deg, var(--pink) 0%, var(--pink-deep) 100%); padding: 36px; }
.v32-table-el th { background: var(--yellow); font-family: var(--font-display); font-weight: 400; }

/* present 舞台:大内边距(旧 slide-inner 是 80px)· 覆盖块自己居中撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 80px 80px 100px; display: flex; flex-direction: column; justify-content: center; }
[data-v32-mode="present"] .sb-metrics__grid { grid-template-columns: repeat(var(--sb-cols, 4), 1fr); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名对齐 v32 schema。
// ────────────────────────────────────────────────────────────

const POSTIT = ["yellow", "blue", "pink", "green", "orange", "purple"];
const ROT = ["rot-l1", "rot-r1", "rot-l2", "rot-r2"];
// V32 S5 · 便签配色/旋转按下标轮换(对齐旧 postitClass)
const postit = (i: number) => `c-${POSTIT[i % POSTIT.length]} ${ROT[i % ROT.length]}`;

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-eyebrow" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const tail = b.displayTail
    ? `<span class="t-script sb-cover__tail" ${ctx.edit(`${p}/displayTail`, "副标题")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-script sb-cover__lead" ${ctx.edit(`${p}/lead`, "引言")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="sb-cover__byline">${b.byline
        .map((x, j) => `<div class="post-it ${postit(j + 2)}"><div class="t-script-sm" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div></div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block sb-cover" data-block-id="${b.id}">
  ${kicker}
  <div class="post-it pinned taped c-yellow rot-l2 sb-cover__note">
    <h1 class="t-display-hero" style="margin:0;" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}${tail}</h1>
    ${lead}
  </div>
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber 便签 + text 大字 + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="post-it pinned c-orange rot-r2 sb-statement__num"><div class="t-stat-value" style="margin:0;" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div></div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-script sb-statement__anno">— <span ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block sb-statement" data-block-id="${b.id}">
  ${big}
  <div class="post-it pinned taped c-yellow rot-l1 sb-statement__note">
    <p class="t-statement" style="margin:0;" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  </div>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(多色 sticky note 网格 · Shrikhand 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const cols = Math.min(b.items.length || 1, 4);
  const title = b.title
    ? `<div class="post-it pinned taped c-white rot-l1" style="padding:24px 36px; align-self:flex-start; margin-bottom:40px;"><h2 class="t-headline" style="margin:0;" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2></div>`
    : "";
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? ` <span aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-script-sm sb-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="post-it pinned ${postit(i)} sb-metric">
      <div class="t-stat-value" style="margin:0;">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body-em sb-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block sb-metrics" data-block-id="${b.id}">
  ${title}
  <div class="sb-metrics__grid" style="--sb-cols:${cols}; grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid       → 网格特性便签(旧 features)
//   layout=numbered/steps → 横排大条目(feature-icon | head+body | metric/when)(旧 diagnosis/proposal)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-eyebrow" style="margin-bottom:18px;">${ctx.esc(b.kicker)}</div>`
    : "";
  const title = b.title
    ? `<div class="post-it pinned taped c-white rot-l1" style="padding:24px 40px; align-self:flex-start; margin-bottom:40px;"><h2 class="t-headline" style="margin:0;" ${ctx.edit(`${p}/title`, "标题")}>${ctx.esc(b.title)}</h2></div>`
    : "";

  if (b.layout === "grid") {
    const gcols = b.items.length <= 3 ? b.items.length || 1 : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        const num = c.num ?? String(i + 1).padStart(2, "0");
        return `<div class="post-it pinned ${postit(i)} sb-card">
      <div class="feature-icon">${ctx.esc(num)}</div>
      <div class="t-title sb-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block sb-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="sb-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → 横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = c.num ?? String(i + 1).padStart(2, "0");
      const right = c.metric
        ? `<div class="t-stat-value" style="margin:0; font-size:56px;" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-script-sm sb-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-script-sm" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="post-it pinned ${postit(i)} sb-card-row">
      <div class="feature-icon">${ctx.esc(num)}</div>
      <div>
        <div class="t-title" style="margin:0 0 8px;" ${ctx.edit(`${p}/items/${i}/head`, "标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body sb-card-row__body" ${ctx.edit(`${p}/items/${i}/body`, "正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="sb-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block sb-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="sb-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(黄便签大标题 + green/blue CTA 便签)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-eyebrow" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-script sb-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary", cls: string) => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="post-it pinned ${cls} sb-cta"${href}><span class="t-script" style="font-size:26px;">${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</span></a>`;
  };
  const cta = b.cta
    ? `<div class="sb-closing__cta">${btn("primary", "c-green rot-r1")}${btn("secondary", "c-blue rot-l1")}</div>`
    : "";
  return `<section class="v32-block sb-closing" data-block-id="${b.id}">
  ${kicker}
  <div class="post-it pinned taped c-yellow rot-l2 sb-closing__note">
    <h2 class="t-display-hero" style="margin:0;" ${ctx.edit(`${p}/display`, "标题")}>${ctx.esc(b.display)}</h2>
    ${sub}
  </div>
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const scatterbrainV32: TemplateV32 = {
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

export default scatterbrainV32;
export { scatterbrainV32, meta, fonts, themeCss };
