/**
 * PR #C3 — Sheet Pivot Table
 *
 * Spreadsheet-style pivot:把扁平 rows[{ region, quarter, revenue }, ...]
 * 按 (rows, cols) 分组,在交叉点用 agg(values[]) 计算汇总。
 * 5 种聚合: sum / avg / count / max / min。空单元格输出 "—"。
 *
 * 实现完全自给(不依赖 hyperformula / lodash):
 *   1. 扫一次 rows,按 rowKey × colKey 把 value 推进 Map<string, number[]>
 *   2. 同步累计 rowSums / colSums / grandSum
 *   3. apply(agg) 给 cells / rowTotals / colTotals / grandTotal
 *
 * 渲染端 (renderPivotTable) 输出 <table class="plain-sheet-pivot">。
 */

export type PivotAgg = "sum" | "avg" | "count" | "max" | "min";

export interface PivotSpec {
  /** data 块名,缺省 = 本 sheet rows;render 端解析,纯数据层不关心 */
  source?: string;
  rows: string[];
  cols: string[];
  values: string[];
  agg?: PivotAgg;
}

export interface PivotResult {
  rowKeys: string[];
  colKeys: string[];
  /** key = `${rowKey}||${colKey}`;value = aggregated number (NaN = empty) */
  cells: Map<string, number>;
  rowTotals: Map<string, number>;
  colTotals: Map<string, number>;
  grandTotal: number;
}

const SEP = ""; // 分组键分隔符,避免和正常字符串撞

function buildCompositeKey(row: Record<string, unknown>, fields: string[]): string {
  return fields
    .map((f) => {
      const v = row[f];
      return v === null || v === undefined ? "" : String(v);
    })
    .join(SEP);
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,，\s]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return NaN;
}

function applyAgg(values: number[], agg: PivotAgg): number {
  if (values.length === 0) return NaN;
  switch (agg) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "count":
      return values.length;
    case "max":
      return Math.max(...values);
    case "min":
      return Math.min(...values);
  }
}

/** 排序:数字按数值,字符串按 localeCompare */
function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.localeCompare(b);
  });
}

/**
 * 核心:把一组 rows 按 spec 聚合成 pivot 结果。
 */
export function pivotData(
  rows: Record<string, unknown>[],
  spec: PivotSpec,
): PivotResult {
  const agg: PivotAgg = spec.agg ?? "sum";
  const valueField = spec.values[0]; // 当前 v1 只支持第一个 value 字段

  // bucket: rowKey -> colKey -> number[]
  const buckets = new Map<string, Map<string, number[]>>();
  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();

  for (const row of rows) {
    const rk = buildCompositeKey(row, spec.rows);
    const ck = buildCompositeKey(row, spec.cols);
    rowKeySet.add(rk);
    colKeySet.add(ck);

    const v = toNumber(row[valueField]);
    if (!Number.isFinite(v)) continue;

    let colMap = buckets.get(rk);
    if (!colMap) {
      colMap = new Map();
      buckets.set(rk, colMap);
    }
    let arr = colMap.get(ck);
    if (!arr) {
      arr = [];
      colMap.set(ck, arr);
    }
    arr.push(v);
  }

  const rowKeys = sortKeys([...rowKeySet]);
  const colKeys = sortKeys([...colKeySet]);

  const cells = new Map<string, number>();
  const rowTotalsAcc = new Map<string, number[]>();
  const colTotalsAcc = new Map<string, number[]>();
  const grandAcc: number[] = [];

  for (const rk of rowKeys) {
    const colMap = buckets.get(rk);
    for (const ck of colKeys) {
      const arr = colMap?.get(ck) ?? [];
      const cellKey = `${rk}||${ck}`;
      cells.set(cellKey, applyAgg(arr, agg));

      // accumulate raw values for row/col/grand totals
      if (arr.length > 0) {
        const rArr = rowTotalsAcc.get(rk) ?? [];
        rArr.push(...arr);
        rowTotalsAcc.set(rk, rArr);

        const cArr = colTotalsAcc.get(ck) ?? [];
        cArr.push(...arr);
        colTotalsAcc.set(ck, cArr);

        grandAcc.push(...arr);
      }
    }
  }

  const rowTotals = new Map<string, number>();
  for (const rk of rowKeys) {
    rowTotals.set(rk, applyAgg(rowTotalsAcc.get(rk) ?? [], agg));
  }
  const colTotals = new Map<string, number>();
  for (const ck of colKeys) {
    colTotals.set(ck, applyAgg(colTotalsAcc.get(ck) ?? [], agg));
  }
  const grandTotal = applyAgg(grandAcc, agg);

  return { rowKeys, colKeys, cells, rowTotals, colTotals, grandTotal };
}

/** 格式化数字:千位分隔;NaN -> "—" */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // 整数不带小数,带小数最多保留 2 位
  const rounded = Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Math.round(n * 100) / 100;
  return rounded.toLocaleString("en-US");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 把复合 key 还原成 human-readable label(分隔符 -> " / ") */
function prettyKey(k: string): string {
  return escapeHtml(k.split(SEP).join(" / ")) || "—";
}

/**
 * 渲染 pivot 表为 HTML 字符串。Total 行/列默认开启。
 */
export function renderPivotTable(result: PivotResult): string {
  const { rowKeys, colKeys, cells, rowTotals, colTotals, grandTotal } = result;

  const headCols = colKeys.map((ck) => `<th scope="col">${prettyKey(ck)}</th>`).join("");
  const head = `<thead><tr><th></th>${headCols}<th scope="col">Total</th></tr></thead>`;

  const bodyRows = rowKeys
    .map((rk) => {
      const tds = colKeys
        .map((ck) => `<td>${fmt(cells.get(`${rk}||${ck}`) ?? NaN)}</td>`)
        .join("");
      return `<tr><th scope="row">${prettyKey(rk)}</th>${tds}<td>${fmt(rowTotals.get(rk) ?? NaN)}</td></tr>`;
    })
    .join("");

  const totalTds = colKeys.map((ck) => `<td>${fmt(colTotals.get(ck) ?? NaN)}</td>`).join("");
  const totalRow = `<tr class="plain-pivot-total"><th scope="row">Total</th>${totalTds}<td>${fmt(grandTotal)}</td></tr>`;

  return `<table class="plain-sheet-pivot">${head}<tbody>${bodyRows}${totalRow}</tbody></table>`;
}
