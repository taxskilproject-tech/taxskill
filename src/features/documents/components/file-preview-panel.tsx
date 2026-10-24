import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import { FilePreview } from "@/features/documents/components/file-preview";
import type { FilePreviewPanelProps } from "@/features/documents/types/preview.types";

export function FilePreviewPanel({
  file,
  onReady,
  onClose,
  inline = false,
}: FilePreviewPanelProps) {
  if (!inline)
    return (
      <SidePanel title={file.name} onClose={onClose} wide>
        <FilePreview file={file} onReady={onReady} />
      </SidePanel>
    );
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
      <Button onClick={onClose} variant="secondary">
        Cerrar vista previa
      </Button>
      <FilePreview file={file} onReady={onReady} />
    </div>
  );
}
