CREATE TABLE IF NOT EXISTS synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
  wiki_file_path VARCHAR(500),
  user_annotation TEXT DEFAULT '',
  based_on_count INT DEFAULT 0,
  generated_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
