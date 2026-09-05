/**
 * V32 S5 · Broadside 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/broadside.ts(旧 954 行,三入口 ~20 renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需
 *   1) themeCss:把 broadside 视觉 DNA(ink/cream/fire-orange token + t-* 排版
 *      + 单 Barlow / IBM Plex Mono chrome + hairline / slash bullet 气氛)搬过来,
 *      并把它映射到 --plain-* token 让"没覆盖的兜底块"自动吃到 ink-black 底 + fire accent;
 *   2) blocks:只覆盖有强视觉主张的块(cover/statement/closing 走 fire-orange 环境反色寄存器,
 *      metrics/cards 用 fire-orange 大数字 + hairline)。其余(prose/heading/quote/callout/table/
 *      compare/quadrant/chart/media/sequence/group)走兜底 renderer + 下面对 .v32-* 的重绘。
 *
 * DNA(照搬旧模板注释):
 *   - 二色 register:dark(ink-black + cream)/ orange(fire-orange + ink);永不 cream/white slide
 *   - 唯一 fire-orange #E85D26 · dark 上 accent · orange 上整个环境
 *   - 全 Barlow(400-900)做 display/heading/body — 不混 serif
 *   - IBM Plex Mono 只做 chrome:kicker/label/counter/slash;UPPERCASE 0.14em tracking
 *   - lowercase display(永不 UPPERCASE 大字)· 完全 flat · 0 阴影 0 圆角 · 1px hairline
 *   - bullet marker = orange "/" mono glyph
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "broadside",
  name: "Broadside",
  tagline:
    "Protest-poster broadside · 巨大 lowercase Barlow 900 + 单 fire-orange register · IBM Plex Mono UPPERCASE chrome · 完全 flat",
  scheme: "dark" as const,
  density: "low" as const,
  bestFor:
    "Manifesto decks · protest-style announcements · climate / advocacy briefings · SPACE10-flavored future reports · culture statements · zine-style think pieces",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Barlow:wght@400;600;700;800;900",
  "IBM Plex Mono:wght@400;500",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* /
// --font-body 让兜底块吃到 ink-black 底 + cream 字 + fire accent;再把关键 .v32-* 类
// 重绘成 broadside 观感(单 Barlow / 无圆角无阴影 / hairline / slash bullet)。
const themeCss = `
:root {
  /* ── broadside 原 token(照搬旧模板 :root)── */
  --ink-black: #111111;
  --ink-black-alt: #1A1A18;
  --fire-orange: #E85D26;
  --cream: #F0ECE5;
  --cream-muted: #888880;
  --cream-hint: #505048;
  --border-dark: #282826;
  --ink-on-orange-muted: rgba(17, 17, 17, 0.75);
  --ink-on-orange-hint: rgba(17, 17, 17, 0.55);
  --ink-on-orange-faint: rgba(17, 17, 17, 0.40);
  --ink-on-orange-border: rgba(17, 17, 17, 0.20);

  --font-display: 'Barlow', 'Noto Sans SC', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* ── 把 broadside 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得
     ink-black 底 + cream 字 + fire accent ──
     WCAG AA:cream(#F0ECE5) on ink-black(#111) ≈ 15:1;cream-muted(#888880) ≈ 5.2:1 ≥4.5 */
  --plain-bg: var(--ink-black);
  --plain-surface: var(--ink-black);
  --plain-surface-2: var(--ink-black-alt);
  --plain-text: var(--cream);
  --plain-text-mute: var(--cream-muted);
  --plain-text-faint: var(--cream-hint);
  --plain-border: var(--border-dark);
  --plain-border-strong: var(--fire-orange);
  --plain-accent: var(--fire-orange);
  --plain-accent-strong: var(--fire-orange);
  --plain-accent-bg: rgba(232, 93, 38, 0.08);
  --plain-success: var(--fire-orange);
  --plain-warn: var(--fire-orange);
  --plain-danger: var(--fire-orange);
  --plain-danger-bg: rgba(232, 93, 38, 0.08);

  --stage-bg: #000000;
  --slide-bg: var(--ink-black);
  --doc-page-bg: var(--ink-black);
  --doc-text: var(--cream);

  --font-body: var(--font-display);
  --v32-radius: 0px; /* broadside 铁律:零圆角 */
  --v32-gap: 0px;    /* broadside 用 hairline 而非 gap 分隔 */
}

/* ── broadside 排版工具类(照搬旧 t-* · block renderer 直接用)── */
.t-display { font-family: var(--font-display); font-weight: 900; font-size: clamp(120px, 13vw, 250px); line-height: 0.88; letter-spacing: -0.04em; color: var(--cream); text-transform: none; margin: 0; }
.t-h1 { font-family: var(--font-display); font-weight: 800; font-size: clamp(72px, 7.5vw, 144px); line-height: 0.9; letter-spacing: -0.03em; color: var(--cream); text-transform: none; margin: 0; }
.t-h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(44px, 4.5vw, 88px); line-height: 1.1; letter-spacing: -0.02em; color: var(--cream); text-transform: none; margin: 0; }
.t-h3 { font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, 2.8vw, 54px); line-height: 1.2; color: var(--cream); text-transform: none; margin: 0; }
.t-lead { font-family: var(--font-display); font-weight: 400; font-size: clamp(16px, 1.6vw, 30px); line-height: 1.5; color: var(--cream); }
.t-body { font-family: var(--font-display); font-weight: 400; font-size: clamp(13px, 1.2vw, 22px); line-height: 1.6; color: var(--cream); }
.t-label { font-family: var(--font-mono); font-weight: 500; font-size: clamp(11px, 0.72vw, 14px); line-height: 1; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fire-orange); }
.t-label-dim { font-family: var(--font-mono); font-weight: 500; font-size: clamp(11px, 0.72vw, 14px); line-height: 1; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cream-hint); }
.t-stat-value { font-family: var(--font-display); font-weight: 900; font-size: clamp(72px, 5.5vw, 110px); line-height: 1; letter-spacing: -0.04em; color: var(--fire-orange); margin: 0; text-transform: none; }

/* broadside 分隔件 · kicker rail(stub-rule + mono label)*/
.bs-stub { width: 36px; height: 2px; background: var(--fire-orange); display: inline-block; flex: none; }
.bs-kicker-rail { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }

/* ── 覆盖块:orange register(fire-orange 底 + ink 字)· cover/statement/closing ── */
.bs-orange { background: var(--fire-orange); color: var(--ink-black); position: relative; }
.bs-orange .t-display, .bs-orange .t-h1, .bs-orange .t-h2, .bs-orange .t-h3 { color: var(--ink-black); }
.bs-orange .t-lead { color: var(--ink-on-orange-muted); }
.bs-orange .t-label { color: var(--ink-on-orange-hint); }
.bs-orange .bs-stub { background: var(--ink-black); }

.bs-cover__display .bs-tail { display: block; margin-top: 0.05em; }
.bs-cover__lead { margin-top: 4vh; max-width: 60ch; }
.bs-cover__byline { display: flex; gap: 36px; margin-top: 5vh; flex-wrap: wrap; }

.bs-statement { display: flex; flex-direction: column; justify-content: center; }
.bs-statement__num { margin-bottom: 2vh; }
.bs-statement__text { max-width: 78%; }
.bs-statement__anno { display: flex; align-items: center; gap: 14px; margin-top: 5vh; }

/* metrics ← 旧 renderStats:stat-card top-hairline + fire 大数字 */
.bs-metrics__title { margin: 0 0 5vh; max-width: 80%; }
.bs-metrics__grid { display: grid; gap: 4vw; }
.bs-metric { border-top: 1px solid var(--border-dark); padding: 3vh 0 0; }
.bs-metric__value { display: flex; align-items: baseline; gap: 0.15em; }
.bs-metric__delta { font-size: 0.28em; font-family: var(--font-display); }
.bs-metric[data-delta="down"] .bs-metric__delta { color: var(--cream-hint); }
.bs-metric__label { margin-top: 1.5vh; }
.bs-metric__hint { margin-top: 1.5vh; }

/* cards ← 旧 renderDiagnosis(numbered/steps 横排)/ renderFeatures(grid)*/
.bs-cards__title { margin: 3vh 0 4vh; max-width: 78%; }
.bs-card-row { border-top: 1px solid var(--border-dark); padding: 3vh 0; display: grid; grid-template-columns: 100px 1fr 240px; gap: 4vw; align-items: baseline; }
.bs-card-row__num { font-size: clamp(48px, 4vw, 80px); }
.bs-card-row__head { margin-bottom: 1.5vh; }
.bs-card-row__metric { text-align: right; }
.bs-card-row__metric-v { font-size: clamp(36px, 3vw, 60px); }
.bs-card-row__metric-l { margin-top: 1vh; }
.bs-cards__grid { display: grid; gap: 4vh; }
.bs-card { display: flex; flex-direction: column; gap: 1.5vh; }
.bs-card__head { font-size: clamp(22px, 2vw, 38px); }

/* closing CTA(mono border pill · text-decoration none)*/
.bs-closing__sub { margin-top: 4vh; max-width: 60ch; }
.bs-closing__cta { display: flex; gap: 24px; margin-top: 5vh; }
.bs-cta { display: inline-block; text-decoration: none; font-family: var(--font-mono); font-weight: 500; font-size: clamp(11px, 0.72vw, 14px); letter-spacing: 0.14em; text-transform: uppercase; padding: 6px 14px; border: 1px solid var(--ink-black); color: var(--ink-black); }

/* ── 兜底块的 broadside 重绘(prose/heading/quote/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 broadside 的 flat + hairline + fire accent)── */
.v32-heading-text, .v32-h1, .v32-h2, .v32-h3,
.v32-cards-title, .v32-metrics-title, .v32-compare-title, .v32-table-title, .v32-seq-title, .v32-group-title,
.v32-media-title, .v32-chart-title, .v32-closing-display, .v32-cover-display {
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; text-transform: none; color: var(--cream);
}
.v32-prose-body, .v32-body, .v32-card-body, .v32-callout-body, .v32-media-body { font-family: var(--font-display); color: var(--cream); }
.v32-quote-text, .v32-media-quote blockquote { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; color: var(--cream); }
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-el, .v32-media-img, .v32-media-ph { border-radius: 0; box-shadow: none; }
.v32-kicker, .v32-cover-kicker, .v32-quote-attr { font-family: var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--fire-orange); }

/* slash bullet:所有兜底 li 用 orange "/" mono glyph(永不 disc)*/
.v32-compare-bullets, .v32-prose-body ul, .v32-callout-body ul { list-style: none; padding: 0; }
.v32-compare-bullets li, .v32-prose-body ul li, .v32-callout-body ul li { position: relative; padding-left: 32px; }
.v32-compare-bullets li::before, .v32-prose-body ul li::before, .v32-callout-body ul li::before {
  content: "/"; position: absolute; left: 0; top: 0; font-family: var(--font-mono); font-weight: 700; color: var(--fire-orange);
}

/* present 舞台:ink-black 底 + 大内边距(旧 slide-inner 是 5.5vh/5.5vw)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 5.5vh 5.5vw; }
[data-v32-mode="present"] .bs-cover, [data-v32-mode="present"] .bs-statement, [data-v32-mode="present"] .bs-closing {
  min-height: 100%; display: flex; flex-direction: column;
}
[data-v32-mode="present"] .bs-cover, [data-v32-mode="present"] .bs-closing { justify-content: flex-end; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string · 对齐 S2)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|features / renderClosing;字段名从旧 slide.xxx 改成 v32 block.xxx。
// ────────────────────────────────────────────────────────────

// cover ← 旧 renderCover(orange register · lowercase Barlow 900 大标题)
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bs-kicker-rail"><span class="bs-stub"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const tail = b.displayTail
    ? `<span class="bs-tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-lead bs-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="bs-cover__byline">${b.byline
        .map((x, j) => `<div class="t-label" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</div>`)
        .join("")}</div>`
    : "";
  return `<section class="v32-block bs-orange bs-cover" data-block-id="${b.id}">
  ${kicker}
  <h1 class="t-display bs-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(orange register · bigNumber + text + annotation)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-display bs-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<div class="bs-statement__anno"><span class="bs-stub"></span><span class="t-label" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span></div>`
    : "";
  return `<section class="v32-block bs-orange bs-statement" data-block-id="${b.id}">
  ${big}
  <h2 class="t-h1 bs-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</h2>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(dark register · stat-card top-hairline + fire 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2 bs-metrics__title" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 3);
  const items = b.items
    .slice(0, 6)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const delta = glyph ? `<span class="bs-metric__delta" aria-hidden="true">${glyph}</span>` : "";
      const hint = m.hint
        ? `<div class="t-label-dim bs-metric__hint" ${ctx.edit(`${p}/items/${i}/hint`, "说明")}>${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="bs-metric" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="t-stat-value bs-metric__value">${ctx.esc(m.value)}${delta}</div>
      <div class="t-body bs-metric__label" ${ctx.edit(`${p}/items/${i}/label`, "标签")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block bs-metrics" data-block-id="${b.id}">
  ${title}
  <div class="bs-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal(numbered/steps 横排)/ renderFeatures(grid)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bs-kicker-rail"><span class="bs-stub"></span><span class="t-label">${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2 bs-cards__title" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const items = b.items
      .slice(0, 3)
      .map(
        (c: CardItem, i: number) => `<div class="bs-card">
      <div class="t-h3 bs-card__head" ${ctx.edit(`${p}/items/${i}/head`, "特性标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "特性说明")}>${ctx.esc(c.body)}</div>
    </div>`,
      )
      .join("");
    return `<section class="v32-block bs-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="bs-cards__grid">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目(num | head+body | metric)
  const items = b.items
    .slice(0, 5)
    .map((c: CardItem, i: number) => {
      const metric = c.metric
        ? `<div class="t-stat-value bs-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label-dim bs-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<div class="t-label-dim">${ctx.esc(c.when)}</div>`
          : "";
      return `<div class="bs-card-row">
      <div class="t-stat-value bs-card-row__num">${ctx.esc(c.num ?? String(i + 1).padStart(2, "0"))}</div>
      <div>
        <div class="t-h3 bs-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="bs-card-row__metric">${metric}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block bs-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div>${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(orange register · mono border CTA)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div class="bs-kicker-rail"><span class="bs-stub"></span><span class="t-label" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span></div>`
    : "";
  const sub = b.sub
    ? `<p class="t-lead bs-closing__sub" ${ctx.edit(`${p}/sub`, "副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = c.href ? ` href="${ctx.esc(c.href)}"` : "";
    return `<a class="bs-cta" data-kind="${kind}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="bs-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block bs-orange bs-closing" data-block-id="${b.id}">
  ${kicker}
  <h2 class="t-display bs-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
  ${sub}
  ${cta}
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const broadsideV32: TemplateV32 = {
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

export default broadsideV32;
export { broadsideV32, meta, fonts, themeCss };
