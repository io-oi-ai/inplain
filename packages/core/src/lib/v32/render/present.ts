/**
 * V32 S2 · 分屏算法 + present/report 的 CSS 组装
 *
 * present 不是渲染分支:renderReport 出一份 block DOM,present/report 只在 CSS/包裹层不同。
 *   - report:blocks 顺序垂直流(套 DOC_BASE_CSS)
 *   - present:按 pageBreak 把 blocks 切成屏,每屏 .slide,套 VIEWPORT_BASE_CSS + STAGE_SCALER_JS letterbox
 *
 * 复用 v31 util:VIEWPORT_BASE_CSS / STAGE_SCALER_JS / DOC_BASE_CSS(letterbox/滚动/翻页零重造)。
 */
import type { Block } from "../content/schema";

/**
 * V32 S2 · §2.3 分屏算法:遇 pageBreak && 当前屏非空则切新屏。
 * group 块整体算一屏内容(不被拆 —— 它本就是叶子级 renderChild 递归,不参与切分)。
 *
 * 规则:
 *   - 顺序扫 blocks,累积到当前屏
 *   - 命中 block.pageBreak 且当前屏已有内容 → 结束当前屏,该 block 起新屏
 *   - cover/closing 天然是整屏,但切分只认 pageBreak(由 S1 迁移/AI 标注保证)
 *   - **全程无 pageBreak → 退化成按 heading 分屏**(见下)
 *
 * 为什么要兜底:pageBreak 只有 deck 来源会标(fromV31 对 doc/sheet 刻意不加)。
 * V32 让三种 kind 都能演讲后,doc/sheet 进 present 会挤成**一整屏**
 * (技术上"能渲染",实际没法当演讲用)。无 pageBreak 时按语义边界切:
 *   - 有 heading → 按 heading 切(作者自己给的章节边界,比按块数机械切更合语义)
 *   - 没 heading 但顶层是 group(sheet 的典型形状:一个 group = 一行面板)
 *     → 每个顶层 group 一屏
 * 两者都没有 → 保持单屏(短文档本来就该一屏)。
 */
export function splitIntoSlides(blocks: Block[]): Block[][] {
  const hasExplicitBreak = blocks.some((b) => b.pageBreak);
  const hasHeading = blocks.some((b) => b.type === "heading");
  const isBreakPoint = hasExplicitBreak
    ? (b: Block) => Boolean(b.pageBreak)
    : hasHeading
      ? (b: Block) => b.type === "heading"
      : (b: Block) => b.type === "group";

  const slides: Block[][] = [];
  let cur: Block[] = [];
  for (const b of blocks) {
    if (isBreakPoint(b) && cur.length > 0) {
      slides.push(cur);
      cur = [];
    }
    cur.push(b);
  }
  if (cur.length > 0) slides.push(cur);
  return slides.length > 0 ? slides : [[]];
}

/**
 * V32 S2 · 素模板默认样式(纯 token · 无颜色/字号硬编码)
 *
 * 定义 --v32-* 排版尺度(相对 rem/em/vw)+ 直接吃项目全局 --plain-* 颜色 token。
 * present mode 下字号基准放大(舞台 1920 基准),report mode 用文档基准。
 * 模板(S3)通过覆盖这些 token 长出 DNA。
 */
export const V32_BLANK_THEME_CSS = `
:root {
  /* 颜色 token · fallback 到中性值(独立打开也不裸)· 生产环境吃全局 --plain-* */
  --plain-bg: var(--plain-bg, #ffffff);
  --plain-surface: var(--plain-surface, #f7f7f8);
  --plain-surface-2: var(--plain-surface-2, #efeff1);
  --plain-text: var(--plain-text, #1a1a1a);
  --plain-text-mute: var(--plain-text-mute, #55555c);
  --plain-text-faint: var(--plain-text-faint, #8a8a92);
  --plain-border: var(--plain-border, #e2e2e6);
  --plain-border-strong: var(--plain-border-strong, #c8c8cf);
  --plain-accent: var(--plain-accent, #3b5bdb);
  --plain-accent-strong: var(--plain-accent-strong, #2f49b0);
  --plain-accent-bg: var(--plain-accent-bg, #eef1fd);
  --plain-success: var(--plain-success, #2f9e44);
  --plain-warn: var(--plain-warn, #e8590c);
  --plain-danger: var(--plain-danger, #e03131);
  --plain-danger-bg: var(--plain-danger-bg, #fff0f0);

  /* 舞台颜色映射(letterbox 用) */
  --stage-bg: var(--plain-surface-2);
  --slide-bg: var(--plain-bg);
  --doc-page-bg: var(--plain-bg);
  --doc-text: var(--plain-text);

  /* 排版尺度(相对 · 不写死 px 字号) */
  --v32-scale: 1;
  --v32-gap: 1.5rem;
  --v32-radius: 12px;
  --v32-maxw: 760px;
  font-family: var(--font-body, system-ui, -apple-system, "Segoe UI", sans-serif);
}

.v32-block { color: var(--plain-text); box-sizing: border-box; }
.v32-block * { box-sizing: border-box; }
.v32-kicker { font-size: 0.75em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--plain-accent); font-weight: 600; margin-bottom: 0.5em; }

/* cover / closing */
.v32-cover, .v32-closing { text-align: left; }
.v32-cover-kicker { font-size: 0.85em; letter-spacing: 0.1em; text-transform: uppercase; color: var(--plain-accent); font-weight: 600; margin-bottom: 0.75em; }
.v32-cover-display, .v32-closing-display { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.05; font-weight: 800; color: var(--plain-text); margin: 0; letter-spacing: -0.02em; }
.v32-cover-tail { color: var(--plain-accent); }
.v32-cover-lead, .v32-closing-sub { font-size: 1.15em; color: var(--plain-text-mute); margin-top: 0.75em; max-width: 42ch; }
.v32-cover-byline { display: flex; gap: 1em; margin-top: 1.25em; color: var(--plain-text-faint); font-size: 0.9em; }
.v32-closing-cta { display: flex; gap: 0.75em; margin-top: 1.5em; }
.v32-cta { display: inline-flex; align-items: center; padding: 0.7em 1.4em; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 0.95em; }
.v32-cta[data-kind="primary"] { background: var(--plain-accent); color: var(--plain-bg); }
.v32-cta[data-kind="secondary"] { background: transparent; color: var(--plain-accent); border: 1px solid var(--plain-border-strong); }

/* statement */
.v32-statement-num { font-size: clamp(3rem, 8vw, 5rem); font-weight: 800; color: var(--plain-accent); line-height: 1; letter-spacing: -0.03em; }
.v32-statement-text { font-size: 1.4em; font-weight: 600; color: var(--plain-text); margin: 0.4em 0 0; max-width: 32ch; }
.v32-statement-anno { color: var(--plain-text-mute); margin-top: 0.6em; font-size: 0.95em; }

/* prose */
.v32-prose-body { color: var(--plain-text); line-height: 1.7; }
.v32-prose-body h1,.v32-prose-body h2,.v32-prose-body h3 { color: var(--plain-text); line-height: 1.25; margin: 1.2em 0 0.4em; }
.v32-prose-body p { margin: 0 0 0.9em; }
.v32-prose-body ul,.v32-prose-body ol { margin: 0 0 0.9em; padding-left: 1.4em; }
.v32-prose-body li { margin: 0.25em 0; }
.v32-prose-body a { color: var(--plain-accent); }
.v32-prose-body code { background: var(--plain-surface-2); padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
.v32-prose[data-tone="warn"] { border-left: 3px solid var(--plain-warn); padding-left: 1em; }
.v32-prose[data-tone="danger"] { border-left: 3px solid var(--plain-danger); padding-left: 1em; }
.v32-prose[data-tone="ok"] { border-left: 3px solid var(--plain-success); padding-left: 1em; }

/* heading */
.v32-heading-text { color: var(--plain-text); font-weight: 700; margin: 0; line-height: 1.2; }
.v32-heading[data-level="1"] .v32-heading-text { font-size: 2rem; }
.v32-heading[data-level="2"] .v32-heading-text { font-size: 1.6rem; }
.v32-heading[data-level="3"] .v32-heading-text { font-size: 1.3rem; }
.v32-heading[data-level="4"] .v32-heading-text { font-size: 1.1rem; color: var(--plain-text-mute); }

/* quote */
.v32-quote { margin: 0; }
.v32-quote-text { font-size: 1.4em; font-weight: 500; font-style: italic; color: var(--plain-text); margin: 0; border-left: 3px solid var(--plain-accent); padding-left: 0.8em; line-height: 1.4; }
.v32-quote-attr { color: var(--plain-text-mute); margin-top: 0.6em; font-size: 0.95em; }

/* callout */
.v32-callout { border-radius: var(--v32-radius); padding: 1em 1.2em; border: 1px solid var(--plain-border); background: var(--plain-surface); }
.v32-callout[data-tone="info"], .v32-callout[data-tone="note"] { border-color: var(--plain-accent); background: var(--plain-accent-bg); }
.v32-callout[data-tone="ok"] { border-color: var(--plain-success); }
.v32-callout[data-tone="tip"] { border-color: var(--plain-success); }
.v32-callout[data-tone="warn"] { border-color: var(--plain-warn); }
.v32-callout[data-tone="danger"] { border-color: var(--plain-danger); background: var(--plain-danger-bg); }
.v32-callout-title { font-weight: 700; color: var(--plain-text); margin-bottom: 0.3em; }
.v32-callout-body { color: var(--plain-text); line-height: 1.6; }
.v32-callout-body p:last-child { margin-bottom: 0; }

/* metrics */
.v32-metrics-title { font-size: 1.2em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--v32-gap); }
.v32-metric { background: var(--plain-surface); border: 1px solid var(--plain-border); border-radius: var(--v32-radius); padding: 1.1em; }
.v32-metric-value { font-size: 2rem; font-weight: 800; color: var(--plain-text); letter-spacing: -0.02em; display: flex; align-items: baseline; gap: 0.25em; }
.v32-metric-label { color: var(--plain-text-mute); margin-top: 0.25em; font-size: 0.95em; }
.v32-metric-hint { color: var(--plain-text-faint); font-size: 0.8em; margin-top: 0.15em; }
.v32-delta { font-size: 0.6em; }
.v32-metric[data-delta="up"] .v32-delta { color: var(--plain-success); }
.v32-metric[data-delta="down"] .v32-delta { color: var(--plain-danger); }
.v32-metric[data-delta="flat"] .v32-delta { color: var(--plain-text-faint); }

/* cards */
.v32-cards-title { font-size: 1.4em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--v32-gap); }
.v32-cards[data-layout="steps"] .v32-cards-grid, .v32-cards[data-layout="numbered"] .v32-cards-grid { grid-template-columns: 1fr; }
.v32-card { background: var(--plain-surface); border: 1px solid var(--plain-border); border-radius: var(--v32-radius); padding: 1.25em; position: relative; }
.v32-card-num { font-size: 1.6em; font-weight: 800; color: var(--plain-accent); opacity: 0.5; }
.v32-card-icon { font-size: 1.6em; }
.v32-card-head { font-size: 1.05em; color: var(--plain-text); margin: 0.3em 0 0.4em; }
.v32-card-body { color: var(--plain-text-mute); margin: 0; line-height: 1.55; font-size: 0.95em; }
.v32-card-when { color: var(--plain-text-faint); font-size: 0.85em; margin-top: 0.5em; }
.v32-card-metric { margin-top: 0.6em; }
.v32-card-metric-v { font-weight: 800; color: var(--plain-accent); font-size: 1.2em; }
.v32-card-metric-l { color: var(--plain-text-mute); font-size: 0.85em; margin-left: 0.4em; }

/* sequence */
.v32-seq-title { font-size: 1.4em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-seq-list { list-style: none; margin: 0; padding: 0; }
.v32-seq-item { position: relative; padding-left: 1.6em; padding-bottom: 1.1em; border-left: 2px solid var(--plain-border); }
.v32-seq-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.v32-seq-dot { position: absolute; left: -6px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--plain-accent); }
.v32-seq-when { color: var(--plain-text-faint); font-size: 0.8em; letter-spacing: 0.04em; }
.v32-seq-label { color: var(--plain-text); font-weight: 600; }
.v32-seq-hint { color: var(--plain-text-mute); font-size: 0.9em; margin-top: 0.15em; }
.v32-sequence[data-flow="arrow"] .v32-seq-item { border-left-style: dashed; }

/* compare */
.v32-compare-title { font-size: 1.4em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-compare-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--v32-gap); }
.v32-compare-col { background: var(--plain-surface); border: 1px solid var(--plain-border); border-radius: var(--v32-radius); padding: 1.25em; }
.v32-compare-col[data-side="right"] { border-color: var(--plain-accent); }
.v32-compare-label { font-weight: 700; color: var(--plain-text); margin-bottom: 0.5em; }
.v32-compare-bullets { margin: 0; padding-left: 1.2em; color: var(--plain-text-mute); }
.v32-compare-bullets li { margin: 0.3em 0; }

/* quadrant */
.v32-quad-plot { position: relative; width: 100%; aspect-ratio: 16/10; background: var(--plain-surface); border: 1px solid var(--plain-border); border-radius: var(--v32-radius); }
.v32-quad-axis-x { position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed var(--plain-border-strong); }
.v32-quad-axis-y { position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1px dashed var(--plain-border-strong); }
.v32-quad-q { position: absolute; font-size: 0.8em; color: var(--plain-text-faint); padding: 0.5em; }
.v32-quad-q[data-q="tl"] { top: 0; left: 0; }
.v32-quad-q[data-q="tr"] { top: 0; right: 0; }
.v32-quad-q[data-q="bl"] { bottom: 0; left: 0; }
.v32-quad-q[data-q="br"] { bottom: 0; right: 0; }
.v32-quad-point { position: absolute; transform: translate(-50%, 50%); display: flex; align-items: center; gap: 0.4em; }
.v32-quad-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--plain-accent); display: inline-block; }
.v32-quad-point[data-focal="true"] .v32-quad-dot { background: var(--plain-danger); width: 16px; height: 16px; }
.v32-quad-plabel { font-size: 0.8em; color: var(--plain-text); white-space: nowrap; }
.v32-quad-xlabel { position: absolute; bottom: -1.6em; left: 50%; transform: translateX(-50%); font-size: 0.8em; color: var(--plain-text-mute); }
.v32-quad-ylabel { position: absolute; left: -1.6em; top: 50%; transform: translateY(-50%) rotate(-90deg); font-size: 0.8em; color: var(--plain-text-mute); }

/* table */
.v32-table-title { font-size: 1.2em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-table-scroll { overflow-x: auto; }
.v32-table-el { width: 100%; border-collapse: collapse; font-size: 0.95em; }
.v32-table-el th, .v32-table-el td { text-align: left; padding: 0.6em 0.8em; border-bottom: 1px solid var(--plain-border); color: var(--plain-text); }
.v32-table-el th { color: var(--plain-text-mute); font-weight: 700; border-bottom: 2px solid var(--plain-border-strong); }

/* chart · SVG 用 currentColor → 这里给容器 color=accent,轴/文字降透明度 */
.v32-chart-title { font-size: 1.2em; color: var(--plain-text); margin: 0 0 0.5em; }
.v32-chart-svg { color: var(--plain-accent); max-width: 100%; }
.v32-chart-svg svg { max-width: 100%; height: auto; }
.v32-chart-caption { color: var(--plain-text-mute); font-size: 0.85em; margin-top: 0.4em; }

/* media */
.v32-media { display: grid; grid-template-columns: 1fr 1fr; gap: var(--v32-gap); align-items: center; }
.v32-media[data-side="left"] { direction: rtl; }
.v32-media[data-side="left"] > * { direction: ltr; }
.v32-media-title { font-size: 1.5em; color: var(--plain-text); margin: 0.2em 0 0.4em; }
.v32-media-body { color: var(--plain-text-mute); line-height: 1.6; }
.v32-media-img { width: 100%; border-radius: var(--v32-radius); display: block; }
.v32-media-ph { width: 100%; aspect-ratio: 4/3; background: var(--plain-surface-2); border-radius: var(--v32-radius); }
.v32-media-quote blockquote { font-size: 1.3em; font-style: italic; color: var(--plain-text); margin: 0; }
.v32-media-quote figcaption { color: var(--plain-text-mute); margin-top: 0.5em; }

/* group */
.v32-group-title { font-size: 1.3em; color: var(--plain-text); margin: 0 0 0.75em; }
.v32-group-inner { display: flex; gap: var(--v32-gap); }
.v32-group-inner[data-layout="row"] { flex-direction: row; flex-wrap: wrap; }
.v32-group-inner[data-layout="stack"] { flex-direction: column; }
.v32-group-inner > .v32-block { flex: 1 1 0; min-width: 0; }
.v32-group-inner > .v32-block[data-span="half"] { flex: 1 1 45%; }
.v32-group-inner > .v32-block[data-span="third"] { flex: 1 1 30%; }
.v32-group-inner > .v32-block[data-span="full"] { flex: 1 1 100%; }

/* span(顶层 report 流) */
.v32-flow > .v32-block[data-span="half"] { max-width: 50%; }
.v32-flow > .v32-block[data-span="third"] { max-width: 33%; }
`.trim();

/**
 * V32 S2 · report mode 专属布局(垂直流)· 叠在 DOC_BASE_CSS 之后
 * present mode 专属:每屏 .slide 内部 padding + 居中,舞台 1920×1080。
 */
export const V32_REPORT_CSS = `
.v32-flow { max-width: var(--v32-maxw); margin: 0 auto; }
.v32-flow > * + * { margin-top: 2.5rem; }
`.trim();

export const V32_PRESENT_CSS = `
/* present:每屏内容居中,内边距按 1920 舞台;字号放大到演示基准 */
.slide { display: flex; align-items: center; }
.v32-slide-inner { width: 100%; padding: 96px 120px; display: flex; flex-direction: column; gap: 32px; justify-content: center; }
.v32-slide-inner { font-size: 24px; }
.v32-slide-inner .v32-cover-display, .v32-slide-inner .v32-closing-display { font-size: 96px; }
.v32-slide-inner .v32-statement-num { font-size: 160px; }
.v32-slide-inner .v32-metric-value { font-size: 56px; }
/* 单屏多块也走垂直堆叠 · group 内仍横排 */
`.trim();
