import type { DialogKeyboardEvent } from "@/components/types/dialog.types";

function focusableControls(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      !element.matches(":disabled,[aria-disabled='true']") &&
      !element.closest("[hidden],[inert]") &&
      element.getClientRects().length > 0,
  );
}

export function handleDialogKeyDown(event: DialogKeyboardEvent): void {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const dialog = event.currentTarget;
  if (
    !(event.target instanceof Element) ||
    event.target.closest("dialog") !== dialog
  )
    return;
  const controls = focusableControls(dialog);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  const boundary = event.shiftKey ? first : last;
  if (document.activeElement !== boundary) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
