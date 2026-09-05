import type { DocKind } from "@/lib/agents/types";

/**
 * 三件套的默认标题(source 里没写标题时的兜底)。
 *
 * 纯函数层无 React context,拿不到 next-intl 的 t()。
 * 所以约定:默认值可由渲染层(有 useTranslations 的 hook / 组件)通过
 * `defaults` 注入本地化文案;不注入时退回这里的英文哨兵值。
 *
 * key 约定(渲染层用):Workspace.untitledDeck / untitledDoc / untitledSheet。
 *
 * 三件套(deck/doc/sheet)统一走同一套处理,避免出现
 * "英文 Untitled Deck 但中文 未命名 sheet" 这种语言不一致的历史 bug。
 */
export type TitleDefaults = {
  deck: string;
  doc: string;
  sheet: string;
};

export const DEFAULT_TITLES: TitleDefaults = {
  deck: "Untitled Deck",
  doc: "Untitled Doc",
  sheet: "Untitled Sheet",
};

/**
 * 从纯文本 source 提取一个显示标题，纯前端用，不抛错。
 * - deck: 首个 "# " 开头的 heading
 * - doc:  frontmatter `title:` 或 首个 h1
 * - sheet: frontmatter `title:`
 *
 * @param defaults 可选:渲染层注入的本地化默认标题;不传则用英文哨兵值。
 */
export function extractTitle(
  kind: DocKind,
  source: string,
  defaults: TitleDefaults = DEFAULT_TITLES,
): string {
  switch (kind) {
    case "deck": {
      const m = source.match(/^\s*#\s+(.+?)\s*$/m);
      return m?.[1].trim() || defaults.deck;
    }
    case "doc": {
      const fmTitle = readFrontmatter(source, "title");
      if (fmTitle) return fmTitle;
      const m = source.match(/^\s*#\s+(.+?)\s*$/m);
      return m?.[1].trim() || defaults.doc;
    }
    case "sheet": {
      const fmTitle = readFrontmatter(source, "title");
      return fmTitle || defaults.sheet;
    }
  }
}

function readFrontmatter(src: string, key: string): string | null {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const line = m[1].split("\n").find((l) => l.match(new RegExp(`^\\s*${key}:\\s*`)));
  if (!line) return null;
  const v = line.replace(new RegExp(`^\\s*${key}:\\s*`), "").trim();
  if (!v) return null;
  // 支持 JSON 字符串引号
  if (v.startsWith('"') || v.startsWith("'")) {
    try {
      return JSON.parse(v.replace(/'/g, '"'));
    } catch {
      return v.replace(/^["']|["']$/g, "");
    }
  }
  return v;
}
