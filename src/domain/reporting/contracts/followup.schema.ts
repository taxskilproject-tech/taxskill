import { z } from "zod";

export const deliveryIndicatorSchema = z.enum([
  "compliance",
  "pending",
  "on_time",
  "late",
]);
export const companyIndicatorSchema = z.object({
  company_id: z.uuid(),
  company_name: z.string(),
  required: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  on_time: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
});
export const companyIndicatorsSchema = z.object({
  rows: z.array(companyIndicatorSchema),
  count: z.number().int(),
  queried_at: z.string(),
});
export const deliveryDetailSchema = z.object({
  id: z.uuid(),
  obligation_id: z.uuid(),
  company_name: z.string(),
  module: z.string(),
  title: z.string(),
  period: z.string(),
  label: z.string(),
  worker_name: z.string().nullable(),
  state: z.string(),
  reason: z.string().nullable(),
  due_date: z.iso.date().nullable(),
  received_at: z.string().nullable(),
});
export const deliveryDetailsSchema = z.object({
  rows: z.array(deliveryDetailSchema),
  count: z.number().int(),
  queried_at: z.string(),
});
export const documentAssistantsSchema = z.object({
  rows: z.array(
    z.object({
      user_id: z.uuid(),
      name: z.string(),
      email: z.email(),
      active: z.boolean(),
    }),
  ),
});
