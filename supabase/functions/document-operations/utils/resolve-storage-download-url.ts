const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function resolveStorageDownloadUrl(
  signedUrl: string,
  publicBaseUrl: string,
) {
  const signed = new URL(signedUrl);
  const base = new URL(publicBaseUrl);
  const secure = base.protocol === "https:";
  const local =
    base.protocol === "http:" && LOCAL_HOSTS.includes(base.hostname);
  if (
    (!secure && !local) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("DEPENDENCY_UNAVAILABLE");
  if (!signed.pathname.startsWith("/storage/v1/object/sign/") || signed.hash)
    throw new Error("DEPENDENCY_UNAVAILABLE");
  // Preserve the signed path/query; only the trusted deployment origin changes.
  return base.origin + signed.pathname + signed.search;
}
