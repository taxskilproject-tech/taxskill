import { afterEach, describe, expect, it, vi } from "vitest";

import {
  databaseMigrations,
  databaseProcess,
  dumpDatabase,
} from "../scripts/operations/repositories/database-backup";

const subprocess = vi.hoisted(() => ({
  run: vi.fn(() => ({
    status: 0,
    stdout: Buffer.from('["20261017000000"]'),
  })),
}));

vi.mock("node:child_process", () => ({ spawnSync: subprocess.run }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(() => true) }));

afterEach(() => vi.unstubAllEnvs());

describe("ejecutor PostgreSQL de respaldo", () => {
  it("usa el rol del CLI y conserva TLS verificado sin exponer la contraseña en argumentos", () => {
    vi.stubEnv(
      "H08_DATABASE_URL",
      "postgresql://cli_login_postgres.gzwrqvqofcrdjvzoblaz:private-test@aws-1-ca-central-1.pooler.supabase.com:5432/postgres",
    );
    vi.stubEnv("H08_DATABASE_CA_CERT", "test-results/public-ca.crt");
    expect(databaseMigrations("cloud")).toEqual(["20261017000000"]);
    expect(subprocess.run).toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining([
        "psql",
        "-qAtc",
        expect.stringMatching(/^set role postgres; select /),
      ]),
      expect.objectContaining({
        env: expect.objectContaining({
          PGPASSWORD: "private-test",
          PGSSLMODE: "verify-full",
          PGSSLROOTCERT: "/tmp/taxskill-ca.crt",
        }),
      }),
    );
    dumpDatabase("cloud");
    expect(subprocess.run).toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining(["pg_dump", "--role=postgres"]),
      expect.anything(),
    );
    expect(subprocess.run).not.toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining(["private-test"]),
      expect.anything(),
    );
  });

  it("rechaza un proyecto ajeno antes de ejecutar Docker", () => {
    vi.stubEnv(
      "H08_DATABASE_URL",
      "postgresql://cli_login_postgres.other:private-test@aws-1-ca-central-1.pooler.supabase.com:5432/postgres",
    );
    const query = databaseProcess.bind(undefined, "cloud", "psql", [
      "-Atc",
      "select 1",
    ]);
    expect(query).toThrow("Conexión PostgreSQL productiva no autorizada.");
    expect(subprocess.run).not.toHaveBeenCalled();
  });
});
