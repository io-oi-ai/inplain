/**
 * 版本列表追加 —— **带上限**。
 *
 * ⚠ 为什么必须封顶(实测数据):
 * `documents.versions` 是一个 JSON 列,每个版本里存着一份完整 HTML(~80KB)。
 * D1/SQLite 没有 jsonb 拼接,所以每次追加版本的实现都是
 * 「整列读出 → push → 整列写回」。版本数无上限的话:
 *   - 生产实测有文档攒到 **14 个版本 / 743KB**
 *   - 于是每换一次模板要搬运近 1.5MB(读 743KB + 写 823KB)
 *   - 而且**越用越慢** —— 用户体感就是"这功能越来越像坏了"
 *
 * 保留最近 MAX_VERSIONS 个:版本时间轴的价值集中在最近几步(撤销/对比),
 * 三十步之前的版本没人回得去,却在每次写入时都要被搬一遍。
 *
 * 注意这是**截断最旧的**,不是拒绝新的 —— 用户永远能继续改。
 */

/** 保留的版本**条目**数上限 —— 时间轴上能看到多少个还原点。 */
export const MAX_VERSIONS = 20;

/**
 * 保留 html 的版本数。**这条才是真正省事的地方。**
 *
 * 关键事实:工作台预览走 `/api/v31/doc?editable=1`,它**不读 version.html**,
 * 而是从 content + themeSlug **现场重渲**(存库那份不带编辑脚本,没法直接用)。
 * 也就是说历史版本的 html 几乎没人读,却让每次写入都要搬运整列。
 *
 * 所以:只有最近 KEEP_HTML 版留 html,更旧的剥掉 —— themeSlug 和 content 都还在,
 * 真要回溯随时能重渲出来。20 版 × 80KB(1.6MB)因此降到 ~240KB。
 */
export const KEEP_HTML = 3;

type VersionLike = { html?: string };

/**
 * 追加一个版本:超限丢最旧的,并剥掉老版本的 html。
 * @returns { versions, activeIdx } —— activeIdx 永远指向刚追加的那个
 */
export function appendVersion<T extends VersionLike>(
  prev: unknown,
  entry: T,
): { versions: T[]; activeIdx: number } {
  const arr = Array.isArray(prev) ? (prev as T[]) : [];
  const next = [...arr, entry];
  // 1) 条目封顶:截断最旧的(不是拒绝新的 —— 用户永远能继续改)
  const trimmed = next.length > MAX_VERSIONS ? next.slice(next.length - MAX_VERSIONS) : next;
  // 2) 只有最近 KEEP_HTML 版留 html,更旧的剥掉(能从 content+themeSlug 重渲)
  const cutoff = trimmed.length - KEEP_HTML;
  const slimmed = trimmed.map((v, i) => {
    if (i >= cutoff || !v || typeof v !== "object" || !("html" in v)) return v;
    const { html: _dropped, ...rest } = v as T & { html?: string };
    void _dropped;
    return rest as T;
  });
  return { versions: slimmed, activeIdx: slimmed.length - 1 };
}
