/**
 * V29 compileTheme · 5 层 spec → 完整 CSS
 *
 * 跟老 compileTheme 共存(老 compile.ts 还在) · 老 ThemeSpec 自动升级走这个
 */
import { ramp, type Ramp } from "./ramp";
import { bestContrastWith } from "./selectors";
import { hexToRgb, relativeLuminance } from "./color";
import type { ThemeSpecV29, ThemeDecoration } from "../spec";

export type CompiledThemeV29 = {
  id: string;
  label: string;
  vars: Record<string, string>;
  css: string;
};

export function compileThemeV29(spec: ThemeSpecV29): CompiledThemeV29 {
  // ── 1. 色彩 ramp ─────────────────────────────────────────
  const s: Ramp = ramp(spec.colors.surface);
  const n: Ramp = ramp(spec.colors.ink);
  const a: Ramp = ramp(spec.colors.accent);

  const surfaceL = relativeLuminance(hexToRgb(spec.colors.surface));
  const isDark = surfaceL < 0.18;

  const paper = isDark ? s["950"] : s["50"];
  const surface = isDark ? s["900"] : s["100"];
  const raised = isDark ? s["800"] : s["50"];
  const surfaceBase = isDark ? s["950"] : s["100"];

  const inkPool = isDark ? [n["50"], n["100"], n["200"]] : [n["800"], n["900"], n["950"]];
  const ink = bestContrastWith(surfaceBase, inkPool);
  const inkSoft = isDark ? n["200"] : n["700"];
  const inkMute = isDark ? n["400"] : n["500"];
  const rule = isDark ? n["800"] : n["200"];

  const accent = spec.colors.accent;
  const accentSoft = a["200"];
  const hero = spec.colors.hero ?? (isDark ? s["950"] : n["900"]);
  const onHero = relativeLuminance(hexToRgb(hero)) < 0.18 ? s["50"] : n["900"];

  // ── 2. Typography vars ──────────────────────────────────
  const t = spec.typography;
  const fontUi =
    t.microLabel?.font ?? '"Inter", "PingFang SC", -apple-system, sans-serif';
  const fontDisplay = t.display.font;
  const fontText = t.body.font;
  const fontMono = t.mono?.font ?? '"JetBrains Mono", "Menlo", monospace';

  // ── 3. Spacing ──────────────────────────────────────────
  const u = spec.unit.base;

  // ── 4. CSS variables 平铺 ───────────────────────────────
  const vars: Record<string, string> = {
    // colors
    "--plain-paper": paper,
    "--plain-surface": surface,
    "--plain-raised": raised,
    "--plain-ink": ink,
    "--plain-ink-soft": inkSoft,
    "--plain-ink-mute": inkMute,
    "--plain-rule": rule,
    "--plain-accent": accent,
    "--plain-accent-soft": accentSoft,
    "--plain-hero": hero,
    "--plain-on-hero": onHero,
    "--plain-link": accent,
    // typography
    "--plain-font-text": fontText,
    "--plain-font-display": fontDisplay,
    "--plain-font-mono": fontMono,
    "--plain-font-ui": fontUi,
    // spacing 12 阶
    "--plain-space-1": `${u * 0.5}px`,
    "--plain-space-2": `${u}px`,
    "--plain-space-3": `${u * 1.5}px`,
    "--plain-space-4": `${u * 2}px`,
    "--plain-space-5": `${u * 3}px`,
    "--plain-space-6": `${u * 4}px`,
    "--plain-space-7": `${u * 6}px`,
    "--plain-space-8": `${u * 8}px`,
    "--plain-space-9": `${u * 10}px`,
    "--plain-space-10": `${u * 12}px`,
    "--plain-space-11": `${u * 14}px`,
    "--plain-space-12": `${u * 16}px`,
    // radius
    "--plain-radius-card": `${spec.decoration.radius}px`,
    "--plain-radius-pill":
      spec.decoration.radius === 0 ? "0" : "9999px",
    // motion
    "--plain-dur-fast": "120ms",
    "--plain-dur-mid": "240ms",
    "--plain-ease-ui": "cubic-bezier(0.2, 0, 0.13, 1.5)",
  };

  // ── 5. Decoration CSS recipes(只 emit 命中的) ─────────
  const decorationCss = buildDecorationCss(spec.decoration);

  // ── 6. Typography utility classes ───────────────────────
  const typoCss = buildTypoCss(spec.typography);

  // ── 7. 拼总 CSS ─────────────────────────────────────────
  const varBlock = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  const css = `:root, [data-plain-theme="${spec.id}"] {
${varBlock}
}
${typoCss}
${decorationCss}`;

  return { id: spec.id, label: spec.label, vars, css };
}

// ─────────────────────────────────────────────────────────────
// Typography utility · 把 ladder 翻译成 .plain-typo-* class
// ─────────────────────────────────────────────────────────────
function buildTypoCss(t: ThemeSpecV29["typography"]): string {
  const tokens: Array<[string, typeof t.display | undefined]> = [
    ["display", t.display],
    ["display-md", t.displayMd],
    ["numeral-jumbo", t.numeralJumbo],
    ["headline", t.headline],
    ["micro-label", t.microLabel],
    ["body-lede", t.bodyLede],
    ["body", t.body],
    ["body-sm", t.bodySm],
    ["quote", t.quote],
    ["mono", t.mono],
  ];
  return tokens
    .filter(([, tok]) => !!tok)
    .map(([name, tok]) => {
      const tk = tok!;
      return `.plain-typo-${name} {
  font-family: ${tk.font};
  font-size: ${tk.size};
  line-height: ${tk.lh};
  ${tk.ls ? `letter-spacing: ${tk.ls};` : ""}
  font-weight: ${tk.weight};
  ${tk.transform ? `text-transform: ${tk.transform};` : ""}
  ${tk.italic ? "font-style: italic;" : ""}
}`;
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// Decoration CSS recipes · 每个装饰一个独立 ::before/::after pattern
// 用 attribute selectors · 让 layout 加 data-plain-decor="halftone sun-glow" 命中多个
// ─────────────────────────────────────────────────────────────
function buildDecorationCss(d: ThemeDecoration): string {
  const recipes: string[] = [];

  if (d.halftone) {
    recipes.push(`/* halftone · 右下角点阵 */
[data-plain-decor~="halftone"]::after {
  content: "";
  position: absolute;
  right: -40px; bottom: -40px;
  width: 320px; height: 240px;
  background-image: radial-gradient(circle, color-mix(in oklab, var(--plain-accent) 35%, transparent) 1.2px, transparent 1.6px);
  background-size: 14px 14px;
  mask-image: radial-gradient(ellipse at bottom right, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at bottom right, black 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}`);
  }

  if (d.sunGlow) {
    recipes.push(`/* sun-glow · 双角径向光斑 */
[data-plain-decor~="sun-glow"] {
  background:
    radial-gradient(120% 80% at 110% 110%, color-mix(in oklab, var(--plain-accent) 50%, transparent) 0%, transparent 60%),
    radial-gradient(90% 60% at -10% -10%, color-mix(in oklab, var(--plain-hero) 28%, transparent) 0%, transparent 65%),
    linear-gradient(180deg, var(--plain-paper) 0%, var(--plain-surface) 100%);
}`);
  }

  if (d.hairline) {
    recipes.push(`/* hairline · 1px ink 杂志风横线 */
.plain-hairline {
  height: 1px;
  background: var(--plain-ink);
  border: none;
  margin: var(--plain-space-5) 0;
}
.plain-hairline-double {
  height: 3px;
  border-top: 1px solid var(--plain-ink);
  border-bottom: 1px solid var(--plain-ink);
  background: transparent;
}`);
  }

  if (d.grain && d.grain > 0) {
    const opacity = Math.min(d.grain, 1) * 0.6;
    recipes.push(`/* grain · 颗粒噪点 */
[data-plain-decor~="grain"]::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  mix-blend-mode: multiply;
  opacity: ${opacity.toFixed(2)};
  pointer-events: none;
  z-index: 0;
}`);
  }

  if (d.scanlines) {
    recipes.push(`/* scanlines · CRT 扫描线(8-Bit) */
[data-plain-decor~="scanlines"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px);
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: multiply;
}`);
  }

  if (d.ribbon) {
    recipes.push(`/* ribbon · 70s 对角彩色带(Sakura) */
.plain-ribbon {
  position: absolute;
  top: -20px; right: -60px;
  width: 200px; height: 30px;
  background: linear-gradient(90deg, var(--plain-accent) 0%, var(--plain-hero) 100%);
  transform: rotate(35deg);
  transform-origin: center;
  z-index: 1;
  pointer-events: none;
}`);
  }

  if (d.seal) {
    recipes.push(`/* seal · 印章 / starburst */
.plain-seal {
  position: absolute;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 2px solid var(--plain-accent);
  color: var(--plain-accent);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--plain-font-ui);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  transform: rotate(-12deg);
  background: transparent;
}`);
  }

  if (d.graphPaper) {
    recipes.push(`/* graph-paper · Cobalt Grid 背景网格 */
[data-plain-decor~="graph-paper"] {
  background-image:
    linear-gradient(to right, color-mix(in oklab, var(--plain-accent) 8%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--plain-accent) 8%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
}`);
  }

  if (d.binderTabs) {
    recipes.push(`/* binder-tabs · Notebook 右侧 tab */
.plain-binder-tab {
  position: absolute;
  right: -4px;
  width: 32px;
  height: 80px;
  background: var(--plain-accent);
  border-radius: 0 6px 6px 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--plain-on-hero);
  font-family: var(--plain-font-ui);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  writing-mode: vertical-rl;
}`);
  }

  if (d.stencilTitle) {
    recipes.push(`/* stencil · 镂空标题 */
.plain-stencil {
  color: transparent;
  -webkit-text-stroke: 2px var(--plain-accent);
  text-stroke: 2px var(--plain-accent);
  font-weight: 900;
}`);
  }

  if (d.pin) {
    recipes.push(`/* pin · 手绘安全别针 */
.plain-pin::before {
  content: "📎";
  position: absolute;
  top: 12px; left: 12px;
  font-size: 24px;
  transform: rotate(-15deg);
  z-index: 2;
  filter: drop-shadow(1px 1px 0 var(--plain-ink-mute));
}`);
  }

  if (d.shadow === "stacked-pixel") {
    recipes.push(`/* stacked-pixel shadow · 8-Bit / Block Frame */
.plain-shadow-stacked {
  box-shadow:
    4px 4px 0 0 var(--plain-accent),
    8px 8px 0 0 var(--plain-hero),
    12px 12px 0 0 var(--plain-ink);
}`);
  } else if (d.shadow === "soft-glow") {
    recipes.push(`/* soft-glow shadow · neon */
.plain-shadow-glow {
  box-shadow: 0 0 24px color-mix(in oklab, var(--plain-accent) 60%, transparent),
              0 4px 16px color-mix(in oklab, var(--plain-accent) 30%, transparent);
}`);
  } else if (d.shadow === "offset-block") {
    recipes.push(`/* offset-block shadow · Vintage Editorial */
.plain-shadow-block {
  box-shadow: 6px 6px 0 0 var(--plain-ink);
}`);
  } else if (d.shadow === "soft-card") {
    recipes.push(`.plain-shadow-card {
  box-shadow: 0 8px 24px -12px color-mix(in oklab, var(--plain-ink) 18%, transparent);
}`);
  }

  return recipes.join("\n\n");
}
