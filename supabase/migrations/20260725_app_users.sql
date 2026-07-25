-- PAVIMENT · Migração para tabela de usuários (app_users)
-- Execute no SQL Editor do Supabase se a tabela ainda não existir

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Usuários padrão caso a tabela esteja vazia
-- admin (senha: admin) | vendas (senha: vendas)
INSERT INTO app_users (username, display_name, password_hash, is_admin, active)
VALUES
  ('admin', 'Administrador', '79416c9685c6baf019b311c43844d8d13e1b1c05c8bfcd814048b8719ddf2ee1', TRUE, TRUE),
  ('vendas', 'Vendas', 'e95677a8dc1e007ad2de15c4a87042c39592c8d358a26b5d0130b9e6440297f4', FALSE, TRUE)
ON CONFLICT (username) DO NOTHING;
