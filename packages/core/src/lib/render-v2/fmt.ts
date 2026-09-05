/**
 * V24-A · 统一数字 / 日期格式化
 *
 * 借鉴 Dune Excel-style fmt code + Evidence.dev fmt name 的混合
 * (Dune `0,0.00 / 0.0a` Excel 风,Evidence `usd0 / pct1` 名字风)。
 *
 * 用法:`fmt(1234567, "usd0")` → "$1,234,567"
 * 用法:`fmt(0.0823, "pct1")` → "8.2%"
 * 用法:`fmt(1234567, "0.0a")` → "1.2M"
 *
 * 设计原则:
 * - SSR-safe(纯 Intl.NumberFormat,无 DOM 依赖)
 * - 失败兜底:无效输入返回原字符串,不抛
 * - 未知 fmt token 返回 Intl 默认 locale 数字
 *
 * 不做:
 * - 不抄 Excel 完整 token 体系(Plain 是 chat-driven,不需要表格内格式刷)
 * - 不接 i18n locale 切换(Plain 用户场景默认 en-US;中文 deck 走 zh-CN 但
 *   数字依然 en-US,商业惯例)
 */

const NUM_LOCALE = "en-US";

/** 已支持的 fmt token。新加 token 时更新这里 + format() switch 即可。 */
export type FmtToken =
  | "text"        // 原文,不做处理(配合 number column 时强制走字符串)
  | "num"         // 1234567 → 1,234,567
  | "num0"        // 1234567 → 1,234,567(无小数,显式)
  | "num1"        // 1234567 → 1,234,567.1
  | "num2"        // 1234567 → 1,234,567.12
  | "usd"         // 1234567 → $1,234,567.00
  | "usd0"        // 1234567 → $1,234,567
  | "usd2"        // 1234567 → $1,234,567.00
  | "pct"         // 0.0823 → 8%
  | "pct0"        // 0.0823 → 8%
  | "pct1"        // 0.0823 → 8.2%
  | "pct2"        // 0.0823 → 8.23%
  | "0.0a"        // 1234567 → 1.2M
  | "0a"          // 1234567 → 1M
  | "0.00a"       // 1234567 → 1.23M
  | "date"        // 2026-05-22 → May 22, 2026
  | "date:YYYY"   // 2026-05-22 → 2026
  | "date:YYYY-MM"// 2026-05-22 → 2026-05
  | "date:MMM-YY";// 2026-05-22 → May-26

/** 用户在 schema 里写 string,我们运行时转成 FmtToken;不识别就当 "num"。 */
export function normalizeFmt(raw: string | undefined): FmtToken {
  if (!raw) return "num";
  // 兼容 Dune 风原码:0,0.00 → num2;0.0a → 0.0a 不变;$0,0 → usd0
  const r = raw.trim().toLowerCase();
  // 直接匹配
  if (
    r === "text" || r === "num" || r === "num0" || r === "num1" || r === "num2" ||
    r === "usd" || r === "usd0" || r === "usd2" ||
    r === "pct" || r === "pct0" || r === "pct1" || r === "pct2" ||
    r === "0.0a" || r === "0a" || r === "0.00a" ||
    r === "date" || r === "date:yyyy" || r === "date:yyyy-mm" || r === "date:mmm-yy"
  ) {
    return r as FmtToken;
  }
  // Dune Excel 风兼容
  if (r === "0,0" || r === "#,##0") return "num0";
  if (r === "0,0.0" || r === "#,##0.0") return "num1";
  if (r === "0,0.00" || r === "#,##0.00") return "num2";
  if (r === "$0,0" || r === "$#,##0") return "usd0";
  if (r === "$0,0.00" || r === "$#,##0.00") return "usd2";
  if (r === "0%" || r === "0.0%") return "pct1";
  if (r === "0.00%") return "pct2";
  return "num";
}

/** 主 format 函数。 */
export function fmt(value: unknown, token?: string | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const tok = normalizeFmt(token);
  if (tok === "text") return String(value);

  if (tok.startsWith("date")) {
    return formatDate(value, tok);
  }

  // 数字类 — 解析失败回退到字符串
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return String(value);

  switch (tok) {
    case "num":
    case "num0":
      return numFmt(n, 0);
    case "num1":
      return numFmt(n, 1);
    case "num2":
      return numFmt(n, 2);
    case "usd":
    case "usd0":
      return currencyFmt(n, 0);
    case "usd2":
      return currencyFmt(n, 2);
    case "pct":
    case "pct0":
      return pctFmt(n, 0);
    case "pct1":
      return pctFmt(n, 1);
    case "pct2":
      return pctFmt(n, 2);
    case "0a":
      return abbrevFmt(n, 0);
    case "0.0a":
      return abbrevFmt(n, 1);
    case "0.00a":
      return abbrevFmt(n, 2);
    default:
      return numFmt(n, 0);
  }
}

// ─── internal helpers ────────────────────────────────────────

function numFmt(n: number, digits: number): string {
  return new Intl.NumberFormat(NUM_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

function currencyFmt(n: number, digits: number): string {
  return new Intl.NumberFormat(NUM_LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

function pctFmt(n: number, digits: number): string {
  return new Intl.NumberFormat(NUM_LOCALE, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/**
 * K / M / B / T 缩写。
 * - 1234 → 1.2K
 * - 1234567 → 1.2M
 * - 1234567890 → 1.2B
 * - 1.23e12 → 1.2T
 *
 * Dune 招牌 `0.0a` 就是这个。Intl 用 compact notation 实现。
 */
function abbrevFmt(n: number, digits: number): string {
  // Intl compact notation 直接给 K/M/B/T,自动 locale-aware
  const formatted = new Intl.NumberFormat(NUM_LOCALE, {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
  return formatted;
}

function formatDate(value: unknown, tok: string): string {
  let date: Date;
  if (value instanceof Date) date = value;
  else date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return String(value);

  const opts: Intl.DateTimeFormatOptions =
    tok === "date:yyyy"
      ? { year: "numeric" }
      : tok === "date:yyyy-mm"
        ? { year: "numeric", month: "2-digit" }
        : tok === "date:mmm-yy"
          ? { year: "2-digit", month: "short" }
          : { year: "numeric", month: "long", day: "numeric" };
  let out = new Intl.DateTimeFormat(NUM_LOCALE, opts).format(date);
  // date:YYYY-MM 走 Intl 出来是 "05/2026" → 改成 "2026-05" 风
  if (tok === "date:yyyy-mm") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    out = `${y}-${m}`;
  }
  return out;
}

/**
 * Delta 格式化(KPI / big-number comparison 用)。
 *
 * - delta = current - prev(绝对) 或 (current - prev) / prev(相对) — 由 caller 决定
 * - 输出 "+12.3%" / "-4.5%" / "0.0%" 带符号
 * - tone: positive / negative / neutral,caller 用来决定颜色 class
 */
export function fmtDelta(delta: number, token: FmtToken = "pct1"): {
  text: string;
  tone: "positive" | "negative" | "neutral";
} {
  const tone: "positive" | "negative" | "neutral" =
    Math.abs(delta) < 1e-9 ? "neutral" : delta > 0 ? "positive" : "negative";
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "";
  return {
    text: sign + fmt(delta, token),
    tone,
  };
}
