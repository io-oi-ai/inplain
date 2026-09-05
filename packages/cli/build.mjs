// @inplain/cli 打包脚本 —— esbuild 把 CLI + 它依赖的主 repo 源码(@/*)bundle 成单文件。
//
// 为什么需要:CLI 通过 @/core、@/lib/render-v2、@/lib/agent 深度依赖主 repo 源码,
// 靠 tsx + 路径别名在 repo 内跑。npm 包里没有主 repo 源码,必须把这些 @/ 依赖内联。
//
// 产物:cli/dist/index.js(带 shebang,自包含,bin 指向它)。
// external:仅 node 内置 + @modelcontextprotocol/sdk(走 npm dependencies 安装)。

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, chmodSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../.."); // @/* → repoRoot/src

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));
const outfile = resolve(__dirname, "dist/index.js");

const result = await build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // @/ 别名解析到主 repo src,递归把主 repo 源码 bundle 进单文件。
  // @/ 解析到 core 包(纯函数内核 + 渲染管线)
  alias: {
    "@/core": resolve(repoRoot, "packages/core/src/core/index.ts"),
    "@/lib": resolve(repoRoot, "packages/core/src/lib"),
    "@": resolve(repoRoot, "packages/core/src"),
  },
  // repo-only 的 deck render-video(依赖 apps/videos)用 plugin 替换成 stub,发布版排除。
  plugins: [
    {
      name: "stub-render-video",
      setup(b) {
        b.onResolve({ filter: /(^|\/)render-video$/ }, () => ({
          path: resolve(__dirname, "src/commands/render-video.stub.ts"),
        }));
      },
    },
    // lib/blob 走 Cloudflare Worker binding 读自家 R2 —— CLI 里跑不了也不该跑。
    // 不 stub 的话整个 @opennextjs/cloudflare 会被拉进 bundle(死代码 + 泄漏实现细节)。
    {
      name: "stub-blob",
      setup(b) {
        b.onResolve({ filter: /(^|\/)lib\/blob$/ }, () => ({
          path: resolve(__dirname, "src/blob.stub.ts"),
        }));
      },
    },
  ],
  banner: {
    js: [
      "#!/usr/bin/env node",
      // ESM bundle 里补齐 CJS 全局:require / __dirname / __filename
      "import { createRequire as ___createRequire } from 'node:module';",
      "import { fileURLToPath as ___f2p } from 'node:url';",
      "import { dirname as ___dn } from 'node:path';",
      "const require = ___createRequire(import.meta.url);",
      "const __filename = ___f2p(import.meta.url);",
      "const __dirname = ___dn(__filename);",
    ].join("\n"),
  },
  // version 从 package.json 注入,消除与 program.version 的漂移
  define: {
    "process.env.PLAIN_CLI_VERSION": JSON.stringify(pkg.version),
  },
  external: [
    "node:*",
    // MCP SDK:体积大 + conditional exports 子路径,留给 npm 装更稳
    "@modelcontextprotocol/sdk",
    "@modelcontextprotocol/sdk/*",
  ],
  minify: true,
  sourcemap: false,
  // 保留函数名:commander 靠函数名推断、agent 内部某些逻辑可能反射名字
  keepNames: true,
  logLevel: "info",
  metafile: true,
});

// 可执行位(npm 安装会按 bin 字段处理,这里兜底)
chmodSync(outfile, 0o755);

// 复制 Claude Code skill 进 dist(随 npm 包分发 · plain install 会装到 .claude/skills/)
{
  const { cpSync, mkdirSync } = await import("node:fs");
  const skillSrc = resolve(__dirname, "skill");
  const skillDst = resolve(__dirname, "dist/skill");
  mkdirSync(skillDst, { recursive: true });
  cpSync(skillSrc, skillDst, { recursive: true });
  console.log("[cli:build] ✓ 复制 skill → dist/skill");
}

// 输出 bundle 分析,便于排查是否意外打进 next/react
const { writeFileSync } = await import("node:fs");
// meta.json 写到 cli/ 根(不进 dist,避免被打进发布 tarball)
writeFileSync(resolve(__dirname, "build-meta.json"), JSON.stringify(result.metafile));

// 体积摘要 + Next/React 污染检查
const inputs = Object.keys(result.metafile.outputs[Object.keys(result.metafile.outputs).find((k) => k.endsWith("index.js"))].inputs ?? {});
const polluted = inputs.filter((p) => /node_modules\/(next|react-dom|react|@opennextjs)\//.test(p) || /\bserver-only\b/.test(p));
const totalBytes = result.metafile.outputs[Object.keys(result.metafile.outputs).find((k) => k.endsWith("index.js"))].bytes;
console.log(`\n[cli:build] dist/index.js = ${(totalBytes / 1024 / 1024).toFixed(2)} MB · ${inputs.length} modules`);
if (polluted.length) {
  console.error(`[cli:build] ⚠️ 检测到 Next/React/Cloudflare 污染(${polluted.length}):`);
  for (const p of polluted.slice(0, 10)) console.error("   " + p);
  process.exit(1);
}
console.log("[cli:build] ✓ 无 next/react/cloudflare/server-only 污染");
