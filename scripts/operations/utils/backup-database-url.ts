const PROJECT_REF = "gzwrqvqofcrdjvzoblaz";
const DATABASE_USERS = ["postgres", "cli_login_postgres"];

export function isAuthorizedBackupDatabase(url: URL): boolean {
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return false;
  if (url.port && url.port !== "5432") return false;
  if (url.pathname !== "/postgres") return false;
  if (url.hostname === `db.${PROJECT_REF}.supabase.co`)
    return DATABASE_USERS.includes(url.username);
  if (!url.hostname.endsWith(".pooler.supabase.com")) return false;
  return DATABASE_USERS.some(
    (user) => url.username === `${user}.${PROJECT_REF}`,
  );
}
