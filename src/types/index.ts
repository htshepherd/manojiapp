// src/types/index.ts

export type Granularity = "summary" | "atomic"
export type NoteStatus = "processing" | "active" | "deleted"
export type RelationType = "supplement" | "extend" | "conflict" | "example"
export type RelationConfidence = "direct" | "inferred" | "uncertain"

export interface Category {
  id: string
  name: string
  icon: string
  granularity: Granularity
  promptTemplate: string
  linkThreshold: number
  synthesisTriggerCount: number
  createdAt: string
  noteCount: number
}

export interface NoteLink {
  targetNoteId: string
  targetNoteTitle?: string
  relationType: RelationType
  relationConfidence: RelationConfidence
  sourceCategoryName: string
  similarityScore: number
}

export interface Note {
  id: string
  userId: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  title: string
  content: string
  preview?: string
  tags: string[]
  status: NoteStatus
  links: NoteLink[]
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  noteId: string
  title: string
  preview: string
  tags: string[]
  categoryName: string
  categoryIcon: string
  similarityScore: number
  createdAt: string
}

export interface GraphNode {
  id: string
  title: string
  categoryId: string
  categoryName: string
  linkCount: number
}

export interface GraphEdge {
  source: string
  target: string
  relationType: RelationType
  relationConfidence: RelationConfidence
  similarityScore: number
}

export interface Synthesis {
  id: string
  categoryId: string
  categoryName: string
  aiContent: string
  userAnnotation: string
  basedOnCount: number
  generatedAt: string
  updatedAt: string
}
