ALTER TABLE products ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'Villagres';
ALTER TABLE products ADD COLUMN IF NOT EXISTS categoria_complementar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo_embalagem TEXT;

INSERT INTO products (
  referencia, formato, linha, colecao, cor, superficie, faces, variacao,
  local_uso, derivacao, m2_por_caixa, pecas_por_caixa, m2_por_pallet,
  cx_por_pallet, peso_bruto_m2, peso_bruto_cx, espessura_mm,
  preco1, preco2, preco3, preco4, descontinuado, marca,
  categoria_complementar, tipo_rejunte, tipo_embalagem
) VALUES
  ('VLC-NIV-CLIP-100-100', '', 'Nivela Clips 1,00 mm Eco Black pacote com 100 unidades', '', '', '', 0, '', 3, '', 1, 100, 0, 0, 0, 0, 1.00, 16.90, 16.90, 16.90, 16.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-150-100', '', 'Nivela Clips 1,50 mm Eco Black pacote com 100 unidades', '', '', '', 0, '', 3, '', 1, 100, 0, 0, 0, 0, 1.50, 16.90, 16.90, 16.90, 16.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-200-100', '', 'Nivela Clips 2,00 mm Eco Black pacote com 100 unidades', '', '', '', 0, '', 3, '', 1, 100, 0, 0, 0, 0, 2.00, 16.90, 16.90, 16.90, 16.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-300-100', '', 'Nivela Clips 3,00 mm Eco Black pacote com 100 unidades', '', '', '', 0, '', 3, '', 1, 100, 0, 0, 0, 0, 3.00, 16.90, 16.90, 16.90, 16.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-100-500', '', 'Nivela Clips 1,00 mm Eco Black pacote com 500 unidades', '', '', '', 0, '', 3, '', 1, 500, 0, 0, 0, 0, 1.00, 75.90, 75.90, 75.90, 75.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-150-500', '', 'Nivela Clips 1,50 mm Eco Black pacote com 500 unidades', '', '', '', 0, '', 3, '', 1, 500, 0, 0, 0, 0, 1.50, 75.90, 75.90, 75.90, 75.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-200-500', '', 'Nivela Clips 2,00 mm Eco Black pacote com 500 unidades', '', '', '', 0, '', 3, '', 1, 500, 0, 0, 0, 0, 2.00, 75.90, 75.90, 75.90, 75.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CLIP-300-500', '', 'Nivela Clips 3,00 mm Eco Black pacote com 500 unidades', '', '', '', 0, '', 3, '', 1, 500, 0, 0, 0, 0, 3.00, 75.90, 75.90, 75.90, 75.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote'),
  ('VLC-NIV-CUNHA-50', '', 'Nivela Cunha Eco Black pacote com 50 unidades', '', '', '', 0, '', 3, '', 1, 50, 0, 0, 0, 0, 0, 18.90, 18.90, 18.90, 18.90, FALSE, 'Villacol', 'Niveladores/Cunhas', NULL, 'Pacote')
ON CONFLICT (referencia) DO UPDATE SET
  linha = EXCLUDED.linha,
  pecas_por_caixa = EXCLUDED.pecas_por_caixa,
  espessura_mm = EXCLUDED.espessura_mm,
  preco1 = EXCLUDED.preco1,
  preco2 = EXCLUDED.preco2,
  preco3 = EXCLUDED.preco3,
  preco4 = EXCLUDED.preco4,
  marca = EXCLUDED.marca,
  categoria_complementar = EXCLUDED.categoria_complementar,
  tipo_embalagem = EXCLUDED.tipo_embalagem;
