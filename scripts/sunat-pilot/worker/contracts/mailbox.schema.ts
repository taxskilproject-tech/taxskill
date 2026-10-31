import { z } from "zod";

import {
  MAILBOX_CHECKPOINT_MAX_ITEMS,
  MAILBOX_PAGE_SIZE,
} from "../constants/worker";
const civilDate = z.iso.date();
const identifier = z.string().min(1).max(128);
export const mailboxKindSchema = z.enum(["notifications", "messages"]);
export const mailboxItemSchema = z.strictObject({
  id: identifier,
  published_on: civilDate,
  has_attachments: z.boolean(),
  read: z.boolean(),
});
export const mailboxPageSchema = z.strictObject({
  connection_key: identifier,
  mailbox: mailboxKindSchema,
  page: z.number().int().positive(),
  page_size: z.literal(MAILBOX_PAGE_SIZE),
  total: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  order: z.enum(["published_desc", "unverified"]),
  items: z.array(mailboxItemSchema).max(MAILBOX_PAGE_SIZE),
});
export const mailboxJobSchema = z
  .strictObject({
    connection_key: identifier,
    mailbox: mailboxKindSchema,
    mode: z.enum(["refresh", "resume"]).default("refresh"),
    from: civilDate,
    through: civilDate,
    read_effect_consent: z.strictObject({
      accepted: z.literal(true),
      warning_version: z.literal(1),
      accepted_at: z.iso.datetime({ offset: true }),
    }),
    limits: z.strictObject({
      max_pages: z.number().int().min(1).max(20),
      max_requests: z.number().int().min(1).max(100),
      max_duration_ms: z.number().int().min(1).max(120000),
      max_attempts_per_page: z.number().int().min(1).max(3),
      request_timeout_ms: z.number().int().min(1).max(15000),
    }),
  })
  .refine((job) => job.from <= job.through);
export const mailboxCheckpointSchema = z.strictObject({
  schema_version: z.literal(1),
  connection_key: identifier,
  mailbox: mailboxKindSchema,
  from: civilDate,
  through: civilDate,
  next_page: z.number().int().positive(),
  total: z.number().int().nonnegative().nullable(),
  order: z.enum(["published_desc", "unverified"]).nullable(),
  first_id: identifier.nullable(),
  last_date: civilDate.nullable(),
  seen_ids: z.array(identifier).max(MAILBOX_CHECKPOINT_MAX_ITEMS),
  items: z.array(mailboxItemSchema).max(MAILBOX_CHECKPOINT_MAX_ITEMS),
  complete: z.boolean(),
});
