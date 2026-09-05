/**
 * 输出工具:默认人类可读(stderr 进度 + stdout 主结果),--json 切机器模式。
 *
 * 设计参考 gh CLI:
 * - 主结果走 stdout(可被 pipe / 重定向)
 * - 进度 / reasoning / 错误走 stderr
 * - --json 时 stdout 是单一 JSON 对象,stderr 仍是进度(便于 agent 过滤)
 */

export type OutputMode = "human" | "json";

let mode: OutputMode = "human";

export function setOutputMode(m: OutputMode): void {
  mode = m;
}

export function getOutputMode(): OutputMode {
  return mode;
}

/** 主结果 — 走 stdout。human 模式直接打印,json 模式打 JSON.stringify。 */
export function emit(data: unknown, humanFmt?: (d: unknown) => string): void {
  if (mode === "json") {
    process.stdout.write(JSON.stringify(data) + "\n");
  } else if (humanFmt) {
    process.stdout.write(humanFmt(data) + "\n");
  } else if (typeof data === "string") {
    process.stdout.write(data + "\n");
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  }
}

/** 进度 / 状态 — 走 stderr,JSON 模式下也可见(agent 决定要不要忽略)。 */
export function progress(msg: string): void {
  process.stderr.write(`${dim(msg)}\n`);
}

/** 失败 — 走 stderr,exit 1。 */
export function fail(msg: string, detail?: unknown): never {
  process.stderr.write(`${red("✗")} ${msg}\n`);
  if (detail) process.stderr.write(`${dim(String(detail))}\n`);
  process.exit(1);
}

// 颜色控制:不依赖 chalk,minimal ANSI。NO_COLOR / 非 TTY 时关闭。
const useColor = process.stderr.isTTY && !process.env.NO_COLOR;
const dim = (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);
const red = (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
