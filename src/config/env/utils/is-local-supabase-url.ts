const LOCAL_API_PORT = "54331";
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function isLocalSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      LOCAL_HOSTS.includes(url.hostname) &&
      url.port === LOCAL_API_PORT &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    // Una URL inválida es una entrada rechazada, no un fallo de red.
    return false;
  }
}
