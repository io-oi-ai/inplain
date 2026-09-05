import type { DocBlock, DocDoc } from "./types";

/**
 * DocDoc → Markdown 字符串。
 * 保留 block id 作为 HTML 注释，便于往返 parse 时恢复 id。
 */
export function docToMd(doc: DocDoc): string {
  const front: string[] = ["---", `title: ${escapeYaml(doc.title)}`];
  if (doc.author) front.push(`author: ${escapeYaml(doc.author)}`);
  if (doc.date) front.push(`date: ${escapeYaml(doc.date)}`);
  front.push("---", "");

  const body = doc.blocks.map(blockToMd).join("\n\n");
  return front.join("\n") + body + "\n";
}

function blockToMd(b: DocBlock): string {
  const idComment = `<!-- id:${b.id} -->`;
  switch (b.type) {
    case "heading":
      return `${idComment}\n${"#".repeat(b.level)} ${b.text}`;
    case "paragraph":
      return `${idComment}\n${b.text}`;
    case "list": {
      const lines = b.items.map((item, idx) =>
        b.ordered ? `${idx + 1}. ${item}` : `- ${item}`,
      );
      return `${idComment}\n${lines.join("\n")}`;
    }
    case "code":
      return `${idComment}\n\`\`\`${b.language}\n${b.code}\n\`\`\``;
    case "quote":
      return `${idComment}\n${b.text
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`;
  }
}

function escapeYaml(v: string): string {
  if (/[:#\n"']/.test(v)) return JSON.stringify(v);
  return v;
}

/**
 * Markdown → DocDoc（最小解析器）。
 * 识别：frontmatter / id 注释 / heading / list / fenced code / blockquote / 其它作为段落
 */
export function mdToDoc(md: string): DocDoc {
  const { body, front } = stripFrontmatter(md);
  const blocks = parseBlocks(body);
  return {
    kind: "doc",
    title: front.title ?? "Untitled",
    author: front.author,
    date: front.date,
    blocks: blocks.length > 0 ? blocks : [{ type: "paragraph", id: "b1", text: "" }],
  };
}

type FrontMatter = { title?: string; author?: string; date?: string };

function stripFrontmatter(md: string): { body: string; front: FrontMatter } {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { body: md, front: {} };
  const front: FrontMatter = {};
  for (const line of m[1].split("\n")) {
    const pair = line.match(/^\s*([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (!pair) continue;
    const [, key, rawVal] = pair;
    const val = rawVal.startsWith('"') ? tryJsonParse(rawVal) : rawVal;
    if (key === "title" || key === "author" || key === "date") {
      front[key] = val;
    }
  }
  return { body: md.slice(m[0].length), front };
}

function tryJsonParse(s: string): string {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function parseBlocks(body: string): DocBlock[] {
  const lines = body.split("\n");
  const blocks: DocBlock[] = [];
  let i = 0;
  let auto = 1;
  const nextId = (explicit?: string) => explicit ?? `b${auto++}`;

  while (i < lines.length) {
    const line = lines[i];
    // 读 id 注释（若紧跟着下一行，则关联到下一个 block）
    let pendingId: string | undefined;
    const idm = line.match(/^\s*<!--\s*id:([a-zA-Z0-9_-]+)\s*-->\s*$/);
    if (idm) {
      pendingId = idm[1];
      i++;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code block
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const lang = fence[1].trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({
        type: "code",
        id: nextId(pendingId),
        language: lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (h) {
      blocks.push({
        type: "heading",
        id: nextId(pendingId),
        level: h[1].length,
        text: h[2],
      });
      i++;
      continue;
    }

    // blockquote（连续 > 开头行合并为一个 quote block）
    if (/^\s*>/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        qLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", id: nextId(pendingId), text: qLines.join("\n") });
      continue;
    }

    // list（连续 - / * / N. 开头行合并）
    const liUnordered = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    const liOrdered = line.match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (liUnordered || liOrdered) {
      const ordered = !!liOrdered;
      const items: string[] = [];
      while (i < lines.length) {
        const lu = lines[i].match(/^\s*[-*]\s+(.+?)\s*$/);
        const lo = lines[i].match(/^\s*\d+\.\s+(.+?)\s*$/);
        if (ordered && lo) items.push(lo[1]);
        else if (!ordered && lu) items.push(lu[1]);
        else break;
        i++;
      }
      blocks.push({
        type: "list",
        id: nextId(pendingId),
        ordered,
        items,
      });
      continue;
    }

    // 段落：累积直到空行
    const pLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      pLines.push(lines[i]);
      i++;
    }
    blocks.push({
      type: "paragraph",
      id: nextId(pendingId),
      text: pLines.join("\n"),
    });
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    /^```/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*[-*]\s/.test(line) ||
    /^\s*\d+\.\s/.test(line) ||
    /^\s*<!--\s*id:/.test(line)
  );
}
