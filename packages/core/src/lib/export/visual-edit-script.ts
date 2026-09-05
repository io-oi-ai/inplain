/**
 * iframe 内运行的脚本:
 *   1. 为关键 DOM 元素(slide / block / row / cell)打标识 data-plain-* 属性
 *   2. 默认模式(inspect=false):单击 editable → contenteditable;clickable → postMessage select
 *   3. Inspect 模式(inspect=true):单击任何 clickable 元素 → 打开父窗口的浮动微调面板
 *      - 不再触发 contenteditable
 *      - 鼠标 cursor 变 crosshair,hover 高亮加强
 *      - 父窗口的 postMessage { type: "set-inspect", enabled: true|false } 切换
 *
 * 父窗口协议(发往父):
 *   { source: 'plain-preview', type: 'select',       kind, path, label, rect }
 *      rect: 选中元素的 viewport 坐标 { left, top, width, height } —— 给 InspectorPanel 定位
 *   { source: 'plain-preview', type: 'direct-patch', kind, path, oldText, newText, label }
 *   { source: 'plain-preview', type: 'edit-cell',    kind, rowIdx, colIdx, oldText, newText, label }
 *   { source: 'plain-preview', type: 'inspect-state', enabled }   - inspect 切换 ack
 *   { source: 'plain-preview', type: 'insert-block',  afterBlockId }
 *      —— 块左侧悬浮「+」· 父窗口弹块选择器,选完发 add op
 *   { source: 'plain-preview', type: 'reorder-block', fromId, toId, before }
 *      —— 「⠿」手柄拖拽 · 父窗口发 move op。before=落在目标块之前
 *
 * 父窗口协议(发到 iframe):
 *   { source: 'plain-parent', type: 'set-inspect',  enabled }
 *   { source: 'plain-parent', type: 'clear-select' }   - 关 InspectorPanel 时通知 iframe 取消高亮
 */
export const VISUAL_EDIT_SCRIPT = `
<style>
  [data-plain-clickable] { cursor: pointer; }
  [data-plain-editing] {
    outline: 2px solid #22c55e !important;
    background: rgba(34,197,94,.08) !important;
    cursor: text !important;
  }
  /* Overlay div —— hover/select 高亮通过绝对定位层实现(精准跟随元素边界,支持圆角) */
  #plain-hover-overlay, #plain-select-overlay {
    position: fixed; pointer-events: none; z-index: 99999;
    border-radius: 3px;
    transition: opacity 0.08s ease;
  }
  #plain-hover-overlay {
    border: 2px dashed rgba(59,130,246,.65);
    background: rgba(59,130,246,.04);
  }
  #plain-select-overlay {
    border: 2px solid #3b82f6;
    background: rgba(59,130,246,.06);
    box-shadow: 0 0 0 4px rgba(59,130,246,.08);
  }
  /* Inspect / select 模式用 Plain 品牌橙红 */
  html[data-plain-inspect="true"] #plain-hover-overlay {
    border-color: rgba(240,83,58,.65);
    background: rgba(240,83,58,.04);
  }
  html[data-plain-inspect="true"] #plain-select-overlay {
    border-color: #f0533a;
    background: rgba(240,83,58,.06);
    box-shadow: 0 0 0 4px rgba(240,83,58,.08);
  }
  /* label tooltip (hover 时右上角显示元素名) */
  #plain-hover-label {
    position: fixed; pointer-events: none; z-index: 100000;
    background: rgba(30,30,30,.82); color: #fff;
    font: 500 11px/1 system-ui,sans-serif;
    padding: 3px 7px; border-radius: 4px;
    white-space: nowrap; backdrop-filter: blur(4px);
    transition: opacity 0.08s ease;
  }
  /* ── V32 块手柄:悬浮「+」插入 / 「⋮⋮」拖拽重排 ── */
  .v32-block { position: relative; }
  .plain-blk-gutter {
    position: absolute; left: -46px; top: 2px;
    display: flex; gap: 2px; opacity: 0;
    transition: opacity .12s ease; z-index: 40;
  }
  .v32-block:hover > .plain-blk-gutter,
  .plain-blk-gutter:hover { opacity: 1; }
  .plain-blk-btn {
    width: 20px; height: 20px; border: 0; border-radius: 4px;
    background: rgba(127,127,127,.14); color: currentColor;
    font: 600 13px/1 system-ui,sans-serif; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 0; opacity: .65;
  }
  .plain-blk-btn:hover { opacity: 1; background: rgba(127,127,127,.28); }
  .plain-blk-drag { cursor: grab; }
  .plain-blk-drag:active { cursor: grabbing; }
  /* 拖拽时的落点指示线 */
  #plain-blk-dropline {
    position: fixed; height: 2px; z-index: 100001;
    background: #f0533a; border-radius: 2px; pointer-events: none;
    box-shadow: 0 0 0 3px rgba(240,83,58,.18);
  }
  [data-blk-dragging] { opacity: .45; }

  /* Drop overlay (拖拽图片进入 image 区域时) */
  #plain-drop-overlay {
    position: fixed; pointer-events: none; z-index: 99998;
    border: 2px dashed #3b82f6; border-radius: 6px;
    background: rgba(59,130,246,.10);
    display: flex; align-items: center; justify-content: center;
    color: #3b82f6; font: 600 13px/1 system-ui,sans-serif;
    gap: 6px; letter-spacing: .01em;
  }
</style>
<script>
(function() {
  const KIND = document.documentElement.getAttribute('data-plain-kind') || 'deck';
  let inspectMode = false;

  /* ── Overlay 管理 ── */
  function mkOverlay(id) {
    const el = document.createElement('div');
    el.id = id; document.body.appendChild(el); return el;
  }
  const hoverOverlay = mkOverlay('plain-hover-overlay');
  const selectOverlay = mkOverlay('plain-select-overlay');
  const hoverLabel   = mkOverlay('plain-hover-label');
  Object.assign(hoverOverlay.style, { opacity: '0' });
  Object.assign(selectOverlay.style, { opacity: '0' });
  Object.assign(hoverLabel.style,   { opacity: '0' });

  function positionOverlay(div, r, offset) {
    const o = offset || 0;
    Object.assign(div.style, {
      left:   (r.left - o) + 'px',
      top:    (r.top  - o) + 'px',
      width:  (r.width  + o * 2) + 'px',
      height: (r.height + o * 2) + 'px',
      opacity: '1',
    });
  }
  function hideOverlay(div) { div.style.opacity = '0'; }

  let hoverTarget = null;
  document.addEventListener('mousemove', function(ev) {
    if (editingEl) { hideOverlay(hoverOverlay); hideOverlay(hoverLabel); return; }
    let el = ev.target;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-plain-clickable')) {
        if (hoverTarget !== el) {
          hoverTarget = el;
          const r = el.getBoundingClientRect();
          positionOverlay(hoverOverlay, r, 2);
          /* label: 右上角 */
          const label = el.getAttribute('data-plain-label') || '';
          if (label) {
            hoverLabel.textContent = label;
            hoverLabel.style.opacity = '1';
            hoverLabel.style.left = Math.min(r.right + 4, window.innerWidth - 200) + 'px';
            hoverLabel.style.top  = Math.max(r.top - 22, 4) + 'px';
          } else { hideOverlay(hoverLabel); }
        }
        return;
      }
      el = el.parentElement;
    }
    hoverTarget = null;
    hideOverlay(hoverOverlay);
    hideOverlay(hoverLabel);
  }, { passive: true });

  function refreshSelectOverlay() {
    const first = document.querySelector('[data-plain-selected]');
    if (!first) { hideOverlay(selectOverlay); return; }
    positionOverlay(selectOverlay, first.getBoundingClientRect(), 3);
  }
  window.addEventListener('scroll', function() {
    refreshSelectOverlay();
    if (hoverTarget) positionOverlay(hoverOverlay, hoverTarget.getBoundingClientRect(), 2);
  }, { passive: true });
  window.addEventListener('resize', function() {
    refreshSelectOverlay();
    if (hoverTarget) positionOverlay(hoverOverlay, hoverTarget.getBoundingClientRect(), 2);
  });

  function tagDeckSlides() {
    const sections = document.querySelectorAll('.marpit > svg > foreignObject > section');
    sections.forEach((el, idx) => {
      // 页标识（点击整页）
      el.setAttribute('data-plain-clickable', 'true');
      el.setAttribute('data-plain-kind', 'deck');
      el.setAttribute('data-plain-path', '/slides/' + idx);
      el.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 页');
      // 标题：section 内第一个 h1 / h2
      const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && !heading.hasAttribute('data-plain-clickable')) {
        heading.setAttribute('data-plain-clickable', 'true');
        heading.setAttribute('data-plain-editable', 'true');
        heading.setAttribute('data-plain-kind', 'deck');
        heading.setAttribute('data-plain-path', '/slides/' + idx + '/title');
        heading.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 页标题');
      }
      // bullets
      const bullets = el.querySelectorAll('li');
      bullets.forEach((b, bIdx) => {
        b.setAttribute('data-plain-clickable', 'true');
        b.setAttribute('data-plain-editable', 'true');
        b.setAttribute('data-plain-kind', 'deck');
        b.setAttribute('data-plain-path', '/slides/' + idx + '/bullets/' + bIdx);
        b.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 页第 ' + (bIdx + 1) + ' 条要点');
      });
      // V27-U · 段落 / 引用 / 图片也标 path · fallback 到 /slides/{idx}
      // 让用户能点任何内容触发 InlineEditPopover · ask AI 改这页(语义上"这块"即落到 slide)
      const paragraphs = el.querySelectorAll('p, blockquote');
      paragraphs.forEach((p, pIdx) => {
        if (p.hasAttribute('data-plain-clickable')) return;
        p.setAttribute('data-plain-clickable', 'true');
        p.setAttribute('data-plain-editable', 'true');
        p.setAttribute('data-plain-kind', 'deck');
        p.setAttribute('data-plain-path', '/slides/' + idx);
        p.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 页第 ' + (pIdx + 1) + ' 段');
      });
      const images = el.querySelectorAll('img');
      images.forEach((img) => {
        if (img.hasAttribute('data-plain-clickable')) return;
        img.setAttribute('data-plain-clickable', 'true');
        img.setAttribute('data-plain-kind', 'deck');
        img.setAttribute('data-plain-path', '/slides/' + idx);
        img.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 页图片');
      });
    });
  }

  function tagDocBlocks() {
    const article = document.querySelector('article');
    if (!article) return;
    // 把 article 的直接子级(含 hero <header> / 富块 <div>)都当成 block,逐个打标。
    // 之前只选 h1..h6/p/ul/.. → hero 标题包在 <header class=plain-doc-hero> 里被漏掉,
    // 导致"标题不能编辑"。现在遍历所有直接子,并钻进容器把可编辑文本元素单独标 path。
    const children = Array.from(article.children);
    children.forEach((el, idx) => {
      if (el.hasAttribute('data-plain-clickable')) return;
      el.setAttribute('data-plain-clickable', 'true');
      el.setAttribute('data-plain-kind', 'doc');
      el.setAttribute('data-plain-path', '/blocks/' + idx);
      const preview = (el.textContent || '').trim().slice(0, 20);
      el.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 段' + (preview ? '（' + preview + '）' : ''));
      const tag = el.tagName.toLowerCase();
      // 纯文本块(段落/标题/引用)→ 整块可 inline 编辑
      if (tag === 'p' || /^h[1-6]$/.test(tag) || tag === 'blockquote') {
        el.setAttribute('data-plain-editable', 'true');
        el.setAttribute('data-plain-text-path', '/blocks/' + idx + '/text');
      }
      // 容器块(hero <header> / data-block 等)→ 钻进去给标题/副标/正文等文本子元素单独打标,
      // 让用户能点标题直接编辑(标题字段 path = /blocks/{idx}/{field})。
      else {
        tagDocInnerText(el, idx);
      }
    });
  }

  // 给容器块内部的可编辑文本子元素打标。字段名按常见结构推断:
  //   h1 → title · .tail → display-tail · .plain-doc-kicker → kicker · .plain-doc-deck → deck
  function tagDocInnerText(container, blockIdx) {
    var map = [
      ['.plain-doc-kicker', 'kicker'],
      ['h1', 'title'],
      ['.plain-doc-deck', 'deck'],
      ['.data-title', 'title'],
    ];
    for (var i = 0; i < map.length; i++) {
      var sel = map[i][0], field = map[i][1];
      var node = container.querySelector(sel);
      if (node && !node.hasAttribute('data-plain-clickable')) {
        node.setAttribute('data-plain-clickable', 'true');
        node.setAttribute('data-plain-editable', 'true');
        node.setAttribute('data-plain-kind', 'doc');
        node.setAttribute('data-plain-path', '/blocks/' + blockIdx + '/' + field);
        node.setAttribute('data-plain-text-path', '/blocks/' + blockIdx + '/' + field);
        node.setAttribute('data-plain-label', field === 'title' ? '标题' : field);
      }
    }
  }

  function tagSheetRows() {
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach((el, idx) => {
      el.setAttribute('data-plain-clickable', 'true');
      el.setAttribute('data-plain-kind', 'sheet');
      el.setAttribute('data-plain-path', '/rows/' + idx);
      el.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 行');
      // 单元格
      el.querySelectorAll('td').forEach((td, cIdx) => {
        td.setAttribute('data-plain-clickable', 'true');
        td.setAttribute('data-plain-editable', 'true');
        td.setAttribute('data-plain-kind', 'sheet');
        td.setAttribute('data-plain-cell-col', String(cIdx));
        td.setAttribute('data-plain-cell-row', String(idx));
        td.setAttribute('data-plain-label', '第 ' + (idx + 1) + ' 行第 ' + (cIdx + 1) + ' 列');
      });
    });
  }

  function tagAll() {
    if (KIND === 'deck') tagDeckSlides();
    else if (KIND === 'doc') tagDocBlocks();
    else if (KIND === 'sheet') tagSheetRows();
  }

  tagAll();
  requestAnimationFrame(tagAll);
  setTimeout(tagAll, 300);

  /* ─────────────────────────────────────────────────────────
   * V32 块级手柄 —— 悬浮「+」插入 / 「⋮⋮」拖拽重排
   *
   * 只挂**顶层块**(.v32-block 且父级不是另一个 .v32-block):
   * group 内部子块不参与,否则"把 A 拖到 group 里第 2 位"这种语义
   * 在 JSON Patch 层要处理跨层级 move,复杂度和出错面都不值得。
   *
   * 发往父窗口:
   *   { type:'insert-block',  afterBlockId }   —— 父窗口弹块选择器
   *   { type:'reorder-block', fromId, toId, before }
   * ───────────────────────────────────────────────────────── */
  function topLevelBlocks() {
    return [...document.querySelectorAll('.v32-block')].filter(function(el) {
      return !el.parentElement || !el.parentElement.closest('.v32-block');
    });
  }

  function mountBlockGutters() {
    topLevelBlocks().forEach(function(el) {
      if (el.querySelector(':scope > .plain-blk-gutter')) return;
      const id = el.getAttribute('data-block-id');
      if (!id) return;
      const g = document.createElement('div');
      g.className = 'plain-blk-gutter';
      g.setAttribute('contenteditable', 'false');

      const add = document.createElement('button');
      add.className = 'plain-blk-btn';
      add.type = 'button';
      add.textContent = '+';
      add.title = 'Insert block below';
      add.addEventListener('click', function(ev) {
        ev.preventDefault(); ev.stopPropagation();
        postToParent({ type: 'insert-block', afterBlockId: id });
      });

      const drag = document.createElement('button');
      drag.className = 'plain-blk-btn plain-blk-drag';
      drag.type = 'button';
      drag.textContent = '⠿';
      drag.title = 'Drag to reorder';
      drag.draggable = true;
      drag.addEventListener('dragstart', function(ev) {
        dragSrcId = id;
        el.setAttribute('data-blk-dragging', '1');
        try { ev.dataTransfer.setData('text/plain', id); } catch (e) {}
        try { ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
      });
      drag.addEventListener('dragend', function() {
        el.removeAttribute('data-blk-dragging');
        dragSrcId = null;
        hideDropLine();
      });

      g.appendChild(add);
      g.appendChild(drag);
      el.appendChild(g);
    });
  }

  let dragSrcId = null;
  let dropLine = null;
  function showDropLine(rect, before) {
    if (!dropLine) {
      dropLine = document.createElement('div');
      dropLine.id = 'plain-blk-dropline';
      document.body.appendChild(dropLine);
    }
    dropLine.style.left = rect.left + 'px';
    dropLine.style.width = rect.width + 'px';
    dropLine.style.top = (before ? rect.top - 1 : rect.bottom - 1) + 'px';
    dropLine.style.display = 'block';
  }
  function hideDropLine() { if (dropLine) dropLine.style.display = 'none'; }

  document.addEventListener('dragover', function(ev) {
    if (!dragSrcId) return;
    const host = ev.target.closest && ev.target.closest('.v32-block');
    if (!host) return;
    const top = topLevelBlocks().indexOf(host) >= 0 ? host : host.closest('.v32-block');
    if (!top) return;
    ev.preventDefault();
    const r = top.getBoundingClientRect();
    showDropLine(r, ev.clientY < r.top + r.height / 2);
  });

  document.addEventListener('drop', function(ev) {
    if (!dragSrcId) return;
    const host = ev.target.closest && ev.target.closest('.v32-block');
    if (!host) { hideDropLine(); return; }
    const toId = host.getAttribute('data-block-id');
    if (!toId || toId === dragSrcId) { hideDropLine(); return; }
    ev.preventDefault();
    const r = host.getBoundingClientRect();
    postToParent({
      type: 'reorder-block',
      fromId: dragSrcId,
      toId: toId,
      before: ev.clientY < r.top + r.height / 2,
    });
    hideDropLine();
  });

  mountBlockGutters();
  requestAnimationFrame(mountBlockGutters);
  setTimeout(mountBlockGutters, 300);

  // 单击:
  //   inspect=true  → 任何 clickable 都打开 inspector(不进 contenteditable)
  //   inspect=false → editable 直接编辑;非 editable 仅 select(老行为)
  let editingEl = null;
  let editOldText = '';
  document.addEventListener('click', function(ev) {
    if (editingEl) return;
    // 交互块(tabs/accordion/code-group/cards/参数切换器/复制按钮/ask)内的点击是功能性原生交互,
    // 不走点选编辑 —— 放行,否则 preventDefault 会吞掉 label→radio / <details> 切换 / 按钮。
    if (ev.target.closest && ev.target.closest(
      '.plain-tabs, .plain-accordion, .plain-code-group, .plain-cards, .plain-param-bar, .plain-table-wrap, [data-copy], [data-ask-open], [data-ask-panel], .plain-tip'
    )) {
      return;
    }
    let el = ev.target;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-plain-clickable')) {
        const kind = el.getAttribute('data-plain-kind') || KIND;
        const path = el.getAttribute('data-plain-path') || '';
        const textPath = el.getAttribute('data-plain-text-path') || null;
        const label = el.getAttribute('data-plain-label') || path;
        const cellRow = el.getAttribute('data-plain-cell-row');
        const cellCol = el.getAttribute('data-plain-cell-col');

        // 取 element rect(viewport coords) —— 给父窗口浮动面板定位
        const r = el.getBoundingClientRect();
        const rect = { left: r.left, top: r.top, width: r.width, height: r.height };

        // V19 · multi-select:Shift+Click 累加,普通 click 重置
        const additive = ev.shiftKey || ev.metaKey || ev.ctrlKey;
        if (!additive) {
          document.querySelectorAll('[data-plain-selected]').forEach(x => x.removeAttribute('data-plain-selected'));
        }
        // 同元素已选 + additive → 取消(toggle)
        if (additive && el.hasAttribute('data-plain-selected')) {
          el.removeAttribute('data-plain-selected');
        } else {
          el.setAttribute('data-plain-selected', 'true');
        }
        refreshSelectOverlay();

        if (inspectMode || true /* V19 · inspect 永远 ON */) {
          // 收集所有当前选中,父端用第一个的 rect 定位 popover,其余作为聚合"对这 N 块"操作
          const allSelected = Array.from(document.querySelectorAll('[data-plain-selected]'));
          if (allSelected.length === 0) {
            // toggle 关掉了最后一个 → 通知父端清掉
            postToParent({ type: 'select-cleared' });
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
          const items = allSelected.map((node) => {
            const r2 = node.getBoundingClientRect();
            return {
              kind: node.getAttribute('data-plain-kind') || KIND,
              path: node.getAttribute('data-plain-path') || '',
              textPath: node.getAttribute('data-plain-text-path') || null,
              label: node.getAttribute('data-plain-label') || '',
              rect: { left: r2.left, top: r2.top, width: r2.width, height: r2.height },
              cellRow: node.getAttribute('data-plain-cell-row'),
              cellCol: node.getAttribute('data-plain-cell-col'),
              currentText: (node.textContent || '').trim().slice(0, 200),
            };
          }).map((it) => ({
            ...it,
            cellRow: it.cellRow !== null ? Number(it.cellRow) : null,
            cellCol: it.cellCol !== null ? Number(it.cellCol) : null,
          }));
          if (items.length === 1) {
            // 兼容旧 'select' 单选消息
            postToParent({ type: 'select', ...items[0] });
          } else {
            postToParent({ type: 'multi-select', items });
          }
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }

        // 默认模式:editable → 直接编辑文本(老路径)
        if (el.hasAttribute('data-plain-editable')) {
          beginEdit(el);
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }

        // 默认模式 + 仅 clickable(不 editable):告知父,把 chat prompt 塞个前缀
        postToParent({ type: 'select', kind, path, label, rect });
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      el = el.parentElement;
    }
  }, true);

  /**
   * 提交当前编辑,并接着编相邻的那个。
   *
   * ⚠ 不能"先拿到 next 节点 → commit → beginEdit(next)":
   * commit 会 postMessage 给父窗口,父窗口重渲后**整个 iframe 被换掉**,
   * 手里那个节点就成了孤儿(改它没有任何效果)。
   * 所以记的是 data-plain-path 这种**重渲后依然在**的稳定标识,
   * 等新文档就绪再按 path 找回来。
   *
   * 内容没变(commit 不发消息、不重渲)时,直接原地续编即可。
   */
  function advanceEdit(dir) {
    var cur = editingEl;
    if (!cur) return;
    var target = nextEditable(cur, dir);
    var targetPath = target ? (target.getAttribute('data-plain-path') || '') : '';
    var changed = (cur.textContent || '').trim() !== editOldText;
    commitEdit(true);
    if (!target) return;
    if (!changed) { beginEdit(target); return; }  // 没改动 → 不会重渲,原地续编
    if (!targetPath) return;                       // 没有稳定标识 → 不赌,停在这
    // ⚠ 存 sessionStorage 而不是变量:重渲会**重新执行整个脚本**,
    // iframe 里的变量全部丢失。sessionStorage 跨 document 重建仍在。
    try { sessionStorage.setItem('plain.focusAfterRender', targetPath); } catch (e) {}
  }

  /**
   * 脚本启动时:如果上一轮编辑要求"重渲后接着编某个 path",在这里接上。
   * 取完立刻删 —— 只兑现一次,否则用户下次打开这份文档会莫名其妙进入编辑态。
   */
  function resumePendingFocus() {
    var path = '';
    try {
      path = sessionStorage.getItem('plain.focusAfterRender') || '';
      sessionStorage.removeItem('plain.focusAfterRender');
    } catch (e) {}
    if (!path) return;
    var el = document.querySelector('[data-plain-editable="true"][data-plain-path="' + path + '"]');
    if (el) beginEdit(el);
  }

  /**
   * 按**文档顺序**找相邻的可编辑元素。
   * dir=1 下一个 / dir=-1 上一个。走到头返回 null(不循环 —— 编到末尾
   * 又跳回开头会让人以为没保存)。
   * 只认可见元素:隐藏的(比如非当前页的 slide)跳过,否则 Enter 会
   * "跳到一个看不见的地方"。
   */
  function nextEditable(from, dir) {
    if (!from) return null;
    var all = [].slice.call(document.querySelectorAll('[data-plain-editable="true"]'))
      .filter(function (e) {
        return e.offsetParent !== null || e.getClientRects().length > 0;
      });
    var i = all.indexOf(from);
    if (i < 0) return null;
    var j = i + (dir === -1 ? -1 : 1);
    return all[j] || null;
  }

  function beginEdit(el) {
    if (editingEl) commitEdit(false);
    editingEl = el;
    editOldText = (el.textContent || '').trim();
    el.setAttribute('data-plain-editing', 'true');
    el.setAttribute('contenteditable', 'true');
    // 避免 iframe 丢焦导致看不到输入
    el.focus();
    // 全选文本，方便直接改
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {}
  }

  function commitEdit(emit) {
    if (!editingEl) return;
    const el = editingEl;
    const newText = (el.textContent || '').trim();
    editingEl = null;
    el.removeAttribute('data-plain-editing');
    el.removeAttribute('contenteditable');
    if (!emit) return;
    if (newText === editOldText) return;
    const kind = el.getAttribute('data-plain-kind') || KIND;
    // 优先使用 data-plain-text-path（"就这个字段"），否则用 data-plain-path
    const textPath = el.getAttribute('data-plain-text-path') || el.getAttribute('data-plain-path') || '';
    const cellRow = el.getAttribute('data-plain-cell-row');
    const cellCol = el.getAttribute('data-plain-cell-col');
    const label = el.getAttribute('data-plain-label') || textPath;
    if (kind === 'sheet' && cellRow !== null && cellCol !== null) {
      postToParent({
        type: 'edit-cell',
        kind: 'sheet',
        rowIdx: Number(cellRow),
        colIdx: Number(cellCol),
        label,
        oldText: editOldText,
        newText,
      });
    } else {
      // direct-patch:父窗口直接本地 apply,不走 AI
      postToParent({
        type: 'direct-patch',
        kind,
        path: textPath,
        label,
        oldText: editOldText,
        newText,
      });
    }
  }

  document.addEventListener('keydown', function(ev) {
    if (!editingEl) return;
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      // Notion 手感:提交后**顺势编下一个**,而不是退出编辑等你再点一次。
      // 连续改一份文档时,这一下省掉的点击是最多的。
      // Tab 同理(顺带支持);Shift+Enter 仍是换行(上面 !ev.shiftKey 已排除)。
      advanceEdit(1);
    } else if (ev.key === 'Tab') {
      ev.preventDefault();
      advanceEdit(ev.shiftKey ? -1 : 1);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      // 还原文本
      if (editingEl && editOldText !== undefined) editingEl.textContent = editOldText;
      commitEdit(false);
    }
  }, true);

  document.addEventListener('focusout', function(ev) {
    if (editingEl && ev.target === editingEl) {
      commitEdit(true);
    }
  }, true);

  function postToParent(payload) {
    try {
      parent.postMessage({ source: 'plain-preview', ...payload }, '*');
    } catch (e) {}
  }

  // 监听父窗口指令
  window.addEventListener('message', function(ev) {
    const data = ev.data;
    if (!data || data.source !== 'plain-parent') return;
    if (data.type === 'set-inspect') {
      inspectMode = !!data.enabled;
      if (inspectMode) {
        document.documentElement.setAttribute('data-plain-inspect', 'true');
      } else {
        document.documentElement.removeAttribute('data-plain-inspect');
        // 退出 inspect 时清掉选中,避免视觉残留
        document.querySelectorAll('[data-plain-selected]').forEach(x => x.removeAttribute('data-plain-selected'));
      }
      postToParent({ type: 'inspect-state', enabled: inspectMode });
    } else if (data.type === 'clear-select') {
      document.querySelectorAll('[data-plain-selected]').forEach(x => x.removeAttribute('data-plain-selected'));
      hideOverlay(selectOverlay);
    }
  });

  // Inspector 面板需要跟随选中元素;滚动 / resize 时重发 rect
  function emitSelectedRect() {
    const el = document.querySelector('[data-plain-selected]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    postToParent({
      type: 'rect-update',
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  }
  window.addEventListener('scroll', emitSelectedRect, true);
  window.addEventListener('resize', emitSelectedRect);

  // V19 · 接收外部 drag(从父端 AssetsButton 拖图过来) → 找最近 image / media-split section → 替换 src
  // dataTransfer 类型 application/x-plain-asset-url 携带 blob URL
  /* drop overlay(拖图进入 image 区域时显示) */
  const dropOverlay = mkOverlay('plain-drop-overlay');
  dropOverlay.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" opacity=".4"/></svg> 松开替换图片';
  Object.assign(dropOverlay.style, { opacity: '0' });

  let dragOverEl = null;
  document.addEventListener('dragover', function(ev) {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    let el = ev.target;
    while (el && el !== document.body) {
      if (el.classList && (
        el.classList.contains('plain-deck-image') ||
        el.classList.contains('plain-deck-media-split') ||
        el.classList.contains('plain-deck-gallery')
      )) {
        if (dragOverEl !== el) {
          dragOverEl = el;
          const r = el.getBoundingClientRect();
          positionOverlay(dropOverlay, r, 0);
        }
        return;
      }
      el = el.parentElement;
    }
    if (dragOverEl) { dragOverEl = null; hideOverlay(dropOverlay); }
  });
  document.addEventListener('dragleave', function() {
    if (dragOverEl) { dragOverEl = null; hideOverlay(dropOverlay); }
  });
  document.addEventListener('drop', function(ev) {
    ev.preventDefault();
    const url = ev.dataTransfer && (ev.dataTransfer.getData('application/x-plain-asset-url') || ev.dataTransfer.getData('text/plain'));
    if (!url) return;
    if (dragOverEl) {
      dragOverEl.removeAttribute('data-plain-drop-target');
    }
    // 找包含 drop 目标 section 的 path
    let el = ev.target;
    let sectionKind = null;
    let sectionIdx = null;
    while (el && el !== document.body) {
      const path = el.getAttribute && el.getAttribute('data-plain-path');
      if (path) {
        // 期望 '/slides/3' 或 '/sections/3' 这样
        const m = path.match(/^\\/(slides|sections)\\/(\\d+)$/);
        if (m) {
          sectionKind = m[1];
          sectionIdx = Number(m[2]);
          break;
        }
      }
      el = el.parentElement;
    }
    if (sectionIdx === null) return;
    // 通知父端做 patch:在该 section 上替换 src
    postToParent({ type: 'asset-drop', sectionPath: '/' + sectionKind + '/' + sectionIdx, url });
    dragOverEl = null;
    hideOverlay(dropOverlay);
    // 替换后自动进入 crop 模式(让用户调整 pan/scale)
    const imgEl = document.querySelector('[data-plain-path="/' + sectionKind + '/' + sectionIdx + '"] img');
    if (imgEl) enterCropMode(imgEl, '/' + sectionKind + '/' + sectionIdx);
  });

  /* ── Crop / Pan 模式 ─────────────────────────────────────────────
   * 参考 HTML-Slides-Editor:object-fit:cover + object-position pan + scale 1-4x。
   * 用户拖拽调位置,滚轮调大小,点"✓"确认,点"✕"或 Esc 取消。
   * 确认时 postToParent({ type:'crop-commit', sectionPath, cropX, cropY, cropScale })
   * 父端把这些写成 JSON patch 存回 content。
   */
  let cropState = null;
  const cropBar = document.createElement('div');
  cropBar.id = 'plain-crop-bar';
  Object.assign(cropBar.style, {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '100001', display: 'none',
    background: 'rgba(20,20,20,.88)', backdropFilter: 'blur(8px)',
    borderRadius: '10px', padding: '8px 12px',
    display: 'none', alignItems: 'center', gap: '10px',
    color: '#fff', font: '500 12px/1 system-ui,sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,.4)',
  });
  cropBar.innerHTML = [
    '<span style="opacity:.6">拖拽调整位置 · 滚轮缩放</span>',
    '<label style="display:flex;align-items:center;gap:4px;opacity:.8;cursor:pointer">',
    '  <input id="plain-crop-scale" type="range" min="100" max="400" value="100" style="width:80px;accent-color:#3b82f6">',
    '  <span id="plain-crop-scale-val">1.0×</span>',
    '</label>',
    '<button id="plain-crop-ok" style="background:#3b82f6;color:#fff;border:0;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit">✓ 确认</button>',
    '<button id="plain-crop-cancel" style="background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit">✕</button>',
  ].join('');
  document.body.appendChild(cropBar);

  function enterCropMode(img, sectionPath) {
    const cs = window.getComputedStyle(img);
    cropState = {
      img, sectionPath,
      x: 50, y: 50, scale: 1,  // object-position % + scale
      dragging: false, lastX: 0, lastY: 0,
    };
    img.style.objectFit = 'cover';
    img.style.objectPosition = '50% 50%';
    img.style.transform = '';
    img.style.cursor = 'grab';
    cropBar.style.display = 'flex';
    document.getElementById('plain-crop-scale').value = '100';
    document.getElementById('plain-crop-scale-val').textContent = '1.0×';
    img.addEventListener('mousedown', cropMousedown);
    document.addEventListener('mousemove', cropMousemove);
    document.addEventListener('mouseup', cropMouseup);
    img.addEventListener('wheel', cropWheel, { passive: false });
  }

  function exitCropMode(commit) {
    if (!cropState) return;
    const { img, sectionPath, x, y, scale } = cropState;
    img.removeEventListener('mousedown', cropMousedown);
    document.removeEventListener('mousemove', cropMousemove);
    document.removeEventListener('mouseup', cropMouseup);
    img.removeEventListener('wheel', cropWheel);
    img.style.cursor = '';
    cropBar.style.display = 'none';
    if (commit) {
      postToParent({ type: 'crop-commit', sectionPath, cropX: x - 50, cropY: y - 50, cropScale: scale });
    } else {
      // 取消 → 还原(父端最新 html 重载会覆盖)
      img.style.objectPosition = '50% 50%';
      img.style.transform = '';
    }
    cropState = null;
  }

  function applyCrop() {
    if (!cropState) return;
    const { img, x, y, scale } = cropState;
    img.style.objectPosition = x + '% ' + y + '%';
    img.style.transform = scale !== 1 ? 'scale(' + scale + ')' : '';
    img.style.transformOrigin = x + '% ' + y + '%';
  }

  function cropMousedown(ev) { if (!cropState) return; cropState.dragging = true; cropState.lastX = ev.clientX; cropState.lastY = ev.clientY; cropState.img.style.cursor = 'grabbing'; ev.preventDefault(); }
  function cropMousemove(ev) {
    if (!cropState || !cropState.dragging) return;
    const dx = (ev.clientX - cropState.lastX) / cropState.img.offsetWidth * 100;
    const dy = (ev.clientY - cropState.lastY) / cropState.img.offsetHeight * 100;
    cropState.x = Math.max(0, Math.min(100, cropState.x - dx));
    cropState.y = Math.max(0, Math.min(100, cropState.y - dy));
    cropState.lastX = ev.clientX; cropState.lastY = ev.clientY;
    applyCrop();
  }
  function cropMouseup() { if (cropState) { cropState.dragging = false; cropState.img.style.cursor = 'grab'; } }
  function cropWheel(ev) {
    if (!cropState) return;
    ev.preventDefault();
    cropState.scale = Math.max(1, Math.min(4, cropState.scale - ev.deltaY * 0.005));
    applyCrop();
    const si = document.getElementById('plain-crop-scale');
    const sv = document.getElementById('plain-crop-scale-val');
    if (si) si.value = String(Math.round(cropState.scale * 100));
    if (sv) sv.textContent = cropState.scale.toFixed(1) + '×';
  }

  document.getElementById('plain-crop-ok').addEventListener('click', () => exitCropMode(true));
  document.getElementById('plain-crop-cancel').addEventListener('click', () => exitCropMode(false));
  document.getElementById('plain-crop-scale').addEventListener('input', function() {
    if (!cropState) return;
    cropState.scale = this.value / 100;
    document.getElementById('plain-crop-scale-val').textContent = cropState.scale.toFixed(1) + '×';
    applyCrop();
  });
  document.addEventListener('keydown', function(ev) {
    if (!cropState) return;
    if (ev.key === 'Escape') exitCropMode(false);
    if (ev.key === 'Enter') exitCropMode(true);
  });

  /**
   * 双击 → 就地编辑(Notion 手感)。
   *
   * ⚠ 为什么要单独挂 dblclick:上面 click 分支里那段
   *   if (el.hasAttribute('data-plain-editable')) beginEdit(el)
   * 是**死代码** —— 它在 if (inspectMode || true) 的 return 之后,
   * 永远到不了(V19 把 inspect 写死成常开)。所以 Plain 实际上一直
   * **没有就地编辑**,单击只会弹浮层让你输指令。
   *
   * 不改单击的行为(选中+浮层是既有习惯,很多人靠它对块下指令),
   * 用双击开这条路:双击改字是文档类产品的通用直觉。
   */
  document.addEventListener('dblclick', function (ev) {
    var el = ev.target;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-plain-editable')) {
        // 清掉单击留下的选中态,否则浮层和编辑框会同时在
        document.querySelectorAll('[data-plain-selected]').forEach(function (x) {
          x.removeAttribute('data-plain-selected');
        });
        refreshSelectOverlay();
        postToParent({ type: 'select-cleared' });
        beginEdit(el);
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      el = el.parentElement;
    }
  }, true);

  // 放在最后:此时所有 data-plain-editable 都已标注完(见上面的标注流程),
  // 否则按 path 找不到元素。函数声明会提升,所以顺序上没问题。
  resumePendingFocus();
})();
</script>
`;
