"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import type { CatalogSearchProps } from "@/features/documents/types/configuration-filters.types";

export function CatalogSearch({ busy, onSearch }: CatalogSearchProps) {
  const [query, setQuery] = useState("");
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor="rule-catalog-search">
        Buscar tipo documental
      </label>
      <div className="flex gap-2">
        <Input
          id="rule-catalog-search"
          maxLength={200}
          value={query}
          placeholder="Nombre o código del tipo…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch(query);
            }
          }}
        />
        <Button
          onClick={() => onSearch(query)}
          loading={busy}
          loadingText="Buscando…"
          variant="secondary"
        >
          Buscar tipos
        </Button>
      </div>
    </div>
  );
}
