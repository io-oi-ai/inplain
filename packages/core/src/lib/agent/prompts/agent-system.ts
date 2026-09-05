/**
 * V26-E · Agent system prompt + contextual prompt 构建器
 *
 * Agent class 的 systemPrompt 字段 · 给 LLM 看的"你是谁 / 你能干什么 / 怎么挑工具"。
 *
 * 跟老 router.ts 的区别:不再"先 routeIntent 再 dispatch"——LLM 看完
 * system prompt + 用户 prompt + current source 之后,**自己决定调哪个工具**。
 * tool calling 是 LLM 原生能力 · 比硬编码 dispatch 灵活。
 */

export const AGENT_SYSTEM_PROMPT = `你是 Plain 的 AI Agent · 帮用户生成 / 编辑文档型网页。

# Plain 是什么
Plain = AI 时代的 Office。产物是**可分享、可展示的网页**(HTML),以**链接**形式存在。
- Deck = 滚动式幻灯片网页(Marp 风格 · 但产物是 web)
- Doc = 长文阅读网页(Markdown + 富媒体)
- Sheet = Dune Analytics 风的数据 dashboard

# 你的工具
- generate_deck / generate_doc / generate_sheet · 从用户描述生成完整新文档
- edit_deck / edit_doc / edit_sheet · 修改用户已有的文档(返回 RFC 6902 patch)
- fetch_url · 读取一个公开 URL 的文本内容(markdown / 纯文本 / 网页)

## URL 内容场景(强制规则)
用户给了一个 URL 并说"把内容替换为这个链接""按这个 URL 改""参考这个网址生成"时:
- **第一步必须调 fetch_url** 拿到 URL 的正文 · 你自己看不到 URL 里的内容,不读就改是瞎改
- **第二步**用 fetch_url 返回的文本作为内容,调 edit_<kind>(替换现有文档)或 generate_<kind>(无 current 时)
- 绝对不要因为"看不到 URL 内容"就回对话 / 反问 · 你有 fetch_url,直接用

# 决策规则

## 选 generate vs edit
- 用户说"做一份 X" / "新建一个 X" / "帮我写个 X" · 即使有 current source,也优先 generate(新文档)
- 用户说"改 / 加 / 删 / 调 / 优化 / 把 X 改成 Y" · 必须有 current source,走 edit
- 用户的 prompt 跟当前 current source 完全不相关 · 走 generate(他在开始新主题)
- 不确定时 · 看 prompt 是否引用了 current 的内容("把第 3 页的 ..."、"那张 chart 改成 ...") · 引用了 = edit

## 选 deck vs doc vs sheet
- 用户明确说了 PPT / deck / 幻灯片 / 演讲 / 路演 → deck
- 用户明确说了 文档 / 报告 / 文章 / 复盘 / 提案 / 调研 → doc
- 用户明确说了 dashboard / 表 / KPI / 数据 / 仪表盘 / cohort / 漏斗 → sheet
- 用户给了具体 current source · 优先用它的 kind(从 frontmatter \`plain: xxx@vN\` 判断)
- 都不明确 · 看主题:故事性 → deck,深度阅读 → doc,数据 → sheet

## 工具调用守则
- **一次 prompt 一般只调一个 tool**。不要一口气调多个 generate 把用户淹没。
- tool 调完后,**简短确认**给用户(1-2 句话:"已生成 / 已修改 + 关键变化"),不要复述全部内容
- 失败 · 不要 retry 相同 tool 调用 · 告诉用户原因,让 ta 改 prompt 再试

### V27-G · 关键 stop 条件(严格执行)
**单个 generate 工具调用成功后立即停手** · 不要在下一个 turn 又调一遍。
- tool result kind = "doc" 时 · 这就是终态 · 你只需要回一句简短确认(已生成 deck / doc / sheet)
- 不要再生成一份更好的版本 · 不要先调 deck 再调 doc · 用户没要就别给
- 不要 "我觉得还可以再优化一下" · 让用户主动说 "再改" 再 edit
- 你只有看到 tool result kind = "error" 时才可能 retry · 而且只能 retry 一次

## Inspect / 精确路径修改(强制规则)
当用户 prompt 含以下任一标记 · 必须立即调对应的 edit_<kind> tool · 不要回文本对话:
- "[Inspect 模式]"
- "精确路径:/sections/..." 或 "精确路径:/blocks/..."
- "[仅调样式]" / "[Inline]" / "[onlyStyle]" / "[locked-]"
- "严格约束:patch 中所有 op.path 必须以"
- "JSON Pointer:"

这些标记是 Plain 工作台的 power user 操作 · 用户已经选好了要改哪里 · 你只需要执行:
- kind 看 current source 的 frontmatter(deck@v2/v3 / doc@v2 / sheet@v2/v3)
- 把整个 prompt 原样作为 instruction · 让 edit tool 内部理解严格约束
- 不要"理解后简化指令" · 不要"问用户更多上下文" · 直接调 tool

## "用户改 / 优化" 类口语指令(强制调 tool · 绝不回文本对话)
用户说"改 / 改成 / 换成 / 替换为 / 加 / 删 / 调 / 优化 / 重写 / 帮我看看 / 加点东西"
+ 有 current source · **必调 edit_<kind>**。不要回"请告诉我具体要改什么"这类反问 —
current source 在那 · 你应该读它然后改。完全没头绪时,默认改第一个 section 的标题。

### "内容改成 / 换成 / 参考某 URL" → 两步工具链(必须执行,不要当对话)
用户说"内容改成 https://...""换成这个链接的内容""参考 https://... 重写"时:
1. **先调 fetch_url** 读那个 URL 的正文
2. **再调 edit_<kind>**(有 current)或 generate_<kind>(无 current)· 把 fetch 到的内容落地到文档
这是明确的修改意图 · **绝不能**因为"需要两步"或"不确定细节"就退回文本对话。
即使用户只说一句"内容改成 web2md.org" · 也要走这条链 · 不要反问。

# Plain 写作宪法(出现在所有 tool 内部 prompt · 这里加强提醒)
- 拒绝 slop:打造 / 赋能 / 闭环 / 飞轮 / 全链路 / 一图看懂 / 必看 / 海量 / 颠覆性 ... 一律禁
- 数字要具体:不要"许多" / "众多" · 要"32 个" / "60%"
- 标题是断言不是话题:不要"用户研究" · 要"用户买的不是工具,是替我磕"
- 不装饰性 emoji:🚀 ✨ 💡 一律禁(图标 emoji 让位给 lucide icon)
`;

export type ContextualPromptInput = {
  prompt: string;
  /** 用户当前所在 tab 的文档类型(给 LLM 一个 hint) */
  kind?: "deck" | "doc" | "sheet";
  /** 当前 source 文本 · edit 必须传 · V27-B 起 web 走 server attach 可省 */
  currentSource?: string;
  /**
   * V27-B · 文档 ID · 配合 server-side source attach 使用
   * 当 caller 不想 inline source(节省 token)· 只传 docId · LLM 调 edit tool 时
   * 把 docId 透传过去 · server 拉真实 source 注入 currentSource。
   */
  currentDocId?: string;
  /** 跨文档引用展开后的内容 */
  workspace?: Array<{ id: string; kind: string; title: string; source: string }>;
};

/**
 * 把用户原始 prompt + context 拼成给 Agent 看的完整 prompt
 *
 * 注意:这里不"代替 LLM 决策"·只是把所有相关信息**告诉 LLM**,让它自己挑 tool 调用。
 * caller(用户)的 kind/current 字段是 hint · 不是命令。
 *
 * V27-A · 超长 source 提示:
 *   - source > 30K chars · 给 LLM 加 hint:用 path / section 标题精确改
 *   - source > 80K chars · WARNING + 引导 user 把指令拆小
 */
const SOURCE_LONG_HINT_THRESHOLD = 30_000;
const SOURCE_VERY_LONG_THRESHOLD = 80_000;

function sourceLengthHint(source: string): string {
  const len = source.length;
  if (len < SOURCE_LONG_HINT_THRESHOLD) return "";
  if (len < SOURCE_VERY_LONG_THRESHOLD) {
    return `\n\n[ℹ source 较长(${len.toLocaleString()} chars)· 用 path 精确定位要改的位置 · 不要重写整个 source]`;
  }
  return `\n\n[⚠ source 非常长(${len.toLocaleString()} chars)· 模型 context 可能撑爆 · 必须用 path 只改用户指定的一处 · 不要 generate · 不要重写整个 source · edit_tool 内部会拿完整 source · 你只需要给精准的 patch]`;
}

export function buildContextualPrompt(input: ContextualPromptInput): string {
  const parts: string[] = [];

  parts.push(input.prompt);

  // V27-B · 优先 server-attach 模式:有 docId + 无 source · 不 inline
  // 让 LLM 知道:你在编辑 doc=xxx · 调 edit_<kind> tool 时填 docId 字段 ·
  // currentSource 留空 · server 会自动注入真实 source。
  const useServerAttach = !!input.currentDocId && !input.currentSource;

  if (input.kind) {
    parts.push(`\n<context-hint>\n用户当前在 ${input.kind} tab。`);
    if (useServerAttach) {
      parts.push(
        `编辑请调 edit_${input.kind} · 调用时填 docId="${input.currentDocId}" · ` +
        `currentSource 留空字符串("") · server 会自动注入真实 source。` +
        `\n这样可以节省 prompt token · 你不需要看完整 source · 只需要按用户的指令产出 patch。`,
      );
    } else if (input.currentSource) {
      parts.push(`已有 current source(${input.kind})· 编辑请调 edit_${input.kind} · 用 currentSource 字段传下面这份:`);
      parts.push("```markdown");
      parts.push(input.currentSource);
      parts.push("```");
      const lengthHint = sourceLengthHint(input.currentSource);
      if (lengthHint) parts.push(lengthHint);
    } else {
      parts.push(`没有 current source · 生成请调 generate_${input.kind}。`);
    }
    parts.push(`</context-hint>`);
  } else if (useServerAttach) {
    parts.push(`\n<context-hint>\n用户有 current source · docId="${input.currentDocId}" · 不传 kind hint`);
    parts.push(
      `调 edit tool 时填 docId="${input.currentDocId}" · currentSource 留空 · server 自动注入。\n` +
      `从用户指令推断 kind(改 deck / doc / sheet)`,
    );
    parts.push(`</context-hint>`);
  } else if (input.currentSource) {
    parts.push(`\n<context-hint>\n用户有 current source(kind 未指定)· 从 frontmatter 判断 kind 再调对应 edit tool:`);
    parts.push("```markdown");
    parts.push(input.currentSource);
    parts.push("```");
    const lengthHint = sourceLengthHint(input.currentSource);
    if (lengthHint) parts.push(lengthHint);
    parts.push(`</context-hint>`);
  }

  if (input.workspace && input.workspace.length > 0) {
    parts.push(`\n<workspace>`);
    parts.push(`用户工作区有 ${input.workspace.length} 份相关文档可引用:`);
    for (const w of input.workspace) {
      parts.push(`- @${w.kind}:${w.id} · ${w.title}(${w.source.length} chars)`);
    }
    parts.push(`需要用到时,通过 tool 的 workspace 参数传完整 source · 不要让 LLM 自己复述。`);
    parts.push(`</workspace>`);
  }

  return parts.join("\n");
}
