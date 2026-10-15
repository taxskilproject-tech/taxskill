import { spawnSync } from "node:child_process";

export function runSupabase(args: readonly string[]): string {
  const executable = process.platform === "win32" ? "supabase.exe" : "supabase";
  const result = spawnSync(executable, [...args, "--log-level", "error"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      "Supabase CLI no pudo completar la operación. Revisa login, vínculo y conectividad.",
    );
  }

  return result.stdout;
}
