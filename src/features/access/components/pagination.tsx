import { Button } from "@/components/atoms/button";
import { PAGE_SIZE } from "@/domain/access/constants/access";
import type { PaginationProps } from "@/features/access/types/access-ui.types";

export function Pagination({ page, count, onPage }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-4"
    >
      <p className="text-sm text-zinc-600">
        {count} registros · Página {page} de {pages}
      </p>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          variant="secondary"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
