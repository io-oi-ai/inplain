/**
 * CLI v31 模版生成入口。
 *
 * 用户 prompt + 模版 slug → generateV31Content(content JSON) →
 * fromV31 → renderReport(doc, templateV32) → 自包含 HTML。
 *
 * 跟 run-agent(v2 DSL)分开:--template 指定时走这条路径。
 * 复用 generate-content.ts(web route 同款生成逻辑)+ V32 统一渲染器。
 */
import { writeFileSync } from "node:fs";
// V36 fix · agent/v31 子系统的值改函数内动态 import,把 run-v31 从 CLI ESM 循环依赖
// 摘除(顶层静态 import 在 linking 期拿到未初始化 binding,见 run-agent.ts 注释)。
// type import 保留(linking 期擦除,无影响)。
import type { V31Kind, V31Content } from "@/lib/v31/generate-content";
import { progress, emit, getOutputMode, fail } from "./output";

export type RunV31Input = {
  kind: V31Kind;
  intent: string;
  templateSlug: string;
  density?: "low" | "high";
};

export type V31Result = {
  kind: V31Kind;
  templateSlug: string;
  content: V31Content;
  html: string;
  /** V32 语义校验结果(转成 Document 后跑 validateDocument)· 空 = 干净 */
  warnings: string;
};

export async function runGenerateV31(input: RunV31Input): Promise<V31Result> {
  // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头注释)
  const [
    { getModel },
    { getModelConfig },
    { V32_TEMPLATES, getTemplateV32 },
    { generateV31Content },
    { fromV31 },
    { validateDocument, formatWarnings },
    { renderReport },
  ] = await Promise.all([
    import("@/lib/agent/provider"),
    import("@/lib/agents/config"),
    import("@/lib/v32/templates"),
    import("@/lib/v31/generate-content"),
    import("@/lib/v32/migrate/from-v31"),
    import("@/lib/v32/content/validate"),
    import("@/lib/v32/render/render-report"),
  ]);
  // 校验模版存在
  const template = V32_TEMPLATES[input.templateSlug];
  if (!template) {
    fail(
      `unknown template "${input.templateSlug}". Run \`plain templates\` to see available slugs.`,
    );
  }
  const cfg = getModelConfig("generator");
  const model = getModel(cfg.provider, cfg.modelId);

  progress(`生成 ${input.kind} content(模版 ${input.templateSlug})…`);
  const content = await generateV31Content({
    model,
    kind: input.kind,
    userPrompt: input.intent,
    density: input.density,
    templateHint: template!.meta.tagline,
  });

  progress(`渲染 HTML…`);
  // V32:AI 出的 v31 content → fromV31 转 Document → renderReport 出 HTML。
  // 模板 kind-agnostic,一个 renderReport 吃 deck/doc/sheet(呈现差异在 CSS 层)。
  const doc = fromV31(input.kind, content);
  const html = renderReport(doc, getTemplateV32(input.templateSlug));

  // V32 语义校验(借鉴 Bento validate)· 复用上面已转好的 doc,不重复转。
  //   校验失败不阻断(内容已生成),只把 warnings 交给上层打 stderr 给 agent 参考。
  let warnings = "";
  try {
    warnings = formatWarnings(validateDocument(doc));
  } catch {
    warnings = "";
  }

  return { kind: input.kind, templateSlug: input.templateSlug, content, html, warnings };
}

/** 输出 v31 结果:HTML 到 -o / stdout;--content-out 另存 JSON;--json 模式整包 emit */
export function emitV31Result(
  r: V31Result,
  opts: { outFile?: string; contentOut?: string },
): void {
  if (opts.contentOut) {
    writeFileSync(opts.contentOut, JSON.stringify(r.content, null, 2));
    progress(`✓ content JSON 写入 ${opts.contentOut}`);
  }
  if (getOutputMode() === "json") {
    emit({ kind: r.kind, templateSlug: r.templateSlug, html: r.html, content: r.content });
    return;
  }
  if (opts.outFile) {
    writeFileSync(opts.outFile, r.html);
    progress(`✓ HTML 写入 ${opts.outFile}`);
  } else {
    process.stdout.write(r.html);
  }
}
