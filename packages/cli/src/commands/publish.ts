/**
 * `plain publish <file.html>` —— 把本地 HTML 文件变成线上链接。
 *
 * 这条命令补的是一个实测存在的缺口:html-to-url 是 Plain 唯一在转化的入口,
 * 但此前**只有网页端有**。重度用户正是批量场景(实测单人 651 次/月),
 * 而批量恰恰是命令行最该擅长的事。
 *
 * 设计上刻意和 `plain push` 分开,不合并成一个命令:
 *   push    传 **Markdown 源**进 workspace,是「文档」,可编辑、可再生成
 *   publish 传**成品 HTML**原样托管,是「交付物」,一个字节都不动
 * 合并会让 `--kind` 之类的参数在一半场景下无意义,而且两者的失败模式完全不同。
 */

import type { Command } from "commander";
import { basename } from "node:path";
import { emit, progress, fail } from "../output";
import { publishHtmlFile, findLocalRefs, type PublishResult } from "../publish-html";
import { readFileSync } from "node:fs";

/** 批量时单个文件失败的记录 —— 不中断整批,最后统一汇报 */
type Failure = { file: string; error: string };

function humanOne(r: PublishResult): string {
  const lines = [r.url];
  if (r.anonymous && r.ttlDays) {
    lines.push(
      `  ⚠ published anonymously — expires in ${r.ttlDays} days.`,
      `    Run \`plain login\` to keep links permanently.`,
    );
  }
  return lines.join("\n");
}

export function registerPublish(program: Command): void {
  program
    .command("publish")
    .description("Publish a local .html file as a shareable link (served as-is)")
    .argument("<files...>", "Local .html file(s)")
    .option("--title <text>", "Override the title (default: from <title> or filename)")
    .option(
      "--skip-asset-check",
      "Don't warn about locally-referenced assets that won't be uploaded",
    )
    .action(
      async (
        files: string[],
        opts: { title?: string; skipAssetCheck?: boolean },
      ) => {
        // --title 对多文件没有意义(会把每个页面都命名成同一个)。
        // 静默忽略比静默生效更糟,所以直接拒绝。
        if (files.length > 1 && opts.title) {
          fail("--title cannot be used with multiple files");
        }

        const results: PublishResult[] = [];
        const failures: Failure[] = [];

        for (const file of files) {
          /**
           * 本地相对路径资源预检。
           *
           * 最常见的翻车:HTML 里写 `<img src="./img/x.png">`,那些文件不会跟着
           * 上传,发布后一堆裂图。只警告不阻断 —— 用户可能是故意的(比如那是
           * 一个本来就跑在别处的页面),我们没有资格替他判定。
           */
          if (!opts.skipAssetCheck) {
            try {
              const refs = findLocalRefs(readFileSync(file, "utf8"));
              if (refs.length) {
                const shown = refs.slice(0, 3).join(", ");
                const more = refs.length > 3 ? ` (+${refs.length - 3} more)` : "";
                progress(
                  `⚠ ${basename(file)} references local files that won't be uploaded: ${shown}${more}`,
                );
              }
            } catch {
              // 读不了就交给 publishHtmlFile 去报准确的错,这里不抢着失败
            }
          }

          progress(`publishing ${basename(file)}…`);
          try {
            const r = await publishHtmlFile({ file, title: opts.title });
            results.push(r);
            // 逐个输出而不是攒到最后 —— 批量跑几十个时,用户要能边跑边看到链接,
            // 中途 Ctrl-C 也不会丢掉已经成功的那些。
            // ⚠ 不要在这里自己定义 --json —— 它是 index.ts 上的**全局**选项,
            // 子命令再定义一个会遮蔽全局那个,导致 setOutputMode("json") 永远不执行,
            // emit 仍按 human 模式把人类文案 JSON 字符串化后吐出来(踩过)。
            // emit(data, humanFmt) 自己会按当前模式选分支,这里只要把两种形态都给它。
            emit(r, (d) => humanOne(d as PublishResult));
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            failures.push({ file, error: msg });
            // 单个失败不中断整批:批量发 50 个课件,不该因为第 3 个有问题就全停。
            progress(`✗ ${basename(file)}: ${msg}`);
          }
        }

        if (failures.length) {
          // 有成功也有失败 → 仍以非零退出,这样 shell 里 `&&` 链不会误判成全成功。
          const summary =
            results.length > 0
              ? `${results.length} published, ${failures.length} failed`
              : `all ${failures.length} failed`;
          fail(summary, failures.map((f) => `${f.file}: ${f.error}`).join("\n"));
        }
      },
    );
}
