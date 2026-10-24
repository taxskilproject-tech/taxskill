import { Button } from "@/components/atoms/button";
import { PAGE_SIZE } from "@/domain/access/constants/access";
import type { PaginationProps } from "@/features/access/types/access-ui.types";

export function Pagination({
  page,
  count,
  onPage,
  pageSize = PAGE_SIZE,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-2 py-2"
    >
      <p
        className="text-xs text-zinc-600"
        aria-label={`${count} registros · Página ${page} de ${pages}`}
      >
        {count} registros · <span className="hidden sm:inline">Página </span>
        {page}
        <span className="sm:hidden">/</span>
        <span className="hidden sm:inline"> de </span>
        {pages}
      </p>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          className="px-3"
          onClick={() => onPage(page - 1)}
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          disabled={page >= pages}
          className="px-3"
          onClick={() => onPage(page + 1)}
          variant="secondary"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
