export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    !URL.canParse(origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return false;
  const source = new URL(origin);
  const target = new URL(request.url);
  // Next may canonicalize request.url to localhost behind its own dev proxy.
  const targetHost = request.headers.get("host") ?? target.host;
  const targetProtocol =
    request.headers.get("x-forwarded-proto") ?? target.protocol.slice(0, -1);
  return (
    ["http:", "https:"].includes(source.protocol) &&
    source.protocol === targetProtocol + ":" &&
    source.host === targetHost &&
    source.pathname === "/" &&
    !source.search &&
    !source.hash &&
    !source.username &&
    !source.password
  );
}
