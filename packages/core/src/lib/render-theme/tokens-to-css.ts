/**
 * ThemeTokens → Marp theme CSS 字符串。
 * 一份模板 + 变量插值。所有 Plain 主题共用这个生成器。
 */

import type { ThemeTokens } from "./tokens";

export function tokensToMarpCss(t: ThemeTokens): string {
  const { colors: c, fonts, type, shape } = t;
  const headingFont = t.headingFamily === "serif" ? fonts.serif : fonts.sans;

  // 标题特色装饰
  const headingDecoration = t.accentDecoration === "bar"
    ? `
section h2 {
  padding-left: 18px;
  border-left: 2.5px solid ${c.primary};
  line-height: 1.25;
}`
    : t.accentDecoration === "underline"
      ? `
section h2 {
  border-bottom: 2px solid ${c.primary};
  padding-bottom: 12px;
  display: inline-block;
}`
      : "";

  return `/* @theme ${t.id} */

* { box-sizing: border-box; }

section {
  --plain-hero-bg: ${c.onSurface};
  --plain-hero-fg: ${c.bg};
  /* tone 节奏变量(参考 guizang-ppt-skill 的 light/dark/hero 节奏维度)
     缺省值映射到主题已有的 onSurface/bg/coverBg/onCover,主题不需手动配也能用。 */
  --plain-tone-dark-bg: ${c.onSurface};
  --plain-tone-dark-fg: ${c.bg};
  --plain-tone-hero-dark-bg: ${c.coverBg};
  --plain-tone-hero-dark-fg: ${c.onCover};
  --plain-tone-hero-light-bg: ${c.bg};
  --plain-tone-hero-light-fg: ${c.onSurface};
  background: ${c.bg};
  color: ${c.onSurface};
  font-family: ${fonts.sans};
  font-size: ${type.body.size}px;
  line-height: ${type.body.line};
  padding: 64px 72px;
  letter-spacing: 0.003em;
  position: relative;
  overflow: hidden;
}

section h1, section h2, section h3, section h4 {
  font-family: ${headingFont};
  color: ${c.onSurface};
  letter-spacing: ${type.headline.tracking ?? -0.01}em;
  font-weight: ${type.headline.weight};
  line-height: 1.2;
}
section h1 { font-size: ${type.display.size}px; line-height: ${type.display.line}; margin: 0 0 28px; font-weight: ${type.display.weight}; }
section h2 { font-size: ${type.headline.size}px; margin: 0 0 24px; }
section h3 { font-size: ${type.title.size}px; color: ${c.onSurfaceMuted}; margin: 24px 0 14px; font-weight: 500; }
section p { font-size: ${type.body.size}px; margin: 0 0 18px; color: ${c.onSurfaceMuted}; }
section ul, section ol { padding-left: 28px; margin: 16px 0; }
section li { margin: 10px 0; line-height: ${type.body.line}; }
section strong { color: ${c.primary}; font-weight: 500; }
section em { color: ${c.primary}; font-style: normal; }
section a { color: ${c.primary}; text-decoration: underline; text-underline-offset: 4px; }
section ul li::marker, section ol li::marker { color: ${c.onSurfaceMuted}; }

section blockquote {
  border-left: 2.5px solid ${c.primary};
  color: ${c.onSurfaceMuted};
  font-style: italic;
  padding-left: 20px;
  margin: 28px 0;
  font-size: ${type.title.size - 8}px;
}

section code {
  background: ${c.surface};
  color: ${c.primary};
  padding: 3px 8px;
  border-radius: ${shape.xs}px;
  font-family: ${fonts.mono};
  font-size: 0.88em;
}

section pre {
  background: ${c.surface};
  border-left: 2.5px solid ${c.primary};
  padding: 20px 24px;
  border-radius: ${shape.sm}px;
  font-size: ${type.caption.size + 4}px;
  line-height: 1.5;
  overflow-x: auto;
  font-family: ${fonts.mono};
}

section th {
  font-weight: 500;
  border-bottom: 2px solid ${c.primary};
  color: ${c.onSurface};
  font-family: ${headingFont};
  padding: 12px 18px;
  text-align: left;
}
section td, section th {
  border-bottom: 1px solid ${c.outline};
  padding: 10px 16px;
}
section td { font-variant-numeric: tabular-nums; color: ${c.onSurfaceMuted}; }
section table { border-collapse: collapse; margin: 20px 0; font-size: ${type.caption.size + 4}px; }

section img { max-width: 100%; border-radius: ${shape.sm}px; }

section::after {
  color: ${c.onSurfaceMuted};
  font-size: 14px;
  font-family: ${fonts.sans};
  letter-spacing: 0.08em;
  right: 36px;
  bottom: 28px;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

/* 封面:大标题 + 特殊背景 */
section.lead, section:has(> h1:only-child) {
  background: ${c.coverBg};
  color: ${c.onCover};
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 96px 104px;
}
section.lead h1, section:has(> h1:only-child) h1 {
  font-size: ${type.displayXL.size}px;
  line-height: ${type.displayXL.line};
  color: ${c.onCover};
  font-weight: ${type.displayXL.weight};
}

/* ── Cover visual variants ──────────────────────────────────────────
   通过 <!-- cover:xxx --> 注释切换的封面美学,跟具体主题正交。
   解决"内置 cover 太单调"问题 — Gamma/Tome 流量都靠这种 hero 美学。

   gradient   — 单色 → 暗色斜向渐变,科技感 hero
   mesh       — 多色噪点 mesh gradient,AI 时代标志
   spotlight  — 暗底 + 单色光晕径向,聚光灯舞台
   grid       — 网格线 + 大字,Swiss / SaaS 工程感
   tape       — 横条色块拼贴,Y2K / 创意社交
   photo      — 给图片预留全屏位置,标题压在底部
*/
section.plain-cover-gradient {
  background: linear-gradient(135deg, ${c.coverBg} 0%, ${c.primary} 100%);
  color: ${c.onCover};
}
section.plain-cover-mesh {
  background:
    radial-gradient(at 25% 15%, ${hexAlpha(c.primary, 0.55)} 0%, transparent 45%),
    radial-gradient(at 75% 80%, ${hexAlpha(c.success, 0.40)} 0%, transparent 50%),
    radial-gradient(at 90% 20%, ${hexAlpha(c.danger, 0.30)} 0%, transparent 50%),
    ${c.coverBg};
  color: ${c.onCover};
}
section.plain-cover-mesh::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 1px 1px, ${hexAlpha(c.onCover, 0.04)} 1px, transparent 0);
  background-size: 28px 28px;
  pointer-events: none;
}
section.plain-cover-spotlight {
  background:
    radial-gradient(ellipse at 50% 45%, ${hexAlpha(c.primary, 0.50)} 0%, transparent 55%),
    ${c.coverBg};
  color: ${c.onCover};
}
section.plain-cover-spotlight h1 {
  text-shadow: 0 0 80px ${hexAlpha(c.primary, 0.5)};
}
section.plain-cover-grid {
  background: ${c.bg};
  color: ${c.onSurface};
  background-image:
    linear-gradient(${hexAlpha(c.outline, 0.6)} 1px, transparent 1px),
    linear-gradient(90deg, ${hexAlpha(c.outline, 0.6)} 1px, transparent 1px);
  background-size: 64px 64px;
  background-position: -1px -1px;
}
section.plain-cover-grid h1 { color: ${c.onSurface}; }
section.plain-cover-tape {
  background:
    linear-gradient(180deg,
      ${c.primary} 0 14%,
      ${c.coverBg} 14% 86%,
      ${c.primary} 86% 100%);
  color: ${c.onCover};
  padding: 116px 104px;
}
section.plain-cover-photo {
  background: ${c.coverBg};
  color: ${c.onCover};
  position: relative;
}
section.plain-cover-photo > img:first-child {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  z-index: 0;
}
section.plain-cover-photo > *:not(img) {
  position: relative;
  z-index: 1;
}
section.plain-cover-photo h1 {
  color: ${c.onCover};
  text-shadow: 0 4px 24px ${hexAlpha(c.coverBg, 0.6)};
}

${headingDecoration}

/* 语义色(用于 callout / delta) */
.plain-semantic-success { color: ${c.success}; background: ${hexAlpha(c.success, 0.08)}; }
.plain-semantic-danger  { color: ${c.danger};  background: ${hexAlpha(c.danger, 0.08)}; }
`;
}

/**
 * 给主题 CSS 注入几个 CSS 变量,便于富 layout CSS 继承主题色
 * (通过 currentColor 继承 + 额外的 --plain-* vars)
 */
export function tokensToWrapperVars(t: ThemeTokens): string {
  const c = t.colors;
  return `
:root[data-active-theme="${t.id}"] {
  --plain-bg-raised: ${c.surface};
  --plain-border: ${c.outline};
  --plain-text-secondary: ${c.onSurfaceMuted};
}
`;
}

/** hex + alpha → rgba,适用于 6 位 hex */
function hexAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
