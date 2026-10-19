const LOCAL_APPLICATION_PORTS = ["3001", "4001"];
const DEFAULT_APPLICATION_PORT = "3001";

export function localApplicationOrigin(): string {
  const port = process.env.TAXSKILL_LOCAL_APP_PORT ?? DEFAULT_APPLICATION_PORT;
  if (!LOCAL_APPLICATION_PORTS.includes(port))
    throw new Error(
      "La app de pruebas solo admite los puertos locales 3001 y 4001.",
    );
  return `http://127.0.0.1:${port}`;
}
