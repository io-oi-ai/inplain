/**
 * V26-C · Tool registry · barrel export
 *
 * 默认 Plain Agent 全套工具(6 个 + 1 个 route-intent 留 V26-A.4 加)
 *
 * 用法:
 *   import { plainTools } from "@/lib/agent/tools";
 *   const agent = new Agent({ ..., tools: plainTools });
 */
import { generateDeckTool } from "./generate-deck";
import { generateDocTool } from "./generate-doc";
import { generateSheetTool } from "./generate-sheet";
import { editDeckTool } from "./edit-deck";
import { editDocTool } from "./edit-doc";
import { editSheetTool } from "./edit-sheet";
import { fetchUrlTool } from "./fetch-url";

export {
  generateDeckTool,
  generateDocTool,
  generateSheetTool,
  editDeckTool,
  editDocTool,
  editSheetTool,
  fetchUrlTool,
};

/** Plain agent 标准工具集 · 给 web/cli/desktop/mcp surface 同时用 */
export const plainTools = [
  generateDeckTool,
  generateDocTool,
  generateSheetTool,
  editDeckTool,
  editDocTool,
  editSheetTool,
  fetchUrlTool,
] as const;
