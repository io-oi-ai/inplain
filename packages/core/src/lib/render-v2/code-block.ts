/**
 * Doc 代码块增强渲染(对标 GitBook / Mintlify · 纯渲染层 · 零运行时依赖)。
 *
 * 能力:
 *  - 语言标签 + 文件名标题(fence info string 支持 `ts title="src/foo.ts"`)
 *  - 行号(CSS counter,无 JS)
 *  - 复制按钮(零依赖脚本,见 CODE_BLOCK_SCRIPT)
 *  - 轻量语法高亮(零依赖 · 覆盖常见语言 ts/js/json/bash/py/sql/html/css)
 *  - 高亮行 / diff 标记(`{1,3-5}` 高亮 · diff 语言 +/- 行着色)
 *
 * 为什么不用 Shiki / highlight.js:产物是自包含导出 HTML + 撞 Workers 10MiB bundle 墙。
 * 这里走"够用就好"的零依赖 tokenizer(关键字/字符串/注释/数字着色),CSS 用 token class。
 *
 * Code group(多语言 tab)在 parse-dsl 层把 `::: code-group` 包成 block,
 * 见 renderCodeGroup。
 */
import { escapeHtml, escapeAttr } from "./chrome";

/** fence info string → { lang, title, highlightLines } */
export function parseFenceInfo(info: string): {
  lang: string;
  title: string;
  highlight: Set<number>;
} {
  const raw = (info ?? "").trim();
  // 第一个 token 是语言
  const langMatch = raw.match(/^([A-Za-z0-9_+-]+)/);
  const lang = (langMatch ? langMatch[1] : "").toLowerCase();
  // title="..." 或 title='...'
  const titleMatch = raw.match(/title=(?:"([^"]*)"|'([^']*)')/);
  const title = titleMatch ? (titleMatch[1] ?? titleMatch[2] ?? "") : "";
  // {1,3-5} 高亮行
  const highlight = new Set<number>();
  const hlMatch = raw.match(/\{([\d,\-\s]+)\}/);
  if (hlMatch) {
    for (const part of hlMatch[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const range = seg.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const a = parseInt(range[1], 10);
        const b = parseInt(range[2], 10);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) highlight.add(i);
      } else if (/^\d+$/.test(seg)) {
        highlight.add(parseInt(seg, 10));
      }
    }
  }
  return { lang, title, highlight };
}

// ── 轻量语法高亮 ───────────────────────────────────────────

// 各语言关键字集(够日常 doc 用 · 不追求完备)
const KEYWORDS: Record<string, Set<string>> = {
  js: new Set(["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","export","from","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","void","delete","yield","static","get","set","null","undefined","true","false"]),
  ts: new Set(["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","export","from","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","void","delete","yield","static","get","set","null","undefined","true","false","interface","type","enum","namespace","public","private","protected","readonly","implements","abstract","as","is","keyof","infer","declare","satisfies","string","number","boolean","any","unknown","never"]),
  py: new Set(["def","return","if","elif","else","for","while","break","continue","class","import","from","as","try","except","finally","raise","with","lambda","yield","async","await","pass","global","nonlocal","del","assert","and","or","not","in","is","None","True","False","self","print"]),
  sql: new Set(["select","from","where","group","by","order","having","limit","offset","join","left","right","inner","outer","on","as","and","or","not","in","is","null","insert","into","values","update","set","delete","create","table","alter","drop","distinct","count","sum","avg","min","max","case","when","then","else","end","union","all","with","over","partition","desc","asc"]),
  bash: new Set(["if","then","else","elif","fi","for","while","do","done","case","esac","function","return","export","local","echo","cd","ls","cat","grep","sed","awk","curl","cp","mv","rm","mkdir","sudo","exit","source"]),
  json: new Set(["true","false","null"]),
};
KEYWORDS.javascript = KEYWORDS.js;
KEYWORDS.typescript = KEYWORDS.ts;
KEYWORDS.tsx = KEYWORDS.ts;
KEYWORDS.jsx = KEYWORDS.js;
KEYWORDS.python = KEYWORDS.py;
KEYWORDS.sh = KEYWORDS.bash;
KEYWORDS.shell = KEYWORDS.bash;
KEYWORDS.zsh = KEYWORDS.bash;

/**
 * 极简零依赖高亮:把一行切成 token,给关键字/字符串/注释/数字包 <span class="tok-*">。
 * HTML/CSS 走专门的路径;其余用通用 tokenizer。已 escapeHtml 后输入,内部不再 escape 文本。
 */
function highlightLine(line: string, lang: string): string {
  const kw = KEYWORDS[lang];
  // 注释整行(// 或 # 或 -- 开头的尾注释)简单处理:行内匹配
  // 通用正则 tokenizer:字符串 / 注释 / 数字 / 标识符
  // 注意:line 已被 escapeHtml(< → &lt; 等),所以引号是原样 " '
  const tokenRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*|#[^\n]*|--[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(line)) !== null) {
    out += line.slice(last, m.index);
    last = m.index + m[0].length;
    if (m[1]) {
      out += `<span class="tok-str">${m[1]}</span>`;
    } else if (m[2]) {
      out += `<span class="tok-com">${m[2]}</span>`;
    } else if (m[3]) {
      out += `<span class="tok-num">${m[3]}</span>`;
    } else if (m[4]) {
      const word = m[4];
      if (kw && kw.has(word)) {
        out += `<span class="tok-kw">${word}</span>`;
      } else if (kw && (lang === "ts" || lang === "js" || lang === "tsx" || lang === "jsx" || lang === "typescript" || lang === "javascript")
                 && /^[a-z]/.test(word) && line[tokenRe.lastIndex] === "(") {
        // 函数调用名
        out += `<span class="tok-fn">${word}</span>`;
      } else {
        out += word;
      }
    }
  }
  out += line.slice(last);
  return out;
}

/**
 * 渲染单个增强代码块。`text` 是原始代码(未 escape),`info` 是 fence info string。
 */
export function renderCodeBlock(text: string, info: string): string {
  const { lang, title, highlight } = parseFenceInfo(info);
  const isDiff = lang === "diff";
  const rawLines = text.replace(/\n$/, "").split("\n");

  const codeLines = rawLines
    .map((ln, i) => {
      const n = i + 1;
      let escaped = escapeHtml(ln);
      let lineCls = "code-line";
      if (highlight.has(n)) lineCls += " is-highlight";
      if (isDiff) {
        if (ln.startsWith("+")) lineCls += " is-add";
        else if (ln.startsWith("-")) lineCls += " is-del";
      } else if (lang) {
        escaped = highlightLine(escaped, lang);
      }
      return `<span class="${lineCls}">${escaped || "​"}</span>`;
    })
    .join("\n");

  const langLabel = lang ? lang.toUpperCase() : "";
  const head =
    title || langLabel
      ? `<div class="code-head">
          ${title ? `<span class="code-title">${escapeHtml(title)}</span>` : `<span class="code-lang">${escapeHtml(langLabel)}</span>`}
          ${title && langLabel ? `<span class="code-lang">${escapeHtml(langLabel)}</span>` : ""}
          <button class="code-copy" type="button" aria-label="Copy code" data-copy>复制</button>
        </div>`
      : `<button class="code-copy code-copy-float" type="button" aria-label="Copy code" data-copy>复制</button>`;

  return `<figure class="plain-code-block${title || langLabel ? " has-head" : ""}" data-lang="${escapeAttr(lang)}">
    ${head}
    <pre class="code-scroll"><code class="language-${escapeAttr(lang)}">${codeLines}</code></pre>
  </figure>`;
}

/**
 * Code group(多语言 tab)。tabs = [{ label, html }],html 是已渲染的代码块 HTML。
 * 零依赖:radio + label + :checked 兄弟选择器,无 JS 也能切。
 */
export function renderCodeGroup(
  tabs: Array<{ label: string; html: string }>,
  groupId: string,
): string {
  if (tabs.length === 0) return "";
  const radios = tabs
    .map(
      (t, i) =>
        `<input type="radio" name="cg-${escapeAttr(groupId)}" id="cg-${escapeAttr(groupId)}-${i}" class="cg-radio"${i === 0 ? " checked" : ""}>`,
    )
    .join("");
  const labels = tabs
    .map(
      (t, i) =>
        `<label for="cg-${escapeAttr(groupId)}-${i}" class="cg-tab">${escapeHtml(t.label)}</label>`,
    )
    .join("");
  const panels = tabs
    .map((t, i) => `<div class="cg-panel" data-idx="${i}">${t.html}</div>`)
    .join("");
  return `<div class="plain-code-group" data-tabs="${tabs.length}">
    ${radios}
    <div class="cg-tabbar">${labels}</div>
    <div class="cg-panels">${panels}</div>
  </div>`;
}

// ── 注入资源 ───────────────────────────────────────────────

/** 复制按钮交互(零依赖) */
export const CODE_BLOCK_SCRIPT = `
(function(){
  if (typeof document === 'undefined') return;
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('[data-copy]');
    if (!btn) return;
    var fig = btn.closest('.plain-code-block');
    var code = fig && fig.querySelector('code');
    if (!code) return;
    var text = code.innerText;
    var done = function(){ var o=btn.textContent; btn.textContent='Copied'; btn.classList.add('copied'); setTimeout(function(){ btn.textContent=o; btn.classList.remove('copied'); }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function(){});
    } else {
      var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); done(); }catch(e){} document.body.removeChild(ta);
    }
  });
})();
`;

/** 代码块 + code group + 高亮 token 的 CSS */
export const CODE_BLOCK_CSS = `
.plain-code-block{position:relative;margin:1.5rem 0;border-radius:10px;overflow:hidden;border:1px solid var(--plain-border,rgba(128,128,128,.18));background:var(--plain-code-bg,#1f1f22)}
.plain-code-block .code-head{display:flex;align-items:center;gap:.6rem;padding:.5rem .85rem;background:rgba(128,128,128,.08);border-bottom:1px solid var(--plain-border,rgba(128,128,128,.18));font-size:.74rem}
.plain-code-block .code-title{font-weight:600;color:var(--plain-text,inherit);font-family:var(--plain-mono,ui-monospace,monospace)}
.plain-code-block .code-lang{margin-left:auto;opacity:.55;letter-spacing:.05em;font-weight:600}
.plain-code-block .code-title + .code-lang{margin-left:auto}
.plain-code-block .code-copy{margin-left:auto;border:1px solid var(--plain-border,rgba(128,128,128,.25));background:transparent;color:inherit;font:inherit;font-size:.72rem;padding:.2rem .6rem;border-radius:6px;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s}
.plain-code-block .code-head .code-lang + .code-copy,.plain-code-block .code-title + .code-lang + .code-copy{margin-left:.4rem}
.plain-code-block .code-copy:hover{opacity:1;background:rgba(128,128,128,.14)}
.plain-code-block .code-copy.copied{opacity:1;color:var(--plain-accent,#3b82f6)}
.plain-code-block .code-copy-float{position:absolute;top:.5rem;right:.5rem;z-index:2;opacity:0}
.plain-code-block:hover .code-copy-float{opacity:.7}
.plain-code-block .code-scroll{margin:0;padding:.9rem 0;overflow-x:auto;background:transparent;counter-reset:cl}
.plain-code-block code{display:block;font-family:var(--plain-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:.82rem;line-height:1.65}
.plain-code-block .code-line{display:block;padding:0 1rem 0 3.2rem;position:relative;white-space:pre}
.plain-code-block .code-line::before{counter-increment:cl;content:counter(cl);position:absolute;left:0;width:2.4rem;text-align:right;opacity:.32;font-variant-numeric:tabular-nums;user-select:none}
.plain-code-block .code-line.is-highlight{background:var(--plain-code-hl,rgba(120,140,255,.12));box-shadow:inset 2px 0 0 var(--plain-accent,#6b7cff)}
.plain-code-block .code-line.is-add{background:rgba(46,160,67,.14)}
.plain-code-block .code-line.is-del{background:rgba(248,81,73,.14)}
.plain-code-block .tok-kw{color:var(--tok-kw,#c678dd)}
.plain-code-block .tok-str{color:var(--tok-str,#98c379)}
.plain-code-block .tok-com{color:var(--tok-com,#7d8590);font-style:italic}
.plain-code-block .tok-num{color:var(--tok-num,#d19a66)}
.plain-code-block .tok-fn{color:var(--tok-fn,#61afef)}
.plain-code-group{margin:1.5rem 0;border-radius:10px;overflow:hidden;border:1px solid var(--plain-border,rgba(128,128,128,.18))}
.plain-code-group .cg-radio{position:absolute;opacity:0;pointer-events:none}
.plain-code-group .cg-tabbar{display:flex;gap:.2rem;padding:.3rem .4rem 0;background:rgba(128,128,128,.08);border-bottom:1px solid var(--plain-border,rgba(128,128,128,.18))}
.plain-code-group .cg-tab{font-size:.76rem;padding:.4rem .8rem;border-radius:7px 7px 0 0;cursor:pointer;opacity:.6;font-weight:500;transition:opacity .15s,background .15s}
.plain-code-group .cg-tab:hover{opacity:.9}
.plain-code-group .cg-panel{display:none}
.plain-code-group .cg-panel .plain-code-block{margin:0;border:0;border-radius:0}
/* radio :checked → 对应 tab 高亮 + panel 显示(按顺序 nth) */
.plain-code-group .cg-radio:nth-of-type(1):checked ~ .cg-tabbar .cg-tab:nth-of-type(1),
.plain-code-group .cg-radio:nth-of-type(2):checked ~ .cg-tabbar .cg-tab:nth-of-type(2),
.plain-code-group .cg-radio:nth-of-type(3):checked ~ .cg-tabbar .cg-tab:nth-of-type(3),
.plain-code-group .cg-radio:nth-of-type(4):checked ~ .cg-tabbar .cg-tab:nth-of-type(4),
.plain-code-group .cg-radio:nth-of-type(5):checked ~ .cg-tabbar .cg-tab:nth-of-type(5){opacity:1;background:var(--plain-code-bg,#1f1f22);box-shadow:0 1px 0 var(--plain-code-bg,#1f1f22)}
.plain-code-group .cg-radio:nth-of-type(1):checked ~ .cg-panels .cg-panel:nth-of-type(1),
.plain-code-group .cg-radio:nth-of-type(2):checked ~ .cg-panels .cg-panel:nth-of-type(2),
.plain-code-group .cg-radio:nth-of-type(3):checked ~ .cg-panels .cg-panel:nth-of-type(3),
.plain-code-group .cg-radio:nth-of-type(4):checked ~ .cg-panels .cg-panel:nth-of-type(4),
.plain-code-group .cg-radio:nth-of-type(5):checked ~ .cg-panels .cg-panel:nth-of-type(5){display:block}
`;
