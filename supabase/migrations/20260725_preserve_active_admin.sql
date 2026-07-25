CREATE OR REPLACE FUNCTION preserve_active_app_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Serialize role/deactivation changes so two concurrent requests cannot
  -- remove the final administrators at the same time.
  LOCK TABLE app_users IN SHARE ROW EXCLUSIVE MODE;

  IF OLD.is_admin = TRUE
     AND OLD.active = TRUE
     AND (TG_OP = 'DELETE' OR NEW.is_admin = FALSE OR NEW.active = FALSE)
     AND NOT EXISTS (
       SELECT 1
       FROM app_users
       WHERE is_admin = TRUE
         AND active = TRUE
         AND id <> OLD.id
     ) THEN
    RAISE EXCEPTION 'O sistema precisa manter pelo menos um administrador ativo.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_active_app_admin_trigger ON app_users;
CREATE TRIGGER preserve_active_app_admin_trigger
BEFORE UPDATE OF is_admin, active OR DELETE ON app_users
FOR EACH ROW
EXECUTE FUNCTION preserve_active_app_admin();
