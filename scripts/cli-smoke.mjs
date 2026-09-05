#!/usr/bin/env node
/**
 * Plain CLI 烟雾测试 —— 端到端验证不依赖 LLM 的路径:
 *
 *   1) plain --help               走得通(commander 注册无错)
 *   2) plain config               读不存在的 config 也不崩
 *   3) plain deck edit --patch    本地 RFC 6902 路径,不调 LLM
 *   4) plain export deck → pptx   完整 read → parse → expand refs → export → write
 *   5) plain mcp tools/list       MCP server 启动 + 列工具
 *   6) plain mcp export_deck_pptx MCP 端到端调用
 *
 * 跑法:pnpm cli:smoke
 *
 * 通过的标志:6 个步骤都过、退出码 0。
 */
import { spawnSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync, statSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, ".audit", "cli-smoke");
mkdirSync(OUT, { recursive: true });

let failures = 0;
const log = (label, msg) => console.log(`[${label}] ${msg}`);
const fail = (label, msg) => {
  failures += 1;
  console.error(`[${label}] FAIL: ${msg}`);
};

// 直接调本地 tsx,不经过 pnpm exec(避免 spawnSync 的 PATH 问题)
const TSX = join(ROOT, "node_modules/.bin/tsx");
const ENTRY = join(ROOT, "packages/cli/src/index.ts");

function runCli(args, opts = {}) {
  const env = { ...process.env, ...(opts.env ?? {}) };
  return spawnSync(TSX, [ENTRY, ...args], {
    encoding: "utf8",
    cwd: ROOT,
    env,
    ...opts,
  });
}

// ──────────────────────────────────────────────────────────
// 1) --help
// ──────────────────────────────────────────────────────────
{
  const r = runCli(["--help"]);
  if (r.status !== 0) fail("help", `exit ${r.status}: ${r.stderr}`);
  else if (!/\bdeck\b/.test(r.stdout) || !/\bmcp\b/.test(r.stdout)) {
    fail("help", `output missing key commands: ${r.stdout.slice(0, 200)}`);
  } else log("help", "OK");
}

// ──────────────────────────────────────────────────────────
// 2) config
// ──────────────────────────────────────────────────────────
{
  const r = runCli(["config"], { env: { XDG_CONFIG_HOME: join(OUT, "xdg-empty") } });
  if (r.status !== 0) fail("config", `exit ${r.status}: ${r.stderr}`);
  else if (!r.stdout.includes("gatewayUrl")) fail("config", `missing field: ${r.stdout}`);
  else log("config", "OK");
}

// ──────────────────────────────────────────────────────────
// 2b) V27-L · 新命令注册测试(share / project / attach / import)
//     只测 --help 不打 prod API · 不污染数据 · 不需要登录
// ──────────────────────────────────────────────────────────
for (const cmd of ["share", "project", "attach", "import"]) {
  const r = runCli([cmd, "--help"]);
  if (r.status !== 0) {
    fail(`${cmd}:help`, `exit ${r.status}: ${(r.stderr || "").slice(0, 200)}`);
  } else if (!r.stdout.includes("Usage:")) {
    fail(`${cmd}:help`, `no Usage in --help output`);
  } else {
    log(`${cmd}:help`, "OK");
  }
}

// ──────────────────────────────────────────────────────────
// 3) deck edit --patch (no LLM)
// V21 · CLI 切到 v2,sample 用 v2 DSL,patch 路径用 /sections/0/display
// ──────────────────────────────────────────────────────────
const DECK = `---
plain: deck@v2
theme: swiss
title: Smoke Test
---

::: cover
display: Old Title
displayTail: subtitle
speakerNotes: 开场
:::

::: stats
items:
  - value: 10x
    label: speed
    hint: fast
  - value: 35%
    label: drop
    hint: less
  - value: 62%
    label: open
    hint: link
speakerNotes: stats
:::

::: closing
display: end
sub: cta
cta:
  primary:
    label: try
    href: example.com
speakerNotes: end
:::
`;
const deckFile = join(OUT, "test.deck.md");
writeFileSync(deckFile, DECK);
{
  const r = runCli([
    "deck", "edit", deckFile,
    "--patch", '[{"op":"replace","path":"/sections/0/display","value":"Smoke Title"}]',
  ]);
  if (r.status !== 0) fail("patch", `exit ${r.status}: ${r.stderr}`);
  else {
    const after = readFileSync(deckFile, "utf8");
    if (!after.includes("Smoke Title")) fail("patch", `title not changed: ${after.slice(0, 200)}`);
    else log("patch", "OK (title replaced)");
  }
}

// ──────────────────────────────────────────────────────────
// 3b) V27-O · deck edit roundtrip · YAML 把 byline/num 当数字 ·
//     adapter 必须 stringify · 否则 ShortText schema 拒
// ──────────────────────────────────────────────────────────
const DECK_NUMERIC = `---
plain: deck@v2
theme: monocle
title: V27-O roundtrip test
---

::: cover
display: Title
display-tail: subtitle
byline:
  - Author
  - 2026
speakerNotes: notes
:::

::: diagnosis
items:
  - num: 01
    head: One
    body: lorem ipsum.
    metric: 100
    metric-label: percent
  - num: 02
    head: Two
    body: dolor sit amet.
    metric: 200
    metric-label: thousand
  - num: 03
    head: Three
    body: consectetur adipiscing.
    metric: 300
    metric-label: million
speakerNotes: notes
:::
`;
const deckNumericFile = join(OUT, "test.deck.numeric.md");
writeFileSync(deckNumericFile, DECK_NUMERIC);
{
  const r = runCli([
    "deck", "edit", deckNumericFile,
    "--patch", '[{"op":"replace","path":"/sections/0/display","value":"Patched"}]',
  ]);
  if (r.status !== 0) fail("patch:numeric", `exit ${r.status}: ${r.stderr.slice(0, 200)}`);
  else {
    const after = readFileSync(deckNumericFile, "utf8");
    if (!after.includes("Patched")) fail("patch:numeric", `not patched`);
    else log("patch:numeric", "OK (byline + num stringified)");
  }
}

// ──────────────────────────────────────────────────────────
// 4) export deck → html (V21 · v2 web-first)
// ──────────────────────────────────────────────────────────
const htmlOut = join(OUT, "test.deck.html");
{
  const r = runCli(["export", deckFile, "--to", "html", "-o", htmlOut]);
  if (r.status !== 0) fail("export:html", `exit ${r.status}: ${r.stderr}`);
  else if (!existsSync(htmlOut) || statSync(htmlOut).size < 1000) {
    fail("export:html", `html too small or missing`);
  } else {
    const html = readFileSync(htmlOut, "utf8");
    if (!html.includes("<!doctype html>")) {
      fail("export:html", `not html: ${html.slice(0, 100)}`);
    } else log("export:html", `wrote ${htmlOut} (${statSync(htmlOut).size} bytes · html-first)`);
  }
}

// 4b) export 老 v1 marp deck → pptx(兼容路径还得活)
const V1_DECK = `---
marp: true
theme: default
paginate: true
---

<!-- id:s1 -->

# v1 PPTX Test

bullet
`;
const v1DeckFile = join(OUT, "v1.deck.md");
writeFileSync(v1DeckFile, V1_DECK);
const pptxOut = join(OUT, "v1.pptx");
{
  const r = runCli(["export", v1DeckFile, "--to", "pptx", "-o", pptxOut]);
  if (r.status !== 0) fail("export:pptx", `exit ${r.status}: ${r.stderr}`);
  else if (!existsSync(pptxOut) || statSync(pptxOut).size < 1000) {
    fail("export:pptx", `pptx too small or missing`);
  } else log("export:pptx", `wrote ${pptxOut} (${statSync(pptxOut).size} bytes · v1 compat)`);
}

// ──────────────────────────────────────────────────────────
// 5+6) mcp tools/list + tools/call(export_deck_pptx)
// ──────────────────────────────────────────────────────────
{
  const child = spawn(TSX, [ENTRY, "mcp"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = [
    `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}`,
    `{"jsonrpc":"2.0","method":"notifications/initialized"}`,
    `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`,
    `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"export_deck_pptx","arguments":${JSON.stringify({ source: DECK })}}}`,
  ];
  child.stdin.write(lines.join("\n") + "\n");

  const out = [];
  child.stdout.on("data", (d) => out.push(d));
  await new Promise((r) => setTimeout(r, 4000));
  child.kill();
  const buf = Buffer.concat(out).toString("utf8");
  const responses = buf
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);

  const toolsList = responses.find((r) => r.id === 2);
  if (!toolsList?.result?.tools?.length) {
    fail("mcp:list", `no tools listed: ${buf.slice(0, 200)}`);
  } else {
    const names = toolsList.result.tools.map((t) => t.name);
    if (!names.includes("generate_deck") || !names.includes("export_deck_pptx")) {
      fail("mcp:list", `tools missing: ${names.join(",")}`);
    } else log("mcp:list", `OK (${names.length} tools)`);
  }

  const exportCall = responses.find((r) => r.id === 3);
  const blob = exportCall?.result?.content?.[1]?.resource?.blob;
  if (!blob || blob.length < 1000) {
    const dbg = JSON.stringify(exportCall ?? { note: "no response id=3 (generate_deck 失败 / 未配 LLM 凭证)" }).slice(0, 200);
    fail("mcp:export", `no blob or too small: ${dbg}`);
  } else log("mcp:export", `OK (${blob.length} base64 chars)`);
}

if (failures > 0) {
  console.error(`\n❌ ${failures} CLI smoke test(s) failed`);
  process.exit(1);
}
console.log("\n✅ Plain CLI smoke tests passed (11/11)");
