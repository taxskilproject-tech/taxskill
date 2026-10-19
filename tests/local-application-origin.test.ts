import { afterEach, describe, expect, it, vi } from "vitest";

import { localApplicationOrigin } from "../scripts/utils/local-application-origin";

afterEach(() => vi.unstubAllEnvs());

describe("destino de la aplicación de pruebas", () => {
  it("usa el puerto local habitual por defecto", () => {
    vi.stubEnv("TAXSKILL_LOCAL_APP_PORT", undefined);
    expect(localApplicationOrigin()).toBe("http://127.0.0.1:3001");
  });

  it("admite el puerto alternativo y conserva loopback", () => {
    vi.stubEnv("TAXSKILL_LOCAL_APP_PORT", "4001");
    expect(localApplicationOrigin()).toBe("http://127.0.0.1:4001");
  });

  it.each(["https://taxskill.vercel.app", "54321", "54331", "", "4001/path"])(
    "rechaza destinos que podrían recibir credenciales por error: %s",
    (value) => {
      vi.stubEnv("TAXSKILL_LOCAL_APP_PORT", value);
      expect(localApplicationOrigin).toThrow("puertos locales 3001 y 4001");
    },
  );
});
