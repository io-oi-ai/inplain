/**
 * Plain DSL v2 · Serializer
 *
 * AI 输出结构化 DeckDocV2 / DocDocV2 / SheetDocV2 → 这里转成文本 .md/.csv,
 * 让 render-v2 / share / showcase / export 都能消费同一份文本源。
 *
 * 反过来,parse-dsl 也能 round-trip 把这些文本回构成结构(loose,够 share 用)。
 */
import type {
  DeckDocV2,
  DeckSection,
  DocDocV2,
  DocBlock,
  SheetDocV2,
  SheetSection,
} from "./schemas";

// ─────────────────────────────────────────────
// Deck → .md
// ─────────────────────────────────────────────

export function serializeDeck(doc: DeckDocV2): string {
  const parts: string[] = [];
  parts.push(serializeFrontmatter({
    plain: "deck@v2",
    theme: doc.theme,
    title: doc.title,
    author: doc.author,
    date: doc.date,
    description: doc.description,
  }));
  parts.push("");
  for (const s of doc.sections) {
    parts.push(serializeDeckSection(s));
    parts.push("");
  }
  return parts.join("\n").trim() + "\n";
}

function serializeDeckSection(s: DeckSection): string {
  const lines: string[] = [`::: ${s.kind}`];
  switch (s.kind) {
    case "cover":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      lines.push(`display: ${yamlString(s.display)}`);
      if (s.displayTail) lines.push(`display-tail: ${yamlString(s.displayTail)}`);
      if (s.lead) lines.push(`lead: ${yamlString(s.lead)}`);
      if (s.byline?.length) {
        lines.push(`byline:`);
        for (const b of s.byline) lines.push(`  - ${yamlString(b)}`);
      }
      break;
    case "hero-question":
      if (s.bigNumber) lines.push(`big-number: ${yamlString(s.bigNumber)}`);
      lines.push(`question: ${yamlString(s.question)}`);
      if (s.annotation) lines.push(`annotation: ${yamlString(s.annotation)}`);
      break;
    case "stats":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      lines.push(`items:`);
      for (const it of s.items) {
        lines.push(`  - value: ${yamlString(it.value)}`);
        lines.push(`    label: ${yamlString(it.label)}`);
        if (it.hint) lines.push(`    hint: ${yamlString(it.hint)}`);
      }
      break;
    case "diagnosis":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      lines.push(`items:`);
      for (const it of s.items) {
        lines.push(`  - num: ${yamlString(it.num)}`);
        lines.push(`    head: ${yamlString(it.head)}`);
        lines.push(`    body: ${yamlString(it.body)}`);
        if (it.metric) lines.push(`    metric: ${yamlString(it.metric)}`);
        if (it.metricLabel) lines.push(`    metric-label: ${yamlString(it.metricLabel)}`);
      }
      break;
    case "pull-quote":
      lines.push(`text: ${yamlString(s.text)}`);
      if (s.attribution) lines.push(`attribution: ${yamlString(s.attribution)}`);
      break;
    case "proposal":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      if (s.lead) lines.push(`lead: ${yamlString(s.lead)}`);
      lines.push(`steps:`);
      for (const it of s.steps) {
        lines.push(`  - head: ${yamlString(it.head)}`);
        lines.push(`    body: ${yamlString(it.body)}`);
        if (it.when) lines.push(`    when: ${yamlString(it.when)}`);
      }
      break;
    case "features":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      lines.push(`items:`);
      for (const it of s.items) {
        const head = `head: ${yamlString(it.head)}`;
        if (it.num) {
          lines.push(`  - num: ${yamlString(it.num)}`);
          lines.push(`    ${head}`);
        } else {
          lines.push(`  - ${head}`);
        }
        lines.push(`    body: ${yamlString(it.body)}`);
      }
      break;
    case "timeline":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      lines.push(`weeks:`);
      for (const w of s.weeks) {
        lines.push(`  - when: ${yamlString(w.when)}`);
        lines.push(`    head: ${yamlString(w.head)}`);
        if (w.bullets?.length) {
          lines.push(`    bullets: [${w.bullets.map(yamlString).join(", ")}]`);
        }
      }
      break;
    case "closing":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      lines.push(`display: ${yamlString(s.display)}`);
      if (s.sub) lines.push(`sub: ${yamlString(s.sub)}`);
      if (s.cta?.primary || s.cta?.secondary) {
        lines.push(`cta:`);
        if (s.cta.primary) {
          lines.push(`  primary: { label: ${yamlString(s.cta.primary.label)}, href: ${yamlString(s.cta.primary.href)} }`);
        }
        if (s.cta.secondary) {
          lines.push(`  secondary: { label: ${yamlString(s.cta.secondary.label)}, href: ${yamlString(s.cta.secondary.href)} }`);
        }
      }
      break;
    case "image":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      lines.push(`src: ${yamlString(s.src)}`);
      if (s.alt) lines.push(`alt: ${yamlString(s.alt)}`);
      if (s.caption) lines.push(`caption: ${yamlString(s.caption)}`);
      if (s.mode && s.mode !== "cover") lines.push(`mode: ${s.mode}`);
      break;
    case "gallery":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      if (s.title) lines.push(`title: ${yamlString(s.title)}`);
      lines.push(`items:`);
      for (const it of s.items) {
        lines.push(`  - src: ${yamlString(it.src)}`);
        if (it.alt) lines.push(`    alt: ${yamlString(it.alt)}`);
        if (it.caption) lines.push(`    caption: ${yamlString(it.caption)}`);
      }
      break;
    case "media-split":
      if (s.kicker) lines.push(`kicker: ${yamlString(s.kicker)}`);
      lines.push(`src: ${yamlString(s.src)}`);
      if (s.alt) lines.push(`alt: ${yamlString(s.alt)}`);
      lines.push(`title: ${yamlString(s.title)}`);
      if (s.body) lines.push(`body: ${yamlString(s.body)}`);
      if (s.bullets && s.bullets.length > 0) {
        lines.push(`bullets:`);
        s.bullets.forEach((b: string) => lines.push(`  - ${yamlString(b)}`));
      }
      if (s.side && s.side !== "left") lines.push(`side: ${s.side}`);
      break;
  }
  // V19 · 演讲模式 speakerNotes(可选 · 不在网页正文显示,只 present mode 浮窗用)
  if ("speakerNotes" in s && s.speakerNotes) {
    lines.push(`speaker-notes: ${yamlString(s.speakerNotes)}`);
  }
  lines.push(":::");
  return lines.join("\n");
}

// ─────────────────────────────────────────────
// Doc → .md
// ─────────────────────────────────────────────

export function serializeDoc(doc: DocDocV2): string {
  const parts: string[] = [];
  parts.push(serializeFrontmatter({
    plain: "doc@v2",
    theme: doc.theme,
    title: doc.title,
    author: doc.author,
    date: doc.date,
    description: doc.description,
  }));
  parts.push("");
  for (const b of doc.blocks) {
    parts.push(serializeDocBlock(b));
    parts.push("");
  }
  return parts.join("\n").trim() + "\n";
}

function serializeDocBlock(b: DocBlock): string {
  switch (b.kind) {
    case "md":
      return b.text;
    case "callout":
      return `::: callout ${b.variant}\n${b.body}\n:::`;
    case "hero": {
      const ls = [`::: hero`];
      if (b.kicker) ls.push(`kicker: ${yamlString(b.kicker)}`);
      ls.push(`title: ${yamlString(b.title)}`);
      if (b.displayTail) ls.push(`display-tail: ${yamlString(b.displayTail)}`);
      if (b.deck) ls.push(`deck: ${yamlString(b.deck)}`);
      if (b.meta?.length) {
        ls.push(`meta:`);
        for (const m of b.meta) ls.push(`  - ${yamlString(m)}`);
      }
      ls.push(`:::`);
      return ls.join("\n");
    }
    case "flow": {
      const ls = [`::: flow`];
      if (b.caption) ls.push(`caption: ${yamlString(b.caption)}`);
      ls.push(`nodes:`);
      for (const n of b.nodes) {
        const head = `head: ${yamlString(n.head)}`;
        if (n.label) {
          ls.push(`  - label: ${yamlString(n.label)}`);
          ls.push(`    ${head}`);
        } else {
          ls.push(`  - ${head}`);
        }
        if (n.body) ls.push(`    body: ${yamlString(n.body)}`);
        if (n.tone) ls.push(`    tone: ${n.tone}`);
      }
      ls.push(`:::`);
      return ls.join("\n");
    }
    case "data-block": {
      const ls = [`::: data-block`];
      if (b.title) ls.push(`title: ${yamlString(b.title)}`);
      ls.push(`headline: ${yamlString(b.headline)}`);
      ls.push(`bars:`);
      for (const bar of b.bars) {
        ls.push(`  - label: ${yamlString(bar.label)}`);
        ls.push(`    value: ${bar.value}`);
        if (bar.display) ls.push(`    display: ${yamlString(bar.display)}`);
        if (bar.tone) ls.push(`    tone: ${bar.tone}`);
      }
      if (b.note) ls.push(`note: ${yamlString(b.note)}`);
      ls.push(`:::`);
      return ls.join("\n");
    }
    case "numbered": {
      const ls = [`::: numbered`];
      ls.push(`items:`);
      for (const it of b.items) {
        ls.push(`  - head: ${yamlString(it.head)}`);
        ls.push(`    body: ${yamlString(it.body)}`);
      }
      ls.push(`:::`);
      return ls.join("\n");
    }
    case "pull-quote": {
      const ls = [`::: pull-quote`];
      ls.push(`text: ${yamlString(b.text)}`);
      if (b.attribution) ls.push(`attribution: ${yamlString(b.attribution)}`);
      ls.push(`:::`);
      return ls.join("\n");
    }
  }
}

// ─────────────────────────────────────────────
// Sheet → .md
// ─────────────────────────────────────────────

export function serializeSheet(doc: SheetDocV2): string {
  const parts: string[] = [];
  parts.push(serializeFrontmatter({
    plain: "sheet@v2",
    theme: doc.theme,
    title: doc.title,
    author: doc.author,
    date: doc.date,
    description: doc.description,
    "data-source": doc.dataSource,
  }));
  parts.push("");
  for (const s of doc.sections) {
    parts.push(serializeSheetSection(s));
    parts.push("");
  }
  return parts.join("\n").trim() + "\n";
}

function serializeSheetSection(s: SheetSection): string {
  if (s.kind === "dashboard-header") {
    const ls = [`::: dashboard-header`];
    if (s.kicker) ls.push(`kicker: ${yamlString(s.kicker)}`);
    ls.push(`title: ${yamlString(s.title)}`);
    if (s.description) ls.push(`description: ${yamlString(s.description)}`);
    if (s.author) ls.push(`author: ${yamlString(s.author)}`);
    if (s.updated) ls.push(`updated: ${yamlString(s.updated)}`);
    if (s.tags?.length) ls.push(`tags: [${s.tags.map(yamlString).join(", ")}]`);
    ls.push(`:::`);
    return ls.join("\n");
  }
  if (s.kind === "kpis") {
    const ls = [`::: kpis`];
    for (const it of s.items) {
      ls.push(`- value: ${yamlString(it.value)}`);
      ls.push(`  label: ${yamlString(it.label)}`);
      if (it.delta) ls.push(`  delta: ${yamlString(it.delta)}`);
      if (it.trend) ls.push(`  trend: ${it.trend}`);
    }
    ls.push(`:::`);
    return ls.join("\n");
  }
  if (s.kind === "insight") {
    return `::: insight\nlabel: ${yamlString(s.label)}\nheadline: ${yamlString(s.headline)}\nbody: |\n${indentBlock(s.body, 2)}\n:::`;
  }
  if (s.kind === "closing") {
    return `::: closing\nkicker: ${yamlString(s.kicker)}\ntitle: ${yamlString(s.title)}\nbody: |\n${indentBlock(s.body, 2)}\n:::`;
  }
  if (s.kind === "param-switcher") {
    const ls = [`::: param-switcher`, `id: ${yamlString(s.id)}`];
    if (s.label) ls.push(`label: ${yamlString(s.label)}`);
    ls.push(`options: [${s.options.map(yamlString).join(", ")}]`);
    ls.push(`:::`);
    return ls.join("\n");
  }
  // panel
  const ls = [`::: panel ${s.variant}`];
  ls.push(`title: ${yamlString(s.title)}`);
  if ("subtitle" in s && s.subtitle) ls.push(`subtitle: ${yamlString(s.subtitle)}`);
  if ("span" in s && typeof s.span === "number") ls.push(`span: ${s.span}`);
  if ("when" in s && typeof s.when === "string" && s.when) ls.push(`when: ${yamlString(s.when)}`);
  switch (s.variant) {
    case "ranking":
      ls.push(`items:`);
      for (const it of s.items) {
        ls.push(`  - rank: ${yamlString(it.rank)}`);
        ls.push(`    label: ${yamlString(it.label)}`);
        if (it.sub) ls.push(`    sub: ${yamlString(it.sub)}`);
        ls.push(`    metric: ${yamlString(it.metric)}`);
        if (it.metricSub) ls.push(`    metric-sub: ${yamlString(it.metricSub)}`);
        if (it.tone) ls.push(`    tone: ${it.tone}`);
      }
      break;
    case "table":
      ls.push(`source: ${yamlString(s.source)}`);
      if (s.sort) ls.push(`sort: ${yamlString(s.sort)}`);
      if (s.limit != null) ls.push(`limit: ${s.limit}`);
      if (s.searchable) ls.push(`searchable: true`);
      if (s.pageSize != null) ls.push(`pageSize: ${s.pageSize}`);
      ls.push(`columns:`);
      for (const c of s.columns) {
        if (typeof c === "string") {
          ls.push(`  - ${c}`);
        } else {
          ls.push(`  - { key: ${c.key}, label: ${yamlString(c.label)}${
            c.format ? `, format: ${c.format}` : ""
          }${c.bar ? `, bar: true` : ""} }`);
        }
      }
      break;
    case "area-chart":
      ls.push(`data: |`);
      ls.push(indentBlock(s.data, 2));
      if (s.yLabel) ls.push(`y-label: ${yamlString(s.yLabel)}`);
      break;
    case "bar-stack":
      ls.push(`data: |`);
      ls.push(indentBlock(s.data, 2));
      break;
    case "sql":
      ls.push(`language: ${s.language}`);
      ls.push(`body: |`);
      ls.push(indentBlock(s.body, 2));
      if (s.stats) ls.push(`stats: ${yamlString(s.stats)}`);
      break;
    default: {
      // line-chart / scatter / heatmap / pie / funnel / mixed-chart / cohort /
      // sankey / lifecycle / big-number 等:统一写 data + 常见可选字段
      const sd = s as Record<string, unknown>;
      if (typeof sd.data === "string") {
        ls.push(`data: |`);
        ls.push(indentBlock(sd.data, 2));
      }
      const passKeys: Array<[string, string]> = [
        ["yLabel", "yLabel"], ["yLabelRight", "yLabelRight"], ["xLabel", "xLabel"],
        ["yFormat", "yFormat"], ["yFormatRight", "yFormatRight"], ["xFormat", "xFormat"],
        ["valueFormat", "valueFormat"], ["hole", "hole"], ["logScale", "logScale"],
        ["stack", "stack"], ["showConversion", "showConversion"],
        ["value", "value"], ["format", "format"], ["comparison", "comparison"],
        ["comparisonLabel", "comparisonLabel"], ["series", "series"],
      ];
      for (const [k, out] of passKeys) {
        const v = sd[k];
        if (v == null) continue;
        if (typeof v === "string") ls.push(`${out}: ${yamlString(v)}`);
        else if (typeof v === "number" || typeof v === "boolean") ls.push(`${out}: ${v}`);
        else if (typeof v === "object") ls.push(`${out}: ${JSON.stringify(v)}`);
      }
      break;
    }
  }
  ls.push(`:::`);
  return ls.join("\n");
}

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

function serializeFrontmatter(obj: Record<string, string | undefined>): string {
  const ls: string[] = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    ls.push(`${k}: ${yamlString(String(v))}`);
  }
  ls.push("---");
  return ls.join("\n");
}

function yamlString(s: string): string {
  // V22-F · 白名单扩到包含 @ . : /,这样 `deck@v2` / `2026.05` / `https://...`
  // 这些常见 frontmatter 值都不会被无谓加引号(否则 isV2 嗅探正则会失配)。
  // 仍保留"数字/bool/null 必引号"的 YAML 规则。
  if (/^[a-zA-Z0-9一-龥_\-+@.:/]+$/.test(s)) return s;
  // 数字 / bool 需要引号(防被 YAML 解读成 number/boolean)
  if (/^-?\d+(\.\d+)?$/.test(s) || s === "true" || s === "false" || s === "null") {
    return `"${s}"`;
  }
  // 其它情况:双引号包,内部转义
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function indentBlock(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}
