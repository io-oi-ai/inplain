/**
 * "Ask this doc" 页内 AI 问答(对标 GitBook/Mintlify · 浮动按钮 + 抽屉)。
 *
 * 浮动按钮 → 打开问答抽屉 → 用户提问 → POST gateway /api/ask-doc(文档纯文本作上下文)
 * → 流式/一次性返回答案。
 *
 * 自包含约束:导出 HTML 里按钮指向绝对 gateway URL(inplain.app);
 * 若 fetch 失败(无网/未登录/跨域)→ 提示降级,不阻塞文档阅读。
 * 文档纯文本从 article DOM 现抽(innerText),不预先 inline(省体积)。
 */

/** gateway 绝对地址 · 导出 HTML 在任意域打开都能回 Plain 后端 */
// 文档问答要一个后端。开源版默认没有 —— 设了 PLAIN_ASK_ENDPOINT 才渲染入口。
const ASK_ENDPOINT =
  (typeof process !== "undefined" ? process.env?.PLAIN_ASK_ENDPOINT : undefined) ?? "";

export const DOC_ASK_CSS = `
.plain-ask-fab { position: fixed; right: 22px; bottom: 22px; z-index: 200; display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 999px; border: 0; background: var(--plain-ink, #1f1f22); color: var(--plain-bg, #fff); font: 600 13px/1 system-ui, sans-serif; cursor: pointer; box-shadow: 0 6px 24px rgba(0,0,0,.22); transition: box-shadow .15s; }
.plain-ask-fab:active { transform: scale(0.97); }
@media (hover:hover) and (pointer:fine) {
  .plain-ask-fab:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,.28); }
}
@media (prefers-reduced-motion: reduce) {
  .plain-ask-fab:hover { transform: none; }
}
.plain-ask-fab svg { width: 16px; height: 16px; }
.plain-ask-panel { position: fixed; right: 22px; bottom: 22px; z-index: 201; width: min(400px, calc(100vw - 44px)); max-height: min(560px, calc(100vh - 44px)); display: none; flex-direction: column; background: var(--plain-bg, #fff); border: 1px solid var(--plain-rule, rgba(128,128,128,.2)); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.24); overflow: hidden; }
.plain-ask-panel.open { display: flex; }
.plain-ask-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--plain-rule, rgba(128,128,128,.14)); }
.plain-ask-head strong { font-size: 14px; }
.plain-ask-close { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 20px; line-height: 1; opacity: .5; }
.plain-ask-close:hover { opacity: 1; }
.plain-ask-log { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.plain-ask-msg { font-size: 14px; line-height: 1.6; }
.plain-ask-msg.q { align-self: flex-end; max-width: 85%; background: var(--plain-accent, #3b82f6); color: #fff; padding: 8px 12px; border-radius: 12px 12px 2px 12px; }
.plain-ask-msg.a { align-self: flex-start; max-width: 92%; color: var(--plain-ink-soft, inherit); white-space: pre-wrap; }
.plain-ask-msg.a.err { color: var(--plain-negative, #e5484d); }
.plain-ask-empty { opacity: .5; font-size: 13px; text-align: center; padding: 20px 0; }
.plain-ask-form { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--plain-rule, rgba(128,128,128,.14)); }
.plain-ask-form input { flex: 1; padding: 9px 12px; border-radius: 9px; border: 1px solid var(--plain-rule, rgba(128,128,128,.25)); background: var(--plain-surface, rgba(128,128,128,.04)); color: inherit; font-size: 14px; outline: none; }
.plain-ask-form input:focus { border-color: var(--plain-accent, #3b82f6); }
.plain-ask-form button { padding: 9px 14px; border-radius: 9px; border: 0; background: var(--plain-ink, #1f1f22); color: var(--plain-bg, #fff); font-weight: 600; font-size: 13px; cursor: pointer; }
.plain-ask-form button:disabled { opacity: .5; cursor: default; }
@media print { .plain-ask-fab, .plain-ask-panel { display: none !important; } }
`;

/** 注入访客模式 shareId 的 inline script(放在 DOC_ASK_SCRIPT 之前) · 作者预览不调 */
export function qaShareIdScript(shareId: string): string {
  // 仅允许合法 nanoid 字符 · 防注入
  const safe = /^[A-Za-z0-9_-]{6,32}$/.test(shareId) ? shareId : "";
  if (!safe) return "";
  return `<script>window.__PLAIN_SHARE_ID__=${JSON.stringify(safe)};</script>`;
}

/** kind 决定按钮文案 + 上下文抽取方式 · deck/doc/sheet 各异 */
export function renderAskFab(kind: "deck" | "doc" | "sheet" = "doc"): string {
  // 没有后端就别渲染入口 —— 一个点了必然失败的按钮比没有按钮更糟。
  if (!ASK_ENDPOINT) return "";
  const label =
    kind === "deck" ? "Ask this deck" : kind === "sheet" ? "Ask this sheet" : "Ask this doc";
  return `<button class="plain-ask-fab" data-ask-open data-ask-kind="${kind}" type="button" aria-label="${label}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ${label}
  </button>
  <div class="plain-ask-panel" data-ask-panel>
    <div class="plain-ask-head"><strong>${label}</strong><button class="plain-ask-close" data-ask-close type="button" aria-label="Close">×</button></div>
    <div class="plain-ask-log" data-ask-log><div class="plain-ask-empty">基于本内容回答你的问题</div></div>
    <form class="plain-ask-form" data-ask-form>
      <input type="text" placeholder="e.g. What does this cover?" data-ask-input autocomplete="off" />
      <button type="submit" data-ask-send>问</button>
    </form>
  </div>`;
}

export const DOC_ASK_SCRIPT = `
(function(){
  if (typeof document === 'undefined') return;
  var fab = document.querySelector('[data-ask-open]');
  var panel = document.querySelector('[data-ask-panel]');
  if (!fab || !panel) return;
  var log = panel.querySelector('[data-ask-log]');
  var form = panel.querySelector('[data-ask-form]');
  var input = panel.querySelector('[data-ask-input]');
  var send = panel.querySelector('[data-ask-send]');
  var ENDPOINT = ${JSON.stringify(ASK_ENDPOINT)};

  function open(){ panel.classList.add('open'); fab.style.display='none'; setTimeout(function(){ input.focus(); }, 50); }
  function close(){ panel.classList.remove('open'); fab.style.display=''; }
  fab.addEventListener('click', open);
  panel.querySelector('[data-ask-close]').addEventListener('click', close);

  function addMsg(text, cls){
    var empty = log.querySelector('.plain-ask-empty');
    if (empty) empty.remove();
    var d = document.createElement('div');
    d.className = 'plain-ask-msg ' + cls;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  var KIND = (fab.getAttribute('data-ask-kind') || 'doc');
  // 分享页会注入 window.__PLAIN_SHARE_ID__ → 访客模式(扣作者账);
  // 没有则作者模式(带登录 cookie 扣自己)。
  var SHARE_ID = (typeof window !== 'undefined' && window.__PLAIN_SHARE_ID__) || '';

  function docText(){
    // 按 kind 抽取上下文:deck=各页文本 · sheet=表格 · doc=正文
    var parts = [];
    if (KIND === 'deck') {
      var slides = document.querySelectorAll('.plain-slide, [data-slide], section');
      if (slides.length) {
        for (var i = 0; i < slides.length; i++) {
          var tx = (slides[i].innerText || '').trim();
          if (tx) parts.push('## 第 ' + (i+1) + ' 页\\n' + tx);
        }
      }
    } else if (KIND === 'sheet') {
      var tables = document.querySelectorAll('table');
      for (var k = 0; k < tables.length; k++) {
        var t = (tables[k].innerText || '').trim();
        if (t) parts.push(t);
      }
    }
    var text = parts.join('\\n\\n');
    if (!text) {
      var art = document.querySelector('article.plain-article') ||
                document.querySelector('main') || document.body;
      text = (art.innerText || '');
    }
    return text.slice(0, 24000);
  }

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var q = (input.value || '').trim();
    if (!q) return;
    addMsg(q, 'q');
    input.value = '';
    send.disabled = true;
    var thinking = addMsg('思考中…', 'a');
    var payload = { question: q, context: docText() };
    if (SHARE_ID) payload.shareId = SHARE_ID;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: SHARE_ID ? 'omit' : 'include',
      body: JSON.stringify(payload)
    }).then(function(r){
      return r.json().then(function(j){ return { ok: r.ok, status: r.status, j: j }; });
    }).then(function(res){
      if (res.ok && res.j.answer){ thinking.textContent = res.j.answer; }
      else {
        thinking.className = 'plain-ask-msg a err';
        thinking.textContent = res.j && res.j.message ? res.j.message : '问答暂时不可用,请稍后再试。';
      }
    }).catch(function(){
      thinking.className = 'plain-ask-msg a err';
      thinking.textContent = 'Could not reach the answer service. This feature needs a hosted Plain account.';
    }).then(function(){ send.disabled = false; input.focus(); });
  });
})();
`;
