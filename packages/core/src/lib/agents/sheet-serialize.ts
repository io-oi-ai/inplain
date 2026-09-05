import type { SheetChart, SheetColumn, SheetDoc, SheetFormat } from "./types";

/**
 * SheetDoc 的纯文本表示：一个"信封"文件 (.sheet.md)
 *
 * 结构：
 * ---
 * kind: sheet
 * title: Q3 财务
 * columns: <JSON array>
 * charts:  <JSON array>
 * ---
 *
 * ```csv
 * <CSV 内容，第一行是 header>
 * ```
 *
 * <narrative markdown>
 *
 * 设计考虑：
 * - 纯文本、可 git diff、AI 友好
 * - CSV 块让 Excel/Numbers 用户一眼看懂
 * - columns/charts 用 JSON 是为了 AI 生成更可靠（避免 YAML 二维数组歧义）
 * - 单文件对比目录形式更适合 M1 的"一份源文件"哲学；V2 再考虑拆
 */

export function sheetToSource(doc: SheetDoc): string {
  const front = [
    "---",
    "kind: sheet",
    `title: ${escapeYaml(doc.title)}`,
    `columns: ${JSON.stringify(doc.columns)}`,
    `charts: ${JSON.stringify(doc.charts)}`,
    // Stage 4:formats 可选,空数组不写避免 noise
    ...(doc.formats && doc.formats.length > 0
      ? [`formats: ${JSON.stringify(doc.formats)}`]
      : []),
    // V16 kami:tableStyle 可选,空字符串/undefined 不写
    ...(doc.tableStyle && doc.tableStyle.trim().length > 0
      ? [`tableStyle: ${escapeYaml(doc.tableStyle)}`]
      : []),
    "---",
    "",
    "```csv",
    rowsToCsv(doc.columns, doc.rows),
    "```",
    "",
    doc.narrative.trimEnd(),
    "",
  ];
  return front.join("\n");
}

function escapeYaml(v: string): string {
  if (/[:#\n"']/.test(v)) return JSON.stringify(v);
  return v;
}

function rowsToCsv(cols: SheetColumn[], rows: Array<Record<string, unknown>>): string {
  const header = cols.map((c) => csvCell(c.key)).join(",");
  const body = rows
    .map((r) => cols.map((c) => csvCell(toStr(r[c.key]))).join(","))
    .join("\n");
  return body ? `${header}\n${body}` : header;
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

/**
 * 源文件 → SheetDoc。
 * 最小解析器：frontmatter (title/columns/charts) + fenced csv block + narrative.
 */
export function sourceToSheet(src: string): SheetDoc {
  const { body, front } = stripFrontmatter(src);
  const { csv, narrative } = splitBody(body);
  const columns = (front.columns as SheetColumn[] | undefined) ?? [
    { key: "col1", label: "Col 1", type: "string" as const },
  ];
  const charts = (front.charts as SheetChart[] | undefined) ?? [];
  const formats = (front.formats as SheetFormat[] | undefined) ?? [];
  const tableStyle = front.tableStyle as string | undefined;
  const rows = csvToRows(csv, columns);

  return {
    kind: "sheet",
    title: (front.title as string | undefined) ?? "Untitled",
    columns,
    rows,
    narrative: narrative.trim(),
    charts,
    formats,
    ...(tableStyle ? { tableStyle } : {}),
  };
}

type FrontMatter = { title?: unknown; columns?: unknown; charts?: unknown; formats?: unknown; tableStyle?: unknown };

function stripFrontmatter(src: string): { body: string; front: FrontMatter } {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { body: src, front: {} };
  const front: FrontMatter = {};
  for (const line of m[1].split("\n")) {
    const pair = line.match(/^\s*([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (!pair) continue;
    const [, key, rawVal] = pair;
    if (key === "kind") continue; // 固定为 sheet，不作为 front 数据
    const parsed = tryParseValue(rawVal);
    if (
      key === "title" ||
      key === "columns" ||
      key === "charts" ||
      key === "formats" ||
      key === "tableStyle"
    ) {
      (front as Record<string, unknown>)[key] = parsed;
    }
  }
  return { body: src.slice(m[0].length), front };
}

function tryParseValue(s: string): unknown {
  const t = s.trim();
  if (t.startsWith("[") || t.startsWith("{") || t.startsWith('"')) {
    try {
      return JSON.parse(t);
    } catch {
      return s;
    }
  }
  return s;
}

function splitBody(body: string): { csv: string; narrative: string } {
  const fence = body.match(/```csv\s*\n([\s\S]*?)\n```/);
  if (!fence) return { csv: "", narrative: body };
  const before = body.slice(0, fence.index ?? 0);
  const after = body.slice((fence.index ?? 0) + fence[0].length);
  const narrative = (before + "\n" + after).trim();
  return { csv: fence[1], narrative };
}

function csvToRows(
  csv: string,
  columns: SheetColumn[],
): Array<Record<string, unknown>> {
  // 防御:columns 应该是数组;如果上游 frontmatter 解析出问题(例如 yaml 流式 key 误匹),给空数组兜底。
  if (!Array.isArray(columns)) {
    console.warn("[sheet-serialize] columns is not an array, got:", typeof columns, columns);
    columns = [];
  }
  const lines = csv.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  // 首行是 header（我们信任它与 columns.key 一致；若不一致，以 columns 为准）
  const headerCells = parseCsvLine(lines[0]);
  const keyOrder = headerCells.length > 0 ? headerCells : columns.map((c) => c.key);
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    keyOrder.forEach((k, idx) => {
      const col = columns.find((c) => c.key === k);
      const raw = cells[idx] ?? "";
      row[k] = coerce(raw, col?.type);
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function coerce(raw: string, type: SheetColumn["type"] | undefined): unknown {
  if (raw === "") return null;
  switch (type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case "boolean":
      return raw === "true" ? true : raw === "false" ? false : raw;
    case "date":
    case "string":
    default:
      return raw;
  }
}
