/**
 * V32 · Document 语义校验(zod 之上的一层)
 *
 * zod(DocumentSchema)保证结构/类型合法;本层查 zod 抓不到的**语义/内容**问题:
 * 重复 id、空必填内容、chart/table 行列错配、quadrant 越界、media 缺 src、group 空/过深。
 *
 * 借鉴 Bento `window.bento.validate()` 的思路(见 memory reference_bento_competitor):
 * agent 生成后拿到 warnings 就能自纠,不必等真实渲染才发现问题。
 *
 * 纯函数,无 runtime 依赖 —— CLI / MCP / web route 都能复用。
 */
import type { Document, Block, GroupBlock } from "./schema";

export type Severity = "error" | "warn";

export interface Warning {
  /** error = 大概率渲染坏 / patch 会错;warn = 能渲染但内容可疑 */
  severity: Severity;
  /** 出问题的 block id(顶层问题为 "$doc") */
  blockId: string;
  /** 短代码,便于 agent 分类处理 */
  code: string;
  /** 人类可读说明 */
  message: string;
}

const MAX_GROUP_DEPTH = 3;

function isGroup(b: Block): b is GroupBlock {
  return b.type === "group";
}

/** 递归遍历所有块(含 group.children),depth 从 0 起 */
function walk(blocks: Block[], depth: number, visit: (b: Block, depth: number) => void): void {
  for (const b of blocks) {
    visit(b, depth);
    if (isGroup(b)) walk(b.children, depth + 1, visit);
  }
}

function blank(s: unknown): boolean {
  return typeof s !== "string" || s.trim().length === 0;
}

/**
 * 校验一份 Document,返回 warnings(空数组 = 干净)。
 * 已假定 doc 通过了 DocumentSchema.parse(结构合法);这里只查语义。
 */
export function validateDocument(doc: Document): Warning[] {
  const out: Warning[] = [];
  const push = (severity: Severity, blockId: string, code: string, message: string) =>
    out.push({ severity, blockId, code, message });

  // ── 顶层 ──
  if (blank(doc.meta.title)) push("warn", "$doc", "empty-title", "meta.title 为空");
  if (doc.blocks.length === 0) push("error", "$doc", "no-blocks", "文档没有任何 block");

  // ── id 唯一性(全局,含 group 内)· patch 靠 id 定位,重复必出错 ──
  const seen = new Map<string, number>();
  walk(doc.blocks, 0, (b) => {
    seen.set(b.id, (seen.get(b.id) ?? 0) + 1);
    if (blank(b.id)) push("error", b.id || "$unknown", "empty-id", "block.id 为空");
  });
  for (const [id, n] of seen) {
    if (n > 1) push("error", id, "duplicate-id", `block id "${id}" 出现 ${n} 次(patch 会定位错块)`);
  }

  // ── 逐块语义 ──
  walk(doc.blocks, 0, (b, depth) => {
    // group:深度 + 空 children
    if (isGroup(b)) {
      if (b.children.length === 0) push("warn", b.id, "empty-group", "group 没有子块");
      if (depth >= MAX_GROUP_DEPTH)
        push("warn", b.id, "deep-group", `group 嵌套深度 ${depth} ≥ ${MAX_GROUP_DEPTH}(渲染可能拥挤)`);
      return;
    }

    switch (b.type) {
      case "cover":
      case "closing":
        if (blank(b.display)) push("warn", b.id, "empty-display", `${b.type} 的 display 为空`);
        break;
      case "statement":
      case "prose":
      case "quote":
        if (blank((b as { text?: string; body?: string }).text ?? (b as { body?: string }).body))
          push("warn", b.id, "empty-text", `${b.type} 内容为空`);
        break;
      case "heading":
        if (blank(b.text)) push("warn", b.id, "empty-text", "heading 文本为空");
        break;
      case "callout":
        if (blank(b.body)) push("warn", b.id, "empty-text", "callout body 为空");
        break;
      case "metrics":
        if (b.items.length === 0) push("warn", b.id, "empty-items", "metrics 没有指标项");
        break;
      case "cards":
        if (b.items.length === 0) push("warn", b.id, "empty-items", "cards 没有卡片项");
        break;
      case "sequence":
        if (b.items.length === 0) push("warn", b.id, "empty-items", "sequence 没有步骤项");
        break;
      case "table": {
        if (b.headers.length === 0) push("warn", b.id, "empty-table", "table 没有表头");
        const cols = b.headers.length;
        b.rows.forEach((row, i) => {
          if (cols > 0 && row.length !== cols)
            push(
              "error",
              b.id,
              "table-shape",
              `table 第 ${i + 1} 行有 ${row.length} 列,表头有 ${cols} 列(错位)`,
            );
        });
        break;
      }
      case "chart": {
        const xLen = b.x.length;
        if (xLen === 0) push("warn", b.id, "empty-chart", "chart 没有 x 轴数据");
        if (b.series.length === 0) push("warn", b.id, "empty-chart", "chart 没有 series");
        // pie/scatter 的 data 长度语义不同,只对折线/柱状类严格查等长
        const strictLenVariants = new Set(["line", "bar", "area", "bar-stack"]);
        if (strictLenVariants.has(b.variant)) {
          b.series.forEach((s) => {
            if (xLen > 0 && s.data.length !== xLen)
              push(
                "error",
                b.id,
                "chart-shape",
                `chart series "${s.name}" 有 ${s.data.length} 个点,x 轴有 ${xLen} 个(长度不匹配)`,
              );
          });
        }
        break;
      }
      case "quadrant": {
        b.points.forEach((p) => {
          if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)
            push(
              "warn",
              b.id,
              "quadrant-range",
              `quadrant 点 "${p.label}" 坐标(${p.x},${p.y})不在 [0,1](多数模板按 0-1 定位)`,
            );
        });
        break;
      }
      case "media": {
        if (b.media.kind === "image" && blank(b.media.src))
          push("warn", b.id, "media-no-src", "media(image)没有 src");
        if (b.media.kind === "quote" && !b.media.quote)
          push("warn", b.id, "media-no-quote", "media(quote)没有 quote 内容");
        break;
      }
    }
  });

  return out;
}

/** 便捷:只要有 error 就返回 true(agent 可据此决定是否重试) */
export function hasErrors(warnings: Warning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}

/** 便捷:格式化成人类可读多行文本(CLI 打印 / MCP 返回) */
export function formatWarnings(warnings: Warning[]): string {
  if (warnings.length === 0) return "✓ no issues";
  return warnings
    .map((w) => `${w.severity === "error" ? "✗" : "⚠"} [${w.code}] ${w.blockId}: ${w.message}`)
    .join("\n");
}
