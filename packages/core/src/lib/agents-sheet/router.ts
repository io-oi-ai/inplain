/**
 * agent-sheet · 三路径 router
 *
 *   A · panel-level patch  · "改 kind / 改标题 / 改列绑定"
 *   B · field-level patch  · "Y log scale / 颜色 / sort / format"
 *   C · regenerate         · "重新画 / 按 X 视角"
 *
 * Router 输入:用户 instruction 文本 + 当前 sheet@v3 source (可选 · 没有就强制 C)
 * Router 输出:决策 { path: "A"|"B"|"C", confidence: 0..1 }
 *
 * V25 阶段:用关键字 + heuristic · 不调 LLM (这层决策本身用 LLM 是浪费)
 *           误判时降级到 C (regenerate),用户失望最少
 */

export type RoutePath = "A" | "B" | "C";

export type RouteDecision = {
  path: RoutePath;
  confidence: number;
  reason: string;
};

const FIELD_KEYWORDS = [
  "log scale", "log 轴", "对数轴",
  "颜色", "改色", "换色", "色块",
  "排序", "升序", "降序", "sort",
  "format", "百分号", "美元", "千分位",
  "y 轴", "x 轴", "y轴", "x轴",
  "标题", "副标题",
];

const REGENERATE_KEYWORDS = [
  "重新", "重画", "重做", "重新画", "重新生成", "重新做",
  "换个角度", "按...视角", "按...分组",
  "全部重写", "from scratch", "重构",
  "整个 dashboard", "整份报告",
];

const PANEL_KEYWORDS = [
  "改成", "换成", "变成", "改为",
  "柱状图", "折线图", "饼图", "面积图", "条形图", "散点图", "热力图",
  "table", "bar", "line", "area", "pie", "scatter",
  "big number", "kpi 卡",
];

export function routeInstruction(
  instruction: string,
  hasCurrent: boolean,
): RouteDecision {
  const text = instruction.toLowerCase();

  // 没 current source → 强制 C (regenerate · 实际是 generate)
  if (!hasCurrent) {
    return { path: "C", confidence: 1.0, reason: "no current source · must generate fresh" };
  }

  // 检测"重新画" → C
  for (const kw of REGENERATE_KEYWORDS) {
    if (text.includes(kw)) {
      return { path: "C", confidence: 0.9, reason: `regenerate keyword: "${kw}"` };
    }
  }

  // 检测"字段调整" → B
  for (const kw of FIELD_KEYWORDS) {
    if (text.includes(kw)) {
      return { path: "B", confidence: 0.85, reason: `field keyword: "${kw}"` };
    }
  }

  // 检测"改 panel 类型" → A
  for (const kw of PANEL_KEYWORDS) {
    if (text.includes(kw)) {
      return { path: "A", confidence: 0.85, reason: `panel keyword: "${kw}"` };
    }
  }

  // 没匹配 → 默认 A · 不行再降级 C
  return { path: "A", confidence: 0.3, reason: "no keyword match · default panel-patch" };
}
