import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_MEDIA, isVideoPath, signMedia } from "@/lib/media-upload";

interface MediaListEditorProps {
  /** Caminhos já guardados no bucket. */
  existing: string[];
  onExistingChange: (paths: string[]) => void;
  /** Ficheiros novos, carregados só ao guardar. */
  files: File[];
  onFilesChange: (files: File[]) => void;
}

/** Fotografias e vídeos de uma experiência ou alojamento (até MAX_MEDIA). */
const MediaListEditor = ({ existing, onExistingChange, files, onFilesChange }: MediaListEditorProps) => {
  const [preview, setPreview] = useState<Record<string, string>>({});
  const filePreviews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    signMedia(existing).then(setPreview);
  }, [existing]);
  useEffect(() => () => filePreviews.forEach((u) => URL.revokeObjectURL(u)), [filePreviews]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    onFilesChange([...files, ...accepted].slice(0, MAX_MEDIA - existing.length));
  };

  const tile = (key: string, src: string | undefined, video: boolean, onRemove: () => void) => (
    <div key={key} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
      {src && (video ? <video src={src} className="h-full w-full object-cover" /> : <img src={src} alt="" className="h-full w-full object-cover" />)}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground"
        aria-label="Remover"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {existing.map((path) =>
          tile(path, preview[path], isVideoPath(path), () => onExistingChange(existing.filter((p) => p !== path))),
        )}
        {files.map((file, i) =>
          tile(filePreviews[i], filePreviews[i], file.type.startsWith("video/"), () => onFilesChange(files.filter((_, j) => j !== i))),
        )}
        {existing.length + files.length < MAX_MEDIA && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-secondary/50">
            <Plus className="h-5 w-5" />
            Adicionar
            <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Até {MAX_MEDIA} fotografias ou vídeos.</p>
    </div>
  );
};

export default MediaListEditor;
