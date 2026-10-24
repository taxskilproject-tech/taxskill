export function presentationPage(value: string | null): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}
