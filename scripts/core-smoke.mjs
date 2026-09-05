#!/usr/bin/env node
/**
 * Plain Core 烟雾测试 —— 在 Node 里 import @plain/core,跑通确定性路径:
 *
 *   marp source → marpToDeck (parse) → deckDocToPptx (export) → 写入 .audit/smoke.pptx
 *   md source   → mdToDoc (parse)    → docDocToDocx (export)  → 写入 .audit/smoke.docx
 *   sheet src   → sourceToSheet      → sheetDocToXlsx          → 写入 .audit/smoke.xlsx
 *   ref 解析    → resolveRef          → 验证 inline 字符串
 *
 * 不调用 LLM(generate/edit 需要 provider key,留给 CLI e2e)。
 *
 * 跑法:pnpm exec tsx scripts/core-smoke.mjs
 *
 * 通过的标志:四个文件都生成、ref 解析返回预期 inline 文本、退出码 0。
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, ".audit");
mkdirSync(OUT_DIR, { recursive: true });

// 通过 core barrel import,这条路径成功 = CLI/Tauri 也能跑
const core = await import(join(ROOT, "packages/core/src/core/index.ts"));

const {
  marpToDeck,
  deckDocToPptx,
  mdToDoc,
  docDocToDocx,
  sourceToSheet,
  sheetDocToXlsx,
  findRefs,
  resolveRef,
  toContext,
} = core;

let failures = 0;
const log = (label, msg) => console.log(`[${label}] ${msg}`);
const fail = (label, msg) => {
  failures += 1;
  console.error(`[${label}] FAIL: ${msg}`);
};

// ─────────────────────────────────────────────────────────────
// 1) Deck:marp → JSON → PPTX
// ─────────────────────────────────────────────────────────────
const DECK_SRC = `---
marp: true
theme: plain-editorial
paginate: true
---

<!-- id:s1 -->

# Plain Core Smoke

**确定性路径验证**

---

<!-- id:s2 -->

## 三件套

- Deck = 说服
- Doc = 说明
- Sheet = 计算
`;

try {
  const deck = marpToDeck(DECK_SRC);
  if (!deck.slides?.length) throw new Error("slides empty");
  log("deck", `parsed ${deck.slides.length} slides; titles: ${deck.slides.map((s) => s.title).join(" | ")}`);
  const pptx = await deckDocToPptx(deck);
  const out = join(OUT_DIR, "smoke.pptx");
  writeFileSync(out, pptx);
  const size = statSync(out).size;
  if (size < 1000) throw new Error(`pptx too small: ${size} bytes`);
  log("deck", `wrote ${out} (${size} bytes)`);
} catch (e) {
  fail("deck", String(e?.stack || e));
}

// ─────────────────────────────────────────────────────────────
// 2) Doc:md → JSON → DOCX
// ─────────────────────────────────────────────────────────────
const DOC_SRC = `---
title: Smoke Doc
---

<!-- id:b1 -->
# Plain Core 解耦验证

<!-- id:b2 -->
这是一段从 Node 直接调用 Plain Core 生成的文档。
`;

try {
  const doc = mdToDoc(DOC_SRC);
  if (!doc.blocks?.length) throw new Error("blocks empty");
  log("doc", `parsed ${doc.blocks.length} blocks`);
  const docx = await docDocToDocx(doc);
  const out = join(OUT_DIR, "smoke.docx");
  writeFileSync(out, docx);
  const size = statSync(out).size;
  if (size < 500) throw new Error(`docx too small: ${size} bytes`);
  log("doc", `wrote ${out} (${size} bytes)`);
} catch (e) {
  fail("doc", String(e?.stack || e));
}

// ─────────────────────────────────────────────────────────────
// 3) Sheet:src → JSON → XLSX
// ─────────────────────────────────────────────────────────────
const SHEET_SRC = `---
kind: sheet
title: Smoke Sheet
columns: [{"key":"month","label":"月份","type":"string"},{"key":"revenue","label":"收入","type":"number"}]
charts: []
---

\`\`\`csv
month,revenue
2026-01,120000
2026-02,135000
2026-03,148000
\`\`\`

Q1 收入持续增长。
`;

try {
  const sheet = sourceToSheet(SHEET_SRC);
  if (!sheet.rows?.length) throw new Error("rows empty");
  log("sheet", `parsed ${sheet.rows.length} rows × ${sheet.columns.length} columns`);
  const xlsx = sheetDocToXlsx(sheet);
  const out = join(OUT_DIR, "smoke.xlsx");
  writeFileSync(out, xlsx);
  const size = statSync(out).size;
  if (size < 500) throw new Error(`xlsx too small: ${size} bytes`);
  log("sheet", `wrote ${out} (${size} bytes)`);
} catch (e) {
  fail("sheet", String(e?.stack || e));
}

// ─────────────────────────────────────────────────────────────
// 4) Refs:跨文档引用解析
// ─────────────────────────────────────────────────────────────
try {
  const sheet = sourceToSheet(SHEET_SRC);
  const ws = toContext({
    docs: [
      { id: "sh1", kind: "sheet", title: "Smoke Sheet", source: SHEET_SRC, createdAt: 0, updatedAt: 0 },
    ],
    currentId: "sh1",
  });
  const refs = findRefs("月度收入:@sheet:sh1:col:revenue");
  if (refs.length !== 1) throw new Error(`expected 1 ref, got ${refs.length}`);
  const r = resolveRef(refs[0], ws);
  if (!r.ok) throw new Error(`resolve failed: ${r.reason}`);
  if (!r.inline.includes("120000") || !r.inline.includes("148000")) {
    throw new Error(`inline missing values: ${r.inline}`);
  }
  log("refs", `resolved @sheet:sh1:col:revenue → "${r.inline}"`);
  log("refs", `sheet.rows[0]: ${JSON.stringify(sheet.rows[0])}`);
} catch (e) {
  fail("refs", String(e?.stack || e));
}

// ─────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n❌ ${failures} smoke test(s) failed`);
  process.exit(1);
}
console.log("\n✅ Plain Core smoke tests passed (4/4)");
