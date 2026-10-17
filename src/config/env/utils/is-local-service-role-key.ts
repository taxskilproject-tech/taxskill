import { isRecord } from "@/domain/common/utils/normalize-operation-error";

export function isLocalServiceRoleKey(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const payload: unknown = JSON.parse(
      atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")),
    );
    return isRecord(payload) && payload.role === "service_role";
  } catch {
    return false;
  }
}
