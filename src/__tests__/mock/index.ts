// src/lib/mock/index.ts

export const MOCK_USER = {
  id: "user-001",
  account: "admin",
}

export const MOCK_CATEGORIES = [
  {
    id: "cat-001",
    name: "产品设计",
    icon: "📱",
    granularity: "summary",
    promptTemplate: "提取核心结论、关键决策和待办事项，以结构化Markdown输出",
    linkThreshold: 0.75,
    synthesisTriggerCount: 5,
    createdAt: "2026-04-01T10:00:00Z",
    noteCount: 8,
  },
  {
    id: "cat-002",
    name: "竞品分析",
    icon: "🔍",
    granularity: "summary",
    promptTemplate: "按产品名聚合，结构化输出功能对比和核心差异",
    linkThreshold: 0.75,
    synthesisTriggerCount: 5,
    createdAt: "2026-04-02T10:00:00Z",
    noteCount: 3,
  },
  {
    id: "cat-003",
    name: "技术研究",
    icon: "⚙️",
    granularity: "atomic",
    promptTemplate: "拆分成独立的技术知识点，每个知识点单独成段",
    linkThreshold: 0.80,
    synthesisTriggerCount: 5,
    createdAt: "2026-04-03T10:00:00Z",
    noteCount: 5,
  },
]

export const MOCK_NOTES = [
  {
    id: "note-001",
    userId: "user-001",
    categoryId: "cat-001",
    categoryName: "产品设计",
    categoryIcon: "📱",
    title: "亲密关系社交产品的核心设计逻辑",
    content: `## 核心结论\n\n微信解决的是"信息传递"，而亲密关系社交解决的是"存在感交换"——这是两个本质不同的需求，不存在竞争关系。\n\n## 关键决策\n\n- 去除回复预期是释放高频分享的关键机制\n- 安全感是亲密社交的底层需求\n- 高频分享平庸内容是产品成功的信号\n\n## 待办事项\n\n- [ ] 研究 Locket Widget 的留存机制\n- [ ] 分析 Path 失败的核心原因`,
    tags: ["亲密社交", "Locket", "产品设计", "用户行为"],
    status: "active",
    links: [
      {
        targetNoteId: "note-002",
        relationType: "extend",
        relationConfidence: "direct",
        sourceCategoryName: "竞品分析",
        similarityScore: 0.87,
      },
      {
        targetNoteId: "note-003",
        relationType: "supplement",
        relationConfidence: "inferred",
        sourceCategoryName: "产品设计",
        similarityScore: 0.76,
      },
    ],
    createdAt: "2026-04-05T14:00:00Z",
    updatedAt: "2026-04-05T14:00:00Z",
  },
  {
    id: "note-002",
    userId: "user-001",
    categoryId: "cat-002",
    categoryName: "竞品分析",
    categoryIcon: "🔍",
    title: "Locket Widget 产品分析",
    content: `## 产品定位\n\nLocket 通过占领手机桌面 Widget 来建立"空间维度"的亲密感，区别于 Snapchat 的时间维度（阅后即焚）。\n\n## 核心机制\n\n- 桌面占领：照片直接出现在对方锁屏\n- 无回复预期：不需要对方回复\n- 内容暗示：界面引导用户发"平庸内容"\n\n## 数据表现\n\n- 2022年1月 App Store 榜首\n- 主要用户群：异地情侣、海外留学生`,
    tags: ["Locket", "竞品", "Widget", "桌面"],
    status: "active",
    links: [
      {
        targetNoteId: "note-001",
        relationType: "extend",
        relationConfidence: "direct",
        sourceCategoryName: "产品设计",
        similarityScore: 0.87,
      },
    ],
    createdAt: "2026-04-06T10:00:00Z",
    updatedAt: "2026-04-06T10:00:00Z",
  },
  {
    id: "note-003",
    userId: "user-001",
    categoryId: "cat-001",
    categoryName: "产品设计",
    categoryIcon: "📱",
    title: "大平台语境污染为独立产品留出空间",
    content: `## 核心结论\n\n语境塑造行为。微信里工作、家人、泛泛之交混在一起，同一张午饭照片在 Locket 是"今天吃了这个"，在微信是"我在打扰你"。\n\n## 底层逻辑\n\n这不是功能问题，是语境问题，大平台无法从根本上修复。独立产品的生存空间正来自于此。`,
    tags: ["语境", "平台", "独立产品", "社交"],
    status: "active",
    links: [
      {
        targetNoteId: "note-001",
        relationType: "supplement",
        relationConfidence: "inferred",
        sourceCategoryName: "产品设计",
        similarityScore: 0.76,
      },
      {
        targetNoteId: "note-004",
        relationType: "supplement",
        relationConfidence: "uncertain",
        sourceCategoryName: "技术研究",
        similarityScore: 0.62,
      },
    ],
    createdAt: "2026-04-07T09:00:00Z",
    updatedAt: "2026-04-07T09:00:00Z",
  },
  {
    id: "note-004",
    userId: "user-001",
    categoryId: "cat-003",
    categoryName: "技术研究",
    categoryIcon: "⚙️",
    title: "Graphify 知识图谱编译原理",
    content: `## 核心机制\n\nGraphify 通过"先编译、再查询"将一次性上下文处理变成持久化知识系统。\n\n## 技术栈\n\n- NetworkX：图计算\n- Leiden 算法：社区聚类\n- tree-sitter：代码解析\n- vis.js：可视化\n\n## 性能数据\n\nToken 消耗降低 71.5 倍，查询从"每次重读"变为"持久图谱查询"`,
    tags: ["Graphify", "知识图谱", "Token优化", "LLM"],
    status: "active",
    links: [
      {
        targetNoteId: "note-003",
        relationType: "supplement",
        relationConfidence: "uncertain",
        sourceCategoryName: "产品设计",
        similarityScore: 0.62,
      },
    ],
    createdAt: "2026-04-08T16:00:00Z",
    updatedAt: "2026-04-08T16:00:00Z",
  },
]

export const MOCK_SYNTHESIS = {
  "cat-001": {
    id: "syn-001",
    categoryId: "cat-001",
    categoryName: "产品设计",
    aiContent: `# 产品设计知识综述\n\n## 核心主题：亲密社交产品的设计逻辑\n\n根据已有笔记，亲密社交产品的核心价值主张是"存在感交换"而非"信息传递"，这与微信等大平台形成本质差异，不存在直接竞争关系。\n\n## 关键洞察\n\n### 1. 语境是差异化的根本\n大平台的语境污染（工作、社交、家庭混杂）天然为垂直产品留出了空间。用户在同一张照片面前的发送决策，完全取决于所在平台的语境暗示。\n\n### 2. 安全感操纵维度决定产品定位\n- Snapchat → 时间维度（阅后即焚）\n- Locket → 空间维度（桌面占领）\n- Path → 关系质量维度（限制好友数，已失败）\n\n### 3. 去除回复预期是关键设计决策\n分享一旦绑定回复预期，用户会在发送前进行心理评估，评估本身就是门槛。\n\n## ⚠️ 矛盾观点\n\n暂无明显矛盾观点。\n\n## 推荐深入研究的问题\n\n1. Locket 规模化后是否会面临功能扩展与克制理念的矛盾？\n2. 国内亲密社交产品为何普遍失败？`,
    userAnnotation: "",
    basedOnCount: 8,
    generatedAt: "2026-04-08T20:00:00Z",
    updatedAt: "2026-04-08T20:00:00Z",
  },
  "cat-002": {
    id: "syn-002",
    categoryId: "cat-002",
    categoryName: "竞品分析",
    aiContent: `# 竞品分析知识综述\n\n## Locket Widget\n\n主打桌面占领，目标用户为异地情侣和海外留学生。`,
    userAnnotation: "这个综述还不够完整，待笔记积累更多后再看。",
    basedOnCount: 3,
    generatedAt: "2026-04-08T18:00:00Z",
    updatedAt: "2026-04-09T09:00:00Z",
  },
}

export const MOCK_GRAPH = {
  nodes: [
    { id: "note-001", title: "亲密关系社交产品的核...", categoryId: "cat-001", categoryName: "产品设计", linkCount: 2 },
    { id: "note-002", title: "Locket Widget 产品分析", categoryId: "cat-002", categoryName: "竞品分析", linkCount: 1 },
    { id: "note-003", title: "大平台语境污染为独立...", categoryId: "cat-001", categoryName: "产品设计", linkCount: 2 },
    { id: "note-004", title: "Graphify 知识图谱编译原理", categoryId: "cat-003", categoryName: "技术研究", linkCount: 1 },
  ],
  edges: [
    { source: "note-001", target: "note-002", relationType: "extend", relationConfidence: "direct", similarityScore: 0.87 },
    { source: "note-001", target: "note-003", relationType: "supplement", relationConfidence: "inferred", similarityScore: 0.76 },
    { source: "note-003", target: "note-004", relationType: "supplement", relationConfidence: "uncertain", similarityScore: 0.62 },
  ],
}

export const MOCK_SEARCH_RESULTS = (query: string) => {
  return MOCK_NOTES.filter(n =>
    n.title.includes(query) ||
    n.content.includes(query) ||
    n.tags.some(t => t.includes(query))
  ).map(n => ({
    noteId: n.id,
    title: n.title,
    preview: n.content.replace(/[#\n]/g, " ").slice(0, 100),
    tags: n.tags.slice(0, 3),
    categoryName: n.categoryName,
    categoryIcon: n.categoryIcon,
    similarityScore: Math.random() * 0.3 + 0.65,
    createdAt: n.createdAt,
  }))
}

export const PROMPT_TEMPLATES = [
  {
    name: "产品设计",
    icon: "📱",
    granularity: "summary",
    promptTemplate: "你是一名产品经理，请阅读以下对话，提炼：1）核心结论 2）关键决策 3）待办事项。以结构化Markdown输出，拒绝废话。",
  },
  {
    name: "竞品分析",
    icon: "🔍",
    granularity: "summary",
    promptTemplate: "请从以下对话中提取竞品信息，按产品名聚合，输出：产品定位、核心机制、数据表现、与我方产品的差异。",
  },
  {
    name: "技术研究",
    icon: "⚙️",
    granularity: "atomic",
    promptTemplate: "请将以下技术对话拆分成独立的知识点，每个知识点包含：概念名称、核心原理、适用场景。",
  },
  {
    name: "灵感记录",
    icon: "💡",
    granularity: "atomic",
    promptTemplate: "请提取以下内容中的灵感和想法，每条独立成段，保留原始观点的锐度，不要过度包装。",
  },
  {
    name: "学习笔记",
    icon: "📚",
    granularity: "summary",
    promptTemplate: "请将以下学习内容整理为结构化笔记，包含：核心概念、关键结论、启发与应用。",
  },
]
