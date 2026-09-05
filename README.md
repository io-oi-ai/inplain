# Plain

**Presentations, reports, and dashboards your AI agent can actually make.**

Plain turns one sentence into a finished artifact — a deck, a long-form doc, or
a data dashboard — rendered as a self-contained web page. It ships as a CLI and
an [MCP](https://modelcontextprotocol.io) server, so Claude Code, Cursor, or any
MCP-aware agent can produce one mid-task and hand back the result.

```bash
npm install -g @inplain/cli
export ANTHROPIC_API_KEY=sk-...        # or OPENAI_API_KEY, or OLLAMA_BASE_URL
plain install                          # wires it into Claude Code / Cursor / VS Code
```

Then, from inside your agent:

> "Read src/payments and build me an 8-page deck on what shipped this sprint."

## Why an agent needs this

Agents are good at deciding *what* a document should say. They're bad at
producing the document — most tooling makes them emit a `.pptx` blob they can't
inspect, or raw HTML they can't reliably edit later.

Plain's artifacts are **plain text in, web page out**:

- **Source is text** — Markdown, CSV, a small DSL. An LLM can edit it precisely
  with a JSON Patch instead of regenerating the whole thing.
- **Output is a self-contained page** — one HTML file, no build step, no runtime.
- **Office formats are an export**, not the product. `.pptx` / `.docx` / `.xlsx`
  exist for people who need them.

One model, three expressions:

| Form | Is | Source |
|---|---|---|
| **deck** | A presentation — scroll or present mode | Markdown |
| **doc** | A long-form report with charts and diagrams | Markdown + frontmatter |
| **sheet** | A data dashboard (KPIs, charts, tables) | CSV + prose + chart spec |

## Use it

**As an MCP server** — what most people want:

```bash
plain install          # writes config for Claude Code / Cursor / VS Code
plain mcp              # or run it in the foreground to debug
```

Tools: `generate_artifact`, `edit_artifact`, `export`, plus per-form variants
and offline Office exporters. `generate_artifact` publishes the result and
returns a shareable URL alongside the source.

**As a CLI** — scriptable, pipes cleanly:

```bash
plain generate "Q3 board update" --as deck -o out.html
plain export out.md --to pptx
plain deck edit out.md --patch '[{"op":"replace","path":"/slides/0/title","value":"Q3"}]'
```

**As a library** — the rendering pipeline is a plain dependency:

```ts
import { marpToDeck, deckDocToPptx, findRefs } from "@inplain/core";
```

## Model backends

Any one of these works:

| Provider | Env var |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Moonshot | `MOONSHOT_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| **Ollama (local)** | `OLLAMA_BASE_URL=http://localhost:11434` |

With Ollama, nothing leaves your machine. Each agent role (router, generator,
editor) can point at a different model via `ROUTER_PROVIDER` / `GENERATOR_MODEL`
and friends.

## What's in here

```
packages/core/    Rendering pipeline, document model, serializers, Office export
packages/cli/     @inplain/cli — the CLI, the MCP server, and the agent skill
scripts/          Smoke tests (no LLM calls, no network)
```

`packages/core` is where an artifact becomes a web page: the V32 document model,
37 templates, the theme engine, and the deck/doc/sheet renderers. It's pure
functions — no IO, no network, no framework.

## Develop

```bash
pnpm install
pnpm plain --help          # run the CLI from source
pnpm build                 # bundle it
```

Four checks, all must pass:

```bash
pnpm typecheck
pnpm core:smoke            # 4 checks — parse, patch, render, export
pnpm build
pnpm cli:smoke             # 11 checks — including a live MCP server over JSON-RPC
```

Neither smoke suite calls an LLM or touches the network, so they run anywhere.

## Hosted version

[inplain.app](https://inplain.app) runs a hosted workspace on top of this — a
web editor, shared links, and a managed model gateway. Everything in this
repository works fully against your own API keys; the hosted service is
optional.

## License

[MIT](./LICENSE)
