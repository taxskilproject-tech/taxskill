import { isRecord } from "@/domain/common/utils/normalize-operation-error";

export function isPublishableKey(value: string): boolean {
  if (value.startsWith("sb_publishable_") && value.length > 20) {
    return true;
  }

  const parts = value.split(".");

  if (parts.length !== 3 || !parts[1]) {
    return false;
  }

  try {
    const payload: unknown = JSON.parse(
      atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")),
    );
    return isRecord(payload) && payload.role === "anon";
  } catch {
    // Una clave mal formada es una entrada inválida, no un error de red.
    return false;
  }
}
