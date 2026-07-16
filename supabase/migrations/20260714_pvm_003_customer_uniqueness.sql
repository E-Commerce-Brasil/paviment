-- PVM-003: bloqueio definitivo de clientes duplicados
-- Execute este arquivo no SQL Editor do Supabase antes de publicar a funcionalidade.
-- A migracao considera duplicados:
--   * nomes iguais ignorando acentos, maiusculas/minusculas e espacos repetidos;
--   * CPF e telefone iguais ignorando mascara;
--   * e-mails iguais ignorando maiusculas/minusculas e espacos externos.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.normalize_customer_name(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(
    trim(
      regexp_replace(
        public.unaccent(coalesce(value, '')),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_customer_digits(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_customer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  duplicate_customer record;
BEGIN
  SELECT id, nome
    INTO duplicate_customer
  FROM public.customers
  WHERE id <> coalesce(NEW.id, gen_random_uuid())
    AND public.normalize_customer_name(nome) = public.normalize_customer_name(NEW.nome)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Ja existe um cliente com este nome: %', duplicate_customer.nome
      USING ERRCODE = '23505';
  END IF;

  IF public.normalize_customer_digits(NEW.cpf) <> '' THEN
    SELECT id, nome
      INTO duplicate_customer
    FROM public.customers
    WHERE id <> coalesce(NEW.id, gen_random_uuid())
      AND public.normalize_customer_digits(cpf) = public.normalize_customer_digits(NEW.cpf)
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Ja existe um cliente com este CPF: %', duplicate_customer.nome
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF public.normalize_customer_digits(NEW.telefone) <> '' THEN
    SELECT id, nome
      INTO duplicate_customer
    FROM public.customers
    WHERE id <> coalesce(NEW.id, gen_random_uuid())
      AND public.normalize_customer_digits(telefone) = public.normalize_customer_digits(NEW.telefone)
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Ja existe um cliente com este telefone: %', duplicate_customer.nome
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF coalesce(trim(NEW.email), '') <> '' THEN
    SELECT id, nome
      INTO duplicate_customer
    FROM public.customers
    WHERE id <> coalesce(NEW.id, gen_random_uuid())
      AND lower(trim(email)) = lower(trim(NEW.email))
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Ja existe um cliente com este e-mail: %', duplicate_customer.nome
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_prevent_duplicates ON public.customers;
CREATE TRIGGER customers_prevent_duplicates
BEFORE INSERT OR UPDATE OF nome, cpf, telefone, email
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_customer();

-- Verificacao previa: a criacao dos indices abaixo falhara caso ja existam duplicados.
-- Use as consultas no final deste arquivo para localizar e corrigir os registros antes de tentar novamente.

CREATE UNIQUE INDEX IF NOT EXISTS customers_nome_normalized_unique
  ON public.customers (public.normalize_customer_name(nome));

CREATE UNIQUE INDEX IF NOT EXISTS customers_cpf_digits_unique
  ON public.customers (public.normalize_customer_digits(cpf))
  WHERE public.normalize_customer_digits(cpf) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS customers_telefone_digits_unique
  ON public.customers (public.normalize_customer_digits(telefone))
  WHERE public.normalize_customer_digits(telefone) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_normalized_unique
  ON public.customers ((lower(trim(email))))
  WHERE coalesce(trim(email), '') <> '';

-- Consultas de diagnostico para uso manual caso a migracao encontre duplicados:
--
-- SELECT public.normalize_customer_name(nome) AS valor, count(*), array_agg(nome)
-- FROM public.customers
-- GROUP BY public.normalize_customer_name(nome)
-- HAVING count(*) > 1;
--
-- SELECT public.normalize_customer_digits(cpf) AS valor, count(*), array_agg(nome)
-- FROM public.customers
-- WHERE public.normalize_customer_digits(cpf) <> ''
-- GROUP BY public.normalize_customer_digits(cpf)
-- HAVING count(*) > 1;
--
-- SELECT public.normalize_customer_digits(telefone) AS valor, count(*), array_agg(nome)
-- FROM public.customers
-- WHERE public.normalize_customer_digits(telefone) <> ''
-- GROUP BY public.normalize_customer_digits(telefone)
-- HAVING count(*) > 1;
--
-- SELECT lower(trim(email)) AS valor, count(*), array_agg(nome)
-- FROM public.customers
-- WHERE coalesce(trim(email), '') <> ''
-- GROUP BY lower(trim(email))
-- HAVING count(*) > 1;
