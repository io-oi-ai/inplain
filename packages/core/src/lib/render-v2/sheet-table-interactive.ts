/**
 * Sheet table 运行时交互(零依赖 · ~1.5KB)。
 *
 * 给带 data-searchable / data-page-size 的 .plain-sheet-table 挂:
 *  - 搜索:输入框过滤行(全列文本 includes,大小写不敏感)
 *  - 排序:点 th.sortable 切 asc/desc(数值列按数,文本列按 localeCompare)
 *  - 分页:超过 pageSize 的行分页,底部页码条
 *
 * 全在浏览器端做,数据已 inline 在 DOM(自包含,导出 HTML 也能跑)。
 */
export const SHEET_TABLE_INTERACTIVE = `
(function(){
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.plain-table-wrap').forEach(function(wrap){
    var table = wrap.querySelector('table.plain-sheet-table');
    if (!table) return;
    var tbody = table.tBodies[0];
    if (!tbody) return;
    var allRows = Array.prototype.slice.call(tbody.rows);
    var pageSize = parseInt(table.getAttribute('data-page-size') || '0', 10) || 0;
    var searchInput = wrap.querySelector('[data-table-search]');
    var pager = wrap.querySelector('[data-table-pager]');
    var filter = '';
    var sortCol = -1, sortDir = 1;
    var page = 0;

    function visibleRows(){
      var rows = allRows;
      if (filter){
        var f = filter.toLowerCase();
        rows = rows.filter(function(r){ return r.textContent.toLowerCase().indexOf(f) !== -1; });
      }
      if (sortCol >= 0){
        var numeric = table.tHead.rows[0].cells[sortCol].getAttribute('data-numeric') === '1';
        rows = rows.slice().sort(function(a,b){
          var av = (a.cells[sortCol]||{}).textContent || '';
          var bv = (b.cells[sortCol]||{}).textContent || '';
          if (numeric){
            var an = parseFloat(av.replace(/[^0-9.\\-]/g,'')); var bn = parseFloat(bv.replace(/[^0-9.\\-]/g,''));
            if (isNaN(an)) an = -Infinity; if (isNaN(bn)) bn = -Infinity;
            return (an - bn) * sortDir;
          }
          return av.localeCompare(bv) * sortDir;
        });
      }
      return rows;
    }

    function render(){
      var rows = visibleRows();
      // 隐藏全部,再按页显示
      allRows.forEach(function(r){ r.style.display = 'none'; });
      var pageRows = rows;
      if (pageSize > 0){
        var maxPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
        if (page > maxPage) page = maxPage;
        pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);
      }
      pageRows.forEach(function(r){ r.style.display = ''; });
      // reorder DOM(排序后)
      pageRows.forEach(function(r){ tbody.appendChild(r); });
      renderPager(rows.length);
    }

    function renderPager(total){
      if (!pager || pageSize <= 0) return;
      var pages = Math.ceil(total / pageSize);
      if (pages <= 1){ pager.hidden = true; pager.innerHTML = ''; return; }
      pager.hidden = false;
      var html = '<button data-pg="prev"'+(page<=0?' disabled':'')+'>‹</button>';
      html += '<span class="pg-info">'+(page+1)+' / '+pages+'</span>';
      html += '<button data-pg="next"'+(page>=pages-1?' disabled':'')+'>›</button>';
      pager.innerHTML = html;
    }

    if (searchInput){
      searchInput.addEventListener('input', function(){ filter = searchInput.value; page = 0; render(); });
    }
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function(th, ci){
      if (!th.classList.contains('sortable')) return;
      th.addEventListener('click', function(){
        if (sortCol === ci){ sortDir = -sortDir; } else { sortCol = ci; sortDir = 1; }
        Array.prototype.forEach.call(table.tHead.rows[0].cells, function(t){ t.removeAttribute('data-sorted'); });
        th.setAttribute('data-sorted', sortDir > 0 ? 'asc' : 'desc');
        render();
      });
    });
    if (pager){
      pager.addEventListener('click', function(ev){
        var b = ev.target.closest && ev.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        page += (b.getAttribute('data-pg') === 'next') ? 1 : -1;
        render();
      });
    }
    render();
  });
})();
`;

/**
 * 参数切换器(预烤切片版 · 零依赖)。
 * 切换器 .param-group[data-param=id] 的按钮 → 显隐带 data-when-{id} 的 grid-cell。
 * 不匹配当前选中值的 cell 隐藏;无 data-when-{id} 的 cell 不受影响(全局 panel)。
 */
export const PARAM_SWITCHER_INTERACTIVE = `
(function(){
  if (typeof document === 'undefined') return;
  var groups = document.querySelectorAll('.plain-param-bar .param-group');
  if (!groups.length) return;
  function apply(paramId, val){
    var sel = '[data-when-' + paramId + ']';
    document.querySelectorAll(sel).forEach(function(cell){
      var cv = cell.getAttribute('data-when-' + paramId);
      cell.style.display = (cv === val) ? '' : 'none';
    });
  }
  groups.forEach(function(g){
    var pid = g.getAttribute('data-param');
    var opts = g.querySelectorAll('.param-opt');
    // 初始按 active(第一个)
    var init = g.querySelector('.param-opt.active') || opts[0];
    if (init) apply(pid, init.getAttribute('data-param-val'));
    g.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('.param-opt');
      if (!b) return;
      opts.forEach(function(o){ o.classList.remove('active'); });
      b.classList.add('active');
      apply(pid, b.getAttribute('data-param-val'));
    });
  });
})();
`;

export const PARAM_SWITCHER_CSS = `
.plain-param-bar { display:flex; flex-wrap:wrap; gap:18px; padding:14px 32px; border-bottom:1px solid var(--plain-rule,rgba(128,128,128,.14)); }
.plain-param-bar .param-group { display:flex; align-items:center; gap:6px; }
.plain-param-bar .param-label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; opacity:.55; margin-right:4px; }
.plain-param-bar .param-opt { font-size:13px; padding:5px 12px; border-radius:7px; border:1px solid var(--plain-rule,rgba(128,128,128,.2)); background:transparent; color:inherit; cursor:pointer; transition:background .15s,border-color .15s,color .15s; }
.plain-param-bar .param-opt:hover { background:var(--plain-surface,rgba(128,128,128,.08)); }
.plain-param-bar .param-opt.active { background:var(--plain-accent,#3b82f6); border-color:var(--plain-accent,#3b82f6); color:#fff; }
`;

export const SHEET_TABLE_CSS = `
.plain-table-wrap { margin: 0; }
.plain-table-wrap .table-search { padding: 0 0 10px; }
.plain-table-wrap .table-search input { width: 100%; max-width: 280px; padding: 7px 11px; font-size: 13px; border-radius: 7px; border: 1px solid var(--plain-rule,rgba(128,128,128,.25)); background: var(--plain-surface,rgba(128,128,128,.04)); color: inherit; outline: none; }
.plain-table-wrap .table-search input:focus { border-color: var(--plain-accent,#3b82f6); }
.plain-sheet-table th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.plain-sheet-table th.sortable:hover { opacity: .85; }
.plain-sheet-table th .sort-ind { display: inline-block; width: 0; opacity: .4; margin-left: 4px; }
.plain-sheet-table th[data-sorted="asc"] .sort-ind::after { content: "▲"; font-size: .7em; }
.plain-sheet-table th[data-sorted="desc"] .sort-ind::after { content: "▼"; font-size: .7em; }
.plain-table-wrap .table-pager { display: flex; align-items: center; gap: 10px; padding: 12px 0 2px; font-size: 12px; }
.plain-table-wrap .table-pager button { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--plain-rule,rgba(128,128,128,.25)); background: transparent; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; }
.plain-table-wrap .table-pager button:hover:not(:disabled) { background: var(--plain-surface,rgba(128,128,128,.1)); }
.plain-table-wrap .table-pager button:disabled { opacity: .35; cursor: default; }
.plain-table-wrap .table-pager .pg-info { opacity: .65; font-variant-numeric: tabular-nums; }
`;
