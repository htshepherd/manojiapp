import { QdrantClient } from '@qdrant/js-client-rest';

declare global {
  var _qdrantClient: QdrantClient | undefined;
}

export const qdrant = global._qdrantClient ?? new QdrantClient({
  url: process.env.QDRANT_URL
});

if (process.env.NODE_ENV !== 'production') {
  global._qdrantClient = qdrant;
}

const COLLECTION = process.env.QDRANT_COLLECTION!;

export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: 1536, distance: 'Cosine' }
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
  const data = await response.json();
  return data.data[0].embedding;
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
  return results.map(r => ({
    note_id: r.payload!.note_id as string,
    score: r.score
  }));
}
