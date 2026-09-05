/**
 * V32 S5 · BlockFrame 模板(从 v31 迁移到 TemplateV32 贴片格式)
 *
 * 迁移自 src/lib/v31/templates/block-frame.ts(旧 970 行,三入口 25+ renderer)。
 * V32 模式:一份 block DOM,present/report 只在 CSS 层不同 → 模板只需:
 *   1) themeCss:把 BlockFrame 的视觉 DNA(5 色糖果 pastel + 4px 黑边 + 8px hard
 *      offset shadow + Inter 900 uppercase display + pill 段眉 + 装饰库)搬过来,
 *      并把 candy 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 sticker-book 观感;
 *   2) blocks:只覆盖 BlockFrame 有强视觉主张的块(cover/statement/metrics/cards/closing)。
 *      其余(prose/heading/quote/callout/table/compare/sequence/quadrant/chart/media/group)
 *      走兜底 renderer + 下面 themeCss 对 .v32-* 的重绘(黑边卡 / hard shadow / 无圆角)。
 *
 * DNA(照搬旧模板注释):4px solid black + 8px hard offset shadow(0 blur)· 五色 saturated
 * 糖果 pastel(pink/blue/green/yellow/cream)· off-white canvas · 黑关闭面 + 12px yellow shadow
 * · Inter 800-900 UPPERCASE 负字距 display · Space Grotesk 600 UPPERCASE tracking label
 * · 倾斜 ±deg 装饰签名 · pill 段眉 · star-burst / stripe / list-num 装饰库 · 0 圆角。
 */
import type { TemplateV32, BlockRenderer } from "./types";
import type { Block, Mark, CardItem } from "../content/schema";
import { fontLinks } from "../render/util";

// V32 S5 · meta:直接搬旧 META
const meta = {
  slug: "block-frame",
  name: "BlockFrame",
  tagline:
    "极繁 neobrutalist · 4px 黑边 + 8px hard offset shadow + 5 色糖果 pastel · 倾斜装饰 + 段眉 pill · sticker book 能量",
  scheme: "light" as const,
  density: "high" as const,
  bestFor:
    "Maker / community / product launches · zine-style decks · gen-Z brand showcases · workshop announcements · playful manifestos",
};

// V32 S5 · fonts:搬旧 fontLinks 两字体
const fonts = fontLinks([
  "Inter:wght@400;500;700;800;900",
  "Space Grotesk:wght@400;500;600;700",
]);

// V32 S5 · themeCss = 模板 DNA。旧 :root token 原样搬,并 override --plain-* 让兜底块吃到
// BlockFrame 底色(off-white canvas + 黑边卡 + hard shadow),再重绘关键 .v32-* 与覆盖块 class。
const themeCss = `
:root {
  /* ── BlockFrame 原 token(照搬旧模板 :root)── */
  --black: #000000;
  --white: #FFFFFF;
  --offwhite: #FFFDF5;
  --pink: #FE90E8;
  --blue: #C0F7FE;
  --green: #99E885;
  --yellow: #F7CB46;
  --cream: #FFDC8B;

  --shadow-d: 8px 8px 0 var(--black);
  --shadow-s: 4px 4px 0 var(--black);
  --shadow-l: 12px 12px 0 var(--yellow);

  --font-display: 'Inter', 'Noto Sans SC', sans-serif;
  --font-label: 'Space Grotesk', 'Noto Sans SC', monospace;

  /* ── 把 candy 色映射到 --plain-* token,让"没覆盖的兜底块"自动获得 sticker-book 底色 ──
     WCAG AA:black(#000) on offwhite(#FFFDF5) 对比≈20:1;pastel 面配黑字均 ≥12:1 */
  --plain-bg: var(--offwhite);
  --plain-surface: var(--white);
  --plain-surface-2: var(--cream);
  --plain-text: var(--black);
  --plain-text-mute: color-mix(in oklab, var(--black) 78%, var(--offwhite));
  --plain-text-faint: color-mix(in oklab, var(--black) 60%, var(--offwhite));
  --plain-border: var(--black);
  --plain-border-strong: var(--black);
  --plain-accent: var(--pink);
  --plain-accent-strong: var(--black);
  --plain-accent-bg: var(--blue);
  --plain-success: var(--green);
  --plain-warn: var(--yellow);
  --plain-danger: var(--pink);
  --plain-danger-bg: var(--pink);

  --stage-bg: #2a2a2a;
  --slide-bg: var(--offwhite);
  --doc-page-bg: var(--offwhite);
  --doc-text: var(--black);

  --font-body: var(--font-display);
  --v32-radius: 0px;  /* BlockFrame 铁律:零圆角 */
  --v32-gap: 28px;    /* 卡片间距(旧 deck 用 28-36px gap)*/
}

/* ── BlockFrame 排版工具类(照搬旧 t-* · 覆盖块 renderer 直接用)── */
.t-h1 { font-family: var(--font-display); font-weight: 900; font-size: clamp(72px, 6vw, 120px); line-height: 0.95; letter-spacing: -0.03em; text-transform: uppercase; margin: 0; color: var(--black); }
.t-h2 { font-family: var(--font-display); font-weight: 800; font-size: clamp(48px, 4vw, 80px); line-height: 1; letter-spacing: -0.02em; text-transform: uppercase; margin: 0; color: var(--black); }
.t-h3 { font-family: var(--font-display); font-weight: 700; font-size: clamp(28px, 2.5vw, 44px); line-height: 1.1; letter-spacing: -0.01em; margin: 0; color: var(--black); }
.t-close { font-family: var(--font-display); font-weight: 900; font-size: clamp(56px, 5vw, 100px); line-height: 0.95; letter-spacing: -0.03em; text-transform: uppercase; margin: 0; }
.t-stat { font-family: var(--font-display); font-weight: 900; font-size: clamp(48px, 4vw, 80px); line-height: 1; margin: 0; color: var(--black); }
.t-card-t { font-family: var(--font-display); font-weight: 700; font-size: 22px; line-height: 1.2; text-transform: uppercase; margin: 0; color: var(--black); }
.t-body { font-family: var(--font-display); font-weight: 500; font-size: clamp(16px, 1.2vw, 22px); line-height: 1.6; color: var(--black); }
.t-body-card { font-family: var(--font-display); font-weight: 500; font-size: 16px; line-height: 1.6; color: var(--black); }
.t-label { font-family: var(--font-label); font-weight: 600; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1; color: var(--black); }
.t-mono { font-family: var(--font-label); font-weight: 600; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--black); }

/* ── pill 段眉(universal · 旧模板签名件)── */
.pill { display: inline-block; border: 3px solid var(--black); padding: 8px 18px; font-family: var(--font-label); font-weight: 600; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; background: var(--white); box-shadow: var(--shadow-s); color: var(--black); }
.pill.pink { background: var(--pink); }
.pill.blue { background: var(--blue); }
.pill.green { background: var(--green); }
.pill.yellow { background: var(--yellow); }
.pill.cream { background: var(--cream); }

/* ── 卡 / 按钮 / 装饰库(照搬)── */
.card-el { border: 4px solid var(--black); background: var(--white); box-shadow: var(--shadow-d); }
.card-sm { border: 3px solid var(--black); background: var(--white); box-shadow: var(--shadow-s); }
.tilt-l { transform: rotate(-4deg); }
.tilt-r { transform: rotate(4deg); }
.tilt-lg-l { transform: rotate(-8deg); }
.tilt-lg-r { transform: rotate(8deg); }
.star-burst { display: inline-block; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); width: 120px; height: 120px; position: absolute; z-index: 0; }
.stripe-block { border: 3px solid var(--black); background: repeating-linear-gradient(45deg, var(--black) 0 4px, var(--green) 4px 12px); width: 80px; height: 120px; position: absolute; z-index: 0; }
.list-num { width: 40px; height: 40px; border: 3px solid var(--black); background: var(--yellow); display: flex; align-items: center; justify-content: center; font-family: var(--font-label); font-weight: 700; font-size: 16px; flex-shrink: 0; color: var(--black); }
.icon-sq { width: 64px; height: 64px; border: 3px solid var(--black); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 28px; text-transform: uppercase; color: var(--black); }
.stat-dot { position: absolute; top: 16px; right: 16px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--black); }
.feature-deco { position: absolute; top: -14px; right: 24px; width: 56px; height: 56px; border: 3px solid var(--black); background: var(--yellow); transform: rotate(-6deg); }
.btn-pri { display: inline-block; border: 3px solid var(--black); background: var(--yellow); color: var(--black); padding: 16px 36px; font-family: var(--font-display); font-weight: 700; font-size: 18px; text-decoration: none; box-shadow: var(--shadow-s); }
.btn-close { border: 4px solid var(--white); background: transparent; color: var(--white); box-shadow: 6px 6px 0 var(--white); }

/* ── 覆盖块自定义 class(由下面 block renderer 产出)── */
.bf-block { position: relative; }
.bf-cover { display: flex; flex-direction: column; }
.bf-cover__display { max-width: 1400px; }
.bf-cover__tail { display: block; margin-top: 0.1em; color: var(--black); }
.bf-cover__lead { margin: 36px 0 0; max-width: 1100px; }
.bf-cover__byline { margin-top: 48px; display: flex; flex-wrap: wrap; gap: 16px; }

.bf-statement { text-align: center; }
.bf-statement__num { font-size: clamp(96px, 12vw, 220px); color: var(--black); }
.bf-statement__text { max-width: 1300px; margin: 24px auto 0; }
.bf-statement__anno { margin-top: 36px; }

.bf-metrics__grid { display: grid; gap: 28px; margin-top: 8px; }
.bf-metric { padding: 32px 28px; position: relative; }
.bf-metric__value { margin-bottom: 14px; }
.bf-metric__hint { margin-top: 12px; }

.bf-cards__list { display: flex; flex-direction: column; gap: 24px; margin-top: 8px; }
.bf-cards__grid { display: grid; gap: 28px; margin-top: 8px; }
.bf-card-row { padding: 32px 36px; display: grid; grid-template-columns: 90px 1fr 220px; gap: 28px; align-items: center; position: relative; }
.bf-card-row__num { font-size: 80px; }
.bf-card-row__head { margin-bottom: 10px; }
.bf-card-row__metric { text-align: right; }
.bf-card-row__metric-v { font-size: 56px; }
.bf-card-row__metric-l { margin-top: 8px; }
.bf-card { padding: 32px 28px; display: flex; flex-direction: column; gap: 16px; position: relative; }

.bf-closing { position: relative; }
.bf-closing__card { border: 4px solid var(--white); background: transparent; padding: 56px 64px; box-shadow: var(--shadow-l); max-width: 1500px; transform: rotate(-1deg); }
.bf-closing__display { color: var(--white); }
.bf-closing__sub { margin-top: 32px; max-width: 1100px; color: rgba(255,255,255,0.85); }
.bf-closing__cta { display: flex; gap: 28px; margin-top: 48px; }

/* ── 兜底块的 BlockFrame 重绘(prose/heading/quote/callout/table/compare/sequence 等走兜底,
     这里把它们从"素模板圆角卡片"拉回 4px 黑边 + hard shadow + 无圆角 + Inter uppercase)── */
.v32-heading-text, .v32-cards-title, .v32-metrics-title, .v32-compare-title,
.v32-table-title, .v32-seq-title, .v32-group-title, .v32-chart-title, .v32-media-title {
  font-family: var(--font-display); font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em;
}
.v32-quote-text, .v32-media-quote blockquote {
  font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;
}
.v32-callout, .v32-metric, .v32-card, .v32-compare-col, .v32-table-scroll, .v32-quote, .v32-media-figure {
  border: 4px solid var(--black); border-radius: 0; box-shadow: var(--shadow-d); background: var(--white);
}
.v32-callout { padding: 24px 28px; }
.v32-callout[data-tone="danger"] { background: var(--pink); }
.v32-callout[data-tone="warn"] { background: var(--yellow); }
.v32-callout[data-tone="ok"] { background: var(--green); }
.v32-callout[data-tone="info"], .v32-callout[data-tone="note"], .v32-callout[data-tone="tip"] { background: var(--blue); }
.v32-kicker, .v32-cover-kicker {
  font-family: var(--font-label); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  border: 3px solid var(--black); background: var(--yellow); box-shadow: var(--shadow-s);
  padding: 8px 18px; display: inline-block; border-radius: 0;
}

/* present 舞台:off-white 底 + 大内边距(旧 slide-inner 是 60px)· 覆盖块自己撑满 */
[data-v32-mode="present"] .v32-slide-inner { padding: 60px 60px 110px; }
[data-v32-mode="present"] .bf-cover { justify-content: center; }
[data-v32-mode="present"] .bf-statement { justify-content: center; align-items: center; min-height: 60vh; display: flex; flex-direction: column; }
[data-v32-mode="present"] .bf-closing { justify-content: center; display: flex; }
`.trim();

// ────────────────────────────────────────────────────────────
// V32 S5 · block renderer(签名 (block, ctx) => string)
// 视觉照搬旧 renderCover / renderHeroQuestion / renderStats /
// renderDiagnosis|proposal|features / renderClosing;字段名改成 v32 block.xxx。
// 旧 slide kind → v32 block 多对一:hero-question→statement · stats→metrics ·
// diagnosis/proposal/features→cards(layout 分流)· closing→closing。
// ────────────────────────────────────────────────────────────

const PASTELS = ["pink", "blue", "green", "yellow", "cream"] as const;

// cover ← 旧 renderCover
const cover: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cover" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<span class="pill yellow tilt-l" ${ctx.edit(`${p}/kicker`, "封面眉标")}>${ctx.esc(b.kicker)}</span>`
    : "";
  const tail = b.displayTail
    ? `<span class="bf-cover__tail" ${ctx.edit(`${p}/displayTail`, "标题续行")}>${ctx.esc(b.displayTail)}</span>`
    : "";
  const lead = b.lead
    ? `<p class="t-body bf-cover__lead" ${ctx.edit(`${p}/lead`, "封面引子")}>${ctx.esc(b.lead)}</p>`
    : "";
  const byline = b.byline?.length
    ? `<div class="bf-cover__byline">${b.byline
        .slice(0, 4)
        .map(
          (x, j) =>
            `<span class="pill ${PASTELS[j % PASTELS.length]} ${j % 2 === 0 ? "tilt-l" : "tilt-r"}" ${ctx.edit(`${p}/byline/${j}`, "署名")}>${ctx.esc(x)}</span>`,
        )
        .join("")}</div>`
    : "";
  return `<section class="v32-block bf-block bf-cover" data-block-id="${b.id}">
  <span class="star-burst tilt-lg-l" style="top: 40px; right: 80px; background: var(--pink);" aria-hidden="true"></span>
  <span class="stripe-block tilt-r" style="bottom: 40px; left: 40px;" aria-hidden="true"></span>
  ${kicker ? `<div style="margin-bottom: 36px;">${kicker}</div>` : ""}
  <h1 class="t-h1 bf-cover__display" ${ctx.edit(`${p}/display`, "封面大标题")}>${ctx.esc(b.display)}${tail}</h1>
  ${lead}
  ${byline}
</section>`;
};

// statement ← 旧 renderHeroQuestion(bigNumber + text + annotation · 居中 + star-burst)
const statement: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "statement" }>;
  const p = ctx.pathPrefix;
  const big = b.bigNumber
    ? `<div class="t-h1 tilt-l bf-statement__num" ${ctx.edit(`${p}/bigNumber`, "大数字")}>${ctx.esc(b.bigNumber)}</div>`
    : "";
  const anno = b.annotation
    ? `<span class="pill pink tilt-r bf-statement__anno" ${ctx.edit(`${p}/annotation`, "注解")}>${ctx.esc(b.annotation)}</span>`
    : "";
  return `<section class="v32-block bf-block bf-statement" data-block-id="${b.id}">
  <span class="star-burst tilt-lg-r" style="top: 20px; left: 40px; background: var(--yellow);" aria-hidden="true"></span>
  <span class="star-burst tilt-lg-l" style="bottom: 20px; right: 40px; background: var(--blue);" aria-hidden="true"></span>
  ${big}
  <p class="t-h2 bf-statement__text" ${ctx.edit(`${p}/text`, "论点")}>${ctx.esc(b.text)}</p>
  ${anno}
</section>`;
};

// metrics ← 旧 renderStats(倾斜 pastel 卡 + stat-dot + 大数字)
const metrics: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "metrics" }>;
  const p = ctx.pathPrefix;
  const title = b.title
    ? `<h2 class="t-h2" style="margin-bottom: 48px;" ${ctx.edit(`${p}/title`, "指标组标题")}>${ctx.esc(b.title)}</h2>`
    : "";
  const cols = Math.min(b.items.length || 1, 4);
  const items = b.items
    .slice(0, 8)
    .map((m: Mark, i: number) => {
      const glyph = m.delta === "up" ? "▲" : m.delta === "down" ? "▼" : m.delta === "flat" ? "→" : "";
      const hint = m.hint
        ? `<div class="t-body-card bf-metric__hint">${ctx.esc(m.hint)}</div>`
        : "";
      return `<div class="card-sm bf-metric ${i % 2 === 0 ? "tilt-l" : "tilt-r"}" style="background: var(--${PASTELS[i % PASTELS.length]});" data-delta="${ctx.esc(m.delta ?? "flat")}">
      <div class="stat-dot" style="background: var(--${PASTELS[(i + 2) % PASTELS.length]});" aria-hidden="true"></div>
      <div class="t-stat bf-metric__value">${ctx.esc(m.value)}${glyph ? ` <span aria-hidden="true">${glyph}</span>` : ""}</div>
      <div class="t-label" ${ctx.edit(`${p}/items/${i}/label`, "指标名")}>${ctx.esc(m.label)}</div>
      ${hint}
    </div>`;
    })
    .join("");
  return `<section class="v32-block bf-block bf-metrics" data-block-id="${b.id}">
  ${title}
  <div class="bf-metrics__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
};

// cards ← 旧 renderDiagnosis / renderProposal / renderFeatures
//   layout=grid           → 网格特性卡(旧 features · icon-sq)
//   layout=numbered/steps → 横排大条目(num | head+body | metric/when · 旧 diagnosis/proposal)
const cards: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "cards" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<div style="margin-bottom: 28px;"><span class="pill pink tilt-l">${ctx.esc(b.kicker)}</span></div>`
    : "";
  const title = b.title
    ? `<h2 class="t-h2" style="margin-bottom: 36px; max-width: 1500px;" ${ctx.edit(`${p}/title`, "卡片组标题")}>${ctx.esc(b.title)}</h2>`
    : "";

  if (b.layout === "grid") {
    const cols = b.items.length <= 3 ? Math.max(b.items.length, 1) : Math.ceil(Math.sqrt(b.items.length));
    const items = b.items
      .map((c: CardItem, i: number) => {
        const glyph = c.icon ?? (c.head[0] ?? String(i + 1)).toUpperCase();
        return `<article class="card-el bf-card ${i % 2 === 0 ? "tilt-l" : "tilt-r"}" style="background: var(--${PASTELS[i % PASTELS.length]});">
      <div class="icon-sq" style="background: var(--white);" aria-hidden="true">${ctx.esc(glyph)}</div>
      <div class="t-card-t" ${ctx.edit(`${p}/items/${i}/head`, "卡片标题")}>${ctx.esc(c.head)}</div>
      <div class="t-body-card" ${ctx.edit(`${p}/items/${i}/body`, "卡片正文")}>${ctx.esc(c.body)}</div>
    </article>`;
      })
      .join("");
    return `<section class="v32-block bf-block bf-cards" data-block-id="${b.id}" data-layout="grid">
  ${kicker}${title}
  <div class="bf-cards__grid" style="grid-template-columns: repeat(${cols}, 1fr);">${items}</div>
</section>`;
  }

  // numbered / steps → diagnosis 式横排大条目
  const items = b.items
    .map((c: CardItem, i: number) => {
      const num = c.num ?? String(i + 1).padStart(2, "0");
      const right = c.metric
        ? `<div class="t-stat bf-card-row__metric-v" ${ctx.edit(`${p}/items/${i}/metric`, "指标")}>${ctx.esc(c.metric)}</div>${c.metricLabel ? `<div class="t-label bf-card-row__metric-l">${ctx.esc(c.metricLabel)}</div>` : ""}`
        : c.when
          ? `<span class="pill cream" ${ctx.edit(`${p}/items/${i}/when`, "时间")}>${ctx.esc(c.when)}</span>`
          : "";
      return `<div class="card-el bf-card-row" style="background: var(--${PASTELS[i % PASTELS.length]});">
      <div class="feature-deco" style="background: var(--white);" aria-hidden="true"></div>
      <div class="t-stat bf-card-row__num">${ctx.esc(num)}</div>
      <div>
        <div class="t-card-t bf-card-row__head" ${ctx.edit(`${p}/items/${i}/head`, "条目标题")}>${ctx.esc(c.head)}</div>
        <div class="t-body-card" ${ctx.edit(`${p}/items/${i}/body`, "条目正文")}>${ctx.esc(c.body)}</div>
      </div>
      <div class="bf-card-row__metric">${right}</div>
    </div>`;
    })
    .join("");
  return `<section class="v32-block bf-block bf-cards" data-block-id="${b.id}" data-layout="${ctx.esc(b.layout)}">
  ${kicker}${title}
  <div class="bf-cards__list">${items}</div>
</section>`;
};

// closing ← 旧 renderClosing(黑底 + 白边卡 + 12px yellow shadow + star-burst)
const closing: BlockRenderer = (block, ctx) => {
  const b = block as Extract<Block, { type: "closing" }>;
  const p = ctx.pathPrefix;
  const kicker = b.kicker
    ? `<span class="pill yellow tilt-l" style="margin-bottom: 28px;" ${ctx.edit(`${p}/kicker`, "结尾眉标")}>${ctx.esc(b.kicker)}</span>`
    : "";
  const sub = b.sub
    ? `<p class="t-body bf-closing__sub" ${ctx.edit(`${p}/sub`, "结尾副文")}>${ctx.esc(b.sub)}</p>`
    : "";
  const btn = (kind: "primary" | "secondary") => {
    const c = b.cta?.[kind];
    if (!c) return "";
    const href = ` href="${ctx.esc(c.href ?? "#")}"`;
    const cls = kind === "primary" ? "btn-pri" : "btn-pri btn-close";
    return `<a class="${cls}"${href}>${ctx.esc(c.label)}${kind === "primary" ? " →" : ""}</a>`;
  };
  const cta = b.cta ? `<div class="bf-closing__cta">${btn("primary")}${btn("secondary")}</div>` : "";
  return `<section class="v32-block bf-block bf-closing" data-block-id="${b.id}" style="background: var(--black);">
  <span class="star-burst tilt-lg-l" style="top: 40px; right: 100px; background: var(--yellow);" aria-hidden="true"></span>
  <span class="star-burst tilt-lg-r" style="bottom: 40px; left: 80px; background: var(--pink);" aria-hidden="true"></span>
  <div class="bf-closing__card">
    ${kicker}
    <h2 class="t-close bf-closing__display" ${ctx.edit(`${p}/display`, "结尾大标题")}>${ctx.esc(b.display)}</h2>
    ${sub}
    ${cta}
  </div>
</section>`;
};

// V32 S5 · 组装:只覆盖强视觉块;其余走兜底 renderer + themeCss 重绘
const blockFrameV32: TemplateV32 = {
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

export default blockFrameV32;
export { blockFrameV32, meta, fonts, themeCss };
