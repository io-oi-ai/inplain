/**
 * doc-citations —— Doc 学术/长文档能力 (PR #B2)
 *
 * 三个能力,都在 normalize 阶段做 source-to-source 改写:
 * 1. 脚注: Markdown 标准语法 `[^N]` → <sup><a>...</a></sup> + 文末 <section>
 * 2. 引文: `@cite[key]` + frontmatter `bibliography:` → <cite> + References 节
 * 3. 目录页: frontmatter `layout: cover` → 文章 body 之前插入 <section class="plain-doc-cover">
 *
 * 设计原则:
 * - 不依赖任何 npm 包,纯 regex pass
 * - 输入输出都是 markdown source(允许混杂 raw HTML —— remark-rehype 用 allowDangerousHtml)
 * - 不消耗 frontmatter,留给后续 parseFrontMatter 解析
 * - 只在检测到对应语法/frontmatter 信号时启动,对 deck/sheet 完全无害
 *
 * 脚注编号算法:
 *   按"引用在正文中第一次出现的顺序"分配编号(不是按定义顺序)。
 *   同一 key 多次引用,共享同一编号,反向回链 id 用 fnref-{key}。
 */

// 单条 bibliography 条目(parsed from frontmatter)
type BibEntry = {
  id: string;
  author?: string;
  title?: string;
  year?: string;
  url?: string;
};

// frontmatter 切片(供 frontmatter-only 信号检测)
type FrontInfo = {
  layout?: string;
  title?: string;
  author?: string;
  date?: string;
  abstract?: string;
  bibliography: BibEntry[];
};

const FRONT_MATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

/**
 * 主入口:对 doc-shape 的 markdown source 跑三个 pass。
 * 安全防御:只在检测到对应信号时启动,deck/sheet 没踩雷的可能。
 */
export function processDocCitations(src: string): string {
  const frontMatch = src.match(FRONT_MATTER_RE);
  const front: FrontInfo = frontMatch ? parseFrontInfo(frontMatch[1]) : { bibliography: [] };
  const frontRaw = frontMatch ? frontMatch[0] : "";
  let body = frontMatch ? src.slice(frontMatch[0].length) : src;

  // 1) 脚注 —— 仅当存在 `[^key]: ...` 定义行时启动(避免误伤 Marp 的 [^1] 语义)
  const hasFootnoteDef = /^\[\^[A-Za-z0-9_-]+\]:\s/m.test(body);
  if (hasFootnoteDef) {
    body = processFootnotes(body);
  }

  // 2) 引文 —— 仅当 frontmatter 有 bibliography 时启动
  if (front.bibliography.length > 0 || /@cite\[/.test(body)) {
    body = processCitations(body, front.bibliography);
  }

  // 3) 目录页 —— frontmatter layout: cover
  if (front.layout === "cover") {
    const cover = renderCover(front);
    // 插到 body 最前面(在 frontmatter 之后)。renderDoc 会把它放在 hero 之后,
    // CSS 用 article:has(.plain-doc-cover) .plain-hero { display:none } 把 hero 藏起来。
    body = `${cover}\n\n${body}`;
  }

  return frontRaw + body;
}

// ─────────────────────────────────────────────────────────────
// frontmatter 微解析(只挑我们要的几个 key,不引入 yaml 依赖)
// ─────────────────────────────────────────────────────────────
function parseFrontInfo(yaml: string): FrontInfo {
  const out: FrontInfo = { bibliography: [] };
  const lines = yaml.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 顶级 key: value(只处理我们关心的)
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      const [, key, rawVal] = kv;
      const val = rawVal.trim();
      if (key === "layout") out.layout = unquote(val);
      else if (key === "title") out.title = unquote(val);
      else if (key === "author") out.author = unquote(val);
      else if (key === "date") out.date = unquote(val);
      else if (key === "abstract") {
        // 支持 `abstract: |` 多行块标量
        if (val === "|" || val === ">" || val === "") {
          // 收集后续缩进行
          const block: string[] = [];
          let j = i + 1;
          // 推断缩进:第一非空行的前导空格数
          let indent = -1;
          while (j < lines.length) {
            const l = lines[j];
            if (l.trim() === "") {
              block.push("");
              j++;
              continue;
            }
            const m = l.match(/^(\s+)/);
            if (!m) break; // 没缩进 = 块结束
            if (indent < 0) indent = m[1].length;
            if (m[1].length < indent) break;
            block.push(l.slice(indent));
            j++;
          }
          out.abstract = block.join("\n").replace(/\s+$/, "");
          i = j;
          continue;
        } else {
          out.abstract = unquote(val);
        }
      } else if (key === "bibliography") {
        // 期望随后是缩进的 list-of-objects
        const { entries, consumed } = parseBibliographyList(lines, i + 1);
        out.bibliography = entries;
        i = i + 1 + consumed;
        continue;
      }
    }
    i++;
  }
  return out;
}

function parseBibliographyList(
  lines: string[],
  start: number,
): { entries: BibEntry[]; consumed: number } {
  const entries: BibEntry[] = [];
  let i = start;
  let cur: BibEntry | null = null;
  let baseIndent = -1;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const indentMatch = line.match(/^(\s*)(.*)$/);
    if (!indentMatch) break;
    const [, indent, rest] = indentMatch;
    if (indent.length === 0) break; // 回到顶级 key
    if (baseIndent < 0) baseIndent = indent.length;
    if (indent.length < baseIndent) break;

    // 新条目: `- id: foo`
    const itemStart = rest.match(/^-\s+([a-zA-Z_]+):\s*(.*)$/);
    if (itemStart) {
      if (cur) entries.push(cur);
      cur = {} as BibEntry;
      const [, key, rawVal] = itemStart;
      assignBib(cur, key, unquote(rawVal.trim()));
      i++;
      continue;
    }
    // 继续条目字段: `  key: value`
    const fieldMatch = rest.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (fieldMatch && cur) {
      const [, key, rawVal] = fieldMatch;
      assignBib(cur, key, unquote(rawVal.trim()));
      i++;
      continue;
    }
    break;
  }
  if (cur) entries.push(cur);
  // 过滤掉没 id 的 (parse failure)
  return { entries: entries.filter((e) => e.id), consumed: i - start };
}

function assignBib(e: BibEntry, key: string, val: string): void {
  if (key === "id") e.id = val;
  else if (key === "author") e.author = val;
  else if (key === "title") e.title = val;
  else if (key === "year") e.year = val;
  else if (key === "url") e.url = val;
}

function unquote(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// ─────────────────────────────────────────────────────────────
// 脚注 pass —— 按出现顺序编号 + 文末 <section>
// ─────────────────────────────────────────────────────────────
function processFootnotes(body: string): string {
  // 先收集定义,从 body 里抠掉
  const defs = new Map<string, string>();
  body = body.replace(/^\[\^([A-Za-z0-9_-]+)\]:[ \t]+(.+(?:\n[ \t]+.+)*)/gm, (_m, key: string, text: string) => {
    // 多行定义:后续缩进行也归入这条
    defs.set(key, text.replace(/\n[ \t]+/g, " ").trim());
    return "";
  });

  // 按"在正文中第一次出现的顺序"分配编号
  const order: string[] = [];
  const numbers = new Map<string, number>();

  // 第一遍扫描:记录顺序(必须排除代码块/行内代码内的 [^foo])
  // 简易处理:mask 代码块,再扫描
  const masked = maskCode(body);
  const refRe = /\[\^([A-Za-z0-9_-]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(masked.text)) !== null) {
    const key = m[1];
    if (!defs.has(key)) continue; // 没定义的不处理(留作原文,避免误伤)
    if (!numbers.has(key)) {
      order.push(key);
      numbers.set(key, order.length);
    }
  }

  if (order.length === 0) return body;

  // 第二遍:替换为 <sup><a> —— 这里直接在 body 上做,代码块里的 [^x] 用同样 mask 保护
  const replaced = replaceOutsideCode(body, /\[\^([A-Za-z0-9_-]+)\]/g, (match, key) => {
    const n = numbers.get(key);
    if (!n) return match;
    return `<sup class="plain-doc-fnref"><a href="#fn-${key}" id="fnref-${key}">${n}</a></sup>`;
  });

  // 文末 section
  const items = order
    .map((key) => {
      const text = escapeHtml(defs.get(key) ?? "");
      return `<li id="fn-${key}">${text} <a class="plain-doc-fn-back" href="#fnref-${key}" aria-label="back">↩</a></li>`;
    })
    .join("\n");
  const section = `\n\n<section class="plain-doc-footnotes" aria-label="Footnotes"><ol>\n${items}\n</ol></section>\n`;
  return replaced.replace(/\s+$/, "") + section;
}

// ─────────────────────────────────────────────────────────────
// 引文 pass —— @cite[key] + References 节
// ─────────────────────────────────────────────────────────────
function processCitations(body: string, bib: BibEntry[]): string {
  const byId = new Map(bib.map((e) => [e.id, e]));
  const used: string[] = [];
  const seen = new Set<string>();

  const replaced = replaceOutsideCode(body, /@cite\[([A-Za-z0-9_-]+)\]/g, (_match, key) => {
    const entry = byId.get(key);
    if (!entry) {
      return `<span class="plain-doc-cite-missing">[?cite:${escapeHtml(key)}]</span>`;
    }
    if (!seen.has(key)) {
      seen.add(key);
      used.push(key);
    }
    const label = citeInline(entry);
    return `<cite class="plain-doc-cite"><a href="#cite-${key}">(${escapeHtml(label)})</a></cite>`;
  });

  if (used.length === 0) return replaced;

  const items = used
    .map((key) => {
      const e = byId.get(key)!;
      return `<li id="cite-${key}">${renderRefItem(e)}</li>`;
    })
    .join("\n");
  const section = `\n\n<section class="plain-doc-references" aria-label="References"><h2>References</h2><ol>\n${items}\n</ol></section>\n`;
  return replaced.replace(/\s+$/, "") + section;
}

/** 行内引文标签:取作者姓 + year,例如 "Smith, 2024" */
function citeInline(e: BibEntry): string {
  const authorPart = e.author ? authorLastName(e.author) : (e.id ?? "?");
  const yearPart = e.year ? `, ${e.year}` : "";
  return `${authorPart}${yearPart}`;
}

function authorLastName(author: string): string {
  // "Smith, J." → "Smith"  / "J. Smith" → "Smith"  / "Doe, A." → "Doe"
  const commaIdx = author.indexOf(",");
  if (commaIdx > 0) return author.slice(0, commaIdx).trim();
  const parts = author.trim().split(/\s+/);
  return parts[parts.length - 1] || author;
}

/** References 列表项: Author. (Year). <em>Title</em>. <a>link</a> */
function renderRefItem(e: BibEntry): string {
  const bits: string[] = [];
  // 作者末尾若已经带 `.` 不再补一个,避免 "Smith, J.." 这种重复句号
  if (e.author) {
    const a = e.author.replace(/\.+\s*$/, "");
    bits.push(`${escapeHtml(a)}.`);
  }
  if (e.year) bits.push(`(${escapeHtml(e.year)}).`);
  if (e.title) {
    const t = e.title.replace(/\.+\s*$/, "");
    bits.push(`<em>${escapeHtml(t)}</em>.`);
  }
  if (e.url) bits.push(`<a href="${escapeAttr(e.url)}">${escapeHtml(e.url)}</a>`);
  return bits.join(" ");
}

// ─────────────────────────────────────────────────────────────
// 目录页 (cover)
// ─────────────────────────────────────────────────────────────
function renderCover(front: FrontInfo): string {
  const title = escapeHtml(front.title ?? "Untitled");
  const metaLabel = front.title ? `Cover · ${escapeHtml(front.title)}` : "Cover";
  const byline: string[] = [];
  if (front.author) byline.push(escapeHtml(front.author));
  if (front.date) byline.push(escapeHtml(front.date));
  const bylineHtml = byline.length > 0
    ? `<div class="plain-doc-cover-byline">${byline.join(" · ")}</div>`
    : "";
  const abstractHtml = front.abstract
    ? `<p class="plain-doc-cover-abstract">${escapeHtml(front.abstract).replace(/\n\n+/g, "</p><p class=\"plain-doc-cover-abstract\">").replace(/\n/g, " ")}</p>`
    : "";
  return `<section class="plain-doc-cover">
  <div class="plain-doc-cover-meta">${metaLabel}</div>
  <h1>${title}</h1>
  ${bylineHtml}
  ${abstractHtml}
</section>`;
}

// ─────────────────────────────────────────────────────────────
// 代码块保护 —— footnote/cite 不能在 ``` 或 `inline` 里被替换
// ─────────────────────────────────────────────────────────────
function maskCode(src: string): { text: string; restore: (s: string) => string } {
  const slots: string[] = [];
  const text = src
    .replace(/```[\s\S]*?```/g, (m) => {
      slots.push(m);
      return ` C${slots.length - 1} `;
    })
    .replace(/`[^`\n]*`/g, (m) => {
      slots.push(m);
      return ` C${slots.length - 1} `;
    });
  return {
    text,
    restore: (s) => s.replace(/ C(\d+) /g, (_m, i) => slots[Number(i)]),
  };
}

function replaceOutsideCode(
  src: string,
  re: RegExp,
  fn: (match: string, p1: string) => string,
): string {
  const masked = maskCode(src);
  const replaced = masked.text.replace(re, fn as (substring: string, ...args: unknown[]) => string);
  return masked.restore(replaced);
}

// ─────────────────────────────────────────────────────────────
// HTML escape utilities (复用 doc.ts 里的实现也行,但保持本文件独立无外部依赖)
// ─────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
