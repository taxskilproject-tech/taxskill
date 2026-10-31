import { z } from "zod";

import {
  LOGIN_FAILURE_CODES,
  LOGIN_PAGE_KINDS,
  LOGIN_RESOURCE_KINDS,
  LOGIN_SCRIPT_ERROR_KINDS,
  LOGIN_TRACE_LIMIT,
} from "../constants/login-diagnostics";

export const loginResourceKindSchema = z.enum(LOGIN_RESOURCE_KINDS);
export const loginFailureCodeSchema = z.enum(LOGIN_FAILURE_CODES);
export const loginScriptErrorKindSchema = z.enum(LOGIN_SCRIPT_ERROR_KINDS);
const pageKindSchema = z.enum(LOGIN_PAGE_KINDS);
const statusSchema = z.number().int().min(100).max(599);
const countSchema = z.number().int().nonnegative();

export const loginNetworkSnapshotSchema = z.object({
  redirects: z
    .array(
      z.object({
        from: pageKindSchema,
        to: pageKindSchema,
        status: statusSchema,
        https: z.boolean(),
      }),
    )
    .max(LOGIN_TRACE_LIMIT),
  document_responses: z
    .array(
      z.object({
        origin: pageKindSchema,
        status: statusSchema,
      }),
    )
    .max(LOGIN_TRACE_LIMIT),
  failed_requests: z
    .array(
      z.object({
        origin: pageKindSchema,
        resource: loginResourceKindSchema,
        code: loginFailureCodeSchema,
      }),
    )
    .max(LOGIN_TRACE_LIMIT),
  blocked_requests: countSchema,
  last_blocked_origin: pageKindSchema.nullable(),
  request_limit_exceeded: z.boolean(),
  web_error_count: countSchema,
  last_web_error: loginScriptErrorKindSchema.nullable(),
  console_error_count: countSchema,
});
