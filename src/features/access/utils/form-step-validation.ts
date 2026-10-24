export function invalidFormControl(root: ParentNode | null) {
  if (!root) return undefined;
  return Array.from(root.querySelectorAll("input,select,textarea")).find(
    (element) =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) &&
      element.willValidate &&
      !element.validity.valid,
  );
}
