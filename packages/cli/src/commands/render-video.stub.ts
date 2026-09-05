// 发布版 stub —— `plain deck render-video` 依赖 repo 内 apps/videos(Remotion + TTS + BGM),
// npm 包里不存在,故发布构建用本 stub 替换 ./render-video,避免把 apps/videos 路径逻辑
// (含 __dirname / REPO_ROOT)打进 bundle。命令在发布版直接缺席。
import type { Command } from "commander";

export function registerRenderVideo(_deck: Command): void {
  // no-op:发布版不提供 render-video(repo-only 功能)
}
