/**
 * theme-v3 · 规则化主题系统
 *
 * 替代 theme-v2(硬编码 hex 表)。
 * 用法:
 *   import { compileTheme, getThemeSpec } from "@/lib/theme-v3";
 *   const { css } = compileTheme(getThemeSpec("monocle"));
 *   // <style>{css}</style>
 */
export { compileTheme, type ThemeSpec, type CompiledTheme } from "./engine/compile";
export { ramp, type Ramp, type RampShade } from "./engine/ramp";
export {
  bestContrastWith,
  minContrastWith,
  mostVivid,
  closestColor,
} from "./engine/selectors";
export {
  contrast,
  hexToRgb,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  mix,
  shiftL,
} from "./engine/color";
export {
  ALL_THEMES_V3,
  DEFAULT_THEME_V3,
  getThemeSpec,
  MONOCLE,
  KAMI,
  SWISS_IKB,
  DUSK,
  DUNE_DARK,
  PRESS,
} from "./themes";

// V29 · 5 层 design system · 10 套新主题
export {
  compileThemeV29,
  type CompiledThemeV29,
} from "./engine/compile-v29";
export {
  type ThemeSpecV29,
  type ThemeColors,
  type ThemeTypography,
  type ThemeDecoration,
  type ThemeLayoutGrammar,
  type CoverGrammar,
  type ContentGrammar,
  type QuoteGrammar,
} from "./spec";
export {
  ALL_V29_THEMES,
  getV29ThemeSpec,
  V29_BIENNALE,
  V29_SAKURA,
  V29_8BIT,
  V29_COBALT,
  V29_EMERALD,
  V29_PINPAPER,
  V29_STENCIL,
  V29_MONOCHROME,
  V29_PINK,
  V29_VELLUM,
} from "./themes-v29";
export { compileAnyTheme, listAllThemes, type CompiledAnyTheme } from "./unified";
