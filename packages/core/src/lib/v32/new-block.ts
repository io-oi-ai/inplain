/**
 * V32 · 块工厂 —— 给定 type 造一个**合法的**默认块。
 *
 * 三个入口共用一份:iframe 里的悬浮「+」、块拖拽后的插入、chat 的 `/` 斜杠命令。
 * 不共用的话每个入口都要各自记一遍"chart 的必填字段是什么",迟早写歪。
 *
 * 铁律:返回值必须能过 DocumentSchema。所以**必填字段一律给占位值**
 * (schema 里 `z.string()` 而非 StringOpt 的那些),空数组能过的就给空数组
 * —— 让用户看到一个"空但结构完整"的块,而不是一个校验不过的半成品。
 *
 * 占位文案走 i18n 由调用方传入(labels),这里不 import next-intl:
 * 这个模块要能在 server(patch route)和 client(选择器)两侧都跑。
 */
import { nanoid } from "nanoid";
import type { Block, BlockType } from "./content/schema";

/** 可被用户手动插入的块 —— 顺序即选择器里的展示顺序 */
export const INSERTABLE_BLOCK_TYPES: BlockType[] = [
  "heading",
  "prose",
  "callout",
  "quote",
  "statement",
  "metrics",
  "table",
  "chart",
  "cards",
  "sequence",
  "compare",
  "quadrant",
  "media",
  "group",
  // cover / closing 不放进来:它们是文档首尾的版式块,随手插一个在中间没有意义
];

/** 占位文案 —— 调用方传 i18n 后的字符串,缺省用中性英文(server 侧兜底) */
export type NewBlockLabels = {
  heading?: string;
  prose?: string;
  quoteText?: string;
  calloutBody?: string;
  statementText?: string;
  metricLabel?: string;
  cardHead?: string;
  cardBody?: string;
  seqLabel?: string;
  compareLeft?: string;
  compareRight?: string;
  bullet?: string;
  tableCol?: string;
  chartTitle?: string;
  mediaTitle?: string;
  groupTitle?: string;
};

const D: Required<NewBlockLabels> = {
  heading: "New heading",
  prose: "Write something…",
  quoteText: "Quote text",
  calloutBody: "Callout body",
  statementText: "A statement worth its own screen",
  metricLabel: "Metric",
  cardHead: "Card title",
  cardBody: "Card body",
  seqLabel: "Step",
  compareLeft: "Option A",
  compareRight: "Option B",
  bullet: "Point",
  tableCol: "Column",
  chartTitle: "Chart",
  mediaTitle: "Media title",
  groupTitle: "Group",
};

/**
 * 造一个新块。id 用 nanoid(与生成侧一致 · patch 按 id 定位)。
 * 未知 type 一律回落 prose —— 宁可插一个能编辑的文本块,也不要抛错打断用户操作。
 */
export function newBlock(type: BlockType, labels: NewBlockLabels = {}): Block {
  const t = { ...D, ...labels };
  const id = nanoid(8);

  switch (type) {
    case "heading":
      return { id, type: "heading", level: 2, text: t.heading };
    case "prose":
      return { id, type: "prose", body: t.prose };
    case "callout":
      return { id, type: "callout", tone: "info", body: t.calloutBody };
    case "quote":
      return { id, type: "quote", text: t.quoteText };
    case "statement":
      return { id, type: "statement", text: t.statementText };
    case "metrics":
      return { id, type: "metrics", items: [{ value: "—", label: t.metricLabel }] };
    case "table":
      return {
        id,
        type: "table",
        headers: [`${t.tableCol} 1`, `${t.tableCol} 2`],
        rows: [["", ""]],
      };
    case "chart":
      // x 长度必须等于每个 series.data 长度(schema 之外的不变式,渲染器会用)
      return {
        id,
        type: "chart",
        variant: "bar",
        title: t.chartTitle,
        x: ["A", "B", "C"],
        series: [{ name: t.chartTitle, data: [0, 0, 0] }],
      };
    case "cards":
      return {
        id,
        type: "cards",
        layout: "grid",
        items: [{ head: t.cardHead, body: t.cardBody }],
      };
    case "sequence":
      return { id, type: "sequence", flow: "time", items: [{ label: t.seqLabel }] };
    case "compare":
      return {
        id,
        type: "compare",
        left: { label: t.compareLeft, bullets: [t.bullet] },
        right: { label: t.compareRight, bullets: [t.bullet] },
      };
    case "quadrant":
      return {
        id,
        type: "quadrant",
        xLabel: "X",
        yLabel: "Y",
        quadrantLabels: ["A", "B", "C", "D"],
        points: [],
      };
    case "media":
      return {
        id,
        type: "media",
        text: { title: t.mediaTitle },
        media: { kind: "image" },
        side: "left",
      };
    case "group":
      return { id, type: "group", layout: "stack", title: t.groupTitle, children: [] };
    case "cover":
      return { id, type: "cover", display: t.heading };
    case "closing":
      return { id, type: "closing", display: t.heading };
    default:
      // 未知 type 回落成可编辑文本块(别让用户的插入操作因为 type 拼错而失败)
      return { id, type: "prose", body: t.prose };
  }
}
