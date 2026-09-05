/**
 * Plain 主题语言 v2 · 主题注册表
 *
 * 6 套首发主题(MVP)。详见 docs/THEME-LANGUAGE.md。
 */

import type { PlainTheme } from "../theme-schema";
import { MONOCLE } from "./monocle";
import { KAMI } from "./kami";
import { SWISS } from "./swiss";
import { DUSK } from "./dusk";
import { DUNE_DARK } from "./dune-dark";
import { PRESS } from "./press";

export { MONOCLE, KAMI, SWISS, DUSK, DUNE_DARK, PRESS };

/** 6 套首发主题清单(MVP) */
export const ALL_THEMES_V2: ReadonlyArray<PlainTheme> = [
  MONOCLE,
  KAMI,
  SWISS,
  DUSK,
  DUNE_DARK,
  PRESS,
];

/** id 查表 */
export function getTheme(id: string): PlainTheme | undefined {
  return ALL_THEMES_V2.find((t) => t.id === id);
}

/** 给指定 context(deck/doc/sheet)能用的主题 */
export function getThemesForContext(
  context: "deck" | "doc" | "sheet",
): ReadonlyArray<PlainTheme> {
  return ALL_THEMES_V2.filter(
    (t) => t.contexts.includes("all") || t.contexts.includes(context),
  );
}

/** 默认主题:Monocle */
export const DEFAULT_THEME_ID = "monocle";
