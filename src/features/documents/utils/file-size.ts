export const BYTES_PER_MB = 1_000_000;
export function megabytesToBytes(value: string): number {
  const megabytes = Number(value);
  return Number.isFinite(megabytes) ? Math.round(megabytes * BYTES_PER_MB) : 0;
}
