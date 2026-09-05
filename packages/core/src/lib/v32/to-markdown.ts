/**
 * V32 Document → Markdown 源。
 *
 * 为什么需要它:Office / PDF 导出链(pptx / docx / xlsx)全都是
 * `marpToDeck(source)` / `mdToDoc(source)` / `sourceToSheet(source)` 起头的,
 * 也就是**只吃 markdown**。而 V32 文档的 `source` 是空的(内容在
 * `content.blocks` 里)→ `/api/export` 直接 400 "kind/format/source required"。
 * 实测:V32 文档导出 .pptx/.docx/.xlsx/.pdf **全部不可用**。
 *
 * 两种补法:
 *   A. 给三个 Office writer 各加一条 V32 入口(重写三套 writer 的输入层)
 *   B. V32 → Markdown,复用已经跑了很久的那条链
 * 选 B:Office 是"降级输出"(CLAUDE.md:.pptx 只是导出格式,不是产物),
 * 降级路径上"结构 + 文字 + 主要视觉可读"就够了,不值得为它维护第二套
 * 渲染分支。而且 markdown 这一跳还顺带把 .md 导出也修好了。
 *
 * ⚠ 有损是**预期行为**,不是缺陷:chart 变成表格、quadrant 变成坐标列表、
 * 动效/媒体嵌入丢失。CLAUDE.md 明确接受降级损耗。
 */
import type { Block, Document, Mark, CardItem } from "./content/schema";

type Kind = "deck" | "doc" | "sheet";

/** 转义表格单元格里的 | */
const cell = (s: string): string => String(s ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ");

function mdTable(headers: string[], rows: string[][]): string {
  if (!headers.length) return "";
  const head = `| ${headers.map(cell).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n");
  return [head, sep, body].filter(Boolean).join("\n");
}

function marksToMd(items: Mark[]): string {
  // 指标组:用表格保住 value/label 的对应关系(列表会把它们揉成一行)
  return mdTable(
    ["指标", "数值", "说明"],
    items.map((m) => [m.label, m.value + (m.delta ? ` (${m.delta})` : ""), m.hint ?? ""]),
  );
}

function cardsToMd(items: CardItem[], numbered: boolean): string {
  return items
    .map((c, i) => {
      const lead = numbered ? `${c.num ?? i + 1}. ` : "- ";
      const head = `**${c.head}**`;
      const metric = c.metric ? ` — ${c.metric}${c.metricLabel ? ` ${c.metricLabel}` : ""}` : "";
      const when = c.when ? ` _(${c.when})_` : "";
      return `${lead}${head}${metric}${when}\n\n   ${c.body}`;
    })
    .join("\n\n");
}

/**
 * 单个 block → markdown 片段。
 * group 递归展开(它只是布局容器,markdown 里没有"并排"概念)。
 */
function blockToMd(b: Block): string {
  switch (b.type) {
    case "cover": {
      const title = [b.display, b.displayTail].filter(Boolean).join(" ");
      return [
        b.kicker ? `_${b.kicker}_` : "",
        `# ${title}`,
        b.lead ?? "",
        b.byline?.length ? b.byline.join(" · ") : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    case "closing": {
      const cta = [b.cta?.primary, b.cta?.secondary]
        .filter(Boolean)
        .map((c) => (c!.href ? `[${c!.label}](${c!.href})` : c!.label))
        .join(" · ");
      return [
        b.kicker ? `_${b.kicker}_` : "",
        `## ${b.display}`,
        b.sub ?? "",
        cta,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    case "statement":
      return [b.bigNumber ? `# ${b.bigNumber}` : "", `**${b.text}**`, b.annotation ?? ""]
        .filter(Boolean)
        .join("\n\n");
    case "heading":
      return `${"#".repeat(b.level)} ${b.text}`;
    case "prose":
      return b.body;
    case "quote":
      return [`> ${b.text.replace(/\n/g, "\n> ")}`, b.attribution ? `> \n> — ${b.attribution}` : ""]
        .filter(Boolean)
        .join("\n");
    case "callout": {
      const label = b.title ?? b.tone.toUpperCase();
      return `> **${label}**\n> \n> ${b.body.replace(/\n/g, "\n> ")}`;
    }
    case "metrics":
      return [b.title ? `### ${b.title}` : "", marksToMd(b.items)].filter(Boolean).join("\n\n");
    case "cards":
      return [
        b.kicker ? `_${b.kicker}_` : "",
        b.title ? `### ${b.title}` : "",
        cardsToMd(b.items, b.layout === "numbered" || b.layout === "steps"),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "sequence":
      return [
        b.kicker ? `_${b.kicker}_` : "",
        b.title ? `### ${b.title}` : "",
        b.items
          .map((it, i) => `${i + 1}. ${it.when ? `**${it.when}** — ` : ""}${it.label}${it.hint ? `\n\n   ${it.hint}` : ""}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "compare":
      // 左右对照 → 两列表格,保住"这两组是对着看的"语义
      return [
        b.title ? `### ${b.title}` : "",
        mdTable(
          [b.left.label, b.right.label],
          Array.from({ length: Math.max(b.left.bullets.length, b.right.bullets.length) }, (_, i) => [
            b.left.bullets[i] ?? "",
            b.right.bullets[i] ?? "",
          ]),
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "quadrant":
      // 四象限没有 markdown 对应物 → 退化成带坐标的表格(信息不丢)
      return [
        `### ${b.xLabel} × ${b.yLabel}`,
        b.quadrantLabels.filter(Boolean).length
          ? `_象限:${b.quadrantLabels.join(" / ")}_`
          : "",
        mdTable(
          [b.xLabel, b.yLabel, "项"],
          b.points.map((p) => [String(p.x), String(p.y), p.label + (p.focal ? " ★" : "")]),
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    case "table":
      return [b.title ? `### ${b.title}` : "", mdTable(b.headers, b.rows)]
        .filter(Boolean)
        .join("\n\n");
    case "chart":
      // 图表 → 数据表格。Office 降级里"数字读得到"比"有个图"更重要。
      return [
        b.title ? `### ${b.title}` : "",
        mdTable(
          ["", ...b.x.map(String)],
          b.series.map((s) => [s.name, ...s.data.map((n) => String(n))]),
        ),
        b.caption ? `_${b.caption}_` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    case "media": {
      const img =
        b.media.kind === "image" && b.media.src ? `![${b.text.title}](${b.media.src})` : "";
      const q = b.media.quote ? `> ${b.media.quote.text}` : "";
      return [
        b.text.kicker ? `_${b.text.kicker}_` : "",
        `### ${b.text.title}`,
        b.text.body ?? "",
        img,
        q,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    case "group":
      return [b.title ? `### ${b.title}` : "", b.children.map(blockToMd).filter(Boolean).join("\n\n")]
        .filter(Boolean)
        .join("\n\n");
    default: {
      // 穷尽检查:加了新 block type 而忘了这里,tsc 会报
      const _never: never = b;
      void _never;
      return "";
    }
  }
}

/**
 * Document → markdown(带 frontmatter)。
 *
 * deck:按 pageBreak 切页,用 Marp 的 `---` 分隔(marpToDeck 就认这个);
 *      一个 pageBreak 都没有时按顶层 block 切,避免所有内容挤在一页。
 * doc / sheet:线性拼接,不切页。
 */
export function documentToMarkdown(doc: Document, kind: Kind): string {
  const fm = [
    "---",
    `plain: ${kind}@v2`,
    `title: ${JSON.stringify(doc.meta.title ?? "")}`,
    ...(doc.meta.author ? [`author: ${JSON.stringify(doc.meta.author)}`] : []),
    ...(doc.meta.date ? [`date: ${JSON.stringify(doc.meta.date)}`] : []),
    ...(doc.meta.description ? [`description: ${JSON.stringify(doc.meta.description)}`] : []),
    "---",
    "",
  ].join("\n");

  const blocks = doc.blocks ?? [];
  if (kind !== "deck") {
    const body = blocks.map(blockToMd).filter(Boolean).join("\n\n");
    return fm + body + "\n";
  }

  // deck:切页
  const hasExplicitBreak = blocks.some((b) => b.pageBreak);
  const pages: string[][] = [];
  for (const b of blocks) {
    const startNew =
      pages.length === 0 || (hasExplicitBreak ? b.pageBreak === true : true);
    if (startNew) pages.push([]);
    pages[pages.length - 1].push(blockToMd(b));
  }
  const body = pages
    .map((p) => p.filter(Boolean).join("\n\n"))
    .filter(Boolean)
    .join("\n\n---\n\n");
  return fm + body + "\n";
}
