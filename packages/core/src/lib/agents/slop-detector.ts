/**
 * Stage 4:Anti-AI-slop detector
 *
 * 检测一段文字里的"AI 生成味"模式。借鉴 nexu-io/open-design 的 anti-slop
 * blacklist 和 PLAIN_WRITING_LAW 的词汇黑名单合并。
 *
 * 共享给 deck-linter / sheet-linter / 未来 doc-linter。
 *
 * 信号类别:
 * 1. 黑名单形容词("赋能 / 打造 / 生态 / 全链路")
 * 2. AI 营销话术("10× 更快"/"行业领先"/"颠覆性")
 * 3. 通用 emoji 滥用(🚀 ✨ 💡 etc)
 * 4. 非数字的"含糊数字"("许多" / "众多" / "海量")
 * 5. 中英混译同义词(AI 翻译味)
 * 6. 占位/废话文案(综上所述 / lorem ipsum / feature one-two-three / sample content)
 *    —— 借鉴 nexu-io/open-design anti-ai-slop,英文占位文案 token 流可见,归 critical。
 */

export type SlopMatch = {
  /** 触发的规则代码 */
  code: SlopCode;
  /** 用户能看的中文说明 */
  message: string;
  /** 触发位置(text 中的 char index 起点) */
  index: number;
  /** 命中字串 */
  match: string;
};

export type SlopCode =
  | "VAGUE_VERB"      // 黑名单动词:打造/赋能/重构/数字化转型
  | "VAGUE_NOUN"      // 黑名单名词:生态/闭环/全链路
  | "MARKETING_HYPE"  // 10× 更快 / 行业领先 / 颠覆性
  | "EMOJI_DECOR"     // 装饰性 emoji
  | "FUZZY_NUMBER"    // 许多 / 众多 / 海量
  | "SYNONYM_REDUNDANCY" // 中英同义("Design First · 设计先行")
  | "BAIT_PHRASE"     // 钓鱼标题:必看/一图看懂/彻底搞懂
  | "SLANG_VERB"      // tw93/kami:白搭/立住/才顺/回炉/闸 类俚语动词
  | "SLOGAN_REWRITE"  // 检测到 kami Slogan→Neutral 表里的"前"形态
  | "FILLER_COPY";    // 占位/废话文案:lorem ipsum / feature one-two-three / 综上所述

const VAGUE_VERBS = [
  "拥抱", "打造", "赋能", "重构", "数字化转型", "深耕",
  "践行", "构建生态", "开启新征程",
];

const VAGUE_NOUNS = [
  "新范式", "共创", "生态", "闭环", "落地", "全链路",
  "护城河", "增长引擎", "第二曲线", "心智", "下沉市场",
  // tw93/kami 补充:中文受众不熟悉时,飞轮/闭环 容易变 slogan
  "飞轮",
];

const MARKETING_HYPE = [
  /(\d+)\s*[xX×]\s*(更快|更高|更好|提升)/, // "10x 更快"
  /(\d+)\s*倍\s*(提升|增长|加速|效能)/,     // "10 倍提升"
  "行业领先", "颠覆性", "革命性", "一站式",
  "极致体验", "千亿级", "数十亿级", "智能化升级",
  // tw93/kami:产品图说里的营销话术
  "爆款", "神器",
];

const FUZZY_NUMBERS = [
  "许多", "众多", "大量", "海量", "诸多", "无数",
  "广泛", "普遍", "纷纷", "屡屡",
];

const FILLER_PHRASES: Array<string | RegExp> = [
  // 中文废话连接
  "综上所述", "让我们一起", "踏上旅程",
  /在这个.{1,8}的时代/,
  "众所周知", "毫无疑问",
  // 借鉴 nexu-io/open-design anti-ai-slop:英文占位文案(lorem / 编号 feature / 样例文案)
  // 这些是 LLM 在空 section 上偷懒编词的典型 tell,token 流可见,严重程度同钓鱼标题。
  /lorem\s+ipsum/i,
  /\bfeature\s+(one|two|three|four|1|2|3|4)\b/i,
  /\b(item|step|section|title|heading)\s+(one|two|three|1|2|3)\b/i,
  /\b(placeholder|sample|dummy|example)\s+(text|content|copy|data|title|heading)\b/i,
  /\b(your|insert)\s+(text|content|title|heading|headline)\s+here\b/i,
  /\bclick\s+here\b/i,
  /\btodo:?\s/i,
];

/**
 * tw93/kami 补充:钓鱼标题(diagram caption / slide title 不该是这种文案,
 * 应直接陈述图的实际内容)。
 */
const BAIT_PHRASES = [
  "必看", "一图看懂", "彻底搞懂", "万字长文", "保姆级",
  "看完就懂", "一文读懂", "学会了", "你必须知道",
];

/**
 * tw93/kami:被禁的 slang verbs(俚语动词),caption 要换成具体动作。
 */
const SLANG_VERBS = [
  "白搭", "立住", "才顺", "回炉",
];

/**
 * tw93/kami Slogan→Neutral 改写表的"slogan 形态"。
 * 命中后 message 给出"建议改写"的目标版本。
 */
const SLOGAN_REWRITES: Array<{ slogan: string; neutral: string }> = [
  { slogan: "没对完", neutral: "交付前过三遍" },
  { slogan: "不算完成", neutral: "交付前过三遍" },
  { slogan: "任一不过则回炉", neutral: "任一步不通过,回到修改" },
  { slogan: "交付前最后一道闸", neutral: "交付前最后检查" },
  { slogan: "最后一道闸", neutral: "最后检查" },
  { slogan: "把习惯立住", neutral: "基础检查清单" },
  { slogan: "习惯立住", neutral: "基础检查" },
];

/** 装饰用 emoji(标记 emoji / 反应 emoji 不算) */
const DECOR_EMOJI = /[🚀✨💡🌟⭐🎯🔥💯👀💪🙌📈🎉🎊]/u;

/**
 * 跑 anti-slop 检测。返回所有匹配。
 * 不修改文本,只列问题 — caller 自己决定 warn / 修改 / 忽略。
 */
export function detectSlop(text: string): SlopMatch[] {
  const out: SlopMatch[] = [];

  for (const w of VAGUE_VERBS) {
    let i = -1;
    while ((i = text.indexOf(w, i + 1)) !== -1) {
      out.push({
        code: "VAGUE_VERB",
        message: `黑名单动词"${w}",换具体白话(参考 PLAIN_WRITING_LAW)`,
        index: i,
        match: w,
      });
    }
  }

  for (const w of VAGUE_NOUNS) {
    let i = -1;
    while ((i = text.indexOf(w, i + 1)) !== -1) {
      out.push({
        code: "VAGUE_NOUN",
        message: `黑名单名词"${w}",换具体场景描述`,
        index: i,
        match: w,
      });
    }
  }

  for (const item of MARKETING_HYPE) {
    if (typeof item === "string") {
      let i = -1;
      while ((i = text.indexOf(item, i + 1)) !== -1) {
        out.push({
          code: "MARKETING_HYPE",
          message: `营销话术"${item}",换具体数字或场景`,
          index: i,
          match: item,
        });
      }
    } else {
      const re = new RegExp(item.source, item.flags + "g");
      let m;
      while ((m = re.exec(text)) !== null) {
        out.push({
          code: "MARKETING_HYPE",
          message: `营销话术"${m[0]}",给出 baseline 才能讲倍数`,
          index: m.index,
          match: m[0],
        });
      }
    }
  }

  for (const w of FUZZY_NUMBERS) {
    let i = -1;
    while ((i = text.indexOf(w, i + 1)) !== -1) {
      out.push({
        code: "FUZZY_NUMBER",
        message: `含糊数量"${w}",改具体数字(数量级也行,如"约 5,000")`,
        index: i,
        match: w,
      });
    }
  }

  // tw93/kami:钓鱼标题(diagram caption / slide title 应直陈内容)
  for (const w of BAIT_PHRASES) {
    let i = -1;
    while ((i = text.indexOf(w, i + 1)) !== -1) {
      out.push({
        code: "BAIT_PHRASE",
        message: `钓鱼标题"${w}",直接陈述具体内容(图的主体 / slide 论点)`,
        index: i,
        match: w,
      });
    }
  }

  // tw93/kami:slang verbs
  for (const w of SLANG_VERBS) {
    let i = -1;
    while ((i = text.indexOf(w, i + 1)) !== -1) {
      out.push({
        code: "SLANG_VERB",
        message: `俚语动词"${w}",caption / 标题里换成具体动作`,
        index: i,
        match: w,
      });
    }
  }

  // tw93/kami Slogan→Neutral 改写表
  for (const item of SLOGAN_REWRITES) {
    let i = -1;
    while ((i = text.indexOf(item.slogan, i + 1)) !== -1) {
      out.push({
        code: "SLOGAN_REWRITE",
        message: `slogan"${item.slogan}",改成中性表述:"${item.neutral}"`,
        index: i,
        match: item.slogan,
      });
    }
  }

  for (const item of FILLER_PHRASES) {
    if (typeof item === "string") {
      let i = -1;
      while ((i = text.indexOf(item, i + 1)) !== -1) {
        out.push({
          code: "FILLER_COPY",
          message: `占位/废话文案"${item}",删掉或填真实内容(空 section 是设计问题,不靠编词填)`,
          index: i,
          match: item,
        });
      }
    } else {
      const re = new RegExp(item.source, item.flags.includes("g") ? item.flags : item.flags + "g");
      let m;
      while ((m = re.exec(text)) !== null) {
        out.push({
          code: "FILLER_COPY",
          message: `占位/废话文案"${m[0]}",删掉或填真实内容(空 section 是设计问题,不靠编词填)`,
          index: m.index,
          match: m[0],
        });
        if (m.index === re.lastIndex) re.lastIndex++; // 防零宽匹配死循环
      }
    }
  }

  // emoji:每段最多 1 个,>1 标记
  const emojiMatches = [...text.matchAll(new RegExp(DECOR_EMOJI.source, "gu"))];
  if (emojiMatches.length > 1) {
    emojiMatches.slice(1).forEach((m) => {
      out.push({
        code: "EMOJI_DECOR",
        message: `装饰 emoji "${m[0]}",一段 ≤ 1 个,优先用 @icon:name`,
        index: m.index ?? 0,
        match: m[0] ?? "",
      });
    });
  }

  return out;
}

/**
 * 把所有命中浓缩成一行简短报告(linter UI 用)
 */
export function summarizeSlop(matches: SlopMatch[]): string {
  if (matches.length === 0) return "";
  const codes = new Map<SlopCode, number>();
  for (const m of matches) codes.set(m.code, (codes.get(m.code) ?? 0) + 1);
  return [...codes.entries()]
    .map(([code, n]) => `${code}×${n}`)
    .join(" / ");
}
