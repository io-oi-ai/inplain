/**
 * 跨文档引用语法（Quarto 风格）：
 *
 *   @<kind>:<docId>                     整份文档
 *   @<kind>:<docId>:<path...>           文档内某部分
 *
 * 具体形式：
 *   @deck:<id>                          整个 deck
 *   @deck:<id>:s3                       deck 第 3 张 slide（用 slide.id）
 *   @deck:<id>:s3:title                 deck 某 slide 标题
 *
 *   @doc:<id>                           整份 doc
 *   @doc:<id>:b5                        doc 的某 block（heading/paragraph/list/code/quote）
 *
 *   @sheet:<id>                         整张表（渲染为 markdown 表）
 *   @sheet:<id>:title                   表标题
 *   @sheet:<id>:col:revenue             某列所有数据（渲染为 inline 文本："120, 135, 148"）
 *   @sheet:<id>:cell:3:revenue          第 3 行的 revenue 单元格（0-indexed）
 *   @sheet:<id>:chart:c1                某图表（渲染为占位 stub）
 *
 * id 规范：
 *   - docId 用 nanoid 风格：`[a-zA-Z0-9_-]{4,64}`
 *   - slide/block id 同上
 *   - 列 key 同上
 *
 * 块级嵌入（M4.5）见 `[sheet:<id>]` 注释风格，与 @ref 区分。
 */

export type RefKind = "deck" | "doc" | "sheet";

export type Ref = {
  kind: RefKind;
  docId: string;
  path: string[]; // 例 ["col", "revenue"] / ["b5"] / ["s3", "title"]
  raw: string; // 原始 @... 字符串，用于 replace
};

const TOKEN = "[A-Za-z0-9_-]+";
// 注意：前向断言排除 "@@" 开头的（留给未来转义）；后向用 \b 保底
const REF_RE = new RegExp(
  `(?<!@)@(deck|doc|sheet):(${TOKEN})((?::${TOKEN})*)`,
  "g",
);

/**
 * 从任意源文本里抓出所有 @ref。保留顺序、去重只在 caller 层做。
 */
export function findRefs(source: string): Ref[] {
  const out: Ref[] = [];
  for (const m of source.matchAll(REF_RE)) {
    const [raw, kind, docId, tail] = m;
    const path = tail ? tail.split(":").filter(Boolean) : [];
    out.push({ kind: kind as RefKind, docId, path, raw });
  }
  return out;
}

/**
 * 解析单个 @ref 字符串（不含周围上下文）；解析失败返回 null。
 */
export function parseRef(input: string): Ref | null {
  const m = input.match(new RegExp(`^@(deck|doc|sheet):(${TOKEN})((?::${TOKEN})*)$`));
  if (!m) return null;
  const [raw, kind, docId, tail] = m;
  const path = tail ? tail.split(":").filter(Boolean) : [];
  return { kind: kind as RefKind, docId, path, raw };
}

/**
 * 把 Ref 回序列化为 @... 文本。
 */
export function refToString(ref: Ref): string {
  return ref.path.length > 0
    ? `@${ref.kind}:${ref.docId}:${ref.path.join(":")}`
    : `@${ref.kind}:${ref.docId}`;
}

/**
 * 用 replacer 替换所有 @ref 命中。replacer 返回要替换成的文本；返回 null 则保留原 raw。
 */
export function replaceRefs(
  source: string,
  replacer: (ref: Ref) => string | null,
): string {
  return source.replace(REF_RE, (raw, kind, docId, tail) => {
    const path = tail ? tail.split(":").filter(Boolean) : [];
    const ref: Ref = { kind: kind as RefKind, docId, path, raw };
    const out = replacer(ref);
    return out ?? raw;
  });
}

/**
 * 块级嵌入语法：一整行为 `[sheet:<id>]` 或 `[sheet:<id>|columns=a,b|limit=10]`
 * 返回 null 表示不是嵌入行。
 */
export type SheetEmbed = {
  docId: string;
  columns?: string[]; // 限定展示的列 key
  limit?: number; // 限定行数
  raw: string;
};

const EMBED_RE = /^\[sheet:([A-Za-z0-9_-]+)((?:\|[^[\]\n]+)*)\]\s*$/;

export function parseSheetEmbed(line: string): SheetEmbed | null {
  const m = line.match(EMBED_RE);
  if (!m) return null;
  const [raw, docId, rest] = m;
  const embed: SheetEmbed = { docId, raw };
  if (rest) {
    for (const part of rest.split("|").map((p) => p.trim()).filter(Boolean)) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim();
      if (k === "columns") embed.columns = v.split(",").map((s) => s.trim()).filter(Boolean);
      else if (k === "limit") {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) embed.limit = Math.floor(n);
      }
    }
  }
  return embed;
}

/**
 * Stage 4(占位):跨文档"问 sheet"语法 — `@sheet:abc123 ?? Q3 ARPU 同比`
 *
 * 现在只识别和提取,不做实际计算 — 留给后续 V14.7+ 实现 LLM 调用。
 * 当前行为:render 时整个 ?? 短语保留原文;agent prompt 里看到这条会自然回答。
 *
 * Schema:
 *   @<kind>:<docId> ?? <natural language question>
 *
 * 解析返回 { ref: Ref, question: string },caller 自己决定怎么处理。
 */
export type QuestionRef = {
  ref: Ref;
  /** ?? 后面的自然语言问题(去掉首尾空白) */
  question: string;
  raw: string;
};

const QUESTION_REF_RE = new RegExp(
  `(?<!@)@(deck|doc|sheet):(${TOKEN})((?::${TOKEN})*)\\s*\\?\\?\\s*([^\\n]+?)(?=\\n|$)`,
  "g",
);

export function findQuestionRefs(source: string): QuestionRef[] {
  const out: QuestionRef[] = [];
  for (const m of source.matchAll(QUESTION_REF_RE)) {
    const [raw, kind, docId, tail, question] = m;
    const path = tail ? tail.split(":").filter(Boolean) : [];
    out.push({
      ref: { kind: kind as RefKind, docId, path, raw: `@${kind}:${docId}${tail}` },
      question: question.trim(),
      raw,
    });
  }
  return out;
}
