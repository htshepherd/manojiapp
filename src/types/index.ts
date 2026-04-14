/**
 * 全局类型定义文件
 * 包含数据库行定义 (XxxRow) 和 前端模型定义 (Xxx)
 * 禁止在其他文件使用 any
 */

// --- 基础 & 通用 ---

/** 分页元数据 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 统一 API 成功的响应格式 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  generated_at?: string;
  source?: string;
}

/** 统一 API 错误的响应格式 */
export interface ErrorResponse {
  error: string;
  details?: unknown;
  debug?: string;
}

// --- 笔记 (Notes) ---

/** 笔记同步状态 */
export type NoteStatus = 'active' | 'archived' | 'deleted';

/** 数据库 notes 表原始行 */
export interface NoteRow {
  id: string; // 笔记 ID (UUID)
  user_id: string; // 用户 ID (UUID)
  category_id: string; // 分类 ID (UUID)
  category_name: string; // 分类名称
  title: string; // 标题
  content: string; // 内容 (Markdown)
  tags: string[] | null; // 标签数组
  source_text: string | null; // 原始提炼文本
  vector_id: string | null; // 向量 ID (Qdrant)
  raw_file_path: string | null; // 物理文件路径
  status: NoteStatus; // 笔记状态
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
  last_viewed_at: string | null; // 最后阅读时间
}

/** 前端使用的笔记模型 */
export interface Note {
  id: string; // 笔记 ID
  userId: string; // 用户 ID
  categoryId: string; // 分类 ID
  categoryName: string; // 分类名称
  title: string; // 标题
  content: string; // 内容
  tags: string[]; // 标签
  sourceText?: string; // 源码
  vectorId?: string; // 向量 ID
  rawFilePath?: string; // 文件路径
  status: NoteStatus; // 状态
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
  lastViewedAt?: string; // 最后查看
  links?: (NoteLink & { targetNoteTitle: string })[]; // 关联详情
  preview?: string; // 内容预览
}

/** 笔记预览模型 (列表页使用) */
export interface NotePreview extends Pick<Note, 'id' | 'title' | 'tags' | 'categoryId' | 'categoryName' | 'createdAt' | 'updatedAt'> {
  preview: string; // 内容预览 (100-200 字符)
}

// --- 分类 (Categories) ---

/** 数据库 categories 表原始行 */
export interface CategoryRow {
  id: string; // 分类 ID
  user_id: string; // 用户 ID
  name: string; // 名称
  granularity: string; // 颗粒度
  prompt_template: string; // AI 提炼模版
  link_threshold: number; // 连线相似度阈值
  synthesis_trigger_count: number; // 综述触发篇数
  raw_dir: string; // 物理存储目录
  created_at: string; // 创建时间
}

/** 知识学习深度 */
export type Granularity = 'summary' | 'atomic';

/** 前端使用的分类模型 */
export interface Category {
  id: string; // 分类 ID
  userId: string; // 用户 ID
  name: string; // 名称
  granularity: string; // 颗粒度
  promptTemplate: string; // 提炼模版
  linkThreshold: number; // 相似度阈值
  synthesisTriggerCount: number; // 综述触发数
  rawDir: string; // 存储目录
  createdAt: string; // 创建时间
  noteCount: number; // 关联活跃笔记总数
}

// --- 关联 (Note Links) ---

/** 关联类型 */
export type RelationType = 'supplement' | 'extend' | 'conflict' | 'example';

/** 关联可信度 */
export type RelationConfidence = 'direct' | 'inferred' | 'uncertain';

/** 数据库 note_links 表原始行 */
export interface NoteLinkRow {
  id: string; // 关联 ID
  note_id: string; // 源笔记 ID
  target_note_id: string; // 目标笔记 ID
  relation_type: RelationType; // 关联类型
  relation_confidence: RelationConfidence; // 可信度
  similarity_score: number; // 向量相似度得分
  source_category_name: string; // 来源分类名
  user_deleted: boolean; // 用户是否手动删除该关联
  created_at: string; // 创建时间
}

/** 前端使用的关联模型 */
export interface NoteLink {
  id: string; // 关联 ID
  noteId: string; // 源 ID
  targetNoteId: string; // 目标 ID
  relationType: RelationType; // 类型
  relationConfidence: RelationConfidence; // 可信度
  similarityScore: number; // 得分
  sourceCategoryName: string; // 来源分类
  userDeleted: boolean; // 是否被删
  createdAt: string; // 创建时间
}

// --- 综述 (Synthesis) ---

/** 数据库 synthesis 表原始行 */
export interface SynthesisRow {
  id: string; // 综述 ID
  category_id: string; // 所属分类 ID
  user_annotation: string; // 用户批注内容
  generated_at: string; // 自动综述生成时间
  updated_at: string; // 最后更新时间
}

/** 前端使用的综述模型 */
export interface Synthesis {
  id: string; // ID
  categoryId: string; // 分类 ID
  categoryName: string; // 分类名称
  aiContent: string | null; // AI 生成的 Wiki 内容 (.md)
  userAnnotation: string; // 用户批注
  basedOnCount: number; // 基于多少篇笔记生成的
  generatedAt: string | null; // 生成时间
  updatedAt: string; // 更新时间
}

// --- 指令模板 (Prompt Templates) ---

/** 数据库 prompt_templates 表原始行 */
export interface TemplateRow {
  id: string; // 模板 ID
  user_id: string; // 用户 ID
  name: string; // 模板名称
  type: string; // 模板类型
  prompt_template: string; // 具体指令
  description: string | null; // 描述信息
  created_at: string; // 创建时间
}

/** 前端使用的指令模板模型 */
export interface PromptTemplate {
  id: string; // ID
  userId: string; // 用户 ID
  name: string; // 名称
  type: string; // 类型
  promptTemplate: string; // 指令内容
  description?: string; // 描述
  createdAt: string; // 创建时间
}

// --- 知识图谱 (Knowledge Graph) ---

/** 图谱节点 */
export interface GraphNode {
  id: string; // 笔记 ID
  title: string; // 标题
  categoryId: string; // 分类 ID
  categoryName: string; // 分类名
  tags: string[]; // 标签
  createdAt: string; // 创建时间
  linkCount: number; // 连接数 (出度+入度)
}

/** 图谱连线 */
export interface GraphEdge {
  id: string; // 连线 ID
  source: string; // 源节点 ID
  target: string; // 目标节点 ID
  relationType: RelationType; // 关联类型
  relationConfidence: RelationConfidence; // 可信度
  similarityScore: number; // 相似度得分
  sourceCategoryName: string; // 来源分类
}

/** 完整图谱数据结构 */
export interface GraphData {
  nodes: GraphNode[]; // 节点集合
  edges: GraphEdge[]; // 边集合
  generated_at: string | null; // 数据快照生成时间
  source: 'graphify' | 'database-fallback'; // 数据来源
}
