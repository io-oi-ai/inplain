/**
 * V26-D · Streaming rules · public API
 */
export type {
  StreamingRule,
  RuleAction,
  RuleMatch,
  RuleExecution,
  RuleHitCounter,
  RuleHitListener,
} from "./types";
export { RuleRuntime } from "./runtime";
export type { RuleRuntimeOptions } from "./runtime";
export {
  buildSlopStreamingRules,
  PLAIN_DEFAULT_RULES,
  actionForSlopCode,
} from "./slop-streaming";
