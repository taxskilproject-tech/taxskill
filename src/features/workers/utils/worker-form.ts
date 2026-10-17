import {
  employmentInputSchema,
  workerInputSchema,
} from "@/domain/workers/contracts/worker.schema";

export function optionalFormText(data: FormData, field: string) {
  return String(data.get(field) ?? "").trim() || null;
}
export function parseWorkerForm(data: FormData, companyId: string) {
  return workerInputSchema.safeParse({
    company_id: companyId,
    identity_type: data.get("identity_type"),
    identity_number: data.get("identity_number"),
    first_names: data.get("first_names"),
    last_names: data.get("last_names"),
    birth_date: optionalFormText(data, "birth_date"),
    email: optionalFormText(data, "email"),
    phone: optionalFormText(data, "phone"),
    address: optionalFormText(data, "address"),
    notes: optionalFormText(data, "notes"),
  });
}
export function parseEmploymentForm(data: FormData) {
  return employmentInputSchema.safeParse({
    start_date: data.get("start_date"),
    end_date: optionalFormText(data, "end_date"),
    termination_reason: optionalFormText(data, "termination_reason"),
    termination_notes: optionalFormText(data, "termination_notes"),
    position: optionalFormText(data, "position"),
    department: optionalFormText(data, "department"),
    contract_type: optionalFormText(data, "contract_type"),
    reference_salary: optionalFormText(data, "reference_salary"),
    currency: data.get("currency"),
  });
}
export function parseEmploymentEnd(data: FormData, startDate: string) {
  return employmentInputSchema.safeParse({
    start_date: startDate,
    end_date: optionalFormText(data, "end_date"),
    termination_reason: optionalFormText(data, "termination_reason"),
    termination_notes: optionalFormText(data, "termination_notes"),
    position: null,
    department: null,
    contract_type: null,
    reference_salary: null,
    currency: "PEN",
  });
}
