import { db } from '../lib/db';

const DEFAULT_TEMPLATES = [
  {
    name: '通用摘要', type: '通用类',
    prompt_template: `你是一个知识提炼专家。请将以下对话内容提炼为结构化笔记。
要求：
1. 提取核心论点和结论，忽略寒暄和无效内容
2. 输出格式为 Markdown，包含标题、正文段落、要点列表
3. 在末尾提取 3~5 个关键标签（tags），用逗号分隔
4. 标题简洁有力，不超过20字`,
    description: '适用于通用对话、会议记录、文章阅读的知识提炼'
  },
  {
    name: '案例研究', type: '职场类',
    prompt_template: `你是一个职场经验提炼专家。请将以下内容整理为结构化案例笔记。
要求：
1. 严格按照「背景 → 挑战 → 解决方案 → 结果」四段结构输出
2. 每段用二级标题（##）标注
3. 提取 3~5 个关键标签（tags）
4. 标题以「案例：」开头`,
    description: '适用于项目复盘、工作案例、职场经验总结'
  },
  {
    name: '架构分析', type: '技术类',
    prompt_template: `你是一个技术架构分析专家。请将以下技术讨论提炼为结构化笔记。
要求：
1. 提取所有技术名词、组件名称、依赖关系
2. 输出包含：核心架构描述、技术选型理由、关键约束条件
3. 使用代码块标注技术术语
4. 提取 3~5 个技术标签（tags）`,
    description: '适用于技术方案讨论、架构评审、技术选型记录'
  },
  {
    name: '灵感捕捉', type: '创意类',
    prompt_template: `你是一个创意思维整理专家。请将以下内容中的灵感和想法提炼为笔记。
要求：
1. 捕捉所有闪光点，哪怕是不成熟的想法
2. 标注每个想法的应用切入点（"可以用在..."）
3. 保留原始的发散性，不要过度收敛
4. 提取 3~5 个创意标签（tags）`,
    description: '适用于头脑风暴、随手灵感、创意讨论记录'
  },
  {
    name: '概念拆解', type: '学术类',
    prompt_template: `你是一个学术知识整理专家。请将以下内容拆解为独立的知识点笔记。
要求：
1. 每个核心概念单独成段，附上清晰定义
2. 标注概念间的关系（包含、对立、依赖等）
3. 用简洁的例子辅助说明抽象概念
4. 提取 3~5 个学科标签（tags）`,
    description: '适用于课程学习、书籍阅读、学术论文整理'
  }
];

export async function seedDefaultTemplates(userId: string) {
  // 检查用户是否已经完成过初始化
  const { rows } = await db.query(
    `SELECT is_onboarded FROM users WHERE id = $1`, [userId]
  );
  
  if (rows.length === 0 || rows[0].is_onboarded) {
    return;
  }

  // 开始初始化模版
  for (const t of DEFAULT_TEMPLATES) {
    await db.query(
      `INSERT INTO prompt_templates (user_id, name, type, prompt_template, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, t.name, t.type, t.prompt_template, t.description]
    );
  }

  // 标记该用户已完成初始化，以后即使模版删光了也不再自动补全
  await db.query(
    `UPDATE users SET is_onboarded = TRUE WHERE id = $1`, [userId]
  );
}
