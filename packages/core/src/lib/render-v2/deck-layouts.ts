/**
 * Deck v2 · layout HTML templates + 共享 CSS
 *
 * 每个 layout 接 data: Record<string, unknown>(来自 parse-dsl),输出 HTML 字符串。
 * 不直接写 inline style —— 全靠 .plain-deck-* className + 主题变量。
 *
 * 支持的 layout(对照桌面 web2md-story.deck.html):
 *   cover           — hero 大字 + lead + byline
 *   hero-question   — 暗背景 + 巨数字 + 标题问题
 *   stats           — 4-col KPI grid
 *   diagnosis       — 编号 + body + 右侧 metric 三列
 *   pull-quote      — 居中大引文
 *   proposal        — 3-step 卡片
 *   features        — 4-col feature grid
 *   timeline        — 4-col timeline
 *   closing         — hero 暗收尾 + CTA
 *
 * 不认识的 layout(name 不在表里)→ 渲染成 fallback `<section>` 显示原 data。
 */

import { escapeHtml, escapeAttr } from "./chrome";

export type SectionData = Record<string, unknown>;

/** layout 渲染器签名 */
type LayoutRenderer = (data: SectionData) => string;

const LAYOUTS: Record<string, LayoutRenderer> = {
  cover: renderCover,
  "hero-question": renderHeroQuestion,
  stats: renderStats,
  diagnosis: renderDiagnosis,
  "pull-quote": renderPullQuote,
  proposal: renderProposal,
  features: renderFeatures,
  timeline: renderTimeline,
  closing: renderClosing,
  // V19 · 图相关 section,让 deck 不再"全是文字"
  image: renderImage,
  gallery: renderGallery,
  "media-split": renderMediaSplit,
};

export function renderDeckSection(
  name: string,
  data: SectionData,
): string {
  const fn = LAYOUTS[name];
  if (fn) return fn(data);
  return renderUnknown(name, data);
}

// ─────────────────────────────────────────────
// individual layouts
// ─────────────────────────────────────────────

function renderCover(d: SectionData): string {
  const kicker = str(d.kicker);
  const display = str(d.display);
  const tail = str(d["display-tail"]);
  const lead = str(d.lead);
  const byline = arrStr(d.byline);

  // V29 · grammar / decor 由 renderDeck 在外层 wrap 写入 [data-cover-grammar][data-plain-decor]
  // 这里只渲染语义 HTML · 装饰由 CSS 通过 attribute selector 接管
  return `<section class="plain-section plain-deck-cover">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    <h1>${escapeHtml(display)}${tail ? `<br/><em>${escapeHtml(tail)}</em>` : ""}</h1>
    ${lead ? `<p class="plain-deck-lead">${escapeHtml(lead)}</p>` : ""}
    ${
      byline.length > 0
        ? `<div class="plain-deck-byline">${byline.map((b) => `<span>${escapeHtml(b)}</span>`).join("")}</div>`
        : ""
    }
  </div>
</section>`;
}

function renderHeroQuestion(d: SectionData): string {
  const num = str(d["big-number"]);
  const q = str(d.question);
  const ann = str(d.annotation);
  return `<section class="plain-section plain-deck-hero-question">
  <div class="plain-deck-container">
    ${num ? `<div class="plain-deck-bignumber">${escapeHtml(num)}</div>` : ""}
    <h2>${escapeHtml(q)}</h2>
    ${ann ? `<div class="plain-deck-annotation">${escapeHtml(ann)}</div>` : ""}
  </div>
</section>`;
}

function renderStats(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const items = arrObj(d.items);
  return `<section class="plain-section plain-deck-stats">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="plain-deck-stats-grid">
      ${items
        .map(
          (it) => `<div class="plain-deck-stat">
            <span class="value">${escapeHtml(str(it.value))}</span>
            <span class="label">${escapeHtml(str(it.label))}</span>
            ${it.hint ? `<span class="hint">${escapeHtml(str(it.hint))}</span>` : ""}
          </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`;
}

function renderDiagnosis(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const items = arrObj(d.items);
  return `<section class="plain-section plain-deck-diagnosis">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="plain-deck-diag-list">
      ${items
        .map(
          (it) => `<div class="plain-deck-diag-row">
            <div class="diag-num">${escapeHtml(str(it.num))}</div>
            <div class="diag-body">
              <h3>${escapeHtml(str(it.head))}</h3>
              <p>${escapeHtml(str(it.body))}</p>
            </div>
            ${
              it.metric
                ? `<div class="diag-metric">${escapeHtml(str(it.metric))}${
                    it["metric-label"]
                      ? `<small>${escapeHtml(str(it["metric-label"]))}</small>`
                      : ""
                  }</div>`
                : ""
            }
          </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`;
}

function renderPullQuote(d: SectionData): string {
  const text = str(d.text);
  const attr = str(d.attribution);
  return `<section class="plain-section plain-deck-pull-quote">
  <div class="plain-deck-container">
    <blockquote>${escapeHtml(text)}</blockquote>
    ${attr ? `<cite>${escapeHtml(attr)}</cite>` : ""}
  </div>
</section>`;
}

function renderProposal(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const lead = str(d.lead);
  const steps = arrObj(d.steps);
  return `<section class="plain-section plain-deck-proposal">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    ${lead ? `<p class="plain-deck-lead">${escapeHtml(lead)}</p>` : ""}
    <div class="plain-deck-steps">
      ${steps
        .map(
          (s, i) => `<div class="plain-deck-step">
            <div class="step-num">${i + 1}</div>
            <h3>${escapeHtml(str(s.head))}</h3>
            <p>${escapeHtml(str(s.body))}</p>
            ${s.when ? `<div class="step-when">${escapeHtml(str(s.when))}</div>` : ""}
          </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`;
}

function renderFeatures(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const items = arrObj(d.items);
  return `<section class="plain-section plain-deck-features">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="plain-deck-feat-grid">
      ${items
        .map(
          (it) => `<div class="plain-deck-feat">
            ${it.num ? `<span class="num">${escapeHtml(str(it.num))}</span>` : ""}
            <h3>${escapeHtml(str(it.head))}</h3>
            <p>${escapeHtml(str(it.body))}</p>
          </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`;
}

function renderTimeline(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const weeks = arrObj(d.weeks);
  return `<section class="plain-section plain-deck-timeline">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="plain-deck-timeline-grid">
      ${weeks
        .map(
          (w) => `<div class="plain-deck-week">
            <div class="w-label">${escapeHtml(str(w.when))}</div>
            <h3>${escapeHtml(str(w.head))}</h3>
            <ul>${arrStr(w.bullets).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
          </div>`,
        )
        .join("")}
    </div>
  </div>
</section>`;
}

function renderClosing(d: SectionData): string {
  const kicker = str(d.kicker);
  const display = str(d.display);
  const sub = str(d.sub);
  const cta = (d.cta as { primary?: { label: string; href: string }; secondary?: { label: string; href: string } }) ?? {};
  const primary = cta.primary;
  const secondary = cta.secondary;

  return `<section class="plain-section plain-deck-closing">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    <h2>${escapeHtml(display)}</h2>
    ${sub ? `<p class="sub">${escapeHtml(sub)}</p>` : ""}
    ${
      primary || secondary
        ? `<div class="plain-deck-cta">
            ${primary ? `<a class="primary" href="${escapeAttr(primary.href)}" target="_blank" rel="noopener">${escapeHtml(primary.label)} →</a>` : ""}
            ${secondary ? `<a class="secondary" href="${escapeAttr(secondary.href)}" target="_blank" rel="noopener">${escapeHtml(secondary.label)}</a>` : ""}
          </div>`
        : ""
    }
  </div>
</section>`;
}

/**
 * V19 · image · 单图 hero(full-bleed 或 contained,带可选标题/说明)
 * data: { src, alt?, caption?, kicker?, mode?: "cover" | "contain" }
 */
function renderImage(d: SectionData): string {
  const src = str(d.src);
  const alt = str(d.alt) || str(d.caption) || "image";
  const caption = str(d.caption);
  const kicker = str(d.kicker);
  const mode = str(d.mode) === "contain" ? "contain" : "cover";
  if (!src) {
    return `<section class="plain-section plain-deck-image plain-deck-image-empty">
  <div class="plain-deck-container">
    <div class="plain-deck-kicker">IMAGE — add a src or upload an asset</div>
    ${caption ? `<p>${escapeHtml(caption)}</p>` : ""}
  </div>
</section>`;
  }
  return `<section class="plain-section plain-deck-image" data-mode="${mode}">
  <figure>
    <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />
    ${
      kicker || caption
        ? `<figcaption>
            ${kicker ? `<span class="plain-deck-kicker">${escapeHtml(kicker)}</span>` : ""}
            ${caption ? `<p>${escapeHtml(caption)}</p>` : ""}
          </figcaption>`
        : ""
    }
  </figure>
</section>`;
}

/**
 * V19 · gallery · 2-4 张图墙
 * data: { kicker?, title?, items: [{ src, alt?, caption? }, ...] }
 */
function renderGallery(d: SectionData): string {
  const kicker = str(d.kicker);
  const title = str(d.title);
  const items = arrObj(d.items);
  if (items.length === 0) {
    return `<section class="plain-section plain-deck-gallery plain-deck-gallery-empty">
  <div class="plain-deck-container">
    <div class="plain-deck-kicker">GALLERY — no images yet</div>
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
  </div>
</section>`;
  }
  const cols = Math.min(4, Math.max(2, items.length === 3 ? 3 : items.length === 4 ? 4 : 2));
  return `<section class="plain-section plain-deck-gallery" data-cols="${cols}">
  <div class="plain-deck-container">
    ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="plain-deck-gallery-grid">
      ${items
        .map((it) => {
          const src = str(it.src);
          const alt = str(it.alt) || str(it.caption) || "";
          const caption = str(it.caption);
          if (!src) return `<div class="plain-deck-gallery-empty-cell">(missing src)</div>`;
          return `<figure>
            <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />
            ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
          </figure>`;
        })
        .join("")}
    </div>
  </div>
</section>`;
}

/**
 * V19 · media-split · 左图右文 (或反向 reverse: true)
 * data: { src, alt?, kicker?, title, body, bullets?, side?: "left" | "right" }
 */
function renderMediaSplit(d: SectionData): string {
  const src = str(d.src);
  const alt = str(d.alt) || str(d.title) || "image";
  const kicker = str(d.kicker);
  const title = str(d.title);
  const body = str(d.body);
  const bullets = arrStr(d.bullets);
  const side = str(d.side) === "right" ? "right" : "left";
  return `<section class="plain-section plain-deck-media-split" data-side="${side}">
  <div class="plain-deck-container">
    <div class="plain-deck-media-split-grid">
      <figure class="plain-deck-media-split-img">
        ${
          src
            ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`
            : `<div class="plain-deck-image-empty"><span>IMAGE — no asset yet</span></div>`
        }
      </figure>
      <div class="plain-deck-media-split-text">
        ${kicker ? `<div class="plain-deck-kicker">${escapeHtml(kicker)}</div>` : ""}
        ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        ${
          bullets.length > 0
            ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
            : ""
        }
      </div>
    </div>
  </div>
</section>`;
}

function renderUnknown(name: string, d: SectionData): string {
  return `<section class="plain-section plain-deck-unknown">
  <div class="plain-deck-container">
    <div class="plain-deck-kicker">UNKNOWN SECTION · ${escapeHtml(name)}</div>
    <pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre>
  </div>
</section>`;
}

// ─────────────────────────────────────────────
// 共享 deck CSS · 走 var(--plain-*)
// ─────────────────────────────────────────────

export const DECK_CSS = `
/* V27-U · deck 纵向间距升级 · 用户反馈"内容挤压"
   - section padding 提升 112→144px(空气感更足)
   - section 之间 gap 40-80px → 64-120px(每页边界更清晰) */
section.plain-section {
  position: relative;
  padding: max(var(--plain-space-12, 128px), 144px) var(--plain-space-5);
}
/* V27-U · 相邻 section 之间多给一道空气 · 避免上一页结束紧贴下一页开始 */
section.plain-section + section.plain-section {
  margin-top: clamp(64px, 8vh, 120px);
}
.plain-deck-container {
  max-width: 940px;
  margin: 0 auto;
}

/* kicker —— 红线 + 全大写 mono(主题 chrome.kickerBar 决定显隐已经写在主题里) */
.plain-deck-kicker {
  display: inline-flex; align-items: center; gap: var(--plain-space-1);
  font-family: var(--plain-font-ui);
  font-size: var(--plain-size-micro, 0.625rem);
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-ink-mute);
  margin-bottom: var(--plain-space-3);
  font-weight: 500;
}
.plain-deck-kicker::before {
  content: "";
  width: 4px;
  height: 14px;
  background: var(--plain-accent);
}

/* h1 h2 h3 */
.plain-section h1,
.plain-section h2,
.plain-section h3 {
  font-family: var(--plain-font-display);
  font-weight: 500;
  letter-spacing: -0.018em;
  line-height: 1.1;
  color: var(--plain-ink);
}

/* ─────────── cover ─────────── */
/* V27-U · 参考 guizang-ppt-skill 把 cover 从"素渐变"升级到"被光照过的纸"
 *   - 双角 radial 柔焦投影(模拟植物 / 散景 / 光斑)
 *   - SVG inline noise 颗粒(纸张质感 · 不发请求)
 *   - z-index 让装饰永远在内容之下
 *   - 装饰用 accent / hero 色派生 · 切主题自动变 */
.plain-deck-cover {
  /* V27-U · cover 加大上下空气 · 之前 160 / 120 给紧凑感 · 现在更舒缓 */
  padding-top: 200px;
  padding-bottom: 160px;
  /* V27-U · accent 在右下角强 50% 透 · hero 在左上 28% · 让主题色"扑面而来"
   * 之前 22% / 14% 太淡 · citrus-pop 黄色被冲散 · 各主题色都看不出
   * 现在每个主题 cover 都明显带主色 · 视觉差异化最大化 */
  background:
    radial-gradient(120% 80% at 110% 110%, color-mix(in oklab, var(--plain-accent) 50%, transparent) 0%, transparent 60%),
    radial-gradient(90% 60% at -10% -10%, color-mix(in oklab, var(--plain-hero) 28%, transparent) 0%, transparent 65%),
    linear-gradient(180deg, var(--plain-paper) 0%, var(--plain-surface) 100%);
  border-bottom: 1px solid var(--plain-rule);
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
/* 颗粒噪点 · SVG inline · 给纸张质感(guizang 的关键 trick) */
.plain-deck-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  mix-blend-mode: multiply;
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}
/* halftone 点阵装饰 · 右下角散落 · 像 guizang 瑞士系列 */
.plain-deck-cover::after {
  content: "";
  position: absolute;
  right: -40px;
  bottom: -40px;
  width: 320px;
  height: 240px;
  background-image: radial-gradient(circle, color-mix(in oklab, var(--plain-accent) 35%, transparent) 1.2px, transparent 1.6px);
  background-size: 14px 14px;
  mask-image: radial-gradient(ellipse at bottom right, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at bottom right, black 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
/* 内容压在装饰之上 */
.plain-deck-cover > * {
  position: relative;
  z-index: 1;
}
.plain-deck-cover h1 {
  font-size: clamp(3.5rem, 9vw, 7rem);
  /* V27-U · 之前 line-height 0.95 给英文短标设计 · 中文巨字号折行时第 2 行
   *   ascender 直接撞第 1 行 descender · 看起来"叠"在一起。
   *   改 1.08 是中文衬线大字号的最低安全 · 折行后能完全分离。
   *   字距 letter-spacing 从 -0.02 收到 -0.015(中文不该负太多)。 */
  line-height: 1.08;
  margin-bottom: var(--plain-space-4);
  max-width: 880px;
  letter-spacing: -0.015em;
}
.plain-deck-cover h1 em {
  /* V27-U · em 强制 block · 跟主标各占一行 · 中间留 0.25em 视觉断点
   * 之前 inline em 在长中文里折行会跟 h1 第 1 行咬住 · 现在彻底分开 */
  display: block;
  margin-top: 0.25em;
  font-style: italic;
  color: var(--plain-accent);
  line-height: 1.1;
}
.plain-deck-cover .plain-deck-lead {
  font-size: 20px;
  line-height: 1.5;
  color: var(--plain-ink-soft);
  max-width: 600px;
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
}
.plain-deck-byline {
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--plain-ink-mute);
  display: flex; gap: 24px; flex-wrap: wrap;
}

/* ─────────── hero-question ─────────── */
.plain-deck-hero-question {
  background: var(--plain-hero);
  color: var(--plain-on-hero);
  padding: 140px 32px;
  text-align: center;
}
.plain-deck-hero-question h2 {
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  line-height: 1.15;
  color: var(--plain-on-hero);
  max-width: 760px;
  margin: 0 auto;
}
.plain-deck-bignumber {
  display: inline-block;
  font-family: var(--plain-font-display);
  font-size: clamp(120px, 18vw, 200px);
  line-height: 1;
  color: var(--plain-accent);
  font-weight: 300;
  margin-bottom: 16px;
}
.plain-deck-annotation {
  margin-top: 32px;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: color-mix(in srgb, var(--plain-on-hero) 55%, transparent);
}

/* ─────────── stats ─────────── */
.plain-deck-stats h2 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
  max-width: 720px;
}
.plain-deck-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--plain-ink);
  border-bottom: 1px solid var(--plain-ink);
}
@media (max-width: 720px) { .plain-deck-stats-grid { grid-template-columns: repeat(2, 1fr); } }
.plain-deck-stat {
  padding: var(--plain-space-4) var(--plain-space-3);
  border-right: 1px solid var(--plain-rule);
  display: flex; flex-direction: column; gap: var(--plain-space-1);
}
.plain-deck-stat:last-child { border-right: none; }
.plain-deck-stat .value {
  font-family: var(--plain-font-display);
  font-size: 56px;
  line-height: 1;
  color: var(--plain-ink);
  font-weight: 500;
  letter-spacing: -0.02em;
}
.plain-deck-stat .label {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
}
.plain-deck-stat .hint {
  font-size: 13px;
  color: var(--plain-ink-soft);
  font-style: italic;
  margin-top: 4px;
}

/* ─────────── diagnosis ─────────── */
.plain-deck-diagnosis h2 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
  max-width: 640px;
}
.plain-deck-diag-list {
  display: flex; flex-direction: column;
  border-top: 1px solid var(--plain-ink);
}
.plain-deck-diag-row {
  display: grid;
  grid-template-columns: 80px 1fr 220px;
  gap: var(--plain-space-4);
  padding: var(--plain-space-4) 0;
  border-bottom: 1px solid var(--plain-rule);
  align-items: baseline;
}
@media (max-width: 720px) { .plain-deck-diag-row { grid-template-columns: 1fr; } }
.plain-deck-diag-row .diag-num {
  font-family: var(--plain-font-ui);
  font-size: 13px;
  color: var(--plain-ink-mute);
  letter-spacing: 0.16em;
}
.plain-deck-diag-row .diag-body h3 {
  font-size: 26px;
  line-height: 1.3;
  margin-bottom: 12px;
}
.plain-deck-diag-row .diag-body p {
  font-size: 16px;
  color: var(--plain-ink-soft);
}
.plain-deck-diag-row .diag-metric {
  font-family: var(--plain-font-display);
  font-size: 42px;
  line-height: 1;
  color: var(--plain-accent);
  font-weight: 500;
  text-align: right;
}
.plain-deck-diag-row .diag-metric small {
  display: block;
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
  margin-top: 8px;
  font-weight: normal;
}

/* ─────────── pull-quote ─────────── */
.plain-deck-pull-quote {
  padding: 140px 32px;
  text-align: center;
  background: var(--plain-surface);
}
.plain-deck-pull-quote blockquote {
  font-family: var(--plain-font-display);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  line-height: 1.4;
  font-style: italic;
  color: var(--plain-ink);
  max-width: 780px;
  margin: 0 auto;
  position: relative;
}
.plain-deck-pull-quote blockquote::before {
  content: "“";
  position: absolute;
  left: -40px; top: -36px;
  color: var(--plain-accent);
  font-size: 120px;
  line-height: 1;
  font-family: var(--plain-font-display);
}
.plain-deck-pull-quote cite {
  display: block;
  margin-top: 32px;
  font-family: var(--plain-font-ui);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--plain-ink-mute);
  font-style: normal;
}

/* ─────────── proposal (steps) ─────────── */
.plain-deck-proposal h2 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
  max-width: 640px;
}
.plain-deck-proposal .plain-deck-lead {
  color: var(--plain-ink-mute);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
  max-width: 580px;
  font-size: 17px;
}
.plain-deck-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--plain-space-3);
}
@media (max-width: 720px) { .plain-deck-steps { grid-template-columns: 1fr; } }
.plain-deck-step {
  background: var(--plain-raised);
  padding: var(--plain-space-4) var(--plain-space-3);
  border: 1px solid var(--plain-rule);
  border-radius: var(--plain-radius-card);
  position: relative;
}
.plain-deck-step .step-num {
  position: absolute;
  top: 16px; right: 20px;
  font-family: var(--plain-font-display);
  font-size: 56px;
  line-height: 1;
  color: var(--plain-accent-soft);
  font-weight: 300;
}
.plain-deck-step h3 {
  font-size: 22px;
  margin-bottom: 16px;
  margin-right: 56px;
}
.plain-deck-step p {
  font-size: 15px;
  line-height: 1.65;
  color: var(--plain-ink-soft);
}
.plain-deck-step .step-when {
  margin-top: var(--plain-space-3);
  padding-top: var(--plain-space-2);
  border-top: 1px solid var(--plain-rule);
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--plain-ink-mute);
}

/* ─────────── features ─────────── */
.plain-deck-features {
  background: var(--plain-surface);
}
.plain-deck-features h2 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
}
.plain-deck-feat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--plain-rule);
  border: 1px solid var(--plain-rule);
}
@media (max-width: 900px) { .plain-deck-feat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .plain-deck-feat-grid { grid-template-columns: 1fr; } }
.plain-deck-feat {
  background: var(--plain-paper);
  padding: var(--plain-space-3);
  display: flex; flex-direction: column; gap: var(--plain-space-1);
}
.plain-deck-feat .num {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  color: var(--plain-accent);
  letter-spacing: 0.18em;
}
.plain-deck-feat h3 {
  font-size: 18px;
  line-height: 1.3;
  color: var(--plain-ink);
}
.plain-deck-feat p {
  font-size: 13px;
  line-height: 1.55;
  color: var(--plain-ink-soft);
}

/* ─────────── timeline ─────────── */
.plain-deck-timeline h2 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: max(var(--plain-space-8, 64px), 64px);
}
.plain-deck-timeline-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--plain-ink);
}
@media (max-width: 720px) { .plain-deck-timeline-grid { grid-template-columns: 1fr; } }
.plain-deck-week {
  padding: var(--plain-space-4) var(--plain-space-2);
  border-right: 1px solid var(--plain-rule);
}
.plain-deck-week:last-child { border-right: none; }
.plain-deck-week .w-label {
  font-family: var(--plain-font-ui);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--plain-accent);
  margin-bottom: var(--plain-space-2);
}
.plain-deck-week h3 {
  font-size: 20px;
  line-height: 1.3;
  margin-bottom: 12px;
  min-height: 52px;
}
.plain-deck-week ul {
  list-style: none;
  padding: 0;
  font-size: 14px;
  color: var(--plain-ink-mute);
}
.plain-deck-week ul li { padding: 4px 0; }
.plain-deck-week ul li::before {
  content: "·";
  margin-right: 8px;
  color: var(--plain-accent);
}

/* ─────────── closing ─────────── */
.plain-deck-closing {
  padding: 140px 32px;
  text-align: center;
  background: var(--plain-hero);
  color: var(--plain-on-hero);
}
.plain-deck-closing .plain-deck-kicker { color: color-mix(in srgb, var(--plain-on-hero) 50%, transparent); }
.plain-deck-closing .plain-deck-kicker::before { background: var(--plain-accent); }
.plain-deck-closing h2 {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  line-height: 1.2;
  color: var(--plain-on-hero);
  max-width: 800px;
  margin: 0 auto var(--plain-space-3);
}
.plain-deck-closing .sub {
  color: color-mix(in srgb, var(--plain-on-hero) 70%, transparent);
  font-size: 17px;
  max-width: 580px;
  margin: 0 auto var(--plain-space-6);
}
.plain-deck-cta {
  display: flex;
  justify-content: center;
  gap: var(--plain-space-2);
  flex-wrap: wrap;
}
.plain-deck-cta a {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px;
  border-radius: var(--plain-radius-card);
  font-family: var(--plain-font-ui);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: transform var(--plain-dur-mid) var(--plain-ease-page), background var(--plain-dur-mid) var(--plain-ease-page), border-color var(--plain-dur-mid) var(--plain-ease-page);
}
.plain-deck-cta a:active { transform: scale(0.97); }
.plain-deck-cta a.primary {
  background: var(--plain-accent);
  color: var(--plain-on-accent);
}
@media (hover:hover) and (pointer:fine) {
  .plain-deck-cta a.primary:hover { transform: translateY(-1px); }
  .plain-deck-cta a.secondary:hover { border-color: var(--plain-on-hero); }
}
.plain-deck-cta a.secondary {
  background: transparent;
  color: var(--plain-on-hero);
  border: 1px solid color-mix(in srgb, var(--plain-on-hero) 30%, transparent);
}

/* unknown fallback */
.plain-deck-unknown pre {
  font-family: var(--plain-font-mono);
  font-size: 12px;
  background: var(--plain-surface);
  padding: var(--plain-space-2);
  border-radius: var(--plain-radius-card);
  overflow-x: auto;
}

/* ── V19 · image · 单图 hero ───────────────────────────── */
.plain-deck-image {
  padding: 0;
  background: var(--plain-paper);
}
.plain-deck-image figure {
  margin: 0;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}
.plain-deck-image img {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  object-fit: cover;
  display: block;
}
.plain-deck-image[data-mode="contain"] img {
  object-fit: contain;
  background: var(--plain-surface);
}
.plain-deck-image figcaption {
  padding: var(--plain-space-3) var(--plain-space-4);
  background: var(--plain-paper);
  border-top: 1px solid var(--plain-rule);
}
.plain-deck-image figcaption .plain-deck-kicker {
  margin-bottom: var(--plain-space-1);
}
.plain-deck-image figcaption p {
  margin: 0;
  font-family: var(--plain-font-text);
  font-size: 15px;
  color: var(--plain-ink-soft);
  line-height: 1.5;
}
.plain-deck-image-empty {
  min-height: 50vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--plain-surface);
  color: var(--plain-ink-mute);
  font-family: var(--plain-font-mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

/* ── V19 · gallery · 多图墙 ───────────────────────────── */
.plain-deck-gallery .plain-deck-gallery-grid {
  display: grid;
  gap: var(--plain-space-3);
  margin-top: var(--plain-space-4);
}
.plain-deck-gallery[data-cols="2"] .plain-deck-gallery-grid { grid-template-columns: 1fr 1fr; }
.plain-deck-gallery[data-cols="3"] .plain-deck-gallery-grid { grid-template-columns: repeat(3, 1fr); }
.plain-deck-gallery[data-cols="4"] .plain-deck-gallery-grid { grid-template-columns: repeat(4, 1fr); }
.plain-deck-gallery figure {
  margin: 0;
  border-radius: var(--plain-radius-card);
  overflow: hidden;
  background: var(--plain-surface);
}
.plain-deck-gallery img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.plain-deck-gallery figcaption {
  padding: var(--plain-space-2) var(--plain-space-3);
  font-family: var(--plain-font-text);
  font-size: 13px;
  color: var(--plain-ink-soft);
}
.plain-deck-gallery-empty-cell {
  aspect-ratio: 4 / 3;
  display: flex; align-items: center; justify-content: center;
  background: var(--plain-surface);
  color: var(--plain-ink-mute);
  font-family: var(--plain-font-mono);
  font-size: 11px;
  border-radius: var(--plain-radius-card);
}

/* ── V19 · media-split · 左图右文 ───────────────────────────── */
.plain-deck-media-split .plain-deck-media-split-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--plain-space-5);
  align-items: center;
  min-height: 60vh;
}
.plain-deck-media-split[data-side="right"] .plain-deck-media-split-grid {
  direction: rtl;
}
.plain-deck-media-split[data-side="right"] .plain-deck-media-split-text {
  direction: ltr;
}
.plain-deck-media-split-img {
  margin: 0;
  border-radius: var(--plain-radius-card);
  overflow: hidden;
  background: var(--plain-surface);
}
.plain-deck-media-split-img img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.plain-deck-media-split-text h2 {
  font-family: var(--plain-font-display);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin: var(--plain-space-2) 0;
  color: var(--plain-ink);
}
.plain-deck-media-split-text p {
  font-family: var(--plain-font-text);
  font-size: 17px;
  line-height: 1.55;
  color: var(--plain-ink-soft);
  margin: var(--plain-space-3) 0;
}
.plain-deck-media-split-text ul {
  font-family: var(--plain-font-text);
  font-size: 15px;
  line-height: 1.7;
  color: var(--plain-ink-soft);
  padding-left: 1.2em;
  margin: 0;
}
@media (max-width: 768px) {
  .plain-deck-media-split .plain-deck-media-split-grid {
    grid-template-columns: 1fr;
    gap: var(--plain-space-3);
  }
  .plain-deck-media-split[data-side="right"] .plain-deck-media-split-grid {
    direction: ltr;
  }
}

/* ─────────────────────────────────────────────────────────────
   V29 · Cover grammar variants · 接 ThemeSpecV29.layoutGrammar.cover
   Plain 主题 attribute selector 让每套 v29 主题的 cover 有自己的版式
   ───────────────────────────────────────────────────────────── */

/* Biennale · left-bias-yellow-pop · 左对齐 + 右大 accent 块 + 禁阴影 */
html[data-plain-theme="v29-biennale"] .plain-deck-cover {
  text-align: left;
  padding: 140px 80px;
  background: var(--plain-paper);
  border: none;
  position: relative;
  overflow: hidden;
}
html[data-plain-theme="v29-biennale"] .plain-deck-cover::before {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 38%;
  background: var(--plain-accent);
  z-index: 0;
}
html[data-plain-theme="v29-biennale"] .plain-deck-cover::after {
  content: "";
  position: absolute;
  bottom: 40px; left: 60px;
  width: 120px; height: 1px;
  background: var(--plain-ink);
}
html[data-plain-theme="v29-biennale"] .plain-deck-cover h1 {
  font-family: "Instrument Serif", Georgia, serif;
  font-style: italic;
  font-size: clamp(4rem, 11vw, 9rem);
  line-height: 0.86;
  letter-spacing: -0.018em;
  font-weight: 400;
  position: relative;
  z-index: 1;
}
html[data-plain-theme="v29-biennale"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-paper);
  background: var(--plain-ink);
  padding: 0.05em 0.2em;
  margin: 0.15em 0 0 0;
  width: fit-content;
  font-style: italic;
  line-height: 1.0;
}
html[data-plain-theme="v29-biennale"] .plain-deck-cover .plain-deck-kicker {
  font-family: "Archivo", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 11px;
  font-weight: 600;
}

/* Sakura · frame-stamp · 居中 + 黑边框 + 印章 */
html[data-plain-theme="v29-sakura"] .plain-deck-cover {
  padding: 120px 80px;
  background: var(--plain-paper);
  border: 8px solid var(--plain-ink);
  margin: 24px;
  text-align: center;
  position: relative;
  box-shadow: 12px 12px 0 0 var(--plain-accent);
}
html[data-plain-theme="v29-sakura"] .plain-deck-cover::after {
  content: "JIS · A4";
  position: absolute;
  top: 30px; right: 40px;
  width: 80px; height: 80px;
  border: 2px solid var(--plain-accent);
  border-radius: 50%;
  color: var(--plain-accent);
  display: flex; align-items: center; justify-content: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  transform: rotate(-12deg);
}
html[data-plain-theme="v29-sakura"] .plain-deck-cover h1 {
  font-family: "Big Shoulders Display", "Anton", sans-serif;
  font-size: clamp(4rem, 10vw, 8rem);
  line-height: 0.9;
  letter-spacing: -0.02em;
  font-weight: 900;
  text-transform: uppercase;
}
html[data-plain-theme="v29-sakura"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  margin-top: 0.2em;
  font-style: normal;
}

/* 8-Bit · crt-boot · 深色 CRT + scanlines + 多层硬阴影 */
html[data-plain-theme="v29-8bit"] .plain-deck-cover {
  padding: 100px 60px;
  background: var(--plain-paper);
  color: var(--plain-ink);
  border: none;
  position: relative;
  overflow: hidden;
}
html[data-plain-theme="v29-8bit"] .plain-deck-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px);
  pointer-events: none;
  z-index: 2;
}
html[data-plain-theme="v29-8bit"] .plain-deck-cover::after {
  content: "▮";
  position: absolute;
  bottom: 40px; left: 60px;
  color: var(--plain-accent);
  animation: blink 1s steps(2) infinite;
}
@keyframes blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
html[data-plain-theme="v29-8bit"] .plain-deck-cover h1 {
  font-family: "Tektur", "VT323", "Courier New", monospace;
  font-size: clamp(3rem, 8vw, 6.5rem);
  line-height: 1.05;
  letter-spacing: 0.04em;
  font-weight: 700;
  text-transform: uppercase;
  text-shadow:
    4px 0 0 var(--plain-accent),
    8px 0 0 color-mix(in oklab, var(--plain-accent) 60%, transparent);
}
html[data-plain-theme="v29-8bit"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  margin-top: 0.5em;
  text-shadow: 0 0 16px var(--plain-accent);
}

/* Cobalt · ledger-rows · graph-paper 网格 + hairline */
html[data-plain-theme="v29-cobalt"] .plain-deck-cover {
  padding: 120px 80px;
  background:
    linear-gradient(to right, color-mix(in oklab, var(--plain-accent) 6%, transparent) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(to bottom, color-mix(in oklab, var(--plain-accent) 6%, transparent) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--plain-paper);
  border-top: 3px solid var(--plain-accent);
  border-bottom: 1px solid var(--plain-ink);
}
html[data-plain-theme="v29-cobalt"] .plain-deck-cover h1 {
  font-family: "Inter", "Helvetica Neue", sans-serif;
  font-size: clamp(3.5rem, 9vw, 7rem);
  line-height: 0.95;
  letter-spacing: -0.025em;
  font-weight: 700;
}
html[data-plain-theme="v29-cobalt"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  font-style: normal;
  margin-top: 0.2em;
}

/* Emerald · masthead-double-rule · 杂志报头双横线 */
html[data-plain-theme="v29-emerald"] .plain-deck-cover {
  padding: 100px 80px;
  background: var(--plain-paper);
  text-align: center;
  border-top: 1px solid var(--plain-ink);
  border-bottom: 1px solid var(--plain-ink);
  position: relative;
}
html[data-plain-theme="v29-emerald"] .plain-deck-cover::before,
html[data-plain-theme="v29-emerald"] .plain-deck-cover::after {
  content: "";
  position: absolute;
  left: 80px; right: 80px;
  height: 1px;
  background: var(--plain-ink);
}
html[data-plain-theme="v29-emerald"] .plain-deck-cover::before { top: 16px; }
html[data-plain-theme="v29-emerald"] .plain-deck-cover::after { bottom: 16px; }
html[data-plain-theme="v29-emerald"] .plain-deck-cover h1 {
  font-family: "Bodoni Moda", "Cormorant Garamond", Georgia, serif;
  font-size: clamp(3.5rem, 8vw, 6.5rem);
  line-height: 1.0;
  letter-spacing: -0.01em;
  font-weight: 800;
}
html[data-plain-theme="v29-emerald"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  font-style: italic;
  margin-top: 0.15em;
}

/* Pin & Paper · center-stack + 别针 + paper grain */
html[data-plain-theme="v29-pinpaper"] .plain-deck-cover {
  padding: 120px 80px;
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),
    var(--plain-paper);
  border: 1px solid var(--plain-ink);
  margin: 30px;
  position: relative;
}
html[data-plain-theme="v29-pinpaper"] .plain-deck-cover::before {
  content: "📎";
  position: absolute;
  top: 24px; left: 32px;
  font-size: 36px;
  transform: rotate(-25deg);
  filter: drop-shadow(2px 2px 0 var(--plain-ink-mute));
}
html[data-plain-theme="v29-pinpaper"] .plain-deck-cover h1 {
  font-family: "Caveat", "Kalam", cursive;
  font-size: clamp(4rem, 10vw, 7.5rem);
  line-height: 0.95;
  letter-spacing: -0.01em;
  font-weight: 700;
}
html[data-plain-theme="v29-pinpaper"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  font-style: italic;
}

/* Stencil & Tablet · 土系 + 镂空标题 */
html[data-plain-theme="v29-stencil"] .plain-deck-cover {
  padding: 140px 80px;
  background: var(--plain-paper);
  border-left: 6px solid var(--plain-accent);
  position: relative;
}
html[data-plain-theme="v29-stencil"] .plain-deck-cover::after {
  content: "";
  position: absolute;
  bottom: 0; right: 0;
  width: 100px; height: 100px;
  background:
    linear-gradient(135deg, transparent 50%, var(--plain-accent) 50%);
}
html[data-plain-theme="v29-stencil"] .plain-deck-cover h1 {
  font-family: "Archivo Black", "Anton", sans-serif;
  font-size: clamp(3.5rem, 9vw, 7rem);
  line-height: 0.95;
  font-weight: 900;
  text-transform: uppercase;
  color: transparent;
  -webkit-text-stroke: 3px var(--plain-ink);
}
html[data-plain-theme="v29-stencil"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  -webkit-text-stroke: 0;
  font-style: normal;
}

/* Monochrome · ledger-rows · 纯黑 + ledger 横线 */
html[data-plain-theme="v29-monochrome"] .plain-deck-cover {
  padding: 120px 100px;
  background:
    repeating-linear-gradient(0deg, transparent 0px, transparent 38px, color-mix(in oklab, var(--plain-ink) 6%, transparent) 38px, color-mix(in oklab, var(--plain-ink) 6%, transparent) 39px),
    var(--plain-paper);
  border-top: 2px solid var(--plain-ink);
  border-bottom: 2px solid var(--plain-ink);
}
html[data-plain-theme="v29-monochrome"] .plain-deck-cover h1 {
  font-family: "Lora", "Source Serif 4", Georgia, serif;
  font-size: clamp(3rem, 7vw, 5.5rem);
  line-height: 1.1;
  letter-spacing: -0.005em;
  font-weight: 500;
}
html[data-plain-theme="v29-monochrome"] .plain-deck-cover h1 em {
  display: block;
  font-style: italic;
  font-weight: 400;
  color: var(--plain-ink);
  opacity: 0.65;
}

/* Pink Script · 深夜杂志 · 黑底 + 热粉 + soft glow */
html[data-plain-theme="v29-pink"] .plain-deck-cover {
  padding: 140px 80px;
  background:
    radial-gradient(40% 60% at 30% 40%, color-mix(in oklab, var(--plain-accent) 30%, transparent) 0%, transparent 70%),
    radial-gradient(60% 80% at 80% 90%, color-mix(in oklab, var(--plain-accent) 20%, transparent) 0%, transparent 70%),
    var(--plain-paper);
  position: relative;
}
html[data-plain-theme="v29-pink"] .plain-deck-cover h1 {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(4rem, 11vw, 9rem);
  line-height: 0.9;
  letter-spacing: -0.015em;
  font-weight: 400;
  font-style: italic;
  color: var(--plain-ink);
}
html[data-plain-theme="v29-pink"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  text-shadow: 0 0 32px color-mix(in oklab, var(--plain-accent) 50%, transparent);
}

/* Vellum · 学者夜读 · navy 底 + 暖黄 serif */
html[data-plain-theme="v29-vellum"] .plain-deck-cover {
  padding: 140px 100px;
  background: var(--plain-paper);
  text-align: center;
  border-top: 1px solid color-mix(in oklab, var(--plain-ink) 30%, transparent);
  border-bottom: 1px solid color-mix(in oklab, var(--plain-ink) 30%, transparent);
}
html[data-plain-theme="v29-vellum"] .plain-deck-cover h1 {
  font-family: "Cormorant Garamond", "Source Serif 4", Georgia, serif;
  font-size: clamp(3.5rem, 9vw, 7rem);
  line-height: 1.0;
  letter-spacing: -0.01em;
  font-weight: 500;
  color: var(--plain-ink);
}
html[data-plain-theme="v29-vellum"] .plain-deck-cover h1 em {
  display: block;
  color: var(--plain-accent);
  font-style: italic;
  margin-top: 0.15em;
}

/* ─────────── 竖版社交分享卡(小红书/朋友圈/IG · 2026-07-03) ───────────
   [data-plain-social="portrait"] 时:把 cover 固定成 1080×1440(3:4),
   复用 cover 全部装饰(noise/halftone/radial),去 nav+水印,截图即得竖版营销图。
   只在该属性下生效,不影响横版/present/scroll。 */
[data-plain-social="portrait"] body {
  margin: 0;
  background: var(--plain-paper);
  display: flex;
  justify-content: center;
}
[data-plain-social="portrait"] .plain-nav,
[data-plain-social="portrait"] .plain-watermark {
  display: none !important;
}
[data-plain-social="portrait"] section.plain-section.plain-deck-cover {
  width: 1080px;
  height: 1440px;
  padding: 128px 96px;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: none;
}
[data-plain-social="portrait"] .plain-deck-cover h1 {
  font-size: clamp(3.2rem, 8vw, 5.4rem);
  line-height: 1.12;
  letter-spacing: -0.01em;
}
[data-plain-social="portrait"] .plain-deck-cover .plain-deck-lead {
  font-size: 1.5rem;
  line-height: 1.6;
  margin-top: 1.4em;
}
[data-plain-social="portrait"] .plain-deck-cover .plain-deck-kicker {
  font-size: 1.05rem;
}
[data-plain-social="portrait"] .plain-deck-cover .plain-deck-byline {
  margin-top: 2em;
  font-size: 1.1rem;
}
`;

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? ""));
}

function arrObj(v: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
}
