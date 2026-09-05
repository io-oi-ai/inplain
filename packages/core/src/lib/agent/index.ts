/**
 * V26 · Plain Agent · 公开 API
 *
 * 借鉴 earendil-works/pi 的 agent-core + ai · 文档型 agent runtime。
 *
 * 用法:
 *   import { Agent, getModel, plainTools, defaultTransform } from "@/lib/agent";
 *
 *   const agent = new Agent({
 *     systemPrompt: "...",
 *     model: getModel("moonshot", "kimi-k2-0905-preview"),
 *     tools: plainTools,
 *     transformContext: defaultTransform({ recentPairs: 6 }),
 *   });
 *
 *   agent.subscribe((e) => console.log(e.type));
 *   await agent.prompt("帮我做一份 SaaS Q2 dashboard");
 */

export { Agent } from "./core/agent";
export type { AgentInitialState, PromptOptions } from "./core/agent";
export type {
  AgentEvent,
  AgentEventListener,
  EvAgentStart,
  EvTurnStart,
  EvMessageStart,
  EvMessageUpdate,
  EvMessageEnd,
  EvToolExecutionStart,
  EvToolExecutionUpdate,
  EvToolExecutionEnd,
  EvTurnEnd,
  EvAgentEnd,
  EvError,
  EvIntent,
  EvReasoning,
  EvPatch,
  EvDoc,
  EvRuleHit,
} from "./core/events";
export { isLlmVisibleEvent } from "./core/events";
export type {
  AgentMessage,
  AgentUserMessage,
  AgentAssistantMessage,
  AgentToolResultMessage,
  AgentUiMessage,
  LlmMessage,
  LlmTextPart,
  LlmImagePart,
  LlmToolCall,
  LlmContent,
  ToolResultPayload,
} from "./core/message";
export {
  appendDelta,
  convertToLlm,
  emptyAssistantMessage,
  genMessageId,
  markDone,
  markError,
  userMessage,
  withThought,
} from "./core/message";
export type { TransformContext, PlainTransformOptions } from "./core/transform-context";
export {
  composeTransforms,
  defaultTransform,
} from "./core/transform-context";
export type { Tool, ToolContext, ToolRegistry } from "./core/tool";
export { defineTool } from "./core/tool";

// Provider
export type { ProviderName, Capabilities, GatewayConfig, GetModelOptions } from "./provider";
export {
  getModel,
  getCapabilities,
  gatewayFromEnv,
  isProvider,
  selectModel,
} from "./provider";

// Tools
export {
  generateDeckTool,
  generateDocTool,
  generateSheetTool,
  editDeckTool,
  editDocTool,
  editSheetTool,
  plainTools,
} from "./tools";

// Rules (V26-D · streaming token-level slop detection)
export type {
  StreamingRule,
  RuleAction,
  RuleMatch,
  RuleExecution,
  RuleHitCounter,
  RuleHitListener,
  RuleRuntimeOptions,
} from "./rules";
export {
  RuleRuntime,
  buildSlopStreamingRules,
  PLAIN_DEFAULT_RULES,
  actionForSlopCode,
} from "./rules";
