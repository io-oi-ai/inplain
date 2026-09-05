# Contributing

## Setup

```bash
pnpm install
export ANTHROPIC_API_KEY=sk-...   # any one provider; or OLLAMA_BASE_URL for local
pnpm plain --help                 # run the CLI from source
```

Node 22+ and pnpm 10+.

## Before opening a PR

All four must pass:

```bash
pnpm typecheck
pnpm core:smoke      # 4 checks — parse, patch, render, export
pnpm build           # bundles the CLI, fails on Next/React/Cloudflare leakage
pnpm cli:smoke       # 11 checks — includes a live MCP server over JSON-RPC
```

`cli:smoke` starts a real MCP server and speaks JSON-RPC to it, so it catches
protocol regressions that type-checking misses. Neither suite calls an LLM.

## Layout

```
packages/core/src/
  core/index.ts     Public API surface — the barrel other packages import
  lib/v32/          Document model: schema, validation, templates, migration
  lib/render-v2/    DSL → self-contained HTML
  lib/agent/        LLM runtime: agent loop, providers, tools
  lib/export/       PPTX / DOCX / XLSX
packages/cli/src/
  commands/         One file per CLI command; mcp.ts is the MCP server
  skill/            Agent skill installed to ~/.claude/skills/plain
```

The thing to understand first: **an artifact is one source, rendered three
ways.** A deck, a doc, and a sheet share the same underlying document model.
Changes in `lib/v32/` affect all three — that's intentional.

`packages/core` must stay free of IO, network, and framework imports. The CLI
build fails the moment `next/`, `react/`, `@opennextjs/`, or `server-only`
appears in the bundle.

## Good PRs

- One concern each. A bug fix and a refactor are two PRs.
- Match the surrounding code — naming, comment density, idiom.
- Comments explain constraints the code can't show, not what the next line does.
- Changed rendering output? Say what you compared it against.

## Reporting bugs

Include the artifact source that reproduces it, what you expected, what you got,
and your provider + model. For MCP issues, name the client (Claude Code, Cursor,
…) and include the server's stderr.

## Security

Don't file security issues publicly — see [SECURITY.md](./SECURITY.md).
