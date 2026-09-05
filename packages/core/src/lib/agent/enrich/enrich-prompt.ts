/**
 * V27-U · Web 工作台 prompt enrichment 层
 *
 * 用户在 Web 输入"做客户提案" · enricher 用 Kimi 自己扩成
 *   "客户提案 thesis · 对标 a16z thesis blog · 长滚 hero · 8 屏 · indigo-porcelain"
 * 再把扩写后的 intent 喂给现有 generator(同样 Kimi)
 *
 * 为什么:
 *   Claude Code 调 plain MCP 时 · Claude 在外面把粗 prompt 拆细了 ·
 *   Web 用户直接打字给 Kimi · Kimi 看到的是糙糙的需求 · 写出来不够狠。
 *   这一层就是把"Claude Code 替你做的拆解"在 Web 后端补回来 · 一样用 Kimi 跑。
 *
 * 跳过条件:
 *   - kind === "edit"(用户已经在改具体某段 · 意图明确)
 *   - prompt.length > 100(用户自己写得详细了 · enrich 反而画蛇添足)
 *   - 后续: 用户选了场景 wizard 后跳过(预留)
 *
 * 失败兜底:
 *   - enrich 调用 throw / timeout → 直接返原 prompt · 不阻断主链路
 *   - 永远不让 enrich 失败把整个 turn 拉垮
 */
import { generateText, type LanguageModel } from "ai";
import { noThinking } from "@/lib/agent/provider/no-thinking";

export type EnrichInput = {
  /** 用户原始 prompt */
  prompt: string;
  /** 期望文档类型 · 给 enricher 一个 hint */
  kind: "deck" | "doc" | "sheet";
  /** 操作意图 · "generate" 才 enrich · "edit" 跳过 */
  intent: "generate" | "edit";
  /** caller 已经选了场景 wizard ? 跳过 */
  scenarioPicked?: boolean;
};

export type EnrichResult = {
  /** 是否真跑了 enrich · false = 直接返原 prompt */
  enriched: boolean;
  /** 扩写后的 prompt(或原 prompt) */
  prompt: string;
  /** 跳过的原因(透明展示用) */
  skippedReason?: "edit-mode" | "long-prompt" | "scenario-picked" | "enrich-failed";
  /** 真跑了的话 · enrich 用了多少 ms */
  durationMs?: number;
};

/** 跳过逻辑 · 集中一处 */
function shouldSkip(input: EnrichInput): EnrichResult["skippedReason"] | null {
  if (input.intent === "edit") return "edit-mode";
  if (input.prompt.trim().length > 100) return "long-prompt";
  if (input.scenarioPicked) return "scenario-picked";
  return null;
}

const ENRICH_SYSTEM_PROMPT = `你是 Plain 的 prompt enrichment 助手。

Plain 是 AI 时代的 Office · 产物是网页(deck/doc/sheet)· 不是 .pptx。

你的任务:用户给一个糙糙的需求(比如"做客户提案")· 你扩写成一个**详细的 generation intent** ·
让下游 generator 能直接出高质量产物。

扩写规则:
1. **判断场景** · 9 个标杆场景任选一个 · 推荐 V29 主题(每套独立 design system):
   - client-pitch (客户提案 a16z thesis 风) · 推荐 theme: v29-emerald(杂志 masthead 风)
   - investor-letter (投资人信 Stripe Annual Letter 风) · v29-vellum(学者夜读)
   - product-launch (产品发布 Vercel/Linear launch 风) · v29-biennale(美术馆海报 · 黄色 pop)
   - user-research (用户研究 The New Yorker 长文风) · v29-pinpaper(田野笔记本 + 别针)
   - changelog (Linear changelog 风) · v29-cobalt(graph-paper 研究公报)
   - postmortem (Cloudflare blog 事故复盘风) · v29-monochrome(账本严肃)
   - lesson (3Blue1Brown essay 教学风) · v29-emerald(editorial 长文)
   - manifesto (Stripe/Linear Why 单页) · v29-sakura(70s 卡带宣言)
   - dashboard (Dune Analytics 数据故事面板) · v29-8bit(CRT 终端)
   不在列里的场景 · 选最近的或留通用。

2. **指定 layout 组合** · 比如 cover/hero-question/stats/compare/pipeline/pull-quote/quadrant/closing。

3. **推断屏数** · brief 8-12 屏 · feature 18-28 屏 · 默认 brief。

4. **填充缺的细节** · 如果用户说"做客户提案" · 你猜"给谁/讲什么" 留 [TODO: 客户名] 占位 ·
   不要瞎编公司名。

5. **保持用户原意** · 别改主题 · 只是把"怎么呈现"补全。

输出格式 · **纯文本** · 1-3 段 · 不要 markdown 标题 / bullets · 直接给 generator 看的指令。
开头永远是"为 Plain 生成一份 {kind}:" 然后是详细 intent。

例子 输入: "做客户提案"
例子 输出:
为 Plain 生成一份 deck:客户提案场景 · 对标 a16z thesis blog 长滚动风格(不是 PPT 切片)·
约 8-10 屏。结构:cover(thesis 主张) → hero-question(为什么现在) → stats(3 个关键数据) →
compare(现状 vs 提议) → proposal(具体方案) → quadrant(赌局位置) → closing(下一步行动)。
用 v29-emerald 主题(Bodoni serif + 杂志 masthead 双横线 · editorial 严肃感)。
[TODO: 客户名 / 主题留用户补充]
`;

// moonshot-v1-128k 跑 enrich 偶发 >8s · 放宽到 14s 给足时间(失败仍有兜底,不阻断主链路)
const TIMEOUT_MS = 14000;

/**
 * 尝试 enrich · 失败兜底返原 prompt
 */
export async function enrichPrompt(
  model: LanguageModel,
  input: EnrichInput,
): Promise<EnrichResult> {
  const skipReason = shouldSkip(input);
  if (skipReason) {
    return { enriched: false, prompt: input.prompt, skippedReason: skipReason };
  }

  const start = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    const { text } = await generateText({
      model,
      system: ENRICH_SYSTEM_PROMPT,
      prompt: `kind: ${input.kind}\n用户需求: ${input.prompt}`,
      abortSignal: ac.signal,
      // enricher 不需要复杂 reasoning · 输出 1-2 段够用 · 调小加快返回(降超时概率)
      maxOutputTokens: 400,
      temperature: 1, // Kimi k2.6 仅支持 temperature=1
      ...noThinking(model),
    });
    clearTimeout(timer);

    const enriched = text.trim();
    if (!enriched || enriched.length < 20) {
      // 输出太短 · 当 enrich 失败处理
      return {
        enriched: false,
        prompt: input.prompt,
        skippedReason: "enrich-failed",
        durationMs: Date.now() - start,
      };
    }

    return {
      enriched: true,
      prompt: enriched,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    // 永远不阻断主链路
    if (process.env.NODE_ENV !== "production") {
      console.warn("[enrich] failed · fallback to original prompt:", e);
    }
    return {
      enriched: false,
      prompt: input.prompt,
      skippedReason: "enrich-failed",
      durationMs: Date.now() - start,
    };
  }
}
