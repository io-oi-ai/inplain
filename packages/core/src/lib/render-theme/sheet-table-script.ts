/**
 * Stage 2:Sheet 表格交互脚本(列头排序 + 行筛选)
 *
 * 注入到 sheet 渲染 HTML 末尾。纯 vanilla JS,~3KB。
 *
 * 不用 TanStack Table 是因为它是 React-only headless,我们渲染端是 SSR 静态 HTML;
 * 重构成 client component 反而失去 SSR 的快和稳。
 *
 * PR #C1:加 client-side 格式化 hook。
 * 如果 td 上带 data-type 但没经过 server-side 格式化 (例如 client-side 渲染
 * 路径或 visual edit 直接改了原值),我们用 Intl.NumberFormat / DateTimeFormat
 * 在浏览器里跑一遍,并解析 <!--cell ...--> 内联 metadata。
 * 仅当 data-formatted="false" 或 td 含 <!--cell--> 注释时才动手。
 */

export const SHEET_TABLE_SCRIPT = `<script>
(function() {
  const table = document.querySelector('.sheet-table-wrap table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  // ─── PR #C1:client-side cell formatting hook ───
  // 仅处理"还没格式化"的 td:data-formatted="false" 或 innerHTML 含 <!--cell ...-->。
  const locale = (document.documentElement.lang || 'en').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  function parseCellMeta(raw) {
    const m = raw.match(/<!--\\s*cell\\s+([^>]*?)\\s*-->/i);
    if (!m) return { content: raw.trim(), style: {} };
    const style = {};
    const tokenRe = /([a-zA-Z][a-zA-Z0-9_-]*)(?::([^\\s]+))?/g;
    let t;
    while ((t = tokenRe.exec(m[1])) !== null) {
      const key = t[1].toLowerCase();
      const val = t[2];
      if (val === undefined) {
        if (key === 'bold') style['font-weight'] = '600';
        else if (key === 'italic') style['font-style'] = 'italic';
        continue;
      }
      if (key === 'bg' || key === 'background') style['background'] = val;
      else if (key === 'color') style['color'] = val;
      else if (key === 'align' && (val === 'left' || val === 'center' || val === 'right')) style['text-align'] = val;
      else if (key === 'weight') style['font-weight'] = val;
    }
    return { content: (raw.slice(0, m.index) + raw.slice(m.index + m[0].length)).trim(), style: style };
  }
  function fmtCell(td) {
    const type = td.getAttribute('data-type');
    if (!type) return;
    const already = td.getAttribute('data-formatted');
    if (already === 'true') return;
    const raw = td.textContent || '';
    const hasMeta = /<!--\\s*cell\\b/i.test(td.innerHTML);
    if (!hasMeta && already !== 'false') return;
    const parsed = parseCellMeta(td.innerHTML);
    // apply style
    Object.keys(parsed.style).forEach(function(k){
      try { td.style.setProperty(k, parsed.style[k]); } catch(_) {}
      if (k === 'text-align') td.setAttribute('data-align', parsed.style[k]);
    });
    const content = parsed.content || raw;
    let out = content;
    const precision = parseFloat(td.getAttribute('data-precision') || 'NaN');
    const currency = td.getAttribute('data-currency') || 'USD';
    try {
      if (type === 'number') {
        const n = parseFloat(content.replace(/[,，]/g, ''));
        if (isFinite(n)) out = new Intl.NumberFormat(locale, {
          minimumFractionDigits: isFinite(precision) ? precision : 0,
          maximumFractionDigits: isFinite(precision) ? precision : 2,
        }).format(n);
      } else if (type === 'currency') {
        const n = parseFloat(content.replace(/[,，$¥€£￥]/g, ''));
        if (isFinite(n)) out = new Intl.NumberFormat(locale, {
          style: 'currency', currency: currency,
          minimumFractionDigits: isFinite(precision) ? precision : 0,
          maximumFractionDigits: isFinite(precision) ? precision : 0,
        }).format(n);
      } else if (type === 'percent') {
        const n = parseFloat(content.replace(/%$/, ''));
        if (isFinite(n)) out = new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: isFinite(precision) ? precision : 1,
          maximumFractionDigits: isFinite(precision) ? precision : 1,
        }).format(n > 1 ? n / 100 : n);
      } else if (type === 'date') {
        const d = new Date(content);
        if (isFinite(d.getTime())) out = new Intl.DateTimeFormat(locale, {
          year: 'numeric', month: 'short', day: 'numeric'
        }).format(d);
      } else if (type === 'bool') {
        const s = content.trim().toLowerCase();
        if (s === 'true' || s === '1' || s === 'yes') { out = '✓'; td.classList.add('plain-sheet-cell--bool-true'); }
        else if (s === 'false' || s === '0' || s === 'no') { out = '✗'; td.classList.add('plain-sheet-cell--bool-false'); }
      }
    } catch(_) {}
    td.textContent = out;
    td.setAttribute('data-formatted', 'true');
  }
  Array.from(tbody.querySelectorAll('td.plain-sheet-cell')).forEach(fmtCell);

  const allRows = Array.from(tbody.querySelectorAll('tr'));
  const ths = Array.from(table.querySelectorAll('thead th'));

  // ─── 排序:列头点击 toggle asc/desc/原序 ───
  ths.forEach((th, colIdx) => {
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    let dir = 0; // 0=原序 / 1=asc / -1=desc
    th.addEventListener('click', () => {
      dir = dir === 0 ? 1 : dir === 1 ? -1 : 0;
      ths.forEach((other) => {
        if (other !== th) other.dataset.sortDir = '';
      });
      th.dataset.sortDir = dir === 1 ? 'asc' : dir === -1 ? 'desc' : '';
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (dir === 0) {
        // 还原:按 allRows 顺序
        allRows.forEach((r) => tbody.appendChild(r));
        return;
      }
      rows.sort((a, b) => {
        const av = a.children[colIdx]?.textContent?.trim() ?? '';
        const bv = b.children[colIdx]?.textContent?.trim() ?? '';
        const an = parseFloat(av.replace(/[,，]/g, ''));
        const bn = parseFloat(bv.replace(/[,，]/g, ''));
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : av.localeCompare(bv, 'zh');
        return dir * cmp;
      });
      rows.forEach((r) => tbody.appendChild(r));
    });
  });

  // ─── 筛选:在表格上方插一个搜索框 ───
  const wrap = table.parentElement;
  if (!wrap) return;
  const filterBar = document.createElement('div');
  filterBar.className = 'sheet-filter-bar';
  filterBar.innerHTML = '<input type="search" placeholder="Filter (space-separated keywords)" class="sheet-filter-input" />';
  wrap.insertBefore(filterBar, table);

  const input = filterBar.querySelector('.sheet-filter-input');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      const terms = q.split(/\\s+/).filter(Boolean);
      const rows = Array.from(tbody.querySelectorAll('tr'));
      let visible = 0;
      rows.forEach((r) => {
        if (terms.length === 0) {
          r.style.display = '';
          visible++;
          return;
        }
        const text = r.textContent.toLowerCase();
        const match = terms.every((t) => text.includes(t));
        r.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      // 显示匹配数
      let badge = filterBar.querySelector('.sheet-filter-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sheet-filter-badge';
        filterBar.appendChild(badge);
      }
      badge.textContent = q ? visible + ' / ' + rows.length + ' 行' : '';
    }, 100);
  });
})();
</script>`;
