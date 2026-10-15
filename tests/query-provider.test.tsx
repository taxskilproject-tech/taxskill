// @vitest-environment jsdom
import type { QueryFunction } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/lib/query/providers/query-provider";

import { QueryProbe } from "./fixtures/query-probe";
import { companyScope, otherUserScope } from "./fixtures/scopes";

afterEach(cleanup);

it("cambiar usuario remonta el contexto y elimina la caché anterior", async () => {
  const second = Promise.withResolvers<string>();
  const onClient = vi.fn();
  const queryFn = vi
    .fn<QueryFunction<string>>()
    .mockResolvedValueOnce("Datos de A")
    .mockReturnValueOnce(second.promise);
  const view = render(
    <QueryProvider scope={companyScope}>
      <QueryProbe onClient={onClient} queryFn={queryFn} />
    </QueryProvider>,
  );
  await screen.findByText(/Datos de A/);
  const originalClient = onClient.mock.calls[0]?.[0];
  view.rerender(
    <QueryProvider scope={otherUserScope}>
      <QueryProbe onClient={onClient} queryFn={queryFn} />
    </QueryProvider>,
  );
  expect(screen.queryByText(/Datos de A/)).toBeNull();
  expect(originalClient.getQueryCache().getAll()).toHaveLength(0);
  await act(async () => second.resolve("Datos de B"));
  await screen.findByText(/Datos de B/);
});

it("abort y respuesta tardía del contexto anterior no contaminan al nuevo", async () => {
  const first = Promise.withResolvers<string>();
  const onClient = vi.fn();
  const queryFn = vi
    .fn<QueryFunction<string>>()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce("Respuesta nueva");
  const view = render(
    <QueryProvider scope={companyScope}>
      <QueryProbe onClient={onClient} queryFn={queryFn} />
    </QueryProvider>,
  );
  await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
  const firstSignal = queryFn.mock.calls[0]?.[0].signal;
  view.rerender(
    <QueryProvider scope={otherUserScope}>
      <QueryProbe onClient={onClient} queryFn={queryFn} />
    </QueryProvider>,
  );
  await screen.findByText(/Respuesta nueva/);
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => first.resolve("Respuesta vieja"));
  expect(screen.queryByText(/Respuesta vieja/)).toBeNull();
});

it("el contexto anónimo no habilita consultas del negocio", () => {
  const queryFn = vi.fn<QueryFunction<string>>();
  render(
    <QueryProvider scope={null}>
      <QueryProbe onClient={vi.fn()} queryFn={queryFn} />
    </QueryProvider>,
  );
  expect(queryFn).not.toHaveBeenCalled();
});
