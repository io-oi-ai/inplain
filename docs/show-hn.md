# Show HN 发帖包

> 内部文档，不进 README。发完可删。

---

## 标题

```
Show HN: Plain – Plain-text source for agent-generated decks, docs, and sheets
```

**备选**（如果想更挑衅一点，主动邀请 file-vs-link 那场争论）：

```
Show HN: Plain – Agents generate shareable web pages, not .pptx files
```

避开的词：AI、beautiful、stunning、in seconds、PowerPoint。调研里七个用了这类词的
slide 生成器全部拿到 1-2 分。

---

## URL

```
https://github.com/io-oi-ai/inplain
```

---

## 正文（首条评论，帖子发出后立刻贴）

Hi HN — Plain is an MCP server and CLI that lets a coding agent produce a
finished deck, doc, or dashboard mid-task.

**Disclosure first:** I also run inplain.app, a hosted version. This repo is
MIT and complete — the CLI, the MCP server, the document model, all 37
templates, and the renderers. The hosted service adds a web editor and link
hosting. Nothing here is crippled to upsell that; if it were, you'd find it in
five minutes and rightly say so.

**The problem I kept hitting.** Agents are good at deciding what a document
should say. They're bad at producing one. Ask Claude Code for a deck and you
get either a `.pptx` blob it can't inspect afterwards, or a wall of HTML it
can't reliably edit — the next change regenerates the whole file and quietly
loses your tweaks.

**What Plain does differently.** The source stays plain text — Markdown, CSV, a
small block DSL — and the output is one self-contained HTML file. So editing is
a JSON Patch, not a regeneration:

    plain deck edit q3.md --patch '[
      {"op":"replace","path":"/sections/1/items/0/value","value":"42%"}
    ]'

That runs locally with no LLM call. The agent can also do it in natural
language, but the deterministic path is there when you want it, and it's what
makes iterative editing survive.

Deck, doc, and sheet are the same document model rendered three ways. A doc can
embed a dashboard panel; a deck can reference a sheet's column. That's the
architectural bet — one model, three expressions — and it's why this isn't
three separate tools in a trenchcoat.

**Why both an MCP server and a CLI.** I know the anti-MCP argument on here, and
I think it's largely right: MCP tool definitions eat context whether or not you
use them. Plain's 12 tools cost roughly 1–1.5k tokens of schema. If that's too
much for your setup, skip the MCP server entirely — `plain generate` and
`plain export` do the same work from a shell, and pipe cleanly. Same binary,
same code path, no server.

**Local.** Point `OLLAMA_BASE_URL` at a local Ollama and nothing leaves your
machine. Or bring an Anthropic/OpenAI/Google/Moonshot/DeepSeek key — tokens
bill to your account, not through me. Each agent role (router, generator,
editor) can use a different model.

**What it's bad at:**

- Office export only handles the older Marp-style source, not the v2 format
  `generate` produces. Web-native HTML is the real path; `.pptx` is a
  compatibility fallback and it shows.
- The CLI bundle is ~9 MB, mostly marp-core pulling in mathjax.
- No WYSIWYG editor. Editing is text or patches.
- Generation quality is bounded by your model. A local 8B produces 8B-quality
  slides.
- The document model changed shape twice (v1 → v31 → v32). Some code paths
  still carry v1 compatibility.

**Output you can look at before installing anything** — each is one
`plain generate` call, published as it came out:

- deck: https://io-oi-ai.github.io/inplain/examples/deck.html
- doc: https://io-oi-ai.github.io/inplain/examples/doc.html
- sheet: https://io-oi-ai.github.io/inplain/examples/sheet.html

**Try it:**

    npm install -g @inplain/cli
    export ANTHROPIC_API_KEY=sk-...      # or OLLAMA_BASE_URL
    plain install                        # writes MCP config for Claude Code / Cursor
    plain generate "Q3 board update" --as deck -o out.html

Two smoke suites (`pnpm core:smoke`, `pnpm cli:smoke`) run without an LLM or a
network, so you can verify the pipeline before spending a token. The second one
starts a real MCP server and speaks JSON-RPC to it.

Nearest neighbours, since someone will ask: Marp and Slidev are the renderers I
learned from — they have no generation layer. Presenton is the mature open
source deck generator, decks only. HermesOffice covers three formats locally
too, and is worth a look. What I haven't found elsewhere is the combination of
one document model across the three, a text source an LLM can patch, and MCP as
a first-class surface.

Happy to answer anything — including the parts I got wrong.

---

## 评论区预判（调研 + 代码实测）

**"Why MCP instead of a CLI / a Skill?"** — 最可能被问的。正文已预先回答：两个都有，
同一份代码。Webctl 靠"拒绝 MCP"拿 134 分，mcp2cli 靠"替代 MCP"拿 146 分——这是 2026
的活跃战场，必须先手。

**"MCP tool 定义占多少 context?"** — 12 个 tool，描述 ~747 tokens，加 schema 约 1–1.5k。

**"Does it work with Ollama?"** — 是。`OLLAMA_BASE_URL` 一个变量。HN 重奖这一条。

**"这是不是 SaaS 漏斗?"** — 正文前三行已披露。调研明确说：未披露的商业钩子是最快的翻车方式。

**"Show me output you didn't cherry-pick."** — 准备好现场用评论区给的题目跑一个，贴链接。

**"HermesOffice / LobsterAI 跟你什么区别?"** — HermesOffice 546★ 同样三形态 + 本地，
LobsterAI 5982★ 还在高速迭代。正文点名了 HermesOffice。区别落在：一套文档模型 +
可 patch 的文本源 + MCP 一等公民。**不要贬低它们**——HN 反感这个。

**"为什么不用 reveal.js / Marp?"** — Plain 的渲染层就是从它们学的。差别在生成 +
可编辑性，不在渲染。

**"v1/v31/v32 三代模型是什么情况?"** — 正文"what it's bad at"已自曝。诚实承认演进痕迹
比被人发现好。

---

## 发帖时机

**推荐：周二或周三，13:00–15:00 UTC**（美西早 6–8 点 / 美东 9–11 点）。

避开：
- 苹果九月发布会窗口（历来霸屏）
- 周五和周末（讨论型帖子靠评论，周末没人吵）
- 发帖当周如有 Anthropic/OpenAI/Google 的模型发布，顺延——那类新闻会淹没 MCP 相关帖

硬约束（来自 188k 帖样本研究）：
- **半衰期 24 小时**，92% 的影响在 48 小时内落定。发帖当天清空日程守评论区。
  作者响应速度是唯一可控的最强变量。
- 每个 upvote ≈ 1.4 个 star，但高分段衰减（700+ 分的帖平均只有 0.79 star/分）。
- HN 得分与 star 数相关性 r = 0.29——**只解释 8% 的方差**。评论数相关性 r = 0.10，
  基本无关。Show HN 是一次脉冲，不是增长策略。仓库必须在发帖前就打磨好。

Semble 发了三次（7 分 → 8 分 → 445 分）。首发不理想不是终点，改好了可以再发。

---

## 发帖前最后检查

- [x] 三个真实产物链接可访问，且不是手工调过的
      → io-oi-ai.github.io/inplain/examples/
- [x] `npm install -g @inplain/cli` 能装 —— 0.6.0 已发布，干净环境实测通过
- [x] `plain install` 写出的 MCP 配置正确（隔离 HOME 实测，三个工具都写对）
- [x] README 首屏是差异化 + 可点的产物链接
- [ ] 清空发帖当天日程（唯一还差的）
