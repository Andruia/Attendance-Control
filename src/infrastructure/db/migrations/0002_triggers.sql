-- Migration 0002: Add updated_at trigger function and apply to all tables

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['companies', 'departments', 'employees', 'shifts', 'overtime_configs', 'sync_metadata'])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_update_updated_at ON %I;', tbl
      );
      EXECUTE format(
        'CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;
