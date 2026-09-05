/**
 * sheet@v3 DSL 双向 serialize
 *
 *   frontmatter (YAML · 标准 ---...--- 段)
 *
 *   ::: datasets
 *   - id: ...
 *     source: csv
 *     data: |
 *       ...
 *   :::
 *
 *   ::: queries / ::: vizzes / ::: dashboard 同构
 *
 * parseDsl(v2) 的 parseYamlIsh 不识别"顶层 anonymous array"
 * (它只匹配 `key: value` · 看到 `- id: ...` 会丢弃)。
 * v3 的四区都是顶层 array · 所以 v3 自己抽 section,给每个 section inner
 * 前置 `items:\n` 让 parseYamlIsh 识别成 { items: [...] }。
 */
import { SheetDocV3, type SheetDocV3T } from "./schemas";
import { parseYamlIsh } from "../render-v2/parse-dsl";

// ─────────────────────────────────────────────
// Parse · DSL → SheetDocV3
// ─────────────────────────────────────────────

export function parseSheetV3(source: string): SheetDocV3T | null {
  const r = parseSheetV3Detailed(source);
  return r.ok ? r.doc : null;
}

export function parseSheetV3Detailed(source: string):
  | { ok: true; doc: SheetDocV3T }
  | { ok: false; issues: Array<{ path: string; message: string }> } {
  // 1. frontmatter
  const fmMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!fmMatch) {
    return {
      ok: false,
      issues: [{ path: "frontmatter", message: "missing --- yaml frontmatter ---" }],
    };
  }
  const front = parseYamlIsh(fmMatch[1]);
  if (typeof front.plain !== "string" || !front.plain.trim().startsWith("sheet@v3")) {
    return {
      ok: false,
      issues: [{ path: "front.plain", message: 'missing or wrong "plain: sheet@v3"' }],
    };
  }

  // 2. 抽 4 个 section · `::: name\n...inner...\n:::`
  const body = source.slice(fmMatch[0].length);
  const sectionMap = extractSections(body);

  const datasets = innerToArray(sectionMap.get("datasets") ?? "");
  const queries = innerToArray(sectionMap.get("queries") ?? "");
  const vizzes = innerToArray(sectionMap.get("vizzes") ?? "");
  const dashboard = innerToArray(sectionMap.get("dashboard") ?? "");

  const candidate = {
    plain: "sheet@v3",
    theme: pickStr(front, "theme") ?? "dune-dark",
    // 统一走英文哨兵默认值(与 workspace/title.ts DEFAULT_TITLES.sheet 一致),
    // 修历史 bug:此处曾用中文 "未命名 sheet",而 title.ts 用英文 "Untitled Sheet",语言不一致。
    // 真正的本地化默认标题由渲染层(有 useTranslations)注入,见 workspace/title.ts。
    title: pickStr(front, "title") ?? "Untitled Sheet",
    author: pickStr(front, "author"),
    date: pickStr(front, "date"),
    description: pickStr(front, "description"),
    datasets,
    queries,
    vizzes,
    dashboard,
  };
  const r = SheetDocV3.safeParse(candidate);
  if (r.success) return { ok: true, doc: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}

/**
 * 把 body 切成 `::: name\n...inner...\n:::` map。
 * 重复 section 后者覆盖前者(v3 文档应该不出现)。
 */
function extractSections(body: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^:::\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*$/);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    let end = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^:::\s*$/.test(lines[j])) {
        end = j;
        break;
      }
    }
    if (end < 0) break;
    map.set(name, lines.slice(i + 1, end).join("\n"));
    i = end + 1;
  }
  return map;
}

/**
 * 给 inner 文本前置 `items:\n`,让 parseYamlIsh 把顶层 `- id: ...` 解析成
 * { items: [...] }。inner 文本里所有非空行缩进 2 空格变成 items 子项。
 */
function innerToArray(inner: string): unknown[] {
  if (!inner.trim()) return [];
  const indented = inner
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? "  " + line : line))
    .join("\n");
  const wrapped = `items:\n${indented}`;
  const parsed = parseYamlIsh(wrapped);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function pickStr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// ─────────────────────────────────────────────
// Serialize · SheetDocV3 → DSL
// ─────────────────────────────────────────────

export function serializeSheetV3(doc: SheetDocV3T): string {
  const lines: string[] = ["---", "plain: sheet@v3"];
  if (doc.theme && doc.theme !== "dune-dark") lines.push(`theme: ${doc.theme}`);
  lines.push(`title: ${doc.title}`);
  if (doc.author) lines.push(`author: ${doc.author}`);
  if (doc.date) lines.push(`date: ${doc.date}`);
  if (doc.description) lines.push(`description: ${doc.description}`);
  lines.push("---", "");

  // datasets
  lines.push("::: datasets");
  for (const ds of doc.datasets) {
    lines.push(`- id: ${ds.id}`);
    lines.push(`  source: ${ds.source}`);
    if (ds.url) lines.push(`  url: ${ds.url}`);
    if (ds.data) {
      lines.push(`  data: |`);
      ds.data.split("\n").forEach((row) => lines.push(`    ${row}`));
    }
  }
  lines.push(":::", "");

  // queries
  if (doc.queries.length > 0) {
    lines.push("::: queries");
    for (const q of doc.queries) {
      lines.push(`- id: ${q.id}`);
      lines.push(`  source: ${q.source}`);
      if (q.description) lines.push(`  description: ${q.description}`);
      lines.push(`  sql: |`);
      q.sql.split("\n").forEach((row) => lines.push(`    ${row}`));
    }
    lines.push(":::", "");
  }

  // vizzes
  lines.push("::: vizzes");
  for (const v of doc.vizzes) {
    lines.push(`- id: ${v.id}`);
    lines.push(`  query: ${v.query}`);
    lines.push(`  kind: ${v.kind}`);
    if (v.title) lines.push(`  title: ${v.title}`);
    if (v.subtitle) lines.push(`  subtitle: ${v.subtitle}`);
    if (Object.keys(v.config).length > 0) {
      lines.push(`  config:`);
      serializeConfigYaml(v.config, "    ").forEach((row) => lines.push(row));
    }
  }
  lines.push(":::", "");

  // dashboard
  lines.push("::: dashboard");
  for (const c of doc.dashboard) {
    const target = c.cell;
    if (typeof target === "string") {
      lines.push(`- cell: ${target}`);
    } else {
      lines.push(`- cell:`);
      lines.push(`    md: |`);
      target.md.split("\n").forEach((row) => lines.push(`      ${row}`));
    }
    lines.push(`  x: ${c.x}`);
    lines.push(`  y: ${c.y}`);
    lines.push(`  w: ${c.w}`);
    lines.push(`  h: ${c.h}`);
  }
  lines.push(":::", "");

  return lines.join("\n");
}

/** 简单 YAML emit · scalar / nested object · 不处理嵌套数组 */
function serializeConfigYaml(obj: Record<string, unknown>, indent: string): string[] {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      const s = String(v);
      if (typeof v === "string" && /[:#\n]/.test(s)) {
        lines.push(`${indent}${k}: "${s.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${indent}${k}: ${s}`);
      }
    } else if (Array.isArray(v)) {
      lines.push(`${indent}${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`);
    } else if (typeof v === "object") {
      lines.push(`${indent}${k}:`);
      serializeConfigYaml(v as Record<string, unknown>, indent + "  ").forEach((row) =>
        lines.push(row),
      );
    }
  }
  return lines;
}
