/* CF build stub — desktop-only module, never runs on the worker.
 * Real impl stashed by scripts/cf-build.mjs (saves a 3rd marp-core copy, ~1MiB gz). */
import type { DocKind, WorkspaceContext } from "@/core";

export type RenderOpts = {
  themeOverride?: string;
  customTokens?: unknown;
  animate?: boolean;
  readOnly?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function renderHtml(
  _kind: DocKind,
  _source: string,
  _workspace: WorkspaceContext,
  _opts: RenderOpts = {},
): string {
  throw new Error("client-bridge render-impl is desktop-only; unavailable on Cloudflare Workers");
}
