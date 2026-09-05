/**
 * DesignTokens 的运行时校验 —— **安全边界**,不是形式主义。
 *
 * tokens 最终会被 tokensToCss() 拼进 `:root{ --plain-accent: <值>; }` 注入
 * 每一份产物。所以任何外部来源(CLI / 用户 POST)的 token 值都必须先验:
 * 一个含 `;` 或 `}` 的值能逃出声明、往产物里注入任意 CSS。
 *
 * 允许的值形态只有三类,覆盖模板里实际用到的全部写法:
 *   - hex:         #fff / #ffffff / #ffffffcc
 *   - CSS 颜色函数: rgb() / rgba() / hsl() / oklch() / lab() / color-mix(...)
 *   - 关键字:      transparent / currentColor / inherit
 * 一律禁止 `;` `}` `{` `<` `>` `@` 和 url( / expression( 这些注入载体。
 */
import { z } from "zod";

const INJECTION = /[;{}<>@]|url\s*\(|expression\s*\(|\/\*|\*\//i;

/** 颜色值:限长 + 白名单函数 + 禁注入字符 */
const colorValue = z
  .string()
  .min(1)
  .max(200)
  .refine((v) => !INJECTION.test(v), { message: "illegal characters in color value" })
  .refine(
    (v) =>
      /^#[0-9a-f]{3,8}$/i.test(v.trim()) ||
      /^(transparent|currentcolor|inherit)$/i.test(v.trim()) ||
      /^(rgb|rgba|hsl|hsla|oklch|oklab|lch|lab|color-mix|color)\s*\(/i.test(v.trim()),
    { message: "unsupported color format" },
  );

/** 长度值:只允许数字 + 单位(px/rem/em/%/vh/vw)或 0 */
const lengthValue = z
  .string()
  .min(1)
  .max(40)
  .refine((v) => !INJECTION.test(v), { message: "illegal characters in length value" })
  .refine((v) => /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch)?$/i.test(v.trim()), {
    message: "unsupported length format (expected e.g. 8px)",
  });

/** 字体栈:族名 + 逗号 + 空格 + 引号,不允许函数/分号 */
const fontStack = z
  .string()
  .min(1)
  .max(300)
  .refine((v) => !INJECTION.test(v) && !v.includes("("), {
    message: "illegal characters in font stack",
  });

export const ColorTokensSchema = z.object({
  bg: colorValue,
  surface: colorValue,
  surface2: colorValue,
  text: colorValue,
  textMute: colorValue,
  textFaint: colorValue,
  border: colorValue,
  borderStrong: colorValue,
  accent: colorValue,
  accentStrong: colorValue,
  accentBg: colorValue,
  success: colorValue,
  warn: colorValue,
  danger: colorValue,
  dangerBg: colorValue,
});

export const DesignTokensSchema = z.object({
  color: ColorTokensSchema,
  radius: lengthValue,
  gap: lengthValue,
  font: z
    .object({
      body: fontStack.optional(),
      display: fontStack.optional(),
      mono: fontStack.optional(),
    })
    .default({}),
  scheme: z.enum(["light", "dark"]),
});
