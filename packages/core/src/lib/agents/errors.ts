/**
 * Plain agent 层统一错误类型。
 *
 * code 枚举：
 * - PATCH_INVALID —— 两次尝试后 patch 仍非法
 * - SCHEMA —— LLM 输出无法通过 Zod schema 校验
 * - UPSTREAM —— provider 错误（网络 / 429 / 鉴权 / 余额）
 * - NO_CURRENT —— 编辑操作但未提供 current 文档
 * - UNSUPPORTED —— router 返回 M1/M2/M3 尚未支持的组合
 * - REF_INVALID —— 跨文档引用语法非法或目标不存在
 * - UNKNOWN —— 未分类错误
 */
export class AgentError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentError";
  }
}
