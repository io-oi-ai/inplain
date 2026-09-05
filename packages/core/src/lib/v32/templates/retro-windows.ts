/**
 * V32 S5 · Retro Windows 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/retro-windows.ts(旧 959 行,三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 Win9x 视觉 DNA(button-face token + bevel + t-* 排版 + CRT scanline)
 *      搬过来,并把 retro 色映射到 --plain-* token 让"没覆盖的兜底块"自动吃到底色 + bevel;
 *   2) blocks:只覆盖 retro 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/quadrant/chart/media/sequence/group)
 *      走兜底 renderer,靠下面 themeCss 把 .v32-* 从"素模板圆角卡片"拉成 group-box bevel 观感。
 *
 * DNA(照搬旧模板注释):Win95/98 desktop-OS · button-face 灰底(#d4d0c8)+ navy 标题
 * + white/black 双向 bevel illusion + sunken group-box + MS Sans Serif 系统 stack
 * + 固定 pixel 字号 + 0 圆角 0 模糊阴影 + CRT scanline overlay + 状态色语义。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "retro-windows",
  name: "Retro Windows",
  tagline:
    "Win9x desktop-OS · bevel chrome + navy titlebar + MS Sans Serif · CRT scanline overlay",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Nostalgic product dashboards · dev tool decks · functional KPI screens · indie game studio decks · retro-tech announcements",
};

// V32 S5 · fonts:搬旧 FONTS(Press Start 2P / VT323 / Noto Sans SC · Latin 走 system stack)
const fonts = fontLinks([
  "Press Start 2P",
  "VT323",
  "Noto Sans SC:wght@400;500;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 retro 底色 + bevel;再把关键 .v32-* 类重绘成 group-box 观感。
const themeCss = `
:root {
  /* ── retro 原 token(照搬旧模板 :root)── */
  --bg-gray: #c0c0c0;
  --bg-light: #d4d0c8;
  --bg-dark: #808080;
  --white: #ffffff;
  --black: #000000;
  --text-dark: #222222;
  --text-gray: #555555;
  --navy: #000080;
  --blue-bright: #0000a0;
  --green-retro: #008000;
  --red-retro: #800000;
  --yellow-retro: #808000;
  --cyan-retro: #008080;

  --font-stack: 'MS Sans Serif', 'Segoe UI', Tahoma, Geneva, Verdana, 'Noto Sans SC', sans-serif;
  --font-pixel: 'Press Start 2P', cursive;
  --font-term: 'VT323', monospace;

  /* ── 把 retro 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 button-face 底 + navy 强调 ──
     WCAG AA:text-dark(#222) on bg-light(#d4d0c8) ≈9:1;navy(#000080) on bg-light ≈8:1;
     text-gray(#555) on bg-light ≈4.6:1 均达标 */
  --plain-bg: var(--bg-dark);
  --plain-surface: var(--bg-light);
  --plain-surface-2: var(--bg-gray);
  --plain-text: var(--text-dark);
  --plain-text-mute: var(--text-gray);
  --plain-text-faint: var(--text-gray);
  --plain-border: #404040;
  --plain-border-strong: var(--black);
  --plain-accent: var(--navy);
  --plain-accent-strong: var(--blue-bright);
  --plain-accent-bg: var(--white);
  --plain-success: var(--green-retro);
  --plain-warn: var(--yellow-retro);
  --plain-danger: var(--red-retro);
  --plain-danger-bg: var(--white);

  --stage-bg: #008080;
  --slide-bg: var(--bg-dark);
  --doc-page-bg: var(--bg-dark);
  --doc-text: var(--text-dark);

  --font-body: var(--font-stack);
  --v32-radius: 0px; /* retro 铁律:零圆角 */
  --v32-gap: 14px;   /* group-box 之间的窗口内间隙 */
}

/* ── retro 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-xl { font-family: var(--font-stack); font-size: clamp(28px, 3.4vw, 44px); font-weight: 700; line-height: 1.2; color: var(--navy); }
.t-lg { font-family: var(--font-stack); font-size: clamp(20px, 2vw, 26px); font-weight: 700; line-height: 1.3; color: var(--navy); }
.t-md { font-family: var(--font-stack); font-size: clamp(15px, 1.2vw, 18px); font-weight: 400; line-height: 1.6; color: var(--text-dark); }
.t-body { font-family: var(--font-stack); font-size: clamp(14px, 1vw, 16px); font-weight: 400; line-height: 1.5; color: var(--text-dark); }
.t-sm { font-family: var(--font-stack); font-size: 14px; font-weight: 400; line-height: 1.5; color: var(--text-dark); }
.t-xs { font-family: var(--font-stack); font-size: 12px; font-weight: 400; line-height: 1.4; color: var(--text-gray); }
.t-metric { font-family: var(--font-stack); font-size: clamp(24px, 2.6vw, 32px); font-weight: 700; line-height: 1.1; color: var(--navy); }
.t-metric-lg { font-family: var(--font-stack); font-size: clamp(40px, 5vw, 64px); font-weight: 700; line-height: 1.0; color: var(--navy); }
.t-pixel { font-family: var(--font-pixel); font-size: 14px; line-height: 1.8; color: var(--navy); }

/* ── 双向 bevel illusion(retro 招牌观感)── */
.rw-raised {
  border-top: 2px solid var(--white); border-left: 2px solid var(--white);
  border-right: 2px solid var(--black); border-bottom: 2px solid var(--black);
  background: var(--bg-light);
}
.rw-sunken {
  border-top: 2px solid #404040; border-left: 2px solid #404040;
  border-right: 2px solid var(--white); border-bottom: 2px solid var(--white);
}

/* ── group-box(sunken + notched title)· 覆盖块用 ── */
.rw-group {
  position: relative;
  border-top: 2px solid #404040; border-left: 2px solid #404040;
  border-right: 2px solid var(--white); border-bottom: 2px solid var(--white);
  padding: 26px 20px 18px;
  background: var(--bg-light);
  margin-top: 12px;
}
.rw-group-title {
  position: absolute; top: -10px; left: 14px;
  background: var(--bg-light); padding: 0 10px;
  font-family: var(--font-stack); font-size: 13px; font-weight: 700; line-height: 1;
  color: var(--text-dark);
}
.btn-retro {
  display: inline-block; background: var(--bg-light);
  border-top: 2px solid var(--white); border-left: 2px solid var(--white);
  border-right: 2px solid var(--black); border-bottom: 2px solid var(--black);
  padding: 8px 28px; font-family: var(--font-stack); font-size: 14px; font-weight: 400;
  color: var(--text-dark); text-decoration: none;
}
.hr-retro { border: none; border-top: 1px solid #404040; border-bottom: 1px solid var(--white); margin: 14px 0; }
.status-ok { color: var(--green-retro); font-weight: 700; }
.status-warn { color: var(--red-retro); font-weight: 700; }

/* ── 覆盖块(自定义 class · 由下面 block renderer 产出)── */
.rw-cover { text-align: center; }
.rw-cover__kicker { margin-bottom: 24px; }
.rw-cover__display { margin: 0; max-width: 1500px; }
.rw-cover__lead { margin: 28px auto 0; max-width: 1000px; }
.rw-cover__byline { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; margin-top: 20px; }
.rw-cover__btns { display: flex; gap: 14px; justify-content: center; margin-top: 32px; }

.rw-statement__num { margin-bottom: 18px; }
.rw-statement__text { margin: 0; max-width: 24ch; }
.rw-statement__anno { margin-top: 28px; color: var(--text-gray); }

.rw-metrics__grid { display: grid; gap: var(--v32-gap); }
.rw-metric { display: flex; flex-direction: column; gap: 8px; }
.rw-metric__hint { margin-top: 4px; }

.rw-cards__grid { display: grid; gap: var(--v32-gap); }
.rw-card__head { font-weight: 700; color: var(--navy); }
.rw-card__body { margin-top: 8px; }
.rw-card__metric { text-align: right; }

.rw-closing { text-align: center; }
.rw-closing__glyph { font-size: 48px; margin-bottom: 24px; }
.rw-closing__display { margin: 0; max-width: 1400px; }
.rw-closing__sub { margin: 24px auto 0; max-width: 900px; }
.rw-closing__cta { display: flex; gap: 14px; justify-content: center; margin-top: 8px; }

/* ── 兜底块的 retro 重绘(prose/heading/quote/callout/table/compare 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 group-box bevel + MS Sans Serif + 无圆角)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-media-title { font-family: var(--font-stack); font-weight: 700; color: var(--navy); }
.v32-prose-body, .v32-card-body, .v32-callout-body, .v32-media-body { font-family: var(--font-stack); }
.v32-quote-text { font-family: var(--font-stack); font-style: italic; }
/* 素模板圆角卡片 → retro sunken/raised bevel */
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-chart, .v32-quote {
  border-radius: 0 !important;
  box-shadow: none;
  border-top: 2px solid #404040; border-left: 2px solid #404040;
  border-right: 2px solid var(--white); border-bottom: 2px solid var(--white);
  background: var(--bg-light);
}
.v32-callout-title { color: var(--navy); }
.v32-kicker, .v32-cover-kicker { font-family: var(--font-pixel); font-size: 13px; letter-spacing: 0; text-transform: uppercase; color: var(--navy); }
/* 兜底 table 拉成 retro-table 观感 */
.v32-table-el th { background: var(--bg-gray); border: 1px solid #404040; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dark); font-weight: 700; }
.v32-table-el td { background: var(--white); border: 1px solid var(--bg-gray); color: var(--text-dark); }
.v32-cta[data-kind="primary"], .v32-cta[data-kind="secondary"] {
  background: var(--bg-light); color: var(--text-dark);
  border-top: 2px solid var(--white); border-left: 2px solid var(--white);
  border-right: 2px solid var(--black); border-bottom: 2px solid var(--black);
  border-radius: 0;
}

/* present 舞台:button-face 底 + CRT scanline overlay(旧 slide::after)+ 大内边距 */
[data-v32-mode="present"] .slide { background: var(--bg-light); }
[data-v32-mode="present"] .v32-slide-inner { padding: 56px 64px 68px; position: relative; }
[data-v32-mode="present"] .deck-stage::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 9999;
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px);
}
[data-v32-mode="present"] .rw-cover__display { font-size: clamp(40px, 5vw, 64px); }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S3)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features|proposal / renderClosing;字段从旧 slide.xxx → v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(居中窗口内容 + OK/Help 按钮)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = `<div class="t-pixel rw-cover__kicker" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker ?? "PLAIN OS 9.5")}</div>`;
  const tail = b.displayTail ? ` ${ctx.esc(b.displayTail)}` : "";
  const lead = b.lead
    ? `<p class="t-md rw-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="rw-cover__byline">${b.byline
        .map((x, j) => `<div class="t-sm" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block rw-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-xl rw-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  <div class="hr-retro" style="width:60%;margin:32px auto;"></div>
  ${byline}
  <div class="rw-cover__btns"><a class="btn-retro">OK</a><a class="btn-retro">Help</a></div>
</section>`;
};

// statement ← 旧 renderHeroQuestion(group-box + bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-metric-lg rw-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="t-md rw-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>&gt; ${ctx.esc(b.annotation)}</div>`
    : "";
  return `<section class="v32-block rw-statement" data-block-id="${b.id}">
  <div class="rw-group">
    <div class="rw-group-title">! IMPORTANT</div>
    ${big}
    <p class="t-xl rw-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
    ${anno}
  </div>
</section>`;
};

// metrics ← 旧 renderStats(group-box 网格 · navy 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-lg" style="margin:0 0 6px;" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const cls = m.delta === "down" ? "status-warn" : "status-ok";
      const delta = glyph ? `<span class="${cls}" aria-hidden="true"> ${glyph}</span>` : "";
      const hint = m.hint ? `<div class="t-xs rw-metric__hint">${ctx.esc(m.hint)}</div>` : "";
      return `<div class="rw-group rw-metric">
      <div class="rw-group-title" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label.toUpperCase())}</div>
      <div class="t-metric">${ctx.esc(m.value)}${delta}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block rw-metrics" data-block-id="${b.id}">
  ${title}
  <div class="rw-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when)· 旧 diagnosis/proposal
//   layout=grid           → group-box 网格特性卡 · 旧 features
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-pixel" style="font-size:14px;margin-bottom:12px;">${ctx.esc(b.kicker.toUpperCase())}</div>`
    : "";
  const title = b.title
    ? `<h2 class="t-lg" style="margin:0 0 16px;" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const gcols = Math.min(Math.ceil((b.items.length || 1) / 2), 3);
    const items = b.items
      .map((c: CardItem, i: number) => {
        const label = (c.num ?? c.head.slice(0, 20)).toUpperCase();
        return `<div class="rw-group">
      <div class="rw-group-title">${ctx.esc(label)}</div>
      <div class="t-md rw-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body rw-card__body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </div>`;
      })
      .join("");
    return `<section class="v32-block rw-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="rw-cards__grid" style="grid-template-columns: repeat(${gcols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis/proposal 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = ctx.esc(c.num ?? `STEP ${i + 1}`);
      const aside = c.metric
        ? `<div class="rw-card__metric"><b class="t-metric" style="font-size:22px;" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</b>${c.metricLabel ? `<div class="t-xs">${ctx.esc(c.metricLabel)}</div>` : ""}</div>`
        : c.when
          ? `<div class="t-sm status-ok" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="rw-group">
      <div class="rw-group-title">${num}</div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:baseline;">
        <div>
          <b class="t-md rw-card__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</b>
          <div class="t-body rw-card__body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
        </div>
        ${aside}
      </div>
    </div>`;
    })
    .join("");
  const twoCol = b.items.length > 3;
  return `<section class="v32-block rw-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="rw-cards__grid" style="grid-template-columns: repeat(${twoCol ? 2 : 1}, 1fr);">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(hourglass glyph + navy 标题 + retro 按钮)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="t-pixel" style="font-size:18px;margin-bottom:24px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker.toUpperCase())}</div>`
    : "";
  const sub = b.sub
    ? `<div class="t-md rw-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</div>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    const weight = kind === "primary" ? "font-weight:700;" : "";
    return `<a class="btn-retro" style="padding:10px 36px;${weight}"${href}>${ctx.esc(c.label)}</a>`;
  };
  const cta = b.cta ? `<div class="rw-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block rw-closing" data-block-id="${b.id}">
  <div class="rw-closing__glyph" aria-hidden="true">⌛</div>
  ${kicker}
  <h2 class="t-xl rw-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  <div class="hr-retro" style="width:60%;margin:32px auto;"></div>
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const retroWindowsV32: TemplateV32 = {
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

export default retroWindowsV32;
export { retroWindowsV32, meta, fonts, themeCss };
