CREATE TABLE IF NOT EXISTS pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imposto_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  taxa_cartao_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pricing_settings (imposto_percentual, taxa_cartao_percentual)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM pricing_settings);

ALTER TABLE products DROP COLUMN IF EXISTS imposto_percentual;
ALTER TABLE products DROP COLUMN IF EXISTS taxa_cartao_percentual;
