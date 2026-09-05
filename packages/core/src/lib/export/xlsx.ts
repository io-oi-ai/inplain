import * as XLSX from "xlsx";
import type { SheetDoc } from "@/lib/agents/types";

/**
 * SheetDoc → XLSX buffer。
 * - Sheet1 "Data"：第一行 header（label），后续是 rows。按 column.type 转换值。
 * - Sheet2 "Notes"：narrative 一整段 + 图表占位列表（作为文本记录，Excel 不做图）
 */
export function sheetDocToXlsx(doc: SheetDoc): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Data sheet
  const header = doc.columns.map((c) => c.label);
  const body = doc.rows.map((r) =>
    doc.columns.map((c) => coerceForXlsx(r[c.key], c.type)),
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  // 列宽：按最长内容估（min 10 / max 40 字符）
  ws["!cols"] = doc.columns.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...doc.rows.map((r) => String(r[c.key] ?? "").length),
    );
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
  });
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // Notes sheet
  const noteRows: Array<Array<string | number>> = [];
  noteRows.push(["Title", doc.title]);
  noteRows.push([]);
  noteRows.push(["Narrative"]);
  for (const line of doc.narrative.split("\n")) noteRows.push([line]);
  if (doc.charts.length > 0) {
    noteRows.push([]);
    noteRows.push(["Charts (spec)"]);
    noteRows.push(["id", "type", "title", "xKey", "yKeys"]);
    for (const c of doc.charts) {
      noteRows.push([c.id, c.type, c.title, c.xKey, c.yKeys.join(",")]);
    }
  }
  const notesWs = XLSX.utils.aoa_to_sheet(noteRows);
  notesWs["!cols"] = [{ wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, notesWs, "Notes");

  const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(arr);
}

function coerceForXlsx(v: unknown, type: string): string | number | boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (type === "number") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
  if (type === "boolean") {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return String(v);
  }
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}
