/**
 * V32 S2 · 自验脚本(tsx 直接跑)
 *
 * 用 S1 fromV31 转一个 deck 样本 + 一个 doc 样本成 Document,
 * 分别 renderReport 出 present(deck)/report(doc),落磁盘肉眼可查。
 *
 * tsx 坑:@/ 别名静态 import 报 does not provide export → 用绝对路径 await import。
 * 运行:pnpm exec tsx src/lib/v32/render/render-report.selfcheck.ts
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
let failed = 0;
function assert(cond: unknown, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failed++; console.error(`  ✗ ${msg}`); }
}

async function main() {
  const { fromV31 } = await import(resolve(__dirname, "../migrate/from-v31.ts"));
  const { renderReport } = await import(resolve(__dirname, "render-report.ts"));

  // ── DECK 样本(含 XSS 注入探针)→ present ──
  const deck = {
    meta: { title: "Deck <script>alert(1)</script> T", author: "Al", date: "2026", density: "low", description: "d" },
    slides: [
      { kind: "cover", kicker: "K", display: "Big <b>x</b>", displayTail: "tail", lead: "L", byline: ["a", "b"] },
      { kind: "hero-question", bigNumber: "42%", question: "Why? <img src=x onerror=alert(1)>", annotation: "note" },
      { kind: "stats", title: "Numbers", items: [ { value: "10k", label: "users", delta: "up" }, { value: "3%", label: "churn", hint: "h" } ] },
      { kind: "diagnosis", kicker: "dk", title: "Problems", items: [{ num: "1", head: "H", body: "B", metric: "50%", metricLabel: "loss" }] },
      { kind: "compare", title: "vs", left: { label: "A", bullets: ["a1", "a2"] }, right: { label: "B", bullets: ["b1"] } },
      { kind: "pull-quote", text: "quote text", attribution: "someone" },
      { kind: "proposal", title: "Plan", steps: [{ num: "1", head: "Step", body: "do", when: "Q1" }] },
      { kind: "closing", kicker: "end", display: "Thanks", sub: "sub" },
    ],
  };

  // ── DOC 样本 → report ──
  const docV31 = {
    meta: { title: "Doc Sample", author: "Al", date: "2026", description: "desc", density: "high" },
    blocks: [
      { kind: "heading", level: 1, text: "Intro" },
      { kind: "md", body: "## Hello\n\nSome **markdown** with a [link](https://x.com) and:\n\n- one\n- two <b>bold</b>\n" },
      { kind: "callout", tone: "warn", title: "Careful", body: "watch out `code`" },
      { kind: "data-block", title: "KPIs", items: [{ value: "99%", label: "uptime", delta: "up" }] },
      { kind: "quote", text: "a quote", attribution: "me" },
    ],
  };

  let deckDoc: unknown, docDoc: unknown;
  try { deckDoc = fromV31("deck", deck); assert(true, "fromV31(deck) 不抛"); }
  catch (e) { assert(false, `fromV31(deck) 抛: ${(e as Error).message}`); return; }
  try { docDoc = fromV31("doc", docV31); assert(true, "fromV31(doc) 不抛"); }
  catch (e) { assert(false, `fromV31(doc) 抛: ${(e as Error).message}`); return; }

  const presentHtml = renderReport(deckDoc, undefined, { mode: "present" });
  const reportHtml = renderReport(docDoc, undefined, { mode: "report" });

  // ── 断言 ──
  assert(presentHtml.length > 500, `present HTML 非空 (${presentHtml.length}B)`);
  assert(reportHtml.length > 500, `report HTML 非空 (${reportHtml.length}B)`);
  assert(presentHtml.startsWith("<!DOCTYPE"), "present 含 <!DOCTYPE>");
  assert(reportHtml.startsWith("<!DOCTYPE"), "report 含 <!DOCTYPE>");
  assert(presentHtml.includes("deck-viewport") && presentHtml.includes("deck-stage") && presentHtml.includes('class="slide"'), "present 含 letterbox class (deck-viewport/stage/slide)");
  assert(presentHtml.includes("STAGE") || presentHtml.includes("deck-stage"), "present 注入 stage scaler");
  assert(reportHtml.includes("v32-flow") && reportHtml.includes("doc-article"), "report 含 flow (v32-flow/doc-article)");
  assert(!presentHtml.includes("<script>alert(1)</script>"), "present 无未 escape XSS (script)");
  assert(!presentHtml.includes("<img src=x onerror"), "present 无未 escape XSS (raw <img onerror>)");
  assert(presentHtml.includes("&lt;script&gt;") || presentHtml.includes("&lt;b&gt;"), "present XSS 已 escape 成实体");
  assert(reportHtml.includes("<h2") || reportHtml.includes("<strong>"), "report markdown 已渲染成 HTML");
  assert(!reportHtml.includes("two <b>bold</b>"), "report md 内联 XSS 被 escape/清理");

  // ── 危险 URL scheme(markdown 链接语法绕过第一道 escape)──────
  //
  // 回归防护:md() 把源里的 < > 转义,挡住了 <script>/<img onerror>。但 markdown
  // **自己的链接语法不需要 < >** —— `[x](javascript:alert(1))` 会被 marked 正常
  // 渲成 <a href="javascript:alert(1)">。实测 javascript: / vbscript: /
  // data:text/html / 大小写变形 / HTML 实体编码 都能穿过第一道。
  // 现由 sanitizeUrlAttrs 在输出侧把危险 scheme 换成 "#"。
  const ATTACK_URLS = [
    "[a](javascript:alert(1))",
    "[a](JaVaScRiPt:alert(1))",
    "[a](java\tscript:alert(1))",
    "![i](javascript:alert(1))",
    "[a](data:text/html,hello)",
    "[a](vbscript:msgbox(1))",
    "[a](  javascript:alert(1))",
    "[a](file:///etc/passwd)",
    "[a](blob:http://x/y)",
    "[a](&#106;avascript:alert(1))",
    "[a](jav&#x61;script:alert(1))",
  ];
  for (const payload of ATTACK_URLS) {
    const html = renderReport(
      {
        meta: { title: "T", density: "high", defaultMode: "report" },
        kind: "doc",
        blocks: [{ id: "b1", type: "prose", body: payload }],
      } as never,
      undefined,
    );
    assert(
      !/(href|src)\s*=\s*"\s*(javascript|vbscript|data:text|file|blob)/i.test(html),
      `危险 URL 被拦下: ${payload}`,
    );
  }

  // 正常链接不能被误伤(含 data:image 内嵌图 —— Plain 正常用法)
  const SAFE_URLS: Array<[string, string]> = [
    ["[ok](https://inplain.app)", "https://inplain.app"],
    ["[ok](/relative/path)", "/relative/path"],
    ["[ok](mailto:a@b.com)", "mailto:a@b.com"],
    ["![img](data:image/png;base64,iVBORw0KGgo=)", "data:image/png"],
    ["[ok](#anchor)", "#anchor"],
  ];
  for (const [payload, expect] of SAFE_URLS) {
    const html = renderReport(
      {
        meta: { title: "T", density: "high", defaultMode: "report" },
        kind: "doc",
        blocks: [{ id: "b1", type: "prose", body: payload }],
      } as never,
      undefined,
    );
    assert(html.includes(expect), `正常链接未被误伤: ${payload}`);
  }

  // ── 分屏兜底:三 kind 都要能出多屏演讲态 ──────────────────
  // pageBreak 只有 deck 来源会标(fromV31 对 doc/sheet 不加)。V32 让三 kind 都能
  // 演讲后,没兜底的话 doc/sheet 会挤成一整屏 —— 技术上"能渲染",实际没法演讲。
  const mkDoc = (blocks: unknown[]) =>
    ({ meta: { title: "T", density: "high", defaultMode: "present" }, kind: "doc", blocks }) as never;
  const slideCount = (d: unknown) =>
    (renderReport(d as never, undefined, { mode: "present" }).match(/class="slide"/g) ?? []).length;

  // 显式 pageBreak 优先(deck 行为不能被兜底改掉)
  assert(
    slideCount(
      mkDoc([
        { id: "a", type: "prose", body: "1", pageBreak: true },
        { id: "b", type: "prose", body: "2", pageBreak: true },
      ]),
    ) === 2,
    "有 pageBreak → 按 pageBreak 分屏",
  );
  // heading 兜底(doc 典型形状)
  assert(
    slideCount(
      mkDoc([
        { id: "h1", type: "heading", level: 2, text: "一" },
        { id: "p1", type: "prose", body: "x" },
        { id: "h2", type: "heading", level: 2, text: "二" },
        { id: "p2", type: "prose", body: "y" },
      ]),
    ) === 2,
    "无 pageBreak 有 heading → 按 heading 分屏",
  );
  // group 兜底(sheet 典型形状:一个 group = 一行面板,没有 heading)
  assert(
    slideCount(
      mkDoc([
        { id: "g1", type: "group", layout: "row", children: [{ id: "k1", type: "metrics", items: [] }] },
        { id: "g2", type: "group", layout: "row", children: [{ id: "k2", type: "metrics", items: [] }] },
        { id: "g3", type: "group", layout: "row", children: [{ id: "k3", type: "metrics", items: [] }] },
      ]),
    ) === 3,
    "无 pageBreak 无 heading 但有顶层 group → 每 group 一屏",
  );
  // 都没有 → 单屏(短文档本该一屏,别为了分屏硬切)
  assert(
    slideCount(mkDoc([{ id: "p", type: "prose", body: "just one paragraph" }])) === 1,
    "无任何边界 → 保持单屏",
  );

  // ── 落磁盘 ──
  const outDir = resolve(__dirname, "../../../../scratchpad-v32-out");
  mkdirSync(outDir, { recursive: true });
  const pPath = resolve(outDir, "present-deck.html");
  const rPath = resolve(outDir, "report-doc.html");
  writeFileSync(pPath, presentHtml, "utf8");
  writeFileSync(rPath, reportHtml, "utf8");
  console.log(`\n落盘:\n  present: ${pPath} (${presentHtml.length}B)\n  report:  ${rPath} (${reportHtml.length}B)`);

  console.log(failed === 0 ? "\n全部通过 ✓" : `\n${failed} 条失败 ✗`);
  process.exit(failed === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
