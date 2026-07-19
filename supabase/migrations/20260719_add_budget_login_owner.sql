ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by_user TEXT DEFAULT 'admin';

UPDATE budgets
SET created_by_user = 'admin'
WHERE created_by_user IS NULL;
