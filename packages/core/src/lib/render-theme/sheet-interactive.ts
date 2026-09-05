/**
 * PR #C5 — 冻结行列 + 表头筛选/排序(client-side)
 *
 * 两件事:
 *
 * 1. 冻结 (server-side):渲染时给 table 加 .plain-sheet-frozen,并按 freeze.rows /
 *    freeze.cols 给对应 th/td 加 data-freeze。配套 CSS 用 position: sticky
 *    (在 sheet.ts 末尾 PR #C5 段)。
 *
 * 2. 筛选/排序 (client-side):INTERACTIVE_JS 一段纯 vanilla JS 字符串,
 *    跑在浏览器:扫所有 table.plain-sheet-interactive,给 thead th[data-sortable]
 *    挂 click → 排序。再加 search input 做行筛选(可选,通过 data-filter="on")。
 *
 *    跟 sheet-table-script.ts 的差别:那段绑死 .sheet-table-wrap,且强制注入
 *    搜索框;这一段更克制,只对显式标记 data-sortable / data-filter 的 table 动手,
 *    避免和现有 V14.6 表格双重绑定。
 */

export interface FreezeSpec {
  rows?: number;
  cols?: number;
}

/**
 * 给现有 table HTML 字符串"打 marker":返回新的 className 列表 + 提示调用方
 * 在哪些 row/col index 上加 data-freeze。
 *
 * 实际 DOM 修改交给渲染端(它知道 colgroup/thead 结构);这里只产出元数据。
 */
export function buildFreezeAttrs(spec: FreezeSpec): {
  className: string;
  rowsToFreeze: number;
  colsToFreeze: number;
} {
  const r = Math.max(0, spec.rows ?? 0);
  const c = Math.max(0, spec.cols ?? 0);
  return {
    className: r > 0 || c > 0 ? "plain-sheet-frozen" : "",
    rowsToFreeze: r,
    colsToFreeze: c,
  };
}

/**
 * Client-side INTERACTIVE_JS:
 * - 给 table.plain-sheet-interactive 的 thead th[data-sortable] 加 click 排序
 * - 给 table[data-filter="on"] 注入一行 search input,实时筛选
 * - 排序方向通过 data-sort-dir="asc|desc" 反映,CSS 控制箭头
 *
 * 注意:在 template literal 内的 `${}` 必须转义,否则 TS 会插值;
 * 函数体里也不出现 import,纯浏览器代码。
 */
export const INTERACTIVE_JS = `(function(){
  function parseNum(s){
    var n = parseFloat(String(s).replace(/[^0-9.\\-]/g,''));
    return isNaN(n) ? null : n;
  }
  function sortBy(table, colIdx, dir){
    if (!table.tBodies[0]) return;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    rows.sort(function(a,b){
      var ac = a.cells[colIdx], bc = b.cells[colIdx];
      var av = ac ? (ac.textContent || '').trim() : '';
      var bv = bc ? (bc.textContent || '').trim() : '';
      var an = parseNum(av), bn = parseNum(bv);
      if (an !== null && bn !== null) return (an - bn) * dir;
      return av.localeCompare(bv) * dir;
    });
    rows.forEach(function(r){ table.tBodies[0].appendChild(r); });
  }
  function attachSort(table){
    var headers = table.querySelectorAll('thead th[data-sortable]');
    headers.forEach(function(h, i){
      var dir = 0;
      h.style.cursor = 'pointer';
      h.addEventListener('click', function(){
        dir = dir === 1 ? -1 : 1;
        headers.forEach(function(x){ x.removeAttribute('data-sort-dir'); });
        h.setAttribute('data-sort-dir', dir > 0 ? 'asc' : 'desc');
        // colIdx 用 th 在该行的真实 index,避开 colspan(简化:cellIndex)
        sortBy(table, h.cellIndex, dir);
      });
    });
  }
  function attachFilter(table){
    if (table.getAttribute('data-filter') !== 'on') return;
    if (!table.tBodies[0]) return;
    var bar = document.createElement('div');
    bar.className = 'plain-sheet-filter-bar';
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Filter rows...';
    input.className = 'plain-sheet-filter-input';
    bar.appendChild(input);
    var badge = document.createElement('span');
    badge.className = 'plain-sheet-filter-badge';
    bar.appendChild(badge);
    table.parentNode.insertBefore(bar, table);
    var allRows = Array.prototype.slice.call(table.tBodies[0].rows);
    var timer;
    input.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        var q = input.value.trim().toLowerCase();
        var visible = 0;
        allRows.forEach(function(r){
          var match = q === '' || (r.textContent || '').toLowerCase().indexOf(q) >= 0;
          r.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        badge.textContent = q ? (visible + ' / ' + allRows.length) : '';
      }, 80);
    });
  }
  function init(){
    document.querySelectorAll('table.plain-sheet-interactive').forEach(function(t){
      attachSort(t);
      attachFilter(t);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;

/** 包装成可直接注入 HTML 的 <script> tag。frontmatter `interactive: true` 时调用方注入。 */
export function interactiveScriptTag(): string {
  return `<script>${INTERACTIVE_JS}</script>`;
}
