/**
 * Doc 图文混排 layout 展开器(PR #B1)。
 *
 * 输入:markdown 源,内部含 `<!-- layout:image-xxx -->...<!-- /layout -->` 块
 * 输出:展开后的 markdown(把开闭标记换成 div 包裹,留 blank line 让 CommonMark
 *      继续按 markdown 解析内部内容),以及之后对渲染好的 HTML 做后处理拆分
 *      image-side / text-side。
 *
 * 支持 4 个 layout:
 *   - image-left  (图左 40% / 文右 60%)
 *   - image-right (图右 40% / 文左 60%)
 *   - image-full  (图占满,figcaption 在下,不拆分子节点)
 *   - image-card  (图+标题+正文 卡片,不拆分子节点)
 *
 * 设计 judgment:
 *  - 不在 normalize 阶段把 image / text 拆成两个 div,因为 CommonMark 的 "type 6"
 *    HTML block 规则要求每段 markdown 用空行分隔,深一层嵌套体验太差。改在
 *    unified 渲染完得到 HTML 后,用一次正则切分顶层 .plain-doc-layout-image-left/right
 *    div 的子节点:第一个含 <img> 的元素(<p>/<figure>)归 image-side,其余归
 *    text-side。
 *  - image-full / image-card 不拆分,CSS 自然处理布局。
 */

const LAYOUT_NAMES = ["image-left", "image-right", "image-full", "image-card"] as const;
type DocLayout = (typeof LAYOUT_NAMES)[number];

const LAYOUT_RE = /<!--\s*layout:(image-(?:left|right|full|card))\s*-->([\s\S]*?)<!--\s*\/layout\s*-->/g;

/**
 * Pre-process:把 markdown 源里的 `<!-- layout:image-xxx -->...<!-- /layout -->`
 * 包成 `<div class="plain-doc-layout-image-xxx">...</div>`,前后留空行,
 * 让 remark 按 CommonMark "type 6" HTML block 规则解析内部 markdown。
 */
export function expandDocLayouts(src: string): string {
  return src.replace(LAYOUT_RE, (_m, name: DocLayout, body: string) => {
    const inner = body.replace(/^\s+|\s+$/g, "");
    return `\n\n<div class="plain-doc-layout-${name}">\n\n${inner}\n\n</div>\n\n`;
  });
}

/**
 * Post-process:渲染完成的 HTML 里,把 .plain-doc-layout-image-left /
 * .plain-doc-layout-image-right wrapper 的内部子节点拆成两段:
 *   - image-side  (第一个带 <img> 的 <p> / <figure> 元素)
 *   - text-side   (剩余所有元素)
 * image-full / image-card 不拆。
 */
export function postProcessDocLayouts(html: string): string {
  // 用一个手写状态机扫,而不是大正则,因为 <div> 可能嵌套(虽然我们当前 layout
  // 块不嵌套,但 inner markdown 可能渲染出 <div>,比如 table-of-contents 嵌套)。
  const targets: Array<"image-left" | "image-right"> = ["image-left", "image-right"];
  let out = html;
  for (const name of targets) {
    out = splitLayoutWrapper(out, name);
  }
  return out;
}

function splitLayoutWrapper(html: string, name: "image-left" | "image-right"): string {
  const className = `plain-doc-layout-${name}`;
  const openTag = `<div class="${className}">`;
  let cursor = 0;
  let out = "";
  while (cursor < html.length) {
    const start = html.indexOf(openTag, cursor);
    if (start === -1) {
      out += html.slice(cursor);
      break;
    }
    // 把开 div 之前的 html 直接拼上
    out += html.slice(cursor, start);
    // 找匹配的 </div>(支持内部嵌套 <div>)
    const contentStart = start + openTag.length;
    const end = findMatchingDivEnd(html, contentStart);
    if (end === -1) {
      // 没有匹配关闭,容错:把剩余部分原样输出
      out += html.slice(start);
      break;
    }
    const inner = html.slice(contentStart, end);
    const closeIdx = end + "</div>".length;
    out += `${openTag}${splitChildren(inner)}</div>`;
    cursor = closeIdx;
  }
  return out;
}

/** 从 startIdx 起扫,找到平衡的 `</div>`(返回它的起始索引),否则 -1。 */
function findMatchingDivEnd(html: string, startIdx: number): number {
  let depth = 1;
  let i = startIdx;
  // 简单 token 扫:每遇到 <div ...> 或 </div>,depth ±1
  const openRe = /<div(\s[^>]*)?>/g;
  const closeRe = /<\/div>/g;
  while (depth > 0 && i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const openM = openRe.exec(html);
    const closeM = closeRe.exec(html);
    if (!closeM) return -1;
    if (openM && openM.index < closeM.index) {
      depth += 1;
      i = openM.index + openM[0].length;
    } else {
      depth -= 1;
      if (depth === 0) return closeM.index;
      i = closeM.index + closeM[0].length;
    }
  }
  return -1;
}

/**
 * 把 wrapper 的 innerHTML 拆成 image-side + text-side。
 * 策略:从头扫顶层元素(<p>/<figure>/<h1-6>/<ul>/<ol>/<blockquote>/<pre>/<table>/<div>),
 * 第一个含 <img 的元素是 image-side,其它都进 text-side。
 */
function splitChildren(inner: string): string {
  // 顶层元素切分:用一个非严格但够用的方法 —— 按 "</tag>\s*(?=<tag" 切。
  // 实际上更稳的做法是按已知的 block 顺序扫,这里用一个简易栈匹配。
  const blocks = splitTopLevelBlocks(inner);
  if (blocks.length === 0) return inner;
  let imageIdx = blocks.findIndex((b) => /<img[\s>]/i.test(b));
  if (imageIdx === -1) {
    // 没图就不拆,保持原样
    return inner;
  }
  const imageBlock = blocks[imageIdx];
  const textBlocks = blocks.filter((_, i) => i !== imageIdx);
  const textInner = textBlocks.join("\n");
  return `<div class="plain-doc-image-side">${imageBlock}</div><div class="plain-doc-text-side">${textInner}</div>`;
}

/**
 * 把 HTML 字符串按顶层 block 元素切分。
 * 用一个简易的 tag-balance 扫描:遇到顶层开标签就找它的匹配关闭。
 */
function splitTopLevelBlocks(html: string): string[] {
  const out: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/g;
  let cursor = 0;
  const len = html.length;
  while (cursor < len) {
    // 跳过开头空白
    while (cursor < len && /\s/.test(html[cursor])) cursor += 1;
    if (cursor >= len) break;
    tagRe.lastIndex = cursor;
    const m = tagRe.exec(html);
    if (!m || m.index !== cursor) {
      // 不是标签开头,把剩下当一块(罕见)
      out.push(html.slice(cursor).trim());
      break;
    }
    if (m[1] === "/") {
      // 顶层就遇到闭标签,异常,停
      out.push(html.slice(cursor).trim());
      break;
    }
    const tag = m[2].toLowerCase();
    // void 元素(<img>/<hr>/<br>)单独成块
    const VOID = new Set(["img", "hr", "br", "input"]);
    if (VOID.has(tag) || m[0].endsWith("/>")) {
      out.push(m[0]);
      cursor = m.index + m[0].length;
      continue;
    }
    // 找匹配关闭
    const end = findMatchingTagEnd(html, m.index + m[0].length, tag);
    if (end === -1) {
      out.push(html.slice(cursor).trim());
      break;
    }
    const closeLen = `</${tag}>`.length;
    out.push(html.slice(m.index, end + closeLen));
    cursor = end + closeLen;
  }
  return out.filter(Boolean);
}

function findMatchingTagEnd(html: string, startIdx: number, tag: string): number {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  const closeRe = new RegExp(`</${tag}>`, "gi");
  let depth = 1;
  let i = startIdx;
  while (depth > 0 && i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const openM = openRe.exec(html);
    const closeM = closeRe.exec(html);
    if (!closeM) return -1;
    if (openM && openM.index < closeM.index) {
      depth += 1;
      i = openM.index + openM[0].length;
    } else {
      depth -= 1;
      if (depth === 0) return closeM.index;
      i = closeM.index + closeM[0].length;
    }
  }
  return -1;
}

/**
 * 给 header / footer 模板字符串做变量替换。
 * 支持:{title} {author} {date} {page} {total}
 * {page} 和 {total} 走 CSS counter,这里替换为带 class 的 span。
 */
export function renderHeaderFooterTemplate(
  tpl: string,
  vars: { title?: string; author?: string; date?: string },
): string {
  return tpl
    .replace(/\{title\}/g, escapeHtml(vars.title ?? ""))
    .replace(/\{author\}/g, escapeHtml(vars.author ?? ""))
    .replace(/\{date\}/g, escapeHtml(vars.date ?? ""))
    .replace(/\{page\}/g, '<span class="plain-doc-page"></span>')
    .replace(/\{total\}/g, '<span class="plain-doc-total"></span>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 生成 header HTML。简单字符串当成单段渲染。
 */
export function renderDocHeader(
  header: string | { left?: string; center?: string; right?: string } | undefined,
  vars: { title?: string; author?: string; date?: string },
): string {
  if (!header) return "";
  if (typeof header === "string") {
    return `<header class="plain-doc-header"><div class="plain-doc-hf-center">${renderHeaderFooterTemplate(header, vars)}</div></header>`;
  }
  const left = header.left ? renderHeaderFooterTemplate(header.left, vars) : "";
  const center = header.center ? renderHeaderFooterTemplate(header.center, vars) : "";
  const right = header.right ? renderHeaderFooterTemplate(header.right, vars) : "";
  return `<header class="plain-doc-header"><div class="plain-doc-hf-left">${left}</div><div class="plain-doc-hf-center">${center}</div><div class="plain-doc-hf-right">${right}</div></header>`;
}

/**
 * 生成 footer HTML。简单字符串视作 center。
 */
export function renderDocFooter(
  footer: string | { left?: string; center?: string; right?: string } | undefined,
  vars: { title?: string; author?: string; date?: string },
): string {
  if (!footer) return "";
  if (typeof footer === "string") {
    return `<footer class="plain-doc-footer"><div class="plain-doc-hf-left"></div><div class="plain-doc-hf-center">${renderHeaderFooterTemplate(footer, vars)}</div><div class="plain-doc-hf-right"></div></footer>`;
  }
  const left = footer.left ? renderHeaderFooterTemplate(footer.left, vars) : "";
  const center = footer.center ? renderHeaderFooterTemplate(footer.center, vars) : "";
  const right = footer.right ? renderHeaderFooterTemplate(footer.right, vars) : "";
  return `<footer class="plain-doc-footer"><div class="plain-doc-hf-left">${left}</div><div class="plain-doc-hf-center">${center}</div><div class="plain-doc-hf-right">${right}</div></footer>`;
}

/**
 * columns 字段标准化。
 * - 1 / 不写 → null(原行为)
 * - 数字 N(N≥2) → { count: N }
 * - object { count, gap, break } → 透传
 */
export type DocColumns = { count: number; gap?: string; break?: "auto" | "column" | "avoid" };

export function normalizeColumns(value: unknown): DocColumns | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (value <= 1) return null;
    return { count: Math.floor(value) };
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 1) return { count: Math.floor(n) };
    return null;
  }
  if (typeof value === "object") {
    const v = value as { count?: unknown; gap?: unknown; break?: unknown };
    const count = typeof v.count === "number" ? v.count : Number(v.count);
    if (!Number.isFinite(count) || count <= 1) return null;
    const gap = typeof v.gap === "string" ? v.gap : undefined;
    const brk =
      v.break === "auto" || v.break === "column" || v.break === "avoid" ? v.break : undefined;
    return { count: Math.floor(count), gap, break: brk };
  }
  return null;
}

/**
 * 给 <article> 注入 column-count style attr。
 */
export function articleColumnsStyle(cols: DocColumns | null): string {
  if (!cols) return "";
  const gap = cols.gap ?? "32px";
  return ` style="column-count: ${cols.count}; column-gap: ${gap};"`;
}
