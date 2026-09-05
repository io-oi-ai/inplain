/**
 * Marp 单例出口(2026-07-19)。
 *
 * 为什么存在:marp-core 自带完整 KaTeX 字形 + highlight.js,单份 ~3.4MB(压缩前)。
 * 此前 /api/render、/api/export、client-bridge/render-impl 三处各自
 * `import { Marp } from "@marp-team/marp-core"`,Turbopack 在不同 route/context
 * 下打了 **3 份拷贝**进 OpenNext worker → bundle 冲破 CF Workers 10MiB 上限,
 * 生产无法部署。统一从本模块 import 让 chunk 可共享。
 *
 * 铁律:任何新代码要用 Marp,一律 `import { Marp } from "@/lib/marp-shared"`,
 * 不要直接 import marp-core。
 */
export { Marp } from "@marp-team/marp-core";
