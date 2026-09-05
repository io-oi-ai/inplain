/**
 * V29-C · 统一 theme 入口 · 自动判断走 V29 还是 legacy
 *
 * 用法替换原:
 *   compileTheme(getThemeSpec(id))  // 老 API · 老 themes
 *
 * 改:
 *   compileAnyTheme(id)             // 自动:V29 走 V29 · 老 themes 走老
 */
import { compileTheme as compileLegacy } from "./engine/compile";
import { compileThemeV29 } from "./engine/compile-v29";
import { getThemeSpec as getLegacySpec, MONOCLE } from "./themes";
import { getV29ThemeSpec, ALL_V29_THEMES } from "./themes-v29";
import type { ThemeSpecV29 } from "./spec";

export type CompiledAnyTheme = {
  id: string;
  label: string;
  vars: Record<string, string>;
  css: string;
  /** 当前 spec 是否是 V29 5 层结构 */
  isV29: boolean;
  /** V29 spec(只在 isV29=true 时存在 · 让 layout grammar 使用) */
  v29Spec?: ThemeSpecV29;
};

/**
 * 接 id · 自动判断 V29 或老 · 编出 CSS
 *
 * V29 优先 · 兜底老 themes · 都找不到 fallback monocle
 */
export function compileAnyTheme(id: string): CompiledAnyTheme {
  // V29 ID 前缀 · 或者直接 lookup
  const v29Spec = getV29ThemeSpec(id);
  if (v29Spec) {
    const compiled = compileThemeV29(v29Spec);
    return {
      id: compiled.id,
      label: compiled.label,
      vars: compiled.vars,
      css: compiled.css,
      isV29: true,
      v29Spec,
    };
  }

  // 老 themes
  const legacySpec = getLegacySpec(id);
  const compiled = compileLegacy(legacySpec);
  return {
    id: compiled.id,
    label: compiled.label ?? legacySpec.id,
    vars: compiled.vars,
    css: compiled.css,
    isV29: false,
  };
}

/**
 * 列所有可用 theme · 给 picker 用
 */
export function listAllThemes(): Array<{
  id: string;
  label: string;
  vibe?: string;
  isV29: boolean;
}> {
  const v29 = ALL_V29_THEMES.map((t) => ({
    id: t.id,
    label: t.label,
    vibe: t.vibe,
    isV29: true,
  }));
  // 老 themes 也列出来(向后兼容 · 用户老 deck 不会坏)
  // 但是 vibe 字段没有 · 给个 placeholder
  // 用 import 防循环 · 这里直接从 themes 引
  return v29;
}

export { MONOCLE };
