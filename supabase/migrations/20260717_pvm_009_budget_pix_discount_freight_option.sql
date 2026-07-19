ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS desconto_pix_inclui_frete BOOLEAN DEFAULT FALSE;

UPDATE budgets
SET desconto_pix_inclui_frete = FALSE
WHERE desconto_pix_inclui_frete IS NULL;
