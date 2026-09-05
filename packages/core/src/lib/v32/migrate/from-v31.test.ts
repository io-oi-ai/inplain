/**
 * S1 迁移 adapter 单测(tsx 直接跑)。
 *
 * 用动态 import 绕开 tsx 对 .ts 命名导出解析的坑(别用 @/ 静态 import)。
 * 运行:  pnpm exec tsx src/lib/v32/migrate/from-v31.test.ts
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
function assert(cond: unknown, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}
function eq(a: unknown, b: unknown, msg: string) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

async function main() {
  const { fromV31 } = await import(resolve(__dirname, "from-v31.ts"));
  const { parseDocument } = await import(resolve(__dirname, "../content/schema.ts"));

  // ── DECK 样本:覆盖全部 14 种 slide kind ──────────────────────
  const deck = {
    meta: { title: "Deck T", author: "Al", date: "2026", density: "low", description: "d" },
    slides: [
      { kind: "cover", kicker: "K", display: "Big", displayTail: "tail", lead: "L", byline: ["a", "b"] },
      { kind: "hero-question", bigNumber: "42%", question: "Why?", annotation: "note" },
      {
        kind: "stats",
        title: "Numbers",
        items: [
          { value: "10k", label: "users", delta: "up" },
          { value: "3%", label: "churn", hint: "h" },
        ],
      },
      {
        kind: "diagnosis",
        kicker: "dk",
        title: "Problems",
        items: [{ num: "1", head: "H", body: "B", metric: "50%", metricLabel: "loss" }],
      },
      {
        kind: "compare",
        title: "vs",
        left: { label: "A", bullets: ["a1", "a2"] },
        right: { label: "B", bullets: ["b1"] },
      },
      { kind: "pull-quote", text: "quote text", attribution: "someone" },
      {
        kind: "proposal",
        title: "Plan",
        steps: [{ num: "1", head: "Step", body: "do", when: "Q1" }],
      },
      {
        kind: "timeline",
        title: "History",
        items: [
          { when: "2024", label: "start", hint: "h" },
          { when: "2025", label: "grow" },
        ],
      },
      {
        kind: "pipeline",
        title: "Flow",
        items: [
          { num: "1", label: "in" },
          { num: "2", label: "out", hint: "h" },
        ],
      },
      {
        kind: "features",
        title: "Feats",
        items: [
          { head: "F1", body: "b", icon: "star" },
          { head: "F2", body: "b" },
        ],
      },
      {
        kind: "quadrant",
        xLabel: "cost",
        yLabel: "value",
        quadrantLabels: ["q1", "q2", "q3", "q4"],
        points: [{ label: "us", x: 80, y: 90, focal: true }],
      },
      {
        kind: "media-split",
        text: { kicker: "mk", title: "MT", body: "mb" },
        media: { kind: "quote", quote: { text: "mq", attribution: "src" } },
        side: "right",
      },
      {
        kind: "closing",
        kicker: "ck",
        display: "Thanks",
        sub: "sub",
        cta: { primary: { label: "Go", href: "/go" } },
      },
      { kind: "prose", title: "P", body: "prose body" },
    ],
  };

  const deckDoc = fromV31("deck", deck);
  parseDocument(deckDoc); // 断言不抛
  assert(deckDoc.meta.defaultMode === "present", "deck defaultMode=present");
  assert(deckDoc.meta.density === "low", "deck density 沿用 low");
  assert(deckDoc.meta.author === "Al", "deck meta author 搬运");
  eq(deckDoc.blocks.length, deck.slides.length, "deck slides.length === blocks.length");
  assert(deckDoc.blocks.every((b: any) => b.pageBreak === true), "每个 deck block pageBreak=true");
  assert(deckDoc.blocks.every((b: any, i: number) => b.id === `d${i}`), "deck id 确定性 d{index}");

  // 逐块类型断言
  const types = deckDoc.blocks.map((b: any) => b.type);
  eq(types, [
    "cover", "statement", "metrics", "cards", "compare", "quote", "cards",
    "sequence", "sequence", "cards", "quadrant", "media", "closing", "prose",
  ], "deck slide→block 类型映射");

  // 关键字段无损
  const stats: any = deckDoc.blocks[2];
  eq(stats.items[0], { value: "10k", label: "users", delta: "up" }, "stats.items[0] 无损");
  eq(stats.items[1], { value: "3%", label: "churn", hint: "h" }, "stats.items[1] 无损");
  const diag: any = deckDoc.blocks[3];
  assert(diag.layout === "numbered", "diagnosis→cards layout=numbered");
  eq(diag.items[0].metric, "50%", "diagnosis metric 保留");
  eq(diag.items[0].metricLabel, "loss", "diagnosis metricLabel 保留");
  const heroQ: any = deckDoc.blocks[1];
  eq(heroQ.text, "Why?", "hero-question.question → statement.text");
  eq(heroQ.bigNumber, "42%", "hero-question.bigNumber 保留");
  assert((deckDoc.blocks[6] as any).layout === "steps", "proposal→cards layout=steps");
  assert((deckDoc.blocks[7] as any).flow === "time", "timeline→sequence flow=time");
  assert((deckDoc.blocks[8] as any).flow === "arrow", "pipeline→sequence flow=arrow");
  eq((deckDoc.blocks[8] as any).items[0].when, "1", "pipeline num → seq.when");
  assert((deckDoc.blocks[9] as any).layout === "grid", "features→cards layout=grid");
  eq((deckDoc.blocks[11] as any).side, "right", "media-split.side 保留");
  eq((deckDoc.blocks[11] as any).media.quote.text, "mq", "media quote 无损");

  // ── DOC 样本:覆盖 7 种 block ────────────────────────────────
  const doc = {
    meta: { title: "Doc T", deck: "sub", density: "high" },
    blocks: [
      { kind: "heading", level: 2, text: "H2" },
      { kind: "prose", body: "para" },
      { kind: "quote", text: "q", attribution: "who" },
      { kind: "callout", tone: "warn", title: "ct", body: "cb" },
      { kind: "list", ordered: true, items: ["one", "two"] },
      {
        kind: "data-block",
        title: "DB",
        bars: [
          { label: "a", value: 10, display: "10 pts", tone: "bad" },
          { label: "b", value: 20 },
        ],
      },
      { kind: "table", headers: ["c1", "c2"], rows: [["r1a", "r1b"]] },
    ],
  };
  const docDoc = fromV31("doc", doc);
  parseDocument(docDoc);
  assert(docDoc.meta.defaultMode === "report", "doc defaultMode=report");
  assert(docDoc.meta.deck === "sub", "doc meta.deck 搬运");
  eq(docDoc.blocks.length, doc.blocks.length, "doc blocks.length 一致");
  assert(docDoc.blocks.every((b: any) => b.pageBreak === undefined), "doc 不加 pageBreak");
  const docTypes = docDoc.blocks.map((b: any) => b.type);
  eq(docTypes, ["heading", "prose", "quote", "callout", "prose", "metrics", "table"], "doc block 类型映射(list→prose, data-block→metrics)");
  eq((docDoc.blocks[4] as any).body, "1. one\n2. two", "list→prose 拼成 markdown 有序列表");
  // bar.tone 落成 hint(v32 Mark 无 tone 字段 · 语义染色不能凭空消失)
  eq((docDoc.blocks[5] as any).items[0], { value: "10 pts", label: "a", hint: "missed" }, "data-block bars[0]→metrics(display 优先 · tone→hint)");
  eq((docDoc.blocks[5] as any).items[1], { value: "20", label: "b" }, "data-block bars[1]→metrics(无 display 用 value)");
  eq((docDoc.blocks[0] as any).level, 2, "heading level 保留");

  // ── data-block 的 headline / note 必须保住 ───────────────────
  // 回归防护:旧实现 `title: b.title ?? b.headline` 在 title 存在时静默丢 headline,
  // note 更是从没读过。实测存量 doc showcase 因此丢了 21 段真文案。
  const dbFull = fromV31("doc", {
    meta: { title: "T" },
    blocks: [
      {
        kind: "data-block",
        title: "DB",
        headline: "导语:两个指标都动了",
        note: "这些条是进度不是原值",
        bars: [{ label: "a", value: 10, display: "10 pts", tone: "positive" }],
      },
    ],
  });
  parseDocument(dbFull);
  const g = dbFull.blocks[0] as any;
  eq(g.type, "group", "带 headline/note 的 data-block → group 包住");
  eq(g.layout, "stack", "group 用 stack 布局");
  eq(g.children.map((c: any) => c.type), ["prose", "metrics", "prose"], "headline/metrics/note 三块顺序");
  eq(g.children[0].body, "导语:两个指标都动了", "headline 保住");
  eq(g.children[2].body, "这些条是进度不是原值", "note 保住");
  eq(g.children[1].title, "DB", "title 仍在 metrics 上");
  eq(g.children[1].items[0].hint, "on track", "tone=positive → hint");
  // 无 headline/note 时不应多包一层 group
  const dbBare = fromV31("doc", {
    meta: { title: "T" },
    blocks: [{ kind: "data-block", title: "DB", bars: [{ label: "a", value: 1 }] }],
  });
  eq((dbBare.blocks[0] as any).type, "metrics", "无 headline/note → 仍是裸 metrics(不多包 group)");

  // ── SHEET 样本:覆盖 4 种 panel ──────────────────────────────
  const sheet = {
    meta: { title: "Sheet T", deck: "sd" },
    rows: [
      {
        title: "Row0",
        panels: [
          { kind: "kpi", title: "MRR", value: "$10k", delta: "+5%", hint: "hh" },
          { kind: "insight", title: "Ins", body: "insight body", tone: "warn" },
        ],
      },
      {
        panels: [
          {
            kind: "chart",
            variant: "line",
            title: "Trend",
            caption: "cap",
            x: ["Jan", "Feb"],
            series: [{ name: "s1", data: [1, 2] }],
          },
          { kind: "table", title: "Tbl", columns: ["x", "y"], rows: [["1", "2"]] },
        ],
      },
    ],
  };
  const sheetDoc = fromV31("sheet", sheet);
  parseDocument(sheetDoc);
  assert(sheetDoc.meta.defaultMode === "report", "sheet defaultMode=report");
  eq(sheetDoc.blocks.length, 2, "sheet rows → 2 groups");
  assert(sheetDoc.blocks.every((b: any) => b.type === "group" && b.layout === "row"), "每 row → group{layout:row}");
  assert(sheetDoc.blocks.every((b: any, i: number) => b.id === `r${i}`), "group id 确定性 r{index}");
  const g0: any = sheetDoc.blocks[0];
  eq(g0.children.map((c: any) => c.type), ["metrics", "prose"], "row0 panels: kpi→metrics, insight→prose");
  eq(g0.children[0].items[0].value, "$10k", "kpi.value 无损");
  eq(g0.children[0].items[0].hint, "hh", "kpi.hint 保留");
  eq(g0.children[1].tone, "warn", "insight.tone 保留");
  eq(g0.children[1].body, "insight body", "insight.body 无损");
  const g1: any = sheetDoc.blocks[1];
  eq(g1.children.map((c: any) => c.type), ["chart", "table"], "row1 panels: chart, table");
  eq(g1.children[0].series[0].data, [1, 2], "chart series data 无损");
  eq(g1.children[0].x, ["Jan", "Feb"], "chart x 无损");
  eq(g1.children[1].headers, ["x", "y"], "sheet table columns→headers");

  // ── 容错:未知 kind + 缺字段不抛 ─────────────────────────────
  const weird = fromV31("deck", { meta: {}, slides: [{ kind: "totally-unknown", title: "fallback" }, {}] });
  parseDocument(weird); // 不抛
  eq((weird.blocks[0] as any).type, "prose", "未知 slide kind 降级 prose");
  eq((weird.blocks[0] as any).body, "fallback", "未知 slide 用 title 兜 body");
  assert(weird.meta.density === "high", "缺 density 默认 high");
  assert(weird.meta.defaultMode === "present", "缺 meta 仍 deck→present");

  // ── 确定性:同输入两次全等 ──────────────────────────────────
  eq(fromV31("deck", deck), fromV31("deck", deck), "确定性:同输入两次全等");

  // ── 结构性错误可抛 ──────────────────────────────────────────
  let threw = false;
  try {
    fromV31("doc", null);
  } catch {
    threw = true;
  }
  assert(threw, "null 输入抛错");

  console.log(`\n${failed === 0 ? "✓ ALL PASS" : "✗ FAIL"} — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
