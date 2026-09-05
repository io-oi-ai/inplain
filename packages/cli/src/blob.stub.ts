/**
 * `@/lib/blob` 的 CLI 替身。
 *
 * 真实实现读的是 Plain 自家 R2 上的资产,靠 `@opennextjs/cloudflare` 拿
 * Worker binding —— 这在 CLI 里既跑不了(没有 Worker 上下文),也不该跑
 * (CLI 用户没有、也不需要访问我们的 bucket)。
 *
 * 更关键的是打包影响:不 stub 的话 esbuild 会把整个 `@opennextjs/cloudflare`
 * 拉进 `dist/index.js` —— 死代码,却把 R2 / Vercel Blob 的实现细节和 bucket
 * 命名一起塞进了发布产物。
 *
 * 唯一被 CLI 触达的导出是 `readOwnAssetText`(经 lib/agent/tools/fetch-url.ts),
 * 它在"不是自家资产"时本来就返回 `{ ok: false }`,调用方会走普通 HTTP 抓取。
 * 所以恒返 false 与真实行为一致 —— CLI 环境下压根不存在"自家资产"。
 */

export async function readOwnAssetText(
  _url: string,
  _maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  return { ok: false };
}

/** 自家资产判定 —— CLI 环境下永远不是。 */
export function isOwnAssetUrl(_url: string): boolean {
  return false;
}
