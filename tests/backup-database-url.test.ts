import { describe, expect, it } from "vitest";

import { isAuthorizedBackupDatabase } from "../scripts/operations/utils/backup-database-url";

describe("destino PostgreSQL del respaldo productivo", () => {
  it.each([
    "postgresql://postgres:private@db.gzwrqvqofcrdjvzoblaz.supabase.co:5432/postgres",
    "postgresql://cli_login_postgres:private@db.gzwrqvqofcrdjvzoblaz.supabase.co:5432/postgres",
    "postgresql://cli_login_postgres.gzwrqvqofcrdjvzoblaz:private@aws-1-ca-central-1.pooler.supabase.com:5432/postgres",
  ])("admite solo el proyecto autorizado con conexión session: %s", (value) => {
    expect(isAuthorizedBackupDatabase(new URL(value))).toBe(true);
  });

  it.each([
    "postgresql://postgres:private@127.0.0.1:5432/postgres",
    "postgresql://postgres.otherproject:private@aws-1-ca-central-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres.gzwrqvqofcrdjvzoblaz:private@aws-1-ca-central-1.pooler.supabase.com:6543/postgres",
    "postgresql://other:private@db.gzwrqvqofcrdjvzoblaz.supabase.co:5432/postgres",
    "postgresql://postgres:private@db.gzwrqvqofcrdjvzoblaz.supabase.co:5432/other",
    "http://postgres:private@db.gzwrqvqofcrdjvzoblaz.supabase.co:5432/postgres",
  ])("rechaza destinos o contratos ajenos: %s", (value) => {
    expect(isAuthorizedBackupDatabase(new URL(value))).toBe(false);
  });
});
