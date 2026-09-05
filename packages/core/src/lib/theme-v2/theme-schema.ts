/**
 * Plain 主题语言 v2 · L2 Theme · 美学品牌
 *
 * 详见 docs/THEME-LANGUAGE.md
 *
 * Theme = primitives 的具体组合,有 id / vibe / contexts / mood / chrome 全套。
 * 6 套首发主题(MVP)在 ./themes/*.ts。
 */

import { z } from "zod";
import {
  ColorPrimitive,
  FontStack,
  FontScale,
  Space,
  Radius,
  Motion,
  Chrome,
} from "./primitives";

// ─────────────────────────────────────────────
// Theme schema
// ─────────────────────────────────────────────

/** 主题适用场景 —— 让 AI 主动选时知道这套能不能用在 doc 上 */
export const ThemeContext = z.enum(["deck", "doc", "sheet", "all"]);
export type ThemeContext = z.infer<typeof ThemeContext>;

/** mood —— 给 AI / UI 一个粗分类标签 */
export const ThemeMood = z.enum([
  "light",          // 浅底,默认
  "dark",           // 深底,科技 / 夜场
  "warm",           // 暖纸 / 杂志
  "cool",           // 冷蓝 / 严肃
  "high-contrast", // 瑞士单色锚点
]);
export type ThemeMood = z.infer<typeof ThemeMood>;

export const PlainTheme = z.object({
  /** 唯一 id —— 如 'monocle' / 'dune-dark' */
  id:       z.string(),
  /** UI 显示名(中文 OK) */
  label:    z.string(),
  /** 一句话气质(给 AI 当推荐 hint) */
  vibe:     z.string(),
  /** 适用场景 —— 'all' 表示通用 */
  contexts: z.array(ThemeContext).default(["all"]),
  /** mood 粗分类 */
  mood:     ThemeMood,

  /** 12 色 —— 必填 */
  colors:   ColorPrimitive,
  /** 4 字体族 —— 必填 */
  fonts:    FontStack,

  /** 部分主题可覆盖默认 font scale(瑞士巨字 / kami 中文重排) */
  type:     FontScale.partial().optional(),
  /** 间距覆盖 */
  space:    Space.partial().optional(),
  /** 圆角覆盖 */
  radius:   Radius.partial().optional(),
  /** motion 覆盖 */
  motion:   Motion.partial().optional(),

  /** 装饰 chrome */
  chrome:   Chrome,
});
export type PlainTheme = z.infer<typeof PlainTheme>;

/** 主题清单 —— 后续 themes/*.ts 都注册到这里 */
export type ThemeRegistry = ReadonlyArray<PlainTheme>;
