-- 008_add_last_viewed_at.sql
-- 为笔记表新增最后阅读时间字段，用于随机漫步的沉睡推荐逻辑

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP DEFAULT NULL;

-- 加索引：推荐接口按 last_viewed_at 排序时使用
CREATE INDEX IF NOT EXISTS idx_notes_last_viewed_at
  ON notes(user_id, last_viewed_at ASC NULLS FIRST);

COMMENT ON COLUMN notes.last_viewed_at IS '用户最后一次查看该笔记的时间，NULL 表示从未阅读，优先推荐';
