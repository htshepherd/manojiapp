CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  category_name VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('processing', 'active', 'deleted')),
  raw_file_path VARCHAR(500),
  vector_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  relation_type VARCHAR(20) NOT NULL
    CHECK (relation_type IN ('supplement', 'extend', 'conflict', 'example')),
  relation_confidence VARCHAR(20) NOT NULL
    CHECK (relation_confidence IN ('direct', 'inferred', 'uncertain')),
  source_category_name VARCHAR(100),
  similarity_score FLOAT NOT NULL DEFAULT 0,
  user_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (note_id, target_note_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_note_links_note_id ON note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);
