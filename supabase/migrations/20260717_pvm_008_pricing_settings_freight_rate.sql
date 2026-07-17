ALTER TABLE pricing_settings
ADD COLUMN IF NOT EXISTS frete_por_100kg NUMERIC(10,2) NOT NULL DEFAULT 4;

UPDATE pricing_settings
SET frete_por_100kg = 4
WHERE frete_por_100kg IS NULL;
