"use client";
import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { whatsappContactSchema } from "@/domain/notifications/contracts/notification.schema";
import { FormActions } from "@/features/access/components/form-actions";
import type {
  SubmitEvent,
  UserDetailProps,
} from "@/features/access/types/access-ui.types";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";

export function WhatsappContactForm({ user, onChanged }: UserDetailProps) {
  const command = useDocumentCommand();
  const [validation, setValidation] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const parsed = whatsappContactSchema.safeParse({
      user_id: user.profile.user_id,
      expected_revision: user.profile.revision,
      whatsapp_phone:
        String(
          new FormData(event.currentTarget).get("whatsapp_phone") ?? "",
        ).trim() || null,
    });
    setValidation(
      parsed.success
        ? null
        : parsed.error.issues.map((issue) => issue.message).join(" · "),
    );
    if (
      parsed.success &&
      (await command.submit("SaveWhatsAppContact", parsed.data))
    )
      onChanged();
  }
  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h3 className="font-medium">Contacto para resumen WhatsApp</h3>
      <FormField
        defaultValue={user.profile.whatsapp_phone ?? ""}
        disabled={command.busy}
        hint="Formato internacional, sin espacios. Vacío desactiva el contacto; conserva los avisos internos."
        id="user-whatsapp"
        label="Número WhatsApp"
        maxLength={16}
        name="whatsapp_phone"
        type="tel"
      />
      <FormActions
        busy={command.busy}
        error={validation ?? command.error}
        label="Guardar contacto"
        loadingText="Guardando contacto…"
        success={command.result ? "Contacto actualizado." : undefined}
      />
    </form>
  );
}
