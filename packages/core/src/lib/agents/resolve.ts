/**
 * 把 @ref 解析为实际内容。输入是 workspace 的精简视图 + 单个 ref，输出分 3 种模式：
 *
 * - inline：单行替换，用于 doc/deck 内联引用（例"收入：120, 135, 148"）
 * - block：多行/HTML 片段，用于块级嵌入
 * - data：原始数据，给其它 renderer / agent 用
 *
 * 设计取舍：
 * - resolver 不做渲染（不生成 HTML class），只产纯文本或最简单的 <table>
 * - 找不到目标时返回 {ok:false, reason}，caller 决定如何降级（保留原 raw / 显示 missing）
 */

import type { WorkspaceContext } from "@/lib/workspace/types";
import { marpToDeck } from "./deck-serialize";
import { mdToDoc } from "./doc-serialize";
import { sourceToSheet } from "./sheet-serialize";
import type { DeckDoc, DocDoc, SheetDoc } from "./types";
import type { Ref } from "./refs";

export type Resolved =
  | { ok: true; inline: string; block?: string; data?: unknown }
  | { ok: false; reason: string };

export function resolveRef(ref: Ref, ws: WorkspaceContext): Resolved {
  const target = ws.find((d) => d.id === ref.docId && d.kind === ref.kind);
  if (!target) {
    return { ok: false, reason: `未找到 ${ref.kind}:${ref.docId}` };
  }

  try {
    switch (ref.kind) {
      case "deck":
        return resolveDeck(marpToDeck(target.source), ref);
      case "doc":
        return resolveDoc(mdToDoc(target.source), ref);
      case "sheet":
        return resolveSheet(sourceToSheet(target.source), ref, target.title);
    }
  } catch (e) {
    return { ok: false, reason: `解析 ${ref.raw} 失败：${String(e)}` };
  }
}

function resolveDeck(deck: DeckDoc, ref: Ref): Resolved {
  if (ref.path.length === 0) {
    return {
      ok: true,
      inline: deck.slides[0]?.title ?? "(empty deck)",
      data: deck,
    };
  }
  const [slideId, field] = ref.path;
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) return { ok: false, reason: `slide ${slideId} 不存在` };
  if (!field) {
    return { ok: true, inline: slide.title, data: slide };
  }
  if (field === "title") return { ok: true, inline: slide.title };
  if (field === "notes") return { ok: true, inline: slide.notes ?? "" };
  if (field === "bullets") {
    return { ok: true, inline: slide.bullets.join("、"), data: slide.bullets };
  }
  return { ok: false, reason: `未知字段 ${field}` };
}

function resolveDoc(doc: DocDoc, ref: Ref): Resolved {
  if (ref.path.length === 0) {
    return { ok: true, inline: doc.title, data: doc };
  }
  const [blockId] = ref.path;
  const block = doc.blocks.find((b) => b.id === blockId);
  if (!block) return { ok: false, reason: `block ${blockId} 不存在` };
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return { ok: true, inline: block.text, data: block };
    case "list":
      return { ok: true, inline: block.items.join("、"), data: block };
    case "code":
      return { ok: true, inline: block.code, data: block };
  }
}

function resolveSheet(sheet: SheetDoc, ref: Ref, fallbackTitle: string): Resolved {
  if (ref.path.length === 0) {
    // 整表 → markdown 表（inline 用 title，block 用完整表）
    return {
      ok: true,
      inline: sheet.title || fallbackTitle,
      block: sheetToMarkdownTable(sheet),
      data: sheet,
    };
  }
  const [head, ...rest] = ref.path;
  if (head === "title") {
    return { ok: true, inline: sheet.title };
  }
  if (head === "col") {
    const [key] = rest;
    const col = sheet.columns.find((c) => c.key === key);
    if (!col) return { ok: false, reason: `列 ${key} 不存在` };
    const values = sheet.rows.map((r) => String(r[key] ?? ""));
    return {
      ok: true,
      inline: values.join(", "),
      data: values,
    };
  }
  if (head === "cell") {
    const [rowStr, colKey] = rest;
    const rowIdx = Number(rowStr);
    if (!Number.isFinite(rowIdx)) return { ok: false, reason: `行号 ${rowStr} 非法` };
    const row = sheet.rows[rowIdx];
    if (!row) return { ok: false, reason: `行 ${rowIdx} 不存在` };
    if (!(colKey in row)) return { ok: false, reason: `列 ${colKey} 不存在` };
    return { ok: true, inline: String(row[colKey] ?? "") };
  }
  if (head === "chart") {
    const [chartId] = rest;
    const chart = sheet.charts.find((c) => c.id === chartId);
    if (!chart) return { ok: false, reason: `图表 ${chartId} 不存在` };
    return {
      ok: true,
      inline: `[${chart.type}] ${chart.title}`,
      block: `<div class="chart-stub"><strong>[${chart.type}]</strong> ${escapeHtml(
        chart.title,
      )}<br><small>x=${escapeHtml(chart.xKey)} · y=${escapeHtml(
        chart.yKeys.join(","),
      )}</small></div>`,
      data: chart,
    };
  }
  return { ok: false, reason: `未知 path ${ref.path.join(":")}` };
}

export function sheetToMarkdownTable(sheet: SheetDoc, limit?: number): string {
  const header = "| " + sheet.columns.map((c) => c.label).join(" | ") + " |";
  const sep = "| " + sheet.columns.map(() => "---").join(" | ") + " |";
  const rows = (limit ? sheet.rows.slice(0, limit) : sheet.rows)
    .map(
      (r) =>
        "| " +
        sheet.columns.map((c) => String(r[c.key] ?? "").replace(/\|/g, "\\|")).join(" | ") +
        " |",
    )
    .join("\n");
  return [header, sep, rows].filter(Boolean).join("\n");
}

export function sheetToHtmlTable(sheet: SheetDoc, columns?: string[], limit?: number): string {
  const cols = columns
    ? sheet.columns.filter((c) => columns.includes(c.key))
    : sheet.columns;
  const thead = `<tr>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr>`;
  const body = (limit ? sheet.rows.slice(0, limit) : sheet.rows)
    .map(
      (r) =>
        `<tr>${cols
          .map((c) => `<td>${escapeHtml(String(r[c.key] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead>${thead}</thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
