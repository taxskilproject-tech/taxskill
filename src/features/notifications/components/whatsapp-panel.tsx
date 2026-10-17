"use client";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import {
  contactIssueListSchema,
  digestListSchema,
} from "@/domain/notifications/contracts/notification.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useActivityQuery } from "@/features/activities/hooks/use-activity-query";
import { DigestCard } from "@/features/notifications/components/digest-card";

export function WhatsappPanel() {
  const [page, setPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const query = useActivityQuery("digests", { page }, digestListSchema);
  const contacts = useActivityQuery(
    "contact_issues",
    { page: contactPage },
    contactIssueListSchema,
  );
  async function refresh() {
    await Promise.all([query.refetch(), contacts.refetch()]);
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Seguimiento de WhatsApp</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Estados confirmados y resultados pendientes de conciliación.
            Revisa las incidencias y consulta la evidencia de cada resumen.
          </p>
        </div>
        <Button
          loading={query.isFetching || contacts.isFetching}
          loadingText="Actualizando seguimiento…"
          onClick={() => {
            void refresh();
          }}
          variant="secondary"
        >
          Actualizar seguimiento
        </Button>
      </div>
      <QueryState
        error={contacts.error}
        loading={contacts.isPending}
        onRetry={() => {
          void contacts.refetch();
        }}
        retrying={contacts.isFetching}
      >
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="font-medium">Incidencias de contacto</h3>
          {contacts.data?.rows.map((contact) => (
            <p className="text-sm text-zinc-600" key={contact.user_id}>
              {contact.full_name}:{" "}
              {contact.reason === "missing"
                ? "falta número"
                : "formato inválido"}
              .
            </p>
          ))}
          {contacts.data?.count === 0 && (
            <p className="text-sm text-zinc-600">
              Sin incidencias de contacto.
            </p>
          )}
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href="/usuarios"
          >
            Gestionar contactos en Usuarios →
          </Link>
          <Pagination
            count={contacts.data?.count ?? 0}
            onPage={setContactPage}
            page={contactPage}
          />
        </div>
      </QueryState>
      <QueryState
        error={query.error}
        loading={query.isPending}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isFetching}
      >
        {query.data?.rows.map((digest) => (
          <DigestCard digest={digest} key={`${digest.id}:${digest.revision}`} />
        ))}
        {query.data?.count === 0 && (
          <p className="text-sm text-zinc-600">
            Todavía no se prepararon resúmenes. No se crean mensajes vacíos.
          </p>
        )}
        <Pagination
          count={query.data?.count ?? 0}
          onPage={setPage}
          page={page}
        />
      </QueryState>
    </section>
  );
}
