import { QdrantClient } from '@qdrant/js-client-rest';

declare global {
  var _qdrantClient: QdrantClient | undefined;
}

export const qdrant = global._qdrantClient ?? new QdrantClient({
  url: process.env.QDRANT_URL,
  // 若 Qdrant 实例开启了 API Key 鉴权（生产环境推荐），通过环境变量传入
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}),
});

if (process.env.NODE_ENV !== 'production') {
  global._qdrantClient = qdrant;
}

if (!process.env.QDRANT_COLLECTION) {
  throw new Error('[qdrant] 缺少必要环境变量：QDRANT_COLLECTION');
}
const COLLECTION = process.env.QDRANT_COLLECTION;
const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || '1536');

export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' }
    });
  }
}

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${process.env.EMBEDDING_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EMBEDDING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: process.env.EMBEDDING_MODEL, input: text })
  });

  if (!response.ok) {
    throw new Error(`[embedText] Embedding API 返回错误: HTTP ${response.status}`);
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error(`[embedText] Embedding API 响应结构异常: 未找到 data[0].embedding`);
  }
  return embedding;
}

export async function upsertVector(
  vectorId: string,
  vector: number[],
  payload: { note_id: string; user_id: string; category_id: string }
): Promise<void> {
  await qdrant.upsert(COLLECTION, {
    points: [{ id: vectorId, vector, payload }]
  });
}

export async function deleteVector(vectorId: string): Promise<void> {
  await qdrant.delete(COLLECTION, { points: [vectorId] });
}

export async function deleteVectors(vectorIds: string[]): Promise<void> {
  if (vectorIds.length === 0) return;
  await qdrant.delete(COLLECTION, { points: vectorIds });
}

export async function searchSimilar(
  vector: number[],
  userId: string,
  categoryId?: string,
  topK: number = 10
): Promise<Array<{ note_id: string; score: number }>> {
  const filter: any = {
    must: [{ key: 'user_id', match: { value: userId } }]
  };
  if (categoryId) {
    filter.must.push({ key: 'category_id', match: { value: categoryId } });
  }
  const results = await qdrant.search(COLLECTION, {
    vector, filter, limit: topK, with_payload: true
  });
  return results
    .filter(r => typeof r.payload?.note_id === 'string' && r.payload.note_id.length > 0)
    .map(r => ({
      note_id: r.payload!.note_id as string,
      score: r.score
    }));
}
