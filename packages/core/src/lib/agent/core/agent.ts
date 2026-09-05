/**
 * V26-A · Agent class · 跟随 pi-agent-core 抽象
 *
 * V26-A.3 升级:接入 tool calling state machine
 *
 * 责任:
 * 1. 维护当前 session 的 AgentMessage[] state
 * 2. 接收 prompt() · emit 标准 AgentEvent 流
 * 3. 串 transform/convert 把 chat history 喂给 LLM
 * 4. 调用 Tool(本轮起接入)· 处理 tool calling loop
 * 5. 跨 turn 状态机(LLM 调工具 → 工具结果回 LLM → LLM 继续 · 直到无 tool_call · 或达 maxTurns)
 *
 * 借鉴来源:
 * - pi-agent-core README 的 Quick Start + Event Flow + tool execution mode
 */

import { generateText, streamText, type LanguageModel, type ModelMessage } from "ai";
import { jsonSchema, tool as aiTool } from "ai";
import { z } from "zod";

import type { AgentEvent, AgentEventListener } from "./events";
import type {
  AgentMessage,
  AgentAssistantMessage,
  AgentToolResultMessage,
  LlmToolCall,
  ToolResultPayload,
} from "./message";
import {
  appendDelta,
  convertToLlm,
  emptyAssistantMessage,
  genMessageId,
  markDone,
  markError,
  userMessage,
} from "./message";
import {
  defaultTransform,
  type TransformContext,
} from "./transform-context";
import type { Tool, ToolContext, ToolRegistry } from "./tool";
import { RuleRuntime } from "../rules/runtime";
import type { StreamingRule } from "../rules/types";
import { noThinking } from "../provider/no-thinking";

export type AgentInitialState = {
  /** System prompt(可空 · 但应该指定) */
  systemPrompt?: string;
  /** LanguageModel 实例(走 provider/getModel 包出来) */
  model: LanguageModel;
  /** 已有的 chat 历史 */
  messages?: AgentMessage[];
  /** 可选 transform · 默认 defaultTransform({recentPairs:6}) */
  transformContext?: TransformContext;
  /** 工具注册表 · V26-A.3 起接入 */
  tools?: ToolRegistry;
  /**
   * V26-D · Streaming rule 集 · token-level 检测 + 中断 + 注入 reminder
   * 默认空数组 · caller 传 PLAIN_DEFAULT_RULES 启用 slop 拦截
   */
  rules?: StreamingRule[];
  /**
   * 最大 turn 数(防止 tool calling / rule retry 死循环 · 默认 8)
   * 一个 turn = LLM 调一次 · 可能含 tool calls · tool 结果回 LLM 算下一个 turn。
   */
  maxTurns?: number;
  /**
   * V27-B · server-side source attach
   * 当 web 工作台不想把 source inline 进 prompt(避免超长 context · 模型空回)·
   * 由 caller 提供这个 callback · edit tool 内部 currentSource 为空时通过它从 server
   * 读真实 source。docId 由 PromptOptions.docId 传入。
   *
   * 不提供 = CLI / desktop / MCP 默认行为(source 仍由 LLM 在 tool args 里写)。
   */
  sourceResolver?: (docId: string) => Promise<string | null>;
  /**
   * 计费 · token usage 回调。Agent 在每次 LLM 调用(外层 streamText + tool 内
   * generate/edit 的 streamObject)拿到 usage 后调这个,caller 累加后扣积分。
   * 不提供 = 不计费(CLI 走 gateway 自己计 · desktop/MCP 暂不计)。
   */
  onUsage?: (u: { inputTokens: number; outputTokens: number }) => void;
};

export type PromptOptions = {
  attachments?: Array<{ url: string; mimeType?: string; alt?: string }>;
  signal?: AbortSignal;
  /** 给 emit 的事件用 · 标记本次 prompt 关联哪个文档 */
  docId?: string;
  /**
   * 本次 prompt 明确期望调 tool(生成/编辑场景)。
   * 当 LLM 没调任何 tool(把指令当对话)时,Agent 注入强 reminder 自动重试一轮,
   * 而不是直接放弃报"didn't call any tool"。caller(web/cli)在 generate/edit 场景传 true。
   */
  expectTool?: boolean;
  /**
   * 旁路 LLM tool-calling · 直接执行指定 tool。
   *
   * 背景:ai-sdk 在 Cloudflare Workers(workerd)运行时对 OpenAI-compat provider
   *   (moonshot / deepseek 等)的 tool-call arguments 解析有 bug —— 线上拿到的
   *   tc.input 是被截断的 JSON 字符串(如 17 字符 `{\n "prompt": "`),本地 node
   *   则正常返回 object。换 provider 无效(本地全正常、线上全坏)→ 根因在运行时。
   *
   * 当 caller 已经知道意图(generate/edit + kind 明确,工作台天然如此)时,
   *   传 forceToolCall 直接调对应 tool,完全绕开最易坏的"LLM 决定 tool + 传 args"
   *   环节。tool 执行 / streaming / event / 计费全部复用,只是 input 由 caller 给。
   */
  forceToolCall?: { toolName: string; input: unknown };
};

/**
 * Agent class · 一个 session 一个实例 · stateful
 *
 * 不持久化 · caller 自己决定怎么 sync state(Plain web 走 useChatHistory · cli 走 stdout)
 */
export class Agent {
  private readonly model: LanguageModel;
  private readonly systemPrompt?: string;
  private readonly transformContext: TransformContext;
  private readonly maxTurns: number;
  private readonly tools: ToolRegistry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly toolMap: Map<string, Tool<any>>;
  private readonly rules: StreamingRule[];
  private readonly listeners = new Set<AgentEventListener>();
  private messages: AgentMessage[];
  /** V26-D · 单 session 共享 rule runtime · 跨 turn hit count / session reminder 累积 */
  private ruleRuntime: RuleRuntime | null = null;
  /**
   * V26-F · 同 tool 连续失败计数 · 触达 maxToolFails(默认 2)→ 立即停 turn loop
   * 防止 LLM 看到 patch failed 又反复调同一 tool 失败 · 烧 token 而无进展。
   */
  private readonly consecutiveToolFails = new Map<string, number>();
  private readonly maxToolFails = 2;
  /** V27-B · server-side source resolver(可选) */
  private readonly sourceResolver?: (docId: string) => Promise<string | null>;
  /** 计费 · token usage 回调(可选) */
  private readonly onUsage?: (u: { inputTokens: number; outputTokens: number }) => void;
  /** 当前 prompt 关联的 docId · 让 tool ctx.getSource() 在不显式传参时也能拿 */
  private currentDocId?: string;
  /** 本次 prompt 是否调用过任何 tool(用于 expectTool 强制重试判断) */
  private toolCalledThisPrompt = false;

  constructor(init: AgentInitialState) {
    this.model = init.model;
    this.systemPrompt = init.systemPrompt;
    this.transformContext = init.transformContext ?? defaultTransform();
    this.maxTurns = init.maxTurns ?? 8;
    this.tools = init.tools ?? [];
    this.toolMap = new Map(this.tools.map((t) => [t.name, t]));
    this.rules = init.rules ?? [];
    this.messages = [...(init.messages ?? [])];
    this.sourceResolver = init.sourceResolver;
    this.onUsage = init.onUsage;
    if (this.rules.length > 0) {
      this.ruleRuntime = new RuleRuntime({
        rules: this.rules,
        emit: (e) => this.emit(e),
      });
    }
  }

  subscribe(fn: AgentEventListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getMessages(): readonly AgentMessage[] {
    return this.messages;
  }

  appendMessage(msg: AgentMessage): void {
    this.messages.push(msg);
  }

  /**
   * 发起一次 prompt · 完整事件序列(含 tool calling):
   *   agent_start
   *   → turn_start
   *     → message_start(user) · message_end(user)         (只在 turn 1)
   *     → message_start(assistant) · message_update * N · message_end(assistant)
   *     → [tool_execution_start · tool_execution_update * N · tool_execution_end] * M
   *     → message_start(tool_result) · message_end(tool_result)  (每个 tool 一个)
   *   → turn_end
   *   → (有 tool calls 时回到 turn_start 跑下一回合)
   *   → agent_end
   */
  async prompt(input: string, opts: PromptOptions = {}): Promise<void> {
    const newMessagesStart = this.messages.length;
    // V27-B · 保存本次 prompt 的 docId · tool ctx.getSource() 用
    this.currentDocId = opts.docId;
    this.toolCalledThisPrompt = false; // 本次 prompt 重置

    this.emit({ type: "agent_start", prompt: input, docId: opts.docId });

    // V27-A · 超长 prompt 提示(currentSource inline 进来导致 prompt 大)
    // 阈值 80K chars ≈ 25K tokens · GPT-4 / Sonnet 都还能扛但偶发 NO_OUTPUT
    // emit 一个 reasoning 让 UI 可选展示"source 较长 · 建议改用 inspect 精确编辑"
    if (input.length > 80_000) {
      this.emit({
        type: "reasoning",
        source: "progress",
        text: `source 较长(${input.length.toLocaleString()} chars)· 模型偶发空回的概率更高 · 建议:用 inspect 模式点元素精确改 · 或拆成小指令分步执行`,
      });
    }

    // 1. Append user message(turn 1 才做)
    const userMsg = userMessage(input, opts.attachments);
    this.messages.push(userMsg);
    this.emit({ type: "message_start", message: userMsg });
    this.emit({ type: "message_end", message: userMsg });

    // 1.5 · 旁路 tool-calling(forceToolCall)· 见 PromptOptions.forceToolCall 注释。
    //   caller 已知意图时直接执行指定 tool,绕开 workerd 上损坏的 LLM tool-call 解析。
    //   成功 → emit agent_end 直接返回;失败 → fallthrough 到正常 LLM turn loop 兜底。
    if (opts.forceToolCall) {
      const ok = await this.runForcedToolCall(opts.forceToolCall, opts, newMessagesStart);
      if (ok) {
        this.emit({ type: "agent_end", messages: this.messages.slice(newMessagesStart) });
        return;
      }
      this.emit({
        type: "reasoning",
        source: "progress",
        text: "直调工具未成功 · 回退到常规 agent 流程",
      });
    }

    // 2. Turn loop
    //
    // V27-A · 处理 ai SDK 抛 "No output generated. Check the stream for errors."
    // 这类错(LLM stream 结束但 0 output)· 通常是模型偶发或 context 满了。
    // 自动 retry 一次(prompt 不变),命中率 ~50%。仍然失败 → emit 友好错误。
    let attempts = 0;
    const MAX_ATTEMPTS = 2;
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        for (let turnIndex = 1; turnIndex <= this.maxTurns; turnIndex++) {
          const shouldContinue = await this.runOneTurn(turnIndex, opts);
          if (!shouldContinue) break;
        }
        // 硬保底:期望调 tool 但 LLM 把指令当对话(一个 tool 都没调)→ 注入强
        // reminder 再跑一轮,而不是直接报"didn't call any tool"。moonshot 等模型
        // 对"内容改成 X / 换成某 URL"这类常误判为聊天 · prompt 软引导不够可靠。
        if (opts.expectTool && !this.toolCalledThisPrompt) {
          this.messages.push({
            type: "user",
            id: `force_tool_${newMessagesStart}`,
            createdAt: Date.now(),
            content:
              "你刚才没有调用任何工具,只回了文本。这是错误的 —— 用户明确要修改/生成文档,不是聊天。" +
              "现在**必须**调用对应的 tool:有 current source 调 edit_<kind>;要从 URL 取内容先调 fetch_url 再 edit/generate;" +
              "全新生成调 generate_<kind>。不要再回文本,直接调 tool。",
          });
          for (let turnIndex = 1; turnIndex <= this.maxTurns; turnIndex++) {
            const shouldContinue = await this.runOneTurn(turnIndex, opts);
            if (!shouldContinue) break;
          }
        }
        // 跑完没抛 → break 出 retry 循环
        break;
      } catch (e) {
        const rawMessage = e instanceof Error ? e.message : String(e);
        const rawCode = e instanceof Error && "code" in e ? String((e as { code: unknown }).code) : "AGENT_ERROR";

        // V27-L · PLAIN_DEBUG 时把原始 e + stack + cause 一起 dump
        // 让用户能看到"terminated"背后是 fetch / Moonshot / gateway 哪一层
        if (process.env.PLAIN_DEBUG) {
          try {
            const ser = JSON.stringify(
              e,
              ["message", "name", "stack", "cause", "code", "statusCode", "responseBody"],
              2,
            ).slice(0, 1500);
            console.error(`[plain debug] raw catch in prompt() loop:\n${ser}`);
            if (e instanceof Error && e.stack) {
              console.error(`[plain debug] stack:\n${e.stack.split("\n").slice(0, 10).join("\n")}`);
            }
          } catch {}
        }

        // 识别"No output generated"类错(ai SDK 抛的)
        const isNoOutput = /no output generated|check the stream for errors/i.test(rawMessage);

        // V27-G · ai-sdk NoOutputGeneratedError 真实 LLM 错误的提取
        // ai-sdk 6.x 把底层错误塞在 e.cause(可能多层)· 兼容 chain.
        const underlyingMessage = (() => {
          if (!(e instanceof Error)) return null;
          const visited = new Set<unknown>();
          let cur: unknown = e;
          for (let depth = 0; depth < 5; depth++) {
            if (!cur || visited.has(cur)) break;
            visited.add(cur);
            const o = cur as {
              cause?: unknown;
              message?: string;
              responseBody?: string;
              statusCode?: number;
              data?: { error?: { message?: string } };
            };
            // ai-sdk APICallError 把详细错误存在 responseBody / data.error.message
            if (o.data?.error?.message) return o.data.error.message;
            if (o.responseBody) return typeof o.responseBody === "string" ? o.responseBody : JSON.stringify(o.responseBody);
            // statusCode 单独有用
            if (o.statusCode && !o.message?.includes(`${o.statusCode}`)) {
              if (o.message) return `${o.message} (HTTP ${o.statusCode})`;
              return `HTTP ${o.statusCode}`;
            }
            // 沿着 cause 链向下
            if (o.cause) {
              cur = o.cause;
              continue;
            }
            // 到叶子节点拿 message
            if (o.message && o.message !== (e as Error).message) return o.message;
            break;
          }
          // V27-G debug · 没拿到 underlying · 把整个 error 序列化前 400 字符
          try {
            const ser = JSON.stringify(
              e,
              Object.getOwnPropertyNames(e),
            ).slice(0, 400);
            return `(no cause chain · raw error ≈ ${ser})`;
          } catch {
            return null;
          }
        })();
        // model 配置类错误(404 not found / 401 unauthorized / invalid temperature 等)→ 不 retry
        const isModelConfigError = underlyingMessage
          ? /not found the model|permission denied|invalid_request_error|unauthorized|invalid temperature|invalid api key/i.test(
              underlyingMessage,
            )
          : false;

        // 还有机会 retry + 是 NoOutput · 不是 model config 错 · 静默 retry
        if (isNoOutput && !isModelConfigError && attempts < MAX_ATTEMPTS) {
          // 回滚 messages 到本 prompt 开始前 · 让 retry 干净重来
          this.messages.length = newMessagesStart;
          // 重新 push user message · turn loop 内 turn 1 已不再 push
          this.messages.push(userMsg);
          // emit 一个 reasoning 事件让 UI 知道在 retry · 不当成 error
          this.emit({
            type: "reasoning",
            source: "progress",
            text: `第 ${attempts} 次模型未产出内容 · 自动重试中…`,
          });
          // 短退避防 model 端瞬态状态
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }

        // 不 retry · 给用户清晰错误
        // V27-G · model 配置类错误 → 显式说"模型不可用"· 不当 NO_OUTPUT 误导
        const friendly = isModelConfigError && underlyingMessage
          ? `LLM provider 拒绝请求 · ${underlyingMessage}。请检查模型 ID / API key / temperature 设置。`
          : isNoOutput
            ? underlyingMessage
              ? `模型本次未产出内容。底层错误:${underlyingMessage}。可能是 source 过长撑爆 context · 或模型偶发空回。建议:把指令拆小一点 · 或换一个 model。`
              : "模型本次未产出内容。可能是 source 过长撑爆 context · 或模型偶发空回。建议:把指令拆小一点(只描述一处修改) · 或先把不需要的 section 删掉再试。"
            : rawMessage;

        this.emit({
          type: "error",
          code: isModelConfigError ? "MODEL_CONFIG" : (isNoOutput ? "NO_OUTPUT" : rawCode),
          message: friendly,
          partialMessages: this.messages.slice(newMessagesStart),
        });
        break;
      }
    }

    this.emit({
      type: "agent_end",
      messages: this.messages.slice(newMessagesStart),
    });
  }

  /**
   * 跑一个 turn · 返回是否需要继续下一个 turn
   * - 继续条件:assistant 输出了 toolCalls 且 maxTurns 未到
   * - 终止条件:assistant 没调工具(纯文本回答) / 出错 / 达 maxTurns
   */
  private async runOneTurn(turnIndex: number, opts: PromptOptions): Promise<boolean> {
    this.emit({ type: "turn_start", turnIndex });

    // Transform & convert
    const transformed = await this.transformContext(this.messages);
    const llmMessages = convertToLlm(transformed) as unknown as ModelMessage[];

    // 开 assistant message
    let assistantMsg: AgentAssistantMessage = emptyAssistantMessage();
    this.messages.push(assistantMsg);
    this.emit({ type: "message_start", message: assistantMsg });

    // 准备 ai-sdk tools(若有 Tool 注册)
    const aiTools = this.tools.length > 0 ? this.buildAiSdkTools() : undefined;

    // V26-D · 合 session-level reminder 进 system prompt
    const systemWithReminders = this.composeSystemWithReminders();

    // V26-D · 单 turn 内的 abort signal · 让 rule abort 时能停 stream
    const turnAbort = new AbortController();
    if (opts.signal) {
      opts.signal.addEventListener("abort", () => turnAbort.abort(), { once: true });
    }

    // V27-X · tool-calling 用 generateText(非流式)而非 streamText。
    // 原因:moonshot-v1-128k 在 ai-sdk streamText({tools}) 下稳定空回(NO_OUTPUT) —— 直接
    //   API / generateText / streamObject 的 tool calling 都正常,唯独流式 tool-calling 解析挂。
    //   非流式拿完整 text + toolCalls 稳定。代价:外层对话文本不再逐字流式(改一次性 emit),
    //   但用户主要看 tool 内 generate 的 streaming(那条没变),外层对话通常只是简短确认。
    let abortedByRule = false;
    const result = await generateText({
      model: this.model,
      system: systemWithReminders,
      messages: llmMessages,
      tools: aiTools as Parameters<typeof generateText>[0]["tools"],
      abortSignal: turnAbort.signal,
      ...noThinking(this.model),
    });

    // reasoning 存回 message —— convertToLlm 下一轮要把它原样回传给模型
    // (reasoning 类模型的硬要求,见 message.ts 的 assistant 分支注释)。
    // 就算当前 provider 关了 thinking,这里也无害:字段为空就不会写。
    const reasoningText = (result as { reasoningText?: string }).reasoningText;
    if (reasoningText) {
      assistantMsg = { ...assistantMsg, thinking: reasoningText };
      this.messages[this.messages.length - 1] = assistantMsg;
    }

    // 一次性把完整文本 emit + 跑 rule scan(非流式没有逐 chunk,对完整 text 扫一遍)
    if (result.text) {
      assistantMsg = appendDelta(assistantMsg, result.text);
      this.messages[this.messages.length - 1] = assistantMsg;
      this.emit({
        type: "message_update",
        message: assistantMsg,
        delta: { kind: "text", text: result.text },
      });
      if (this.ruleRuntime) {
        const r = this.ruleRuntime.scan(assistantMsg.content);
        if (r.abort) abortedByRule = true;
      }
    }

    let finishReason: typeof result.finishReason | "rule-aborted" = abortedByRule
      ? "rule-aborted"
      : result.finishReason;
    let toolCalls: typeof result.toolCalls | undefined;
    if (!abortedByRule) {
      toolCalls = result.toolCalls;
      // 计费 · 外层对话 turn 的 token(tool 内 generate 的 token 另由 ctx.reportUsage 上报)
      if (this.onUsage) {
        try {
          const u = result.totalUsage;
          this.onUsage({
            inputTokens: u?.inputTokens ?? 0,
            outputTokens: u?.outputTokens ?? 0,
          });
        } catch {
          // usage 拿不到不阻断主链路
        }
      }
    }

    // assistant.toolCalls 同步到 message · 持久化时 LLM 能看到这次它调了哪些工具
    if (toolCalls && toolCalls.length > 0) {
      assistantMsg = {
        ...assistantMsg,
        toolCalls: toolCalls.map((tc): LlmToolCall => ({
          type: "tool_call",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.input,
        })),
      };
      this.messages[this.messages.length - 1] = assistantMsg;
    }

    assistantMsg = markDone(assistantMsg);
    this.messages[this.messages.length - 1] = assistantMsg;
    this.emit({ type: "message_end", message: assistantMsg });

    // 若有 tool calls · 执行每个 tool · emit tool_result message
    const toolResultsForEvent: Array<{
      toolCallId: string;
      toolName: string;
      result: ToolResultPayload;
    }> = [];

    // V26-F · 标记本 turn 是否因 tool 反复失败应当停 loop
    let earlyStopFromToolFailures = false;

    if (toolCalls && toolCalls.length > 0) {
      this.toolCalledThisPrompt = true;
      for (const tc of toolCalls) {
        const result = await this.executeTool(
          tc.toolCallId,
          tc.toolName,
          tc.input,
          opts.signal,
        );
        toolResultsForEvent.push({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          result,
        });

        // V26-F · 失败计数 · 同 tool 连续失败 >= maxToolFails 停 loop
        if (result.kind === "error") {
          const prev = this.consecutiveToolFails.get(tc.toolName) ?? 0;
          const next = prev + 1;
          this.consecutiveToolFails.set(tc.toolName, next);
          if (next >= this.maxToolFails) {
            earlyStopFromToolFailures = true;
            this.emit({
              type: "error",
              code: "TOOL_REPEATED_FAILURE",
              message: `Tool "${tc.toolName}" 连续失败 ${next} 次 · agent 停止 · 请重新描述请求或换种说法`,
            });
          }
        } else {
          // 成功 · 清零
          this.consecutiveToolFails.set(tc.toolName, 0);
        }

        // 把 tool_result append 到 messages · 供下一 turn LLM 看到
        const toolMsg: AgentToolResultMessage = {
          type: "tool_result",
          id: genMessageId(),
          createdAt: Date.now(),
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          result,
        };
        this.messages.push(toolMsg);
        this.emit({ type: "message_start", message: toolMsg });
        this.emit({ type: "message_end", message: toolMsg });

        // Plain 特殊事件 · 把 patch/doc 这种结构化结果再 emit 一遍方便 UI subscribe
        if (result.kind === "doc") {
          this.emit({
            type: "doc",
            kind: result.docKind,
            source: result.source,
            doc: result.doc,
          });
        } else if (result.kind === "patch") {
          this.emit({
            type: "patch",
            ops: result.ops as Parameters<AgentEventListener>[0] extends never
              ? never
              : import("@/lib/agents/types").JsonPatchOp[],
            rationale: result.rationale,
          });
        }
      }
    }

    this.emit({ type: "turn_end", turnIndex, toolResults: toolResultsForEvent });

    // V26-F · tool 连续失败触达阈值 · 立即停 · 不再 retry
    if (earlyStopFromToolFailures) return false;

    // V27-G · generate_* tool 成功返 doc → 立刻停 turn loop ·
    // 不让 LLM 在 turn 2 又调一遍 / 提议"再做一个版本"。
    // 用户要再生成会自己说 · agent 不需要主动加戏。
    const hasGenerateSuccess = toolResultsForEvent.some(
      (tr) =>
        tr.toolName.startsWith("generate_") && tr.result.kind === "doc",
    );
    if (hasGenerateSuccess) return false;

    // 继续条件:
    // - V26-A.3 · 有 tool calls(下一个 turn 让 LLM 看 tool 结果再回应)
    // - V26-D · 被 rule 中断(下一个 turn 看 reminder 重写)
    const hasToolCalls = !!toolCalls && toolCalls.length > 0;
    return hasToolCalls || abortedByRule;
  }

  /**
   * 旁路执行:不经 LLM,直接用 caller 给的 (toolName, input) 调一个 tool。
   * 复用 executeTool 的全部逻辑(schema 校验 / streaming / event / 计费),
   * 并发出与正常 tool-calling 一致的事件序列(turn_start → 合成 assistant message
   * 带 tool_call → tool_execution_* → tool_result message → doc/patch event → turn_end)。
   * 返回 true=成功,false=失败(caller 决定是否回退到 LLM 流程)。
   */
  private async runForcedToolCall(
    force: { toolName: string; input: unknown },
    opts: PromptOptions,
    _newMessagesStart: number,
  ): Promise<boolean> {
    const toolCallId = `${force.toolName}:forced:${genMessageId()}`;
    this.emit({ type: "turn_start", turnIndex: 1 });

    // 合成 assistant message(含 tool_call)· 让持久化/LLM context 看到这次"调用"
    let assistantMsg = emptyAssistantMessage();
    this.messages.push(assistantMsg);
    this.emit({ type: "message_start", message: assistantMsg });
    assistantMsg = {
      ...assistantMsg,
      toolCalls: [
        { type: "tool_call", toolCallId, toolName: force.toolName, args: force.input },
      ],
    };
    assistantMsg = markDone(assistantMsg);
    this.messages[this.messages.length - 1] = assistantMsg;
    this.emit({ type: "message_end", message: assistantMsg });

    // 执行 tool(executeTool 内含 args 兜底 parse + schema 校验)
    const result = await this.executeTool(toolCallId, force.toolName, force.input, opts.signal);
    this.toolCalledThisPrompt = true;

    // tool_result message
    const toolMsg: AgentToolResultMessage = {
      type: "tool_result",
      id: genMessageId(),
      createdAt: Date.now(),
      toolCallId,
      toolName: force.toolName,
      result,
    };
    this.messages.push(toolMsg);
    this.emit({ type: "message_start", message: toolMsg });
    this.emit({ type: "message_end", message: toolMsg });

    // Plain 特殊事件 · 与正常路径一致
    if (result.kind === "doc") {
      this.emit({ type: "doc", kind: result.docKind, source: result.source, doc: result.doc });
    } else if (result.kind === "patch") {
      this.emit({
        type: "patch",
        ops: result.ops as Parameters<AgentEventListener>[0] extends never
          ? never
          : import("@/lib/agents/types").JsonPatchOp[],
        rationale: result.rationale,
      });
    }

    this.emit({
      type: "turn_end",
      turnIndex: 1,
      toolResults: [{ toolCallId, toolName: force.toolName, result }],
    });

    return result.kind !== "error";
  }

  /**
   * V26-D · 把 session-level rule reminder 拼到 system prompt 末尾
   * 每个 turn 都会重新算 · 让最近注入的 reminder 立即生效
   */
  private composeSystemWithReminders(): string | undefined {
    const reminders = this.ruleRuntime?.getSessionReminders() ?? [];
    if (reminders.length === 0) return this.systemPrompt;
    const reminderBlock = reminders
      .map((r) => `<system-reminder>${r}</system-reminder>`)
      .join("\n");
    if (!this.systemPrompt) return reminderBlock;
    return `${this.systemPrompt}\n\n${reminderBlock}`;
  }

  /** 调用一个具体 Tool · 失败转 ToolResultPayload error · 不抛 */
  private async executeTool(
    toolCallId: string,
    toolName: string,
    args: unknown,
    signal?: AbortSignal,
  ): Promise<ToolResultPayload> {
    this.emit({ type: "tool_execution_start", toolCallId, toolName, args });

    const tool = this.toolMap.get(toolName);
    if (!tool) {
      const err: ToolResultPayload = {
        kind: "error",
        code: "UNKNOWN_TOOL",
        message: `Tool "${toolName}" not registered`,
      };
      this.emit({ type: "tool_execution_end", toolCallId, toolName, result: err });
      return err;
    }

    // V27-X · tool args 兜底 parse。ai-sdk v6 标准下 toolCall.input 应是已解析的
    //   object,但 moonshot(及部分 OpenAI-compat provider)在 CF Workers 上偶发把
    //   tool_call arguments 原样透传成 JSON **字符串** → object schema 在 path [] 直接
    //   拒("expected object, received string")→ tool 体根本没跑到。tool arguments
    //   本就是 JSON,字符串形态就 parse 它(失败则保持原值,交给 schema 报准确错误)。
    let normalizedArgs = args;
    // 循环 parse:处理单次或双重序列化。某些 provider 把已是 JSON string 的 args
    // 再 stringify 一次 → 第一遍 parse 得到的还是个 JSON 字符串(形如 "{...}",以
    // 引号开头),需要再 parse 一遍才到 object。所以不能用 startsWith("{") 做守卫
    // (双重序列化的外层是引号)。直接 try-parse,直到不再是 string 或 parse 失败。
    // 最多 3 次防死循环。
    for (let i = 0; i < 3 && typeof normalizedArgs === "string"; i++) {
      const s = normalizedArgs.trim();
      if (!s) break; // 空串不 parse
      try {
        const next = JSON.parse(s);
        if (next === normalizedArgs) break; // 无变化(如 JSON.parse('"x"')==='x' 再 parse 会抛,这里防御)
        normalizedArgs = next;
      } catch {
        break; // 非 JSON 字符串 · 保持原值,下面 safeParse 给可读错误
      }
    }
    // 校验 input
    const parsed = tool.input.safeParse(normalizedArgs);
    if (!parsed.success) {
      const err: ToolResultPayload = {
        kind: "error",
        code: "INPUT_VALIDATION",
        message: `Tool "${toolName}" input invalid: ${parsed.error.message}`,
      };
      this.emit({ type: "tool_execution_end", toolCallId, toolName, result: err });
      return err;
    }

    const ctx: ToolContext = {
      toolCallId,
      signal,
      emit: (e) => this.emit(e),
      emitReasoning: (source, text) => this.emit({ type: "reasoning", source, text }),
      emitPatch: (ops, rationale, docId) =>
        this.emit({
          type: "patch",
          ops: ops as Parameters<AgentEventListener>[0] extends never
            ? never
            : import("@/lib/agents/types").JsonPatchOp[],
          rationale,
          docId,
        }),
      emitPartial: (partial, hint) =>
        this.emit({
          type: "tool_execution_update",
          toolCallId,
          toolName,
          partial,
          hint,
        }),
      // V27-B · 仅当 caller 提供 sourceResolver 才暴露 getSource
      getSource: this.sourceResolver
        ? async (docId: string) => {
            try {
              return await this.sourceResolver!(docId);
            } catch {
              return null;
            }
          }
        : undefined,
      // 计费 · tool 内 generate/edit 的 token 透传到 Agent onUsage
      reportUsage: this.onUsage,
    };

    try {
      const result = await tool.execute(parsed.data, ctx);
      this.emit({ type: "tool_execution_end", toolCallId, toolName, result });
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const code = e instanceof Error && "code" in e ? String((e as { code: unknown }).code) : "TOOL_ERROR";
      const err: ToolResultPayload = { kind: "error", code, message };
      this.emit({ type: "tool_execution_end", toolCallId, toolName, result: err });
      return err;
    }
  }

  /**
   * 把 Plain Tool[] 转成 ai-sdk 的 ToolSet
   * 注:这里 execute 留空 · 因为我们自己接管 tool 执行(在 runOneTurn 后跑)。
   * ai-sdk 把工具 schema 喂给 LLM · LLM 输出 tool_call · 我们 collect 然后自己跑。
   */
  private buildAiSdkTools(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const t of this.tools) {
      // ai-sdk 接受 zod schema 或 jsonSchema · 我们 Tool.input 是 zod
      // 不传 execute · 让 ai-sdk 只 emit tool_call 不自动执行
      // (我们在 runOneTurn 手动调 executeTool)
      out[t.name] = aiTool({
        description: t.description,
        inputSchema: t.input as unknown as Parameters<typeof aiTool>[0]["inputSchema"],
      });
    }
    return out;
  }

  private emit(event: AgentEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch (e) {
        console.error("[agent] listener error:", e);
      }
    }
  }
}

// 防止 unused import 警告
void generateText;
void jsonSchema;
