import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
} from "docx";
import type { DocDoc } from "@/lib/agents/types";

/**
 * DocDoc → DOCX buffer（纯 JS，无 native deps）。
 * block 映射：
 * - heading(1..6) → Paragraph heading_1..6
 * - paragraph → Paragraph（text 作为单 Run，保留 markdown 文本但不再内联解析）
 * - list → 一串 Paragraph，带 bullet/numbering
 * - code → Paragraph 等宽字体（Consolas）
 * - quote → Paragraph 斜体缩进
 */
export async function docDocToDocx(doc: DocDoc): Promise<Uint8Array> {
  const paragraphs: Paragraph[] = [];

  // 首段作为标题（从 frontmatter title 取，若已有 h1 heading 会显得重复但 DOCX 不造成问题）
  paragraphs.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
    }),
  );
  if (doc.author || doc.date) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [doc.author, doc.date].filter(Boolean).join(" · "),
            italics: true,
            color: "666666",
          }),
        ],
        spacing: { after: 400 },
      }),
    );
  }

  for (const b of doc.blocks) {
    switch (b.type) {
      case "heading": {
        const levels = [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6,
        ];
        paragraphs.push(
          new Paragraph({
            text: b.text,
            heading: levels[Math.max(0, Math.min(5, b.level - 1))],
            spacing: { before: 240, after: 120 },
          }),
        );
        break;
      }
      case "paragraph":
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: b.text })],
            spacing: { after: 120 },
          }),
        );
        break;
      case "list":
        for (const item of b.items) {
          paragraphs.push(
            new Paragraph({
              text: item,
              bullet: b.ordered ? undefined : { level: 0 },
              numbering: b.ordered ? { reference: "ordered-list", level: 0 } : undefined,
              spacing: { after: 60 },
            }),
          );
        }
        break;
      case "code":
        for (const line of b.code.split("\n")) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: line, font: "Consolas", size: 20 }),
              ],
              shading: { type: "clear", fill: "F5F5F5", color: "auto" },
              spacing: { after: 0 },
            }),
          );
        }
        paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        break;
      case "quote":
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: b.text, italics: true })],
            alignment: AlignmentType.LEFT,
            indent: { left: 480 },
            spacing: { after: 120 },
          }),
        );
        break;
    }
  }

  const file = new Document({
    title: doc.title,
    creator: doc.author ?? "Plain",
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });

  // Packer.toBlob 跨 runtime 安全（Node + Workers），返回 Blob
  const blob = await Packer.toBlob(file);
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}
