CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  granularity VARCHAR(20) NOT NULL CHECK (granularity IN ('summary', 'atomic')),
  prompt_template TEXT NOT NULL,
  link_threshold FLOAT NOT NULL DEFAULT 0.75
    CHECK (link_threshold >= 0.5 AND link_threshold <= 1.0),
  synthesis_trigger_count INT NOT NULL DEFAULT 5
    CHECK (synthesis_trigger_count >= 3),
  raw_dir VARCHAR(500) NOT NULL,
  note_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
