-- migrations/007_add_user_onboarding.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- 将已经拥有模版的用户标记为已初始化，防止重复导入
UPDATE users SET is_onboarded = TRUE 
WHERE id IN (SELECT DISTINCT user_id FROM prompt_templates);
