/**
 * @icon:name 语法 —— 在 markdown 正文 / deck bullets / doc paragraph 里内联图标。
 *
 * 图标数据从 icons-data.ts 读取(30 个 vendored,~4.6KB),替代 58M lucide-static 依赖。
 * 纯函数,无 fs/node 依赖,Edge runtime 也可用。
 *
 * 语法：@icon:bar-chart / @icon:arrow-right / @icon:check-circle
 * 未知名 → 保留原文(不抛错,写文档的人看到 "@icon:xxx" 就知道名字写错了)
 */

import { LUCIDE_ICON_PATHS } from "./icons-data";

/** 允许的图标名:kebab-case。 */
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/** agent prompt 里告诉模型可以用的常见图标集。控制输出的可预测性。 */
export const COMMON_ICONS = Object.keys(LUCIDE_ICON_PATHS);

/**
 * 两阶段替换:
 *  1. `tokenizeIcons(src)` 把 @icon:name 换成纯文本占位 `\u0001ICON:name\u0001`
 *     (Markdown 解析器会把它当普通文字透过)
 *  2. Marp/marked 渲染后,`expandIconTokens(html)` 把占位符替换成真正的 SVG
 */
const TOKEN_OPEN = "\u0001ICON:";
const TOKEN_CLOSE = "\u0001";

export function tokenizeIcons(src: string): string {
  return src.replace(/@icon:([a-z0-9][a-z0-9-]*)/gi, (_m, rawName) => {
    const name = String(rawName).toLowerCase();
    if (!NAME_RE.test(name)) return _m;
    return `${TOKEN_OPEN}${name}${TOKEN_CLOSE}`;
  });
}

export function expandIconTokens(
  html: string,
  opts: { size?: number; color?: string } = {},
): string {
  const size = opts.size ?? 18;
  const color = opts.color ?? "currentColor";
  const re = new RegExp(`${TOKEN_OPEN}([a-z0-9][a-z0-9-]*)${TOKEN_CLOSE}`, "g");
  return html.replace(re, (_m, rawName) => {
    const name = String(rawName).toLowerCase();
    const body = LUCIDE_ICON_PATHS[name];
    if (!body) return "";
    return buildSvg(name, body, size, color);
  });
}

/** 向后兼容:老的直接替换方式(供非 markdown 场景或已经是 HTML 的 input 用) */
export function replaceIcons(src: string, opts: { size?: number; color?: string } = {}): string {
  return expandIconTokens(tokenizeIcons(src), opts);
}

function buildSvg(name: string, body: string, size: number, color: string): string {
  return (
    `<svg class="plain-icon lucide-${name}" ` +
    `style="display:inline-block;vertical-align:-0.15em;margin:0 0.15em" ` +
    `xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  );
}
