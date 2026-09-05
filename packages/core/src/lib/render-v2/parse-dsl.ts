/**
 * Plain DSL v2 parser · 把 .md/.csv source 解析成结构化 doc tree
 *
 * 输入(三种 kind 的源都过同一个 parser):
 *
 *   ---
 *   plain: deck@v2 | doc@v2 | sheet@v2
 *   theme: monocle | press | dune-dark | ...
 *   title: ...
 *   ---
 *
 *   ::: cover
 *   kicker: BUILT FOR AI ERA
 *   display: Web to Markdown.
 *   :::
 *
 *   ::: callout warn
 *   **关键差异:** ...
 *   :::
 *
 *   ## H2 标题(doc 用)
 *
 *   ... markdown 段落 ...
 *
 *   ::: panel ranking
 *   title: top_extractors
 *   items:
 *     - { rank: "01", label: "Reddit", metric: "72%" }
 *   :::
 *
 * 输出:
 *   {
 *     front: { plain, theme, title, author, ... },
 *     blocks: [
 *       { kind: "section", name: "cover", variant?: undefined, data: {...} },
 *       { kind: "callout", variant: "warn", body: "..." },
 *       { kind: "md", text: "## ... \n\n... " },
 *       { kind: "section", name: "panel", variant: "ranking", data: {...} },
 *       ...
 *     ]
 *   }
 *
 * 不依赖外部 YAML 库 —— 用一个轻量 YAML-ish parser,够覆盖 Plain DSL 实际用法。
 * 如果有真正复杂场景,后期可以换 js-yaml,接口不变。
 */

export type Front = {
  /** 必填 —— "deck@v2" / "doc@v2" / "sheet@v2" */
  plain?: string;
  theme?: string;
  title?: string;
  author?: string;
  date?: string;
  description?: string;
  /** sheet 引用的 csv 数据源 */
  "data-source"?: string;
  /** 任何其他 frontmatter 字段照透传 */
  [k: string]: unknown;
};

export type Block =
  | { kind: "section"; name: string; variant?: string; data: Record<string, unknown> }
  | { kind: "callout"; variant: "info" | "warn" | "danger" | "ok" | "tip" | "note"; body: string }
  | { kind: "code-group"; tabs: Array<{ info: string; code: string }> }
  | { kind: "interactive"; name: "tabs" | "accordion" | "steps" | "cards"; sections: Array<{ title: string; body: string }> }
  | { kind: "md"; text: string };

export type ParsedDoc = {
  front: Front;
  blocks: Block[];
};

/**
 * 主入口。
 * 接受 markdown / plain-dsl-md 字符串,返回结构化 doc tree。
 * 永不抛 —— 异常情况尽量降级到 raw markdown block。
 */
export function parseDsl(src: string): ParsedDoc {
  const { front, body } = stripFrontMatter(src);

  const blocks: Block[] = [];
  let i = 0;
  let mdBuf = "";

  const lines = body.split(/\r?\n/);
  while (i < lines.length) {
    const line = lines[i];

    // 匹配 ::: blockName [variant]
    const open = line.match(/^:::\s*([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+([a-zA-Z][a-zA-Z0-9_-]*))?\s*$/);
    if (open) {
      // 先把累积的 md 文本 flush
      flushMd();

      const name = open[1];
      const variant = open[2];

      // 找匹配的 :::
      const start = i + 1;
      let end = -1;
      for (let j = start; j < lines.length; j++) {
        if (/^:::\s*$/.test(lines[j])) {
          end = j;
          break;
        }
      }
      if (end < 0) {
        // 没找到关闭 —— 当 md 处理(safe fallback)
        mdBuf += line + "\n";
        i += 1;
        continue;
      }

      const innerLines = lines.slice(start, end);
      const inner = innerLines.join("\n");

      if (name === "code-group") {
        // inner 是若干 fenced code 块 · 每块成一个 tab(label = title 或 lang)
        const tabs = parseFencedTabs(inner);
        if (tabs.length > 0) {
          blocks.push({ kind: "code-group", tabs });
        }
      } else if (name === "tabs" || name === "accordion" || name === "steps" || name === "cards") {
        // 交互块:inner 用 `## 标题` 切分成若干 section,每段 body 是 markdown
        const sections = splitByH2(inner);
        if (sections.length > 0) {
          blocks.push({ kind: "interactive", name, sections });
        }
      } else if (name === "callout") {
        blocks.push({
          kind: "callout",
          variant: (["info", "warn", "danger", "ok", "tip", "note"].includes(variant ?? "info")
            ? variant
            : "info") as Block extends { kind: "callout" }
            ? Block["variant"]
            : "info",
          body: inner.trim(),
        });
      } else {
        const data = parseYamlIsh(inner);
        blocks.push({ kind: "section", name, variant, data });
      }

      i = end + 1;
      continue;
    }

    // 普通 markdown 行,累积
    mdBuf += line + "\n";
    i += 1;
  }
  flushMd();

  return { front, blocks };

  function flushMd() {
    const text = mdBuf.trim();
    if (text.length > 0) {
      blocks.push({ kind: "md", text });
    }
    mdBuf = "";
  }
}

/**
 * 从 code-group inner 抽出连续的 fenced code 块。
 * 每个 ```info\n...code...\n``` → { info, code }。
 */
function parseFencedTabs(inner: string): Array<{ info: string; code: string }> {
  const tabs: Array<{ info: string; code: string }> = [];
  const lines = inner.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const fenceOpen = lines[i].match(/^```(.*)$/);
    if (fenceOpen) {
      const info = fenceOpen[1].trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过关闭 ```
      tabs.push({ info, code: buf.join("\n") });
    } else {
      i += 1;
    }
  }
  return tabs;
}

/**
 * 把交互块 inner 按 `## 标题` 切成 section。
 * 第一个 ## 之前的内容(若有)忽略。每段 { title, body(markdown) }。
 */
function splitByH2(inner: string): Array<{ title: string; body: string }> {
  const lines = inner.split(/\r?\n/);
  const sections: Array<{ title: string; body: string }> = [];
  let cur: { title: string; body: string[] } | null = null;
  for (const ln of lines) {
    const h = ln.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (cur) sections.push({ title: cur.title, body: cur.body.join("\n").trim() });
      cur = { title: h[1], body: [] };
    } else if (cur) {
      cur.body.push(ln);
    }
  }
  if (cur) sections.push({ title: cur.title, body: cur.body.join("\n").trim() });
  return sections;
}

// ─────────────────────────────────────────────
// frontmatter
// ─────────────────────────────────────────────

function stripFrontMatter(src: string): { front: Front; body: string } {
  const m = src.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!m) return { front: {}, body: src };

  const front: Front = parseYamlIsh(m[1]) as Front;
  return { front, body: src.slice(m[0].length) };
}

// ─────────────────────────────────────────────
// YAML-ish parser
//
// 支持的语法子集:
//   key: value                  scalar
//   key: "quoted value"         scalar
//   key: |\n  block text        block scalar (multiline)
//   key:                        object
//     sub: value
//   key:                        array of strings
//     - item1
//     - item2
//   key:                        array of objects
//     - sub: x
//       sub2: y
//   key:                        array of inline objects
//     - { sub: x, sub2: "y" }
//
// 不支持: yaml anchors / tags / complex nested arrays-in-arrays
// ─────────────────────────────────────────────

/** 顶层 parser,处理任意层次的 indent block */
export function parseYamlIsh(src: string): Record<string, unknown> {
  const lines = src.split(/\r?\n/);
  return parseBlock(lines, 0, 0).value;
}

function parseBlock(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { value: Record<string, unknown>; nextIdx: number } {
  const obj: Record<string, unknown> = {};
  let i = startIdx;

  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("#")) {
      i += 1;
      continue;
    }
    const indent = leadingSpaces(raw);
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      // 不应该 — block parser 处理时上一行没消费完
      i += 1;
      continue;
    }

    // key: value
    const km = raw.slice(indent).match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!km) {
      i += 1;
      continue;
    }
    const key = km[1];
    const rest = km[2].trim();

    if (rest === "" || rest === "|" || rest === ">") {
      // 看下一行:array(- item)或 block scalar(`|`)或 object
      const next = peekNonEmpty(lines, i + 1);
      if (next && next.indent > indent) {
        // pipe block scalar (string)
        if (rest === "|" || rest === ">") {
          const collected: string[] = [];
          let j = i + 1;
          while (j < lines.length) {
            const r = lines[j];
            if (r.trim() === "") {
              collected.push("");
              j += 1;
              continue;
            }
            const ind = leadingSpaces(r);
            if (ind < next.indent) break;
            collected.push(r.slice(next.indent));
            j += 1;
          }
          obj[key] = collected.join("\n").replace(/\n+$/, "");
          i = j;
          continue;
        }
        // array(- item)
        if (next.line.slice(next.indent).startsWith("-")) {
          const arr = parseArray(lines, i + 1, next.indent);
          obj[key] = arr.value;
          i = arr.nextIdx;
          continue;
        }
        // nested object
        const sub = parseBlock(lines, i + 1, next.indent);
        obj[key] = sub.value;
        i = sub.nextIdx;
        continue;
      }
      // 空值
      obj[key] = "";
      i += 1;
      continue;
    }

    // inline scalar / inline object / inline array
    obj[key] = parseScalar(rest);
    i += 1;
  }

  return { value: obj, nextIdx: i };
}

function parseArray(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { value: unknown[]; nextIdx: number } {
  const arr: unknown[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("#")) {
      i += 1;
      continue;
    }
    const indent = leadingSpaces(raw);
    if (indent < baseIndent) break;
    const content = raw.slice(indent);
    if (!content.startsWith("-")) break;
    const rest = content.slice(1).replace(/^\s+/, "");

    // - { inline: object }
    if (rest.startsWith("{") && rest.endsWith("}")) {
      arr.push(parseInlineObject(rest));
      i += 1;
      continue;
    }
    // - key: value(对象起始,可能跨多行 — 后续行 indent 比 - 多)
    const km = rest.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (km) {
      // 构造一个虚拟"item indent"等于 baseIndent + 2(- 占 2 字符)
      // 收集这个 item 块直到下一个 - 同 indent
      const itemLines: string[] = [content.slice(2)]; // 去掉 "- "
      let j = i + 1;
      while (j < lines.length) {
        const r = lines[j];
        if (r.trim() === "") {
          j += 1;
          continue;
        }
        const ind = leadingSpaces(r);
        if (ind < baseIndent) break;
        if (ind === baseIndent && r.slice(ind).startsWith("-")) break;
        // 把行 indent 校准:相对 baseIndent 拿出来
        itemLines.push(r.slice(baseIndent + 2));
        j += 1;
      }
      const sub = parseBlock(itemLines, 0, 0);
      arr.push(sub.value);
      i = j;
      continue;
    }
    // - scalar
    arr.push(parseScalar(rest));
    i += 1;
  }
  return { value: arr, nextIdx: i };
}

function parseScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === "") return "";
  // null / bool
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  // number
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // inline object / array
  if (s.startsWith("{") && s.endsWith("}")) return parseInlineObject(s);
  if (s.startsWith("[") && s.endsWith("]")) return parseInlineArray(s);
  // quoted string
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return unquote(s);
  }
  // bare string
  return s;
}

function parseInlineObject(raw: string): Record<string, unknown> {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return {};
  // 简单拆分:逗号 + key: value · 不支持嵌套对象/数组里再有逗号(满足 Plain DSL 用法)
  const obj: Record<string, unknown> = {};
  const parts = splitCommas(inner);
  for (const p of parts) {
    const m = p.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    obj[m[1]] = parseScalar(m[2]);
  }
  return obj;
}

function parseInlineArray(raw: string): unknown[] {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  return splitCommas(inner).map(parseScalar);
}

/** 简单 comma 拆分,尊重 quoted strings + 括号嵌套(够 Plain DSL 用) */
function splitCommas(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  let inStr: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === inStr && s[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c as '"' | "'";
      cur += c;
      continue;
    }
    if (c === "{" || c === "[") {
      depth += 1;
      cur += c;
      continue;
    }
    if (c === "}" || c === "]") {
      depth -= 1;
      cur += c;
      continue;
    }
    if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function unquote(s: string): string {
  return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n");
}

function leadingSpaces(s: string): number {
  const m = s.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function peekNonEmpty(
  lines: string[],
  startIdx: number,
): { idx: number; line: string; indent: number } | null {
  for (let j = startIdx; j < lines.length; j++) {
    if (lines[j].trim() === "" || lines[j].trim().startsWith("#")) continue;
    return { idx: j, line: lines[j], indent: leadingSpaces(lines[j]) };
  }
  return null;
}
