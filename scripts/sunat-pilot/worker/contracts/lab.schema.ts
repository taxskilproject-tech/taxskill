import { z } from "zod";

export const mailboxLabScenarioSchema = z.enum([
  "normal",
  "empty",
  "short_page",
  "transient_empty",
  "persistent_empty",
  "expired_once",
  "expired_always",
  "invalid_credentials",
  "captcha",
  "unavailable",
  "wrong_scope",
  "changed_total",
  "repeated_page",
  "unsorted",
  "unverified_order",
  "timeout",
  "anchor_changed",
]);
