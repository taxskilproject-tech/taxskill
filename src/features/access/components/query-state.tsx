import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import type { QueryStateProps } from "@/features/access/types/access-ui.types";

export function QueryState({
  loading,
  error,
  children,
  onRetry,
  retrying,
}: QueryStateProps) {
  if (loading)
    return (
      <ResourceState
        description="Consultando la información del estudio."
        kind="loading"
        title="Cargando información…"
      />
    );
  if (error)
    return (
      <ResourceState
        action={
          <Button
            loading={retrying}
            loadingText="Consultando de nuevo…"
            onClick={onRetry}
          >
            Reintentar consulta
          </Button>
        }
        description={normalizeOperationError(error).message}
        kind="error"
        title="No pudimos cargar la información"
      />
    );
  return children;
}
