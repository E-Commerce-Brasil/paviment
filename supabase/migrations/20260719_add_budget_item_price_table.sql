ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS tabela_preco INTEGER DEFAULT 1;

UPDATE budget_items
SET tabela_preco = 1
WHERE tabela_preco IS NULL;
