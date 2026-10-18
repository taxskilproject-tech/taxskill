import { runSupabase } from "./utils/run-supabase";

const files = new Map([
  ["h02", "supabase/tests/h02-access.sql"],
  ["h03", "supabase/tests/h03-documents.sql"],
  ["h04", "supabase/tests/h04-engine.sql"],
  ["h05", "supabase/tests/h05-employment.sql"],
  ["h06", "supabase/tests/h06-activities.sql"],
  ["h07", "supabase/tests/h07-reporting.sql"],
  ["h08", "supabase/tests/h08-security.sql"],
]);
const file = files.get(process.argv[2] ?? "");
if (!file || process.argv.length !== 3)
  throw new Error(
    "Selecciona h02, h03, h04, h05, h06, h07 o h08. Las pruebas SQL solo usan --local.",
  );

console.log(runSupabase(["test", "db", "--local", file]));
