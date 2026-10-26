const LOCAL_API_PORTS = ["54331", "54431"]; // TaxSkill principal y laboratorio H09 aislado.
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function isLocalSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      LOCAL_HOSTS.includes(url.hostname) &&
      LOCAL_API_PORTS.includes(url.port) &&
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
