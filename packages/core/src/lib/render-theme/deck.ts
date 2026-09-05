/**
 * Marp 主题家族（Gamma 风）—— 5 套辨识度明确的模板
 *
 * 每个主题一份完整 Marp theme CSS（以 `/* @theme name *\/` 开头）。
 * 通过 marp.themeSet.add() 注册，在 frontmatter `theme: <name>` 切换。
 */

// 共享样式片段（各主题里 import 难，所以复制粘贴到每套）
const SHARED_RESET = `
* { box-sizing: border-box; }
section {
  font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, system-ui, sans-serif;
  font-size: 26px;
  line-height: 1.55;
  padding: 64px 72px;
  letter-spacing: 0.003em;
  position: relative;
  overflow: hidden;
}
section ul, section ol { padding-left: 28px; margin: 16px 0; }
section li { margin: 10px 0; line-height: 1.55; }
section pre {
  padding: 20px 24px;
  border-radius: 10px;
  font-size: 18px;
  line-height: 1.5;
  overflow-x: auto;
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
}
section code {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  padding: 3px 8px;
  border-radius: 4px;
}
section blockquote {
  padding: 4px 0 4px 24px;
  margin: 24px 0;
  font-style: italic;
}
section img { max-width: 100%; border-radius: 8px; }
section table { border-collapse: collapse; margin: 20px 0; font-size: 20px; }
section th, section td { padding: 12px 18px; text-align: left; }
section::after {
  font-size: 14px;
  font-family: "Inter", sans-serif;
  letter-spacing: 0.08em;
  right: 36px;
  bottom: 28px;
}
`;

// ─────────────────────────────────────────────────────────────
// 1. plain-mono —— 黑白极简（之前的默认 plain 主题）
// ─────────────────────────────────────────────────────────────
export const THEME_MONO = `/* @theme plain-mono */

${SHARED_RESET}

section {
  background: #fbfbfa;
  color: #1a1a1a;
}
section h1, section h2, section h3 {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  color: #1a1a1a;
  letter-spacing: -0.015em;
  font-weight: 700;
  line-height: 1.15;
}
section h1 { font-size: 72px; margin: 0 0 24px; }
section h2 { font-size: 44px; margin: 0 0 28px; }
section h3 { font-size: 32px; margin: 24px 0 16px; color: #6a6a6a; font-weight: 600; }
section p { font-size: 24px; margin: 0 0 18px; }
section ul li::marker, section ol li::marker { color: #2563eb; }
section em { color: #2563eb; font-style: italic; }
section a { color: #2563eb; text-decoration: underline; text-underline-offset: 4px; }
section.lead, section:has(> h1:only-child) {
  background: linear-gradient(135deg, #fbfbfa 0%, #f0ede8 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 96px;
}
section:has(> h1:only-child) h1 { font-size: 88px; line-height: 1.1; }
section blockquote { border-left: 4px solid #2563eb; color: #6a6a6a; font-size: 28px; }
section code { background: rgba(0, 0, 0, 0.05); }
section pre { background: rgba(0, 0, 0, 0.04); border-left: 3px solid #2563eb; }
section th { font-weight: 600; border-bottom: 2px solid #1a1a1a; }
section td, section th { border-bottom: 1px solid #dcdcda; }
section::after { color: #9a9a9a; }
`;

// ─────────────────────────────────────────────────────────────
// 2. plain-editorial —— 杂志刊物风（暖色衬线）
// ─────────────────────────────────────────────────────────────
export const THEME_EDITORIAL = `/* @theme plain-editorial */

${SHARED_RESET}

section {
  background: #f9f5ef;
  color: #2c2720;
}
section h1, section h2, section h3, section h4 {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  color: #1a1612;
  letter-spacing: -0.02em;
  font-weight: 700;
}
section h1 { font-size: 76px; line-height: 1.1; margin: 0 0 28px; }
section h2 {
  font-size: 48px;
  line-height: 1.2;
  margin: 0 0 32px;
  border-bottom: 2px solid #d4a574;
  padding-bottom: 12px;
  display: inline-block;
}
section h3 { font-size: 34px; color: #6b5c46; font-style: italic; font-weight: 500; }
section p { font-size: 24px; margin: 0 0 20px; color: #3a3329; }
section ul li::marker, section ol li::marker { color: #c8661f; font-weight: 700; }
section em { color: #c8661f; font-style: italic; }
section strong { color: #1a1612; }
section a { color: #c8661f; text-decoration: underline; text-decoration-thickness: 2px; }
section.lead, section:has(> h1:only-child) {
  background:
    linear-gradient(180deg, rgba(212, 165, 116, 0.12) 0%, transparent 50%),
    #f9f5ef;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 100px;
}
section:has(> h1:only-child) h1 {
  font-size: 96px;
  line-height: 1.05;
}
section blockquote {
  border-left: 5px solid #c8661f;
  color: #6b5c46;
  font-size: 30px;
  font-family: "Charter", Georgia, serif;
}
section code { background: rgba(200, 102, 31, 0.1); color: #c8661f; }
section pre {
  background: #2c2720;
  color: #f9f5ef;
  border-left: 4px solid #c8661f;
}
section th { font-weight: 700; border-bottom: 2px solid #1a1612; }
section td, section th { border-bottom: 1px solid #d4c9b5; }
section::after { color: #a89c8a; font-style: italic; }
`;

// ─────────────────────────────────────────────────────────────
// 3. plain-bold —— 发布会风（粗标题 + 鲜明对比色）
// ─────────────────────────────────────────────────────────────
export const THEME_BOLD = `/* @theme plain-bold */

${SHARED_RESET}

section {
  background: #ffffff;
  color: #111111;
}
section h1, section h2, section h3 {
  font-family: "Inter", "PingFang SC", sans-serif;
  color: #111111;
  letter-spacing: -0.035em;
  font-weight: 900;
  line-height: 1.0;
}
section h1 { font-size: 96px; margin: 0 0 36px; }
section h2 {
  font-size: 60px;
  margin: 0 0 32px;
  background: linear-gradient(90deg, #111 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
section h3 { font-size: 36px; color: #2563eb; font-weight: 800; }
section p { font-size: 26px; margin: 0 0 22px; font-weight: 400; }
section strong { color: #2563eb; font-weight: 700; }
section ul li::marker { color: #2563eb; font-size: 1.3em; font-weight: 900; }
section ol li::marker { color: #2563eb; font-weight: 800; }
section em { color: #111; font-style: normal; background: rgba(37, 99, 235, 0.18); padding: 0 4px; border-radius: 3px; }
section a { color: #2563eb; text-decoration: underline; text-decoration-thickness: 3px; }
section.lead, section:has(> h1:only-child) {
  background: #111111;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 100px;
}
section.lead h1, section:has(> h1:only-child) h1 {
  color: #ffffff;
  font-size: 120px;
  line-height: 0.95;
  -webkit-text-fill-color: #ffffff;
}
section blockquote {
  border-left: 6px solid #2563eb;
  color: #444;
  font-size: 32px;
  font-weight: 500;
}
section code { background: #eef4ff; color: #2563eb; font-weight: 600; }
section pre { background: #111; color: #e5e5e5; border-left: 4px solid #2563eb; }
section th { font-weight: 800; border-bottom: 3px solid #111; text-transform: uppercase; letter-spacing: 0.05em; font-size: 18px; }
section td, section th { border-bottom: 1px solid #e5e5e5; }
section::after { color: #bbb; font-weight: 600; }
`;

// ─────────────────────────────────────────────────────────────
// 4. plain-serene —— 冥想产品风（低饱和绿蓝）
// ─────────────────────────────────────────────────────────────
export const THEME_SERENE = `/* @theme plain-serene */

${SHARED_RESET}

section {
  background: linear-gradient(135deg, #f0f7f4 0%, #e8f1f5 100%);
  color: #2a3a3a;
}
section h1, section h2, section h3 {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  color: #1e3a3a;
  letter-spacing: -0.01em;
  font-weight: 600;
  line-height: 1.25;
}
section h1 { font-size: 68px; margin: 0 0 28px; font-weight: 500; }
section h2 { font-size: 42px; margin: 0 0 24px; font-weight: 500; }
section h3 { font-size: 30px; color: #4a6a6a; font-weight: 400; font-style: italic; }
section p { font-size: 24px; margin: 0 0 18px; color: #3a4a4a; font-weight: 300; }
section strong { color: #1e3a3a; font-weight: 600; }
section ul li::marker, section ol li::marker { color: #5a8a7a; }
section em { color: #5a8a7a; }
section a { color: #5a8a7a; text-decoration: underline; text-underline-offset: 4px; }
section.lead, section:has(> h1:only-child) {
  background:
    radial-gradient(ellipse at top right, rgba(90, 138, 122, 0.15) 0%, transparent 60%),
    linear-gradient(135deg, #f0f7f4 0%, #e8f1f5 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 100px;
}
section:has(> h1:only-child) h1 { font-size: 88px; line-height: 1.1; font-weight: 400; }
section blockquote {
  border-left: 3px solid #5a8a7a;
  color: #4a6a6a;
  font-size: 26px;
  font-family: "Charter", Georgia, serif;
}
section code { background: rgba(90, 138, 122, 0.12); color: #3a5a4a; }
section pre { background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(90, 138, 122, 0.2); }
section th { font-weight: 600; border-bottom: 2px solid #1e3a3a; }
section td, section th { border-bottom: 1px solid rgba(90, 138, 122, 0.2); }
section::after { color: #7a9a8a; font-style: italic; }
`;

// ─────────────────────────────────────────────────────────────
// 5. plain-dusk —— 深色科技风（紫渐变黑夜）
// ─────────────────────────────────────────────────────────────
export const THEME_DUSK = `/* @theme plain-dusk */

${SHARED_RESET}

section {
  background: linear-gradient(135deg, #1a1026 0%, #0f0b1a 100%);
  color: #e6e1ed;
}
section h1, section h2, section h3 {
  font-family: "Inter", "PingFang SC", sans-serif;
  letter-spacing: -0.02em;
  font-weight: 700;
  line-height: 1.15;
}
section h1 {
  font-size: 84px;
  margin: 0 0 32px;
  color: #ffffff;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
section h2 { font-size: 48px; margin: 0 0 28px; color: #f5f0ff; }
section h3 { font-size: 32px; color: #a78bfa; font-weight: 600; }
section p { font-size: 24px; margin: 0 0 20px; color: #d8d1e0; }
section strong { color: #ffffff; font-weight: 600; }
section ul li::marker, section ol li::marker { color: #a78bfa; }
section em { color: #c4b5fd; font-style: italic; }
section a { color: #a78bfa; text-decoration: underline; text-underline-offset: 4px; }
section.lead, section:has(> h1:only-child) {
  background:
    radial-gradient(ellipse at top left, rgba(167, 139, 250, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.18) 0%, transparent 50%),
    linear-gradient(135deg, #1a1026 0%, #0f0b1a 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 100px;
}
section:has(> h1:only-child) h1 { font-size: 104px; line-height: 1.05; }
section blockquote {
  border-left: 4px solid #a78bfa;
  color: #b8afc7;
  font-size: 28px;
  font-style: italic;
}
section code {
  background: rgba(167, 139, 250, 0.18);
  color: #c4b5fd;
  font-weight: 500;
}
section pre {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(167, 139, 250, 0.25);
  color: #e6e1ed;
}
section th { font-weight: 700; border-bottom: 2px solid #a78bfa; color: #ffffff; }
section td, section th { border-bottom: 1px solid rgba(167, 139, 250, 0.18); }
section::after { color: #7a6c8e; letter-spacing: 0.1em; }
`;

// ─────────────────────────────────────────────────────────────
// 6. plain-kami —— 和纸印刷风（暖米底 · 油墨蓝 · 编辑级留白）
//    参考 tw93/kami：Good content deserves good paper。
// ─────────────────────────────────────────────────────────────
export const THEME_KAMI = `/* @theme plain-kami */

${SHARED_RESET}

section {
  background: #f5f4ed;
  color: #141413;
  padding: 72px 88px;
}
section h1, section h2, section h3, section h4 {
  font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif;
  color: #141413;
  letter-spacing: -0.01em;
  font-weight: 500;
  line-height: 1.2;
}
section h1 { font-size: 72px; margin: 0 0 28px; }
section h2 {
  font-size: 44px;
  margin: 0 0 24px;
  padding-left: 18px;
  border-left: 2.5px solid #1B365D;
  line-height: 1.25;
}
section h3 { font-size: 30px; color: #3d3d3a; margin: 24px 0 14px; }
section p { font-size: 24px; line-height: 1.55; margin: 0 0 18px; color: #3d3d3a; }
section strong { color: #1B365D; font-weight: 500; }
section em { color: #1B365D; font-style: normal; }
section ul li::marker, section ol li::marker { color: #87867f; }
section a { color: #1B365D; text-decoration: underline; text-underline-offset: 4px; }
section blockquote {
  border-left: 2.5px solid #1B365D;
  color: #4d4c48;
  font-style: italic;
  padding-left: 20px;
  margin: 28px 0;
  font-size: 22px;
}
section code { background: #EEF2F7; color: #1B365D; }
section pre {
  background: #EEF2F7;
  border-left: 2.5px solid #1B365D;
  color: #141413;
  font-size: 18px;
}
section th {
  font-weight: 500;
  border-bottom: 2px solid #1B365D;
  color: #141413;
  font-family: "Source Han Serif SC", Georgia, serif;
}
section td, section th { border-bottom: 1px solid #E4ECF5; padding: 10px 16px; }
section td { font-variant-numeric: tabular-nums; color: #3d3d3a; }
section.lead, section:has(> h1:only-child) {
  background: #f5f4ed;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 104px;
}
section:has(> h1:only-child) h1 {
  font-size: 96px;
  line-height: 1.1;
  border-left: none;
  padding-left: 0;
}
section:has(> h1:only-child)::before {
  content: "";
  display: block;
  width: 56px;
  height: 2.5px;
  background: #1B365D;
  margin-bottom: 32px;
}
section::after { color: #87867f; font-variant-numeric: tabular-nums; }
`;

// ─────────────────────────────────────────────────────────────
// 旧的 PLAIN_DECK_THEME 作为别名指向 plain-mono（保后向兼容）
export const PLAIN_DECK_THEME = THEME_MONO;

// ─────────────────────────────────────────────────────────────
// 所有主题列表 —— 现在来自 ThemeTokens presets,通过 tokensToMarpCss 生成。
// 硬编码的 THEME_MONO/EDITORIAL/... 常量保留但不再使用(后向兼容 export)。
// ─────────────────────────────────────────────────────────────
import { ALL_THEME_TOKENS } from "./theme-presets";
import { tokensToMarpCss } from "./tokens-to-css";
import { MOTION_CSS } from "./motion";

export const ALL_DECK_THEMES: Array<{
  id: string;
  label: string;
  css: string;
  hint?: string;
  description?: string;
  mood?: string;
}> =
  ALL_THEME_TOKENS.map((t) => ({
    id: t.id,
    label: t.label,
    hint: t.hint,
    description: t.description,
    mood: t.mood,
    css: tokensToMarpCss(t),
  }));

// ─────────────────────────────────────────────────────────────
// 外层 wrapper CSS（与主题分离：iframe 容器的 padding / 阴影等）
// ─────────────────────────────────────────────────────────────
export const DECK_WRAPPER_CSS = `
html, body {
  margin: 0;
  padding: 0;
  background: var(--plain-page-bg, #eaeaea);
  min-height: 100vh;
  transition: background 0.3s ease;
}
:root {
  --plain-page-bg: #e5e5e3;
  --plain-border: #dcdcda;
  --plain-bg-raised: #f5f5f4;
  --plain-text-secondary: #5a5a5a;
}
[data-theme="dark"] {
  --plain-page-bg: #0a0a0b;
  --plain-border: #2a2a2d;
  --plain-bg-raised: #18181a;
  --plain-text-secondary: #b4b4b4;
}
.marpit {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 32px;
}
.marpit > svg {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  max-width: 100%;
  height: auto;
  background: #fff;
}
[data-theme="dark"] .marpit > svg {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35);
}
`;

/**
 * 富 layout 样式 —— **必须注入到每个 Marp theme CSS 里**,不能放 wrapper。
 * 因为 Marp 把 section 放进 <svg><foreignObject>,外层 CSS 选中不到 section 内部。
 * 在 route.ts 注册 theme 时把这段字符串追加到主题 CSS 末尾。
 */
export const RICH_LAYOUT_CSS = `

/* stats 布局:指标卡阵列 */
.plain-layout-stats { padding: 56px 64px !important; }
.plain-layout-stats h2 {
  font-size: 34px !important;
  margin-bottom: 40px !important;
  opacity: 0.9;
}
.plain-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 0;
}
.plain-stats-grid[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
.plain-stats-grid[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
.plain-stats-grid[data-count="4"] { grid-template-columns: repeat(2, 1fr); }
.plain-stats-grid[data-count="5"], .plain-stats-grid[data-count="6"] {
  grid-template-columns: repeat(3, 1fr);
}
.plain-stat-card {
  padding: 24px 22px;
  border: 1px solid currentColor;
  border-opacity: 0.15;
  border-radius: 10px;
  position: relative;
  border-color: rgba(128, 128, 128, 0.2);
}
.plain-stat-value {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.plain-stat-delta {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 4px;
}
.plain-stat-up { color: #16a34a; background: rgba(22, 163, 74, 0.08); }
.plain-stat-down { color: #dc2626; background: rgba(220, 38, 38, 0.08); }
.plain-stat-label {
  font-size: 15px;
  margin-top: 12px;
  opacity: 0.7;
}
.plain-stat-hint {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.5;
  font-style: italic;
}

/* timeline 布局:横向时间轴 */
.plain-layout-timeline { padding: 64px 56px !important; }
.plain-timeline {
  display: grid;
  gap: 4px;
  margin: 32px 0;
  position: relative;
}
.plain-timeline[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
.plain-timeline[data-count="4"] { grid-template-columns: repeat(4, 1fr); }
.plain-timeline[data-count="5"] { grid-template-columns: repeat(5, 1fr); }
.plain-timeline[data-count="6"] { grid-template-columns: repeat(6, 1fr); }
.plain-timeline::before {
  content: "";
  position: absolute;
  top: 18px;
  left: 8%;
  right: 8%;
  height: 2px;
  background: currentColor;
  opacity: 0.18;
}
.plain-timeline-node {
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 0 8px;
}
.plain-timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  margin: 10px auto 18px;
  box-shadow: 0 0 0 5px var(--plain-bg-raised, #fff);
}
.plain-timeline-when {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 6px;
}
.plain-timeline-label {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}
.plain-timeline-hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.55;
  line-height: 1.4;
}

/* image-hero 布局:满版图 + 标题覆盖 */
.plain-layout-image-hero { padding: 0 !important; overflow: hidden; }
.plain-layout-image-hero h1,
.plain-layout-image-hero h2 {
  position: absolute;
  bottom: 80px;
  left: 64px;
  right: 64px;
  color: #fff !important;
  text-shadow: 0 2px 24px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.8);
  z-index: 2;
}
.plain-image-hero {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.plain-image-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%);
}
.plain-image-caption {
  position: absolute;
  bottom: 32px;
  left: 64px;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  z-index: 2;
}

/* image-split 布局:左图右文 */
.plain-layout-image-split {
  display: grid !important;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 0 !important;
  align-items: stretch;
}
.plain-layout-image-split .plain-image-split {
  overflow: hidden;
  position: relative;
}
.plain-layout-image-split .plain-image-split img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 0;
  margin: 0;
}
.plain-layout-image-split h2,
.plain-layout-image-split ul,
.plain-layout-image-split p {
  padding-left: 48px;
  padding-right: 48px;
}
.plain-layout-image-split h2:first-child { padding-top: 80px; }

/* ─── callout 信息框 ─── */
.plain-layout-callout { padding: 64px 72px !important; display: flex; flex-direction: column; justify-content: center; }
.plain-callout {
  border-radius: 14px;
  padding: 28px 32px;
  border-left: 4px solid currentColor;
  font-size: 22px;
  line-height: 1.5;
  margin-top: 24px;
}
.plain-callout-info    { background: rgba(37, 99, 235, 0.08);   color: #2563eb; }
.plain-callout-success { background: rgba(22, 163, 74, 0.08);   color: #16a34a; }
.plain-callout-warn    { background: rgba(234, 179, 8, 0.10);   color: #ca8a04; }
.plain-callout-danger  { background: rgba(220, 38, 38, 0.08);   color: #dc2626; }
.plain-callout-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: inherit;
}
.plain-callout-body { color: #1a1a1a; }
[data-theme="dark"] .plain-callout-body { color: #ededed; }

/* ─── progress 进度条 ─── */
.plain-layout-progress { padding: 64px 72px !important; }
.plain-progress {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 32px;
}
.plain-progress-row { display: flex; flex-direction: column; gap: 6px; }
.plain-progress-head { display: flex; justify-content: space-between; align-items: baseline; }
.plain-progress-label { font-size: 18px; font-weight: 500; }
.plain-progress-value {
  font-size: 20px;
  font-weight: 700;
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-variant-numeric: tabular-nums;
}
.plain-progress-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.18);
  overflow: hidden;
}
.plain-progress-fill {
  height: 100%;
  background: currentColor;
  border-radius: 999px;
  transition: width 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.plain-progress-hint { font-size: 13px; opacity: 0.55; margin-top: 2px; }

/* ─── compare 对比 ─── */
.plain-layout-compare { padding: 56px 64px !important; }
.plain-compare {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 32px;
  margin-top: 32px;
}
.plain-compare-col { padding: 0 4px; }
.plain-compare-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 14px;
}
.plain-compare-left .plain-compare-label {
  background: rgba(220, 38, 38, 0.10);
  color: #dc2626;
}
.plain-compare-right .plain-compare-label {
  background: rgba(22, 163, 74, 0.10);
  color: #16a34a;
}
.plain-compare-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.plain-compare-list li {
  font-size: 18px;
  line-height: 1.45;
  padding-left: 22px;
  position: relative;
}
.plain-compare-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  width: 10px;
  height: 2px;
  background: currentColor;
  opacity: 0.4;
}
.plain-compare-divider {
  background: currentColor;
  opacity: 0.15;
  width: 1px;
}

/* ─── quote-block 大引用 ─── */
.plain-layout-quote-block { padding: 72px 96px !important; display: flex; flex-direction: column; justify-content: center; }
.plain-quote-block {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}
.plain-quote-mark {
  font-size: 120px;
  line-height: 0.8;
  opacity: 0.15;
  font-family: "Charter", Georgia, serif;
  margin-bottom: -30px;
  user-select: none;
}
.plain-quote-text {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 32px;
  line-height: 1.5;
  font-style: italic;
  letter-spacing: -0.01em;
  margin-bottom: 32px;
}
.plain-quote-attr { display: flex; gap: 16px; align-items: center; }
.plain-quote-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.9;
  color: var(--plain-bg-raised, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  font-family: "Charter", Georgia, serif;
}
.plain-quote-avatar ~ .plain-quote-meta { opacity: 1; }
.plain-quote-name { font-weight: 600; font-size: 17px; }
.plain-quote-role { font-size: 13px; opacity: 0.6; margin-top: 2px; }

/* ─── profile 团队卡阵列 ─── */
.plain-layout-profile { padding: 56px 64px !important; }
.plain-profiles {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}
.plain-profiles[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
.plain-profiles[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
.plain-profiles[data-count="4"] { grid-template-columns: repeat(4, 1fr); }
.plain-profiles[data-count="5"], .plain-profiles[data-count="6"] {
  grid-template-columns: repeat(3, 1fr);
}
.plain-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 12px;
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 12px;
}
.plain-profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: currentColor;
  color: var(--plain-bg-raised, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 600;
  font-family: "Charter", Georgia, serif;
  margin-bottom: 12px;
  opacity: 0.9;
}
.plain-profile-name { font-weight: 600; font-size: 17px; }
.plain-profile-role { font-size: 13px; opacity: 0.6; margin-top: 4px; }

/* ─── code 代码块 ─── */
.plain-layout-code { padding: 48px 56px !important; }
.plain-code-block {
  background: rgba(0, 0, 0, 0.82);
  border-radius: 10px;
  overflow: hidden;
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 15px;
  margin-top: 24px;
}
.plain-code-title {
  background: rgba(255, 255, 255, 0.06);
  padding: 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.plain-code-lang {
  background: rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.65);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.plain-code-body {
  margin: 0;
  padding: 18px 0;
  background: transparent;
  color: #e6edf3;
  line-height: 1.65;
  overflow-x: auto;
}
.plain-code-body code {
  background: transparent !important;
  padding: 0 !important;
  color: inherit;
  font-size: inherit;
  display: block;
}
.plain-code-line { display: block; padding: 0 18px; }
.plain-code-ln {
  display: inline-block;
  width: 32px;
  color: rgba(255, 255, 255, 0.28);
  user-select: none;
  text-align: right;
  padding-right: 14px;
  font-variant-numeric: tabular-nums;
}
.plain-code-src { color: #e6edf3; }

/* ─── sparkline 阵列 ─── */
.plain-layout-sparkline { padding: 56px 64px !important; }
.plain-sparklines {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}
.plain-sparklines[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
.plain-sparklines[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
.plain-sparklines[data-count="4"] { grid-template-columns: repeat(2, 1fr); }
.plain-sparklines[data-count="5"], .plain-sparklines[data-count="6"] {
  grid-template-columns: repeat(3, 1fr);
}
.plain-spark-card {
  padding: 18px 20px;
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 10px;
}
.plain-spark-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.plain-spark-label {
  font-size: 13px;
  opacity: 0.7;
}
.plain-spark-delta {
  font-size: 12px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
}
.plain-spark-value {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}
.plain-spark-chart { line-height: 0; }

/* ─── act-divider 章节幕(控制节奏用) ─── */
.plain-layout-act-divider {
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding-left: 96px !important;
  padding-right: 96px !important;
}
.plain-layout-act-divider h2 {
  font-size: 88px !important;
  line-height: 1.05 !important;
  margin: 0 0 20px !important;
  letter-spacing: -0.02em;
}
.plain-act-divider { width: 100%; }
.plain-act-kicker {
  font-family: "IBM Plex Mono", "JetBrains Mono", monospace;
  font-size: 13px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 24px;
}
.plain-act-lead {
  font-size: 26px;
  line-height: 1.4;
  max-width: 80%;
  opacity: 0.8;
  margin-top: 20px;
}

/* ─── pipeline 编号流水线 ─── */
.plain-layout-pipeline { padding: 56px 72px !important; }
.plain-pipeline {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 40px;
  margin-top: 32px;
}
.plain-pipeline-step {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
}
.plain-pipeline-num {
  font-family: "IBM Plex Mono", "JetBrains Mono", monospace;
  font-size: 28px;
  font-weight: 500;
  opacity: 0.35;
  line-height: 1;
  min-width: 48px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.plain-pipeline-body { flex: 1; min-width: 0; }
.plain-pipeline-label {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 6px;
}
.plain-pipeline-hint {
  font-size: 14px;
  opacity: 0.6;
  line-height: 1.45;
}

/* ─── hero-question 悬念大问题(深底浅字,模拟剧场灯灭)
 *     因为 Marp 会把 .plain-layout-xxx 当 descendant selector,所以用 attribute selector
 *     section[data-class="..."] 规避 scope 转换。 */
section[data-class="plain-layout-hero-question"] {
  padding: 96px 112px !important;
  display: flex !important;
  flex-direction: column;
  justify-content: center;
  background: var(--plain-hero-bg, #111111) !important;
  color: var(--plain-hero-fg, #f5f5f5) !important;
}
section[data-class="plain-layout-hero-question"] > h1,
section[data-class="plain-layout-hero-question"] > h2,
section[data-class="plain-layout-hero-question"] > h3 {
  font-size: 96px !important;
  line-height: 1.05 !important;
  letter-spacing: -0.025em;
  margin: 0 0 32px !important;
  color: var(--plain-hero-fg, #f5f5f5) !important;
  font-weight: 500;
  max-width: 90%;
}
section[data-class="plain-layout-hero-question"] ul,
section[data-class="plain-layout-hero-question"] ol {
  margin: 24px 0 0;
}
section[data-class="plain-layout-hero-question"] li,
section[data-class="plain-layout-hero-question"] p {
  color: var(--plain-hero-fg, #f5f5f5) !important;
  opacity: 0.7;
  font-size: 22px;
  font-weight: 400;
}

/* ─────── Editorial Pack — Monocle 风(长文 mode) ─────── */

/* article-spread:三栏长文 + drop cap */
section[data-class="plain-layout-article-spread"] {
  padding: 56px 64px 48px !important;
  display: block !important;
}
.ed-article-spread { display: flex; flex-direction: column; gap: 18px; height: 100%; }
.ed-meta { padding-bottom: 16px; border-bottom: 1px solid currentColor; }
.ed-meta { border-bottom-color: rgba(128,128,128,0.25); }
.ed-kicker {
  font-family: "Helvetica Neue", "Inter", sans-serif;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  color: currentColor;
  opacity: 0.7;
  margin-bottom: 14px;
}
.ed-hed {
  font-family: "Charter", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  font-size: 56px !important;
  line-height: 1.1 !important;
  font-weight: 600 !important;
  letter-spacing: -0.015em;
  margin: 0 0 12px !important;
  max-width: 90%;
}
.ed-deck {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 22px;
  line-height: 1.4;
  font-style: italic;
  opacity: 0.78;
  margin-bottom: 12px;
  max-width: 80%;
}
.ed-byline {
  font-family: "Helvetica Neue", "Inter", sans-serif;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-top: 6px;
}
.ed-body {
  flex: 1;
  column-count: 3;
  column-gap: 28px;
  column-rule: 1px solid rgba(128,128,128,0.15);
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 13.5px;
  line-height: 1.55;
  text-align: justify;
  hyphens: auto;
  overflow: hidden;
}
.ed-body-p { margin: 0 0 12px; }
.ed-body-p.has-dropcap::first-letter {
  font-size: 56px;
  line-height: 0.9;
  float: left;
  margin: 4px 8px 0 -2px;
  font-weight: 700;
  font-family: "Charter", Georgia, serif;
  color: currentColor;
}

/* editor-letter:左署名 + 右长段落 */
section[data-class="plain-layout-editor-letter"] {
  padding: 56px 72px !important;
  display: block !important;
}
.ed-editor-letter {
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: 56px;
  height: 100%;
}
.ed-letter-side {
  border-right: 1px solid rgba(128,128,128,0.18);
  padding-right: 32px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 24px;
}
.ed-letter-sig {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 32px;
  font-weight: 600;
  margin-top: 24px;
  letter-spacing: -0.01em;
}
.ed-letter-role {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.6;
  margin-top: 8px;
}
.ed-letter-rule {
  width: 48px;
  height: 2px;
  background: currentColor;
  margin-top: 20px;
  opacity: 0.5;
}
.ed-letter-body {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 16px;
  line-height: 1.6;
  text-align: justify;
  hyphens: auto;
  overflow: hidden;
}
.ed-letter-p { margin: 0 0 14px; }
.ed-letter-p:first-child::first-line {
  font-variant-caps: small-caps;
  letter-spacing: 0.08em;
}

/* photo-essay:满版图 + 角落锁定 */
section[data-class="plain-layout-photo-essay"] {
  padding: 0 !important;
  position: relative;
  display: block !important;
}
.ed-photo-essay {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.ed-photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%);
}
.ed-photo-lockup {
  position: absolute;
  width: 44%;
  background: rgba(255,255,255,0.96);
  padding: 28px 32px;
  color: #1a1a1a;
}
.ed-photo-essay[data-align="bottom-left"] .ed-photo-lockup { left: 48px; bottom: 48px; }
.ed-photo-essay[data-align="bottom-right"] .ed-photo-lockup { right: 48px; bottom: 48px; }
.ed-photo-essay[data-align="top-left"] .ed-photo-lockup { left: 48px; top: 48px; }
.ed-photo-essay[data-align="top-right"] .ed-photo-lockup { right: 48px; top: 48px; }
.ed-photo-hed {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif !important;
  font-size: 38px !important;
  line-height: 1.15 !important;
  font-weight: 600 !important;
  margin: 0 0 8px !important;
  color: #1a1a1a !important;
  letter-spacing: -0.01em;
}
.ed-photo-deck {
  font-family: "Helvetica Neue", "Inter", sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: #555;
  margin-bottom: 12px;
}
.ed-photo-caption {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 10px;
  font-style: italic;
  color: #888;
  letter-spacing: 0.05em;
}

/* data-feature:图表 + 旁注 */
section[data-class="plain-layout-data-feature"] {
  padding: 48px 64px !important;
  display: block !important;
}
.ed-data-feature {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 18px;
}
.ed-df-head { padding-bottom: 14px; border-bottom: 1px solid rgba(128,128,128,0.2); }
.ed-df-hed {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 36px !important;
  line-height: 1.15 !important;
  font-weight: 600 !important;
  margin: 6px 0 0 !important;
  letter-spacing: -0.01em;
}
.ed-df-body {
  flex: 1;
  display: grid;
  grid-template-columns: 8fr 4fr;
  gap: 32px;
  min-height: 0;
}
.ed-df-chart { display: flex; flex-direction: column; gap: 8px; }
.ed-df-chart svg { color: currentColor; }
.ed-df-axis {
  display: flex;
  justify-content: space-between;
  font-family: "Helvetica Neue", sans-serif;
  font-size: 9px;
  letter-spacing: 0.05em;
  opacity: 0.5;
}
.ed-df-annots { display: flex; flex-direction: column; gap: 18px; }
.ed-df-annot {
  border-left: 2px solid currentColor;
  padding-left: 14px;
  font-family: "Charter", Georgia, serif;
}
.ed-df-annot-label {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}
.ed-df-annot-text {
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.85;
}
.ed-df-source {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.5;
  text-align: right;
}

/* sidebar-story:主文 + 灰底专栏 */
section[data-class="plain-layout-sidebar-story"] {
  padding: 48px 56px !important;
  display: block !important;
}
.ed-sidebar-story {
  display: grid;
  grid-template-columns: 8fr 4fr;
  gap: 36px;
  height: 100%;
}
.ed-side-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ed-side-hed {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 38px !important;
  line-height: 1.15 !important;
  font-weight: 600 !important;
  margin: 0 0 10px !important;
}
.ed-side-body {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 15px;
  line-height: 1.6;
  column-count: 2;
  column-gap: 24px;
  text-align: justify;
  hyphens: auto;
}
.ed-side-p { margin: 0 0 12px; }
.ed-side-aside {
  background: rgba(0,0,0,0.04);
  padding: 22px 22px 22px;
  border-radius: 4px;
}
[data-theme="dark"] .ed-side-aside { background: rgba(255,255,255,0.06); }
.ed-side-aside-label {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid currentColor;
}
.ed-side-aside-hed {
  font-family: "Charter", Georgia, serif;
  font-size: 18px !important;
  line-height: 1.3 !important;
  font-weight: 600 !important;
  margin: 0 0 14px !important;
}
.ed-side-aside-list {
  font-family: "Charter", Georgia, serif;
  font-size: 13px;
  line-height: 1.5;
  padding-left: 22px;
  margin: 0;
}
.ed-side-aside-list li { margin-bottom: 8px; }

/* pull-quote-break:超大引述 */
section[data-class="plain-layout-pull-quote-break"] {
  padding: 64px 96px !important;
  display: block !important;
}
.ed-pull-quote-break {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  position: relative;
}
.ed-pq-mark {
  font-family: "Charter", Georgia, serif;
  font-size: 200px;
  line-height: 0.7;
  opacity: 0.12;
  position: absolute;
  top: -20px;
  left: -10px;
  font-weight: 600;
}
.ed-pq-text {
  font-family: "Charter", "Source Han Serif SC", Georgia, serif;
  font-size: 56px !important;
  line-height: 1.2 !important;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.015em;
  margin: 0 0 28px !important;
  border: none !important;
  padding: 0 !important;
  position: relative;
  z-index: 1;
  max-width: 92%;
}
.ed-pq-rule {
  width: 60px;
  height: 2px;
  background: currentColor;
  opacity: 0.6;
  margin-bottom: 16px;
}
.ed-pq-attr {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 500;
  opacity: 0.7;
}

/* ─────── 主题节奏 tone(覆盖 6 套主题的 section 默认色) ───────
 * 参考 guizang-ppt-skill 的 light / dark / hero light / hero dark 节奏维度。
 * 用 attribute selector 而不是 .plain-tone-xxx,因为 Marp 把 section 放进
 * <svg><foreignObject>,scope 转换会把 .xxx 改成 descendant,这里要直接命中 section。
 *
 * --plain-tone-dark-bg / --plain-tone-dark-fg 由 ThemeTokens 控制,主题可覆盖;
 * 缺省值兜底,确保任意主题都能切。
 */
section[data-class~="plain-tone-light"] {
  /* light = 主题默认值,什么都不做 */
}
section[data-class~="plain-tone-dark"] {
  background: var(--plain-tone-dark-bg, #1a1a1a) !important;
  color: var(--plain-tone-dark-fg, #f0f0f0) !important;
}
section[data-class~="plain-tone-dark"] h1,
section[data-class~="plain-tone-dark"] h2,
section[data-class~="plain-tone-dark"] h3,
section[data-class~="plain-tone-dark"] p,
section[data-class~="plain-tone-dark"] li,
section[data-class~="plain-tone-dark"] strong {
  color: var(--plain-tone-dark-fg, #f0f0f0) !important;
}
section[data-class~="plain-tone-dark"] blockquote {
  color: var(--plain-tone-dark-fg, #c8c8c8) !important;
  opacity: 0.85;
}

/* hero-dark:深底浅字,留白更多,字号更大(模拟封面/章节幕封"剧场灯灭") */
section[data-class~="plain-tone-hero-dark"] {
  background: var(--plain-tone-hero-dark-bg, #0e0e10) !important;
  color: var(--plain-tone-hero-dark-fg, #f5f5f5) !important;
  padding: 96px 112px !important;
}
section[data-class~="plain-tone-hero-dark"] h1,
section[data-class~="plain-tone-hero-dark"] h2,
section[data-class~="plain-tone-hero-dark"] h3,
section[data-class~="plain-tone-hero-dark"] p,
section[data-class~="plain-tone-hero-dark"] li,
section[data-class~="plain-tone-hero-dark"] strong {
  color: var(--plain-tone-hero-dark-fg, #f5f5f5) !important;
}
section[data-class~="plain-tone-hero-dark"] h1 { font-size: 96px !important; }
section[data-class~="plain-tone-hero-dark"] h2 { font-size: 72px !important; }

/* hero-light:浅底深字,大留白(与 hero-dark 交替制造节奏) */
section[data-class~="plain-tone-hero-light"] {
  background: var(--plain-tone-hero-light-bg, #fbfbfa) !important;
  color: var(--plain-tone-hero-light-fg, #111) !important;
  padding: 96px 112px !important;
}
section[data-class~="plain-tone-hero-light"] h1 { font-size: 96px !important; }
section[data-class~="plain-tone-hero-light"] h2 { font-size: 72px !important; }

/* V16 kami SVG diagrams */
section[data-class~="plain-layout-quadrant"],
section[data-class~="plain-layout-waterfall"],
section[data-class~="plain-layout-venn"],
section[data-class~="plain-layout-swimlane"],
section[data-class~="plain-layout-layer-stack"] {
  padding: 56px 64px !important;
  display: flex !important;
  flex-direction: column;
}
section[data-class~="plain-layout-quadrant"] h2,
section[data-class~="plain-layout-waterfall"] h2,
section[data-class~="plain-layout-venn"] h2,
section[data-class~="plain-layout-swimlane"] h2,
section[data-class~="plain-layout-layer-stack"] h2 {
  font-size: 30px !important;
  margin-bottom: 12px !important;
}
.plain-diagram {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plain-diagram svg {
  width: 100%;
  height: 100%;
  max-height: 460px;
}
` + MOTION_CSS;
