ALTER TABLE products ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'Villagres';
ALTER TABLE products ADD COLUMN IF NOT EXISTS categoria_complementar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo_rejunte TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo_embalagem TEXT;

UPDATE products
SET marca = 'Villagres'
WHERE marca IS NULL;
