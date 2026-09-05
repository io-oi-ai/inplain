/**
 * Sheet 单元格格式化 (PR #C1)
 *
 * 让 Sheet 的列可声明类型,渲染时自动按 type 走 Intl 格式化。
 * 覆盖 6 种 type:string / number / currency / percent / date / bool。
 *
 * 同时支持 cell-level metadata —— markdown 单元格里写
 *   <!--cell bg:#fee color:#0a0 bold align:right--> 内容
 * 渲染时拆出 style + 干净内容。
 *
 * 这是一份纯函数模块:不引依赖,不碰 DOM,Server 端 / Client 端都能跑。
 * Excel 主流格式不超出 Intl.NumberFormat / Intl.DateTimeFormat 能力,
 * 因此不引 date-fns / numeral.js,避免凭空+50KB。
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SheetColumnType =
  | "string"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "bool";

export type ColumnSpec = {
  key: string;
  header: string;
  type: SheetColumnType;
  /** number / currency / percent 的小数位 */
  precision?: number;
  /** ISO 4217 currency code,默认 USD */
  currency?: string;
  /** date 格式 token (类似 "MMM d, yyyy")。缺省 = locale medium */
  format?: string;
  /** 整列对齐覆盖 */
  align?: "left" | "center" | "right";
};

export type CellMeta = {
  /** 拆掉 <!--cell ...--> 后剩下的可见文本 */
  content: string;
  /** 解出来的样式键值对,直接喂给 td 的 style/class */
  style: Record<string, string>;
};

// ─────────────────────────────────────────────────────────────
// formatValue: 按 ColumnSpec 把任意值变成展示字符串
// ─────────────────────────────────────────────────────────────

/**
 * 把 cell value 按列 spec 格式化成展示文本。
 *
 * 设计取舍:
 * - null/undefined/空串 → 空串 (不显示 "null","NaN")
 * - 类型不匹配 (例如 number 列里塞了 "N/A") → 原样字符串返回,不抛
 * - locale 走调用方传入的 BCP47 (默认 en),中文站点传 "zh-CN"
 */
export function formatValue(
  value: unknown,
  spec: ColumnSpec,
  locale = "en",
): string {
  if (value === null || value === undefined || value === "") return "";

  switch (spec.type) {
    case "string":
      return String(value);

    case "number": {
      const n = toNumber(value);
      if (n === null) return String(value);
      const precision = spec.precision;
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: precision ?? 0,
        maximumFractionDigits: precision ?? 2,
      }).format(n);
    }

    case "currency": {
      const n = toNumber(value);
      if (n === null) return String(value);
      const precision = spec.precision ?? 0;
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: spec.currency || "USD",
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(n);
      } catch {
        // 兜底:currency code 非法时退化为带前缀
        return `${spec.currency || "USD"} ${n.toFixed(precision)}`;
      }
    }

    case "percent": {
      const n = toNumber(value);
      if (n === null) return String(value);
      const precision = spec.precision ?? 1;
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(n);
    }

    case "date": {
      const d = toDate(value);
      if (!d) return String(value);
      if (spec.format) {
        return formatDateWithPattern(d, spec.format, locale);
      }
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    }

    case "bool": {
      const b = toBool(value);
      if (b === null) return String(value);
      return b ? "✓" : "✗"; // ✓ / ✗
    }

    default:
      return String(value);
  }
}

// ─────────────────────────────────────────────────────────────
// parseCellMeta: 拆 <!--cell key:value key:value bold-->
// ─────────────────────────────────────────────────────────────

/**
 * 解析单元格元数据注释。
 *
 * 匹配 <!--cell ...--> ,可在 cell 内容前/后/中,只取第一个。
 * 支持的 key:
 *   bg:#fee         → background-color
 *   color:#0a0      → text color
 *   bold            → font-weight: 600 (bare flag)
 *   align:right     → text-align (left|center|right)
 *
 * 返回 { content: 去掉注释后的内容, style: 解出来的样式 dict }
 */
export function parseCellMeta(raw: string): CellMeta {
  const style: Record<string, string> = {};
  const META_RE = /<!--\s*cell\s+([^>]*?)\s*-->/i;
  const m = raw.match(META_RE);
  if (!m) return { content: raw.trim(), style };

  const body = m[1];
  // tokenize: key:value 或 bareflag,空白分隔
  const TOKEN_RE = /([a-zA-Z][a-zA-Z0-9_-]*)(?::([^\s]+))?/g;
  let t: RegExpExecArray | null;
  while ((t = TOKEN_RE.exec(body)) !== null) {
    const key = t[1].toLowerCase();
    const val = t[2];
    if (val === undefined) {
      // bareflag
      if (key === "bold") style["font-weight"] = "600";
      else if (key === "italic") style["font-style"] = "italic";
      continue;
    }
    if (key === "bg" || key === "background") {
      style["background"] = val;
    } else if (key === "color") {
      style["color"] = val;
    } else if (key === "align") {
      if (val === "left" || val === "center" || val === "right") {
        style["text-align"] = val;
      }
    } else if (key === "weight") {
      style["font-weight"] = val;
    }
  }

  const content = (raw.slice(0, m.index!) + raw.slice(m.index! + m[0].length))
    .trim();
  return { content, style };
}

// ─────────────────────────────────────────────────────────────
// 工具:序列化 style dict 成 inline style 字符串(已 HTML-escape)
// ─────────────────────────────────────────────────────────────

export function styleToAttr(style: Record<string, string>): string {
  const pairs = Object.entries(style)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `${k}:${escapeStyleValue(v)}`);
  return pairs.join(";");
}

function escapeStyleValue(v: string): string {
  // style 属性值里要小心 " 和 ;,前者直接干扰属性边界,后者会被当成新声明
  return String(v).replace(/[";<>]/g, "");
}

// ─────────────────────────────────────────────────────────────
// 渲染 helper: column + raw cell → <td> 字符串
// 给 sheet.ts 在 server-side normalize 阶段统一调用
// ─────────────────────────────────────────────────────────────

/**
 * 把一行的某个 cell 渲染成 <td>…</td>。
 *
 * - 先 parseCellMeta 拆 <!--cell ...--> 内联样式
 * - 再 formatValue 按 column type 跑 Intl 格式化
 * - 合并 column.align 与 cell.style 的 text-align (cell 优先)
 * - 输出带 class="plain-sheet-cell" + data-type / data-align
 */
export function renderCellHtml(
  rawValue: unknown,
  spec: ColumnSpec,
  locale = "en",
): string {
  // 字符串值才走 cell meta 解析;number/bool/Date 直接格式化
  let meta: CellMeta = { content: "", style: {} };
  let valueForFormat: unknown = rawValue;
  if (typeof rawValue === "string") {
    meta = parseCellMeta(rawValue);
    valueForFormat = meta.content;
  }

  const formatted = formatValue(valueForFormat, spec, locale);

  // align 合并:cell 内联 > column 默认
  const cellAlign = meta.style["text-align"];
  const finalAlign = cellAlign || spec.align || "";
  const styleAttr = styleToAttr(meta.style);

  const dataType = ` data-type="${spec.type}"`;
  const dataAlign = finalAlign ? ` data-align="${finalAlign}"` : "";
  const styleHtml = styleAttr ? ` style="${escapeAttr(styleAttr)}"` : "";

  // bool 列额外打颜色 hint,让真假一眼区分
  let extraClass = "";
  if (spec.type === "bool") {
    const b = toBool(valueForFormat);
    if (b === true) extraClass = " plain-sheet-cell--bool-true";
    else if (b === false) extraClass = " plain-sheet-cell--bool-false";
  }

  return `<td class="plain-sheet-cell${extraClass}"${dataType}${dataAlign}${styleHtml}>${escapeHtml(formatted)}</td>`;
}

// ─────────────────────────────────────────────────────────────
// 类型 coerce 工具
// ─────────────────────────────────────────────────────────────

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return null;
    // 去掉千分位逗号(支持中文全角)、$ ¥ € £ 前缀、% 后缀
    const cleaned = trimmed
      .replace(/[,，]/g, "")
      .replace(/^[$¥€£￥]\s*/, "")
      .replace(/%$/, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes" || s === "y" || s === "1") return true;
    if (s === "false" || s === "no" || s === "n" || s === "0") return false;
  }
  return null;
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// 简易 date pattern formatter
//
// 走 Intl.DateTimeFormat 拿到 parts,然后把 pattern token 替换。
// 支持的 token:yyyy yy MMMM MMM MM M d dd HH H mm m ss s
// 不支持完整 Unicode LDML —— 想要花活就别用 format 字段,走 locale 默认。
// ─────────────────────────────────────────────────────────────

function formatDateWithPattern(d: Date, pattern: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const byType: Record<string, string> = {};
  for (const p of parts) byType[p.type] = p.value;

  const fullMonth = byType.month || "";
  const shortMonth = new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
  const monthNum = String(d.getMonth() + 1);
  const dayNum = String(d.getDate());
  const yearNum = String(d.getFullYear());
  const hourNum = String(d.getHours());
  const minNum = String(d.getMinutes());
  const secNum = String(d.getSeconds());

  // 注意:从长 token 到短 token 替换,避免 "MMMM" 被先吃成 "MM"+"MM"
  return pattern
    .replace(/yyyy/g, yearNum)
    .replace(/yy/g, yearNum.slice(-2))
    .replace(/MMMM/g, fullMonth)
    .replace(/MMM/g, shortMonth)
    .replace(/MM/g, monthNum.padStart(2, "0"))
    .replace(/(?<![A-Za-z])M(?![A-Za-z])/g, monthNum)
    .replace(/dd/g, dayNum.padStart(2, "0"))
    .replace(/(?<![A-Za-z])d(?![A-Za-z])/g, dayNum)
    .replace(/HH/g, hourNum.padStart(2, "0"))
    .replace(/(?<![A-Za-z])H(?![A-Za-z])/g, hourNum)
    .replace(/mm/g, minNum.padStart(2, "0"))
    .replace(/(?<![A-Za-z])m(?![A-Za-z])/g, minNum)
    .replace(/ss/g, secNum.padStart(2, "0"))
    .replace(/(?<![A-Za-z])s(?![A-Za-z])/g, secNum);
}

// ─────────────────────────────────────────────────────────────
// HTML escaping (本模块自给自足,不依赖外部 esc)
// ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
