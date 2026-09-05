/**
 * HTML-output anti-slop linter
 *
 * 对标 nexu-io/open-design 的 `lint-artifact`:在**渲染后的 HTML/CSS** 上扫视觉 slop。
 * 这与 `src/lib/agents/slop-detector.ts` 互补——detector 扫的是 LLM token 流里的
 * **中文文案 slop**(打造/赋能/钓鱼标题),这里扫的是 token 流里看不全的
 * **视觉产物 slop**(配色/渐变/卡片形状/字体/图床)。
 *
 * 核心原则(借 OD「AI 味 = 风格用错场景」):**规则严格度按 surface × 区域分档**。
 * - landing(brand 杂志风)/ 内容区:最严,视觉 slop 一律 error。
 * - deck 封面/hero 区(data-plain-zone="cover"):放宽视觉规则(允许大色块/渐变/全幅),
 *   但仍守住「没用心」底线:emoji 冒充图标 / lorem 占位 / 编造指标 / 外部图床。
 * - workspace 产物(doc/sheet):用户主动选了设计哲学,中等宽松。
 *
 * 这把 WEB-RULES 的「禁硬编码颜色」铁律从 prompt 约束升级为**可执行检查**。
 */

export type LintSurface = "landing" | "deck" | "doc" | "sheet";

export type HtmlSlopCode =
  | "INDIGO_ACCENT"            // 默认 Tailwind indigo 当 accent(教科书级 AI tell)
  | "TRUST_GRADIENT"          // hero 上 purple→blue / blue→cyan 双色「信任」渐变
  | "EMOJI_AS_ICON"           // emoji 出现在 h*/button/li/[class*=icon] 当图标用
  | "CARD_ROUNDED_LEFTBORDER" // 圆角卡片 + 彩色左边框(经典 AI dashboard tile)
  | "DISPLAY_FONT_HARDCODE"   // h1/h2 硬编码 Inter/Roboto/system-ui 而非 token
  | "PLACEHOLDER_IMG_CDN"     // unsplash/placehold/picsum 等占位图床
  | "RAW_HEX_SPRAWL"          // :root 外散落 raw hex 过多(没遵守 token)
  | "ACCENT_OVERUSE";         // 一屏 accent 用太多次

export type HtmlSlopSeverity = "error" | "warn" | "info";

export type HtmlSlopMatch = {
  code: HtmlSlopCode;
  severity: HtmlSlopSeverity;
  message: string;
  /** 命中片段(截断到 80 字) */
  snippet: string;
  /** 命中在 html 中的 char index */
  index: number;
};

/** 默认 Tailwind indigo/violet 调色板(最常见的 AI accent tell) */
const INDIGO_HEXES = [
  "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81",
  "#818cf8", "#a5b4fc", "#8b5cf6", "#7c3aed", "#6d28d9",
  "#a855f7", "#9333ea", "#c084fc",
];

/** 占位图床域名 */
const PLACEHOLDER_CDNS = [
  "unsplash.com", "source.unsplash.com", "placehold.co", "placeholder.com",
  "via.placeholder.com", "placekitten.com", "picsum.photos", "loremflickr.com",
  "dummyimage.com",
];

/** 双色「信任」渐变:常见 hue 对(purple/blue/indigo/cyan/pink) */
const TRUST_GRADIENT_RE =
  /linear-gradient\([^)]*(#?(6366f1|4f46e5|8b5cf6|7c3aed|3b82f6|2563eb|06b6d4|0ea5e9|ec4899|db2777)|purple|violet|indigo|blue|cyan|fuchsia|pink)[^)]*,[^)]*(#?(6366f1|4f46e5|8b5cf6|7c3aed|3b82f6|2563eb|06b6d4|0ea5e9|ec4899|db2777)|purple|violet|indigo|blue|cyan|fuchsia|pink)[^)]*\)/i;

/** 硬编码 display 字体(应走 var(--plain-font-display)) */
const HARDCODED_DISPLAY_FONTS =
  /font-family\s*:\s*['"]?(Inter|Roboto|Helvetica|Arial|system-ui|-apple-system)['"]?/i;

/** 装饰/图标位 emoji 集合 */
const ICON_EMOJI =
  /[\u{1F680}\u{2728}\u{1F4A1}\u{1F31F}\u{2B50}\u{1F3AF}\u{1F525}\u{1F4AF}\u{1F4C8}\u{1F389}\u{2705}\u{1F527}\u{26A1}\u{1F511}]/u;

type LintOptions = {
  surface: LintSurface;
  /**
   * 是否对整份产物放宽视觉规则。deck 默认 false(逐区域判断);
   * 显式传 true 可强制按「强视觉」对待整页(如纯海报)。
   */
  posterMode?: boolean;
};

/** 找出所有 data-plain-zone="cover" 区域的 [start, end) range */
function buildCoverZoneRanges(html: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = /<section[^>]*data-plain-zone=["']cover["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const start = m.index;
    const end = html.indexOf("</section>", start);
    ranges.push([start, end === -1 ? html.length : end + "</section>".length]);
  }
  return ranges;
}

function inAnyRange(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => index >= s && index < e);
}

function snippetAt(html: string, index: number): string {
  return html.slice(index, index + 80).replace(/\s+/g, " ").trim();
}

/**
 * 扫描渲染后 HTML 的视觉 slop。
 *
 * 视觉类规则(配色/渐变/卡片/字体)在「封面/海报」语境下放宽为 info(允许大胆视觉);
 * 在 landing / 内容区为 error。
 * 「没用心」类规则(emoji 图标 / 占位图床)在任何 surface 都至少 warn。
 */
export function lintHtmlSlop(html: string, opts: LintOptions): HtmlSlopMatch[] {
  const out: HtmlSlopMatch[] = [];
  const coverRanges = opts.surface === "deck" ? buildCoverZoneRanges(html) : [];

  const isStrongVisualZone = (index: number): boolean => {
    if (opts.posterMode) return true;
    if (opts.surface === "deck") return inAnyRange(index, coverRanges);
    return false;
  };

  // 视觉类 slop 的 severity:强视觉区降级为 info,否则 landing=error / 其他=warn
  const visualSeverity = (index: number): HtmlSlopSeverity => {
    if (isStrongVisualZone(index)) return "info";
    return opts.surface === "landing" ? "error" : "warn";
  };

  // 「没用心」类(emoji图标/占位图床/lorem):任何 surface 都不放宽
  const carelessSeverity = (): HtmlSlopSeverity =>
    opts.surface === "landing" ? "error" : "warn";

  const push = (
    code: HtmlSlopCode,
    severity: HtmlSlopSeverity,
    message: string,
    index: number,
  ) => out.push({ code, severity, message, snippet: snippetAt(html, index), index });

  // 1. INDIGO_ACCENT —— 默认 indigo 调色板(视觉类)
  for (const hex of INDIGO_HEXES) {
    const re = new RegExp(hex, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      push(
        "INDIGO_ACCENT",
        visualSeverity(m.index),
        `默认 Tailwind indigo "${m[0]}" 当 accent —— 教科书级 AI tell,换 var(--plain-accent)`,
        m.index,
      );
    }
  }

  // 2. TRUST_GRADIENT —— 双色信任渐变(视觉类)
  {
    const re = new RegExp(TRUST_GRADIENT_RE.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      push(
        "TRUST_GRADIENT",
        visualSeverity(m.index),
        `双色「信任」渐变 —— 用 flat surface + 字体层级替代,而非 purple→blue 渐变`,
        m.index,
      );
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // 3. DISPLAY_FONT_HARDCODE —— 硬编码字体(违反 token 铁律,即使封面也只降一档)
  {
    const re = new RegExp(HARDCODED_DISPLAY_FONTS.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const sev: HtmlSlopSeverity = isStrongVisualZone(m.index)
        ? "warn"
        : opts.surface === "landing" ? "error" : "warn";
      push(
        "DISPLAY_FONT_HARDCODE",
        sev,
        `硬编码字体 "${m[1]}" —— 用 var(--plain-font-display/text),违反 WEB-RULES 铁律`,
        m.index,
      );
    }
  }

  // 4. CARD_ROUNDED_LEFTBORDER —— 圆角 + 彩色左边框卡片(视觉类)
  {
    const re = /style=["'][^"']*border-radius[^"']*border-left[^"']*["']|style=["'][^"']*border-left[^"']*border-radius[^"']*["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      push(
        "CARD_ROUNDED_LEFTBORDER",
        visualSeverity(m.index),
        `圆角卡片 + 彩色左边框 —— 经典 AI dashboard tile,去掉其一`,
        m.index,
      );
    }
  }

  // 5. EMOJI_AS_ICON —— emoji 在 h*/button/li/[class*=icon] 内当图标(「没用心」类)
  {
    const re = /<(h[1-6]|button|li)[^>]*>([^<]*)<\/\1>|class=["'][^"']*icon[^"']*["'][^>]*>([^<]*)</gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const inner = (m[2] ?? "") + (m[3] ?? "");
      const em = inner.match(ICON_EMOJI);
      if (em) {
        push(
          "EMOJI_AS_ICON",
          carelessSeverity(),
          `emoji "${em[0]}" 冒充图标 —— 换 currentColor 的 monoline SVG`,
          m.index,
        );
      }
    }
  }

  // 6. PLACEHOLDER_IMG_CDN —— 占位图床(「没用心」类)
  for (const cdn of PLACEHOLDER_CDNS) {
    let i = -1;
    while ((i = html.indexOf(cdn, i + 1)) !== -1) {
      push(
        "PLACEHOLDER_IMG_CDN",
        carelessSeverity(),
        `占位图床 "${cdn}" —— 用内置 placeholder 或真实素材`,
        i,
      );
    }
  }

  // 7. RAW_HEX_SPRAWL —— :root 外散落 raw hex 过多(视觉类计数)
  {
    const withoutRoot = html.replace(/:root\s*\{[^}]*\}/gi, "");
    const hexes = withoutRoot.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    const strongVisual = opts.posterMode || coverRanges.length > 0;
    const threshold = strongVisual ? 24 : 12;
    if (hexes.length > threshold) {
      const idx = html.search(/#[0-9a-fA-F]{6}\b/);
      push(
        "RAW_HEX_SPRAWL",
        opts.surface === "landing" ? "error" : "warn",
        `:root 外散落 ${hexes.length} 个 raw hex(阈值 ${threshold})—— 收回到 var(--plain-*) token`,
        idx === -1 ? 0 : idx,
      );
    }
  }

  // 8. ACCENT_OVERUSE —— var(--plain-accent) 一屏用太多次(视觉类计数)
  {
    const count = (html.match(/var\(--plain-accent\b/g) ?? []).length;
    const limit = opts.surface === "landing" ? 2 : 6;
    if (count > limit && !opts.posterMode) {
      const idx = html.indexOf("var(--plain-accent");
      push(
        "ACCENT_OVERUSE",
        opts.surface === "landing" ? "warn" : "info",
        `accent 用了 ${count} 次(建议 ≤ ${limit})—— accent 越省越有重量`,
        idx === -1 ? 0 : idx,
      );
    }
  }

  return out.sort((a, b) => a.index - b.index);
}

/** 把命中浓缩成一行报告 */
export function summarizeHtmlSlop(matches: HtmlSlopMatch[]): string {
  if (matches.length === 0) return "";
  const bySev = { error: 0, warn: 0, info: 0 };
  for (const m of matches) bySev[m.severity]++;
  return `slop: ${bySev.error} error / ${bySev.warn} warn / ${bySev.info} info`;
}
