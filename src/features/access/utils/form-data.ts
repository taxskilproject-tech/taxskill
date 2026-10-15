import type {
  FormSchema,
  ParsedForm,
} from "@/features/access/types/access-ui.types";

export function readForm(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

export function parseForm<T>(
  schema: FormSchema<T>,
  input: unknown,
): ParsedForm<T> {
  const result = schema.safeParse(input);
  return result.success
    ? { data: result.data, error: null }
    : {
        data: null,
        error: result.error.issues
          .map((issue) => issue.path.join(".") + ": " + issue.message)
          .join(" · "),
      };
}

export function nullableId(value: FormDataEntryValue | undefined) {
  return typeof value === "string" && value ? value : null;
}
