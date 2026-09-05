/**
 * V32 · 模板 registry(slug → TemplateV32)。37 个模板统一入口。
 * V32 S6
 */
import type { TemplateV32 } from "./types";
import t_8_bit_orbit from "./8-bit-orbit";
import t_apple_studio from "./apple-studio";
import t_biennale_yellow from "./biennale-yellow";
import t_block_frame from "./block-frame";
import t_blue_professional from "./blue-professional";
import t_bold_poster from "./bold-poster";
import t_broadside from "./broadside";
import t_capsule from "./capsule";
import t_cartesian from "./cartesian";
import t_cobalt_grid from "./cobalt-grid";
import t_coral from "./coral";
import t_creative_mode from "./creative-mode";
import t_daisy_days from "./daisy-days";
import t_editorial_forest from "./editorial-forest";
import t_editorial_tri_tone from "./editorial-tri-tone";
import t_emerald_editorial from "./emerald-editorial";
import t_grove from "./grove";
import t_linear_aurora from "./linear-aurora";
import t_long_table from "./long-table";
import t_mat from "./mat";
import t_monochrome from "./monochrome";
import t_neo_grid_bold from "./neo-grid-bold";
import t_peoples_platform from "./peoples-platform";
import t_pin_and_paper from "./pin-and-paper";
import t_pink_script from "./pink-script";
import t_playful from "./playful";
import t_raw_grid from "./raw-grid";
import t_retro_windows from "./retro-windows";
import t_retro_zine from "./retro-zine";
import t_sakura_chroma from "./sakura-chroma";
import t_scatterbrain from "./scatterbrain";
import t_signal from "./signal";
import t_soft_editorial from "./soft-editorial";
import t_stencil_tablet from "./stencil-tablet";
import t_stripe_gradient from "./stripe-gradient";
import t_studio from "./studio";
import t_vellum from "./vellum";

export const V32_TEMPLATES: Record<string, TemplateV32> = {
  "8-bit-orbit": t_8_bit_orbit,
  "apple-studio": t_apple_studio,
  "biennale-yellow": t_biennale_yellow,
  "block-frame": t_block_frame,
  "blue-professional": t_blue_professional,
  "bold-poster": t_bold_poster,
  "broadside": t_broadside,
  "capsule": t_capsule,
  "cartesian": t_cartesian,
  "cobalt-grid": t_cobalt_grid,
  "coral": t_coral,
  "creative-mode": t_creative_mode,
  "daisy-days": t_daisy_days,
  "editorial-forest": t_editorial_forest,
  "editorial-tri-tone": t_editorial_tri_tone,
  "emerald-editorial": t_emerald_editorial,
  "grove": t_grove,
  "linear-aurora": t_linear_aurora,
  "long-table": t_long_table,
  "mat": t_mat,
  "monochrome": t_monochrome,
  "neo-grid-bold": t_neo_grid_bold,
  "peoples-platform": t_peoples_platform,
  "pin-and-paper": t_pin_and_paper,
  "pink-script": t_pink_script,
  "playful": t_playful,
  "raw-grid": t_raw_grid,
  "retro-windows": t_retro_windows,
  "retro-zine": t_retro_zine,
  "sakura-chroma": t_sakura_chroma,
  "scatterbrain": t_scatterbrain,
  "signal": t_signal,
  "soft-editorial": t_soft_editorial,
  "stencil-tablet": t_stencil_tablet,
  "stripe-gradient": t_stripe_gradient,
  "studio": t_studio,
  "vellum": t_vellum,
};

const DEFAULT_SLUG = "biennale-yellow";

export function getTemplateV32(slug?: string): TemplateV32 {
  return V32_TEMPLATES[slug ?? DEFAULT_SLUG] ?? V32_TEMPLATES[DEFAULT_SLUG];
}

export function listTemplatesV32(): TemplateV32[] {
  return Object.values(V32_TEMPLATES);
}

/**
 * 用一组自定义 tokens 造一个 TemplateV32(用户自建设计系统)。
 *
 * 没有 `blocks` 覆盖 —— 自建系统只是一组 token 值,所有块走中性兜底
 * renderer,靠 themeCss 拿到品牌观感。这也正是"自建"和"内置 37 套"的
 * 区别:内置那些还带手写的 block 重绘(视觉 DNA),自建的只有配色。
 *
 * slug 前缀 `custom:` —— 与内置 slug 命名空间隔开,避免用户把系统命名成
 * "apple-studio" 之类造成歧义。
 */
export function customTemplateV32(opts: {
  id: string;
  name: string;
  themeCss: string;
  scheme: "light" | "dark";
  fonts?: string;
}): TemplateV32 {
  return {
    meta: {
      slug: `custom:${opts.id}`,
      name: opts.name,
      tagline: "",
      scheme: opts.scheme,
    },
    fonts: opts.fonts ?? "",
    themeCss: opts.themeCss,
  };
}
