"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-message";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,.zip,.doc,.docx,.ppt,.pptx";

interface FileUploadProps {
  /** Django endpoint to POST the multipart form to (e.g. campaign media, portfolio, message attachment). */
  endpoint: string;
  /** Form field name the backend expects for the file (usually "file" or "media"). */
  field?: string;
  /** Extra form fields to send alongside the file (e.g. { caption } or { title, kind }). */
  extraFields?: Record<string, string>;
  accept?: string;
  maxBytes?: number;
  /** Called with the raw server response after a successful upload. */
  onUploaded: (response: Record<string, unknown>) => void;
  label?: string;
  className?: string;
}

/**
 * Generic multipart file upload with a client-side size pre-check and an
 * indeterminate progress indicator while the request is in flight (fetch
 * doesn't expose upload progress events, so this is a busy state, not a
 * byte-accurate percentage).
 */
export function FileUpload({
  endpoint,
  field = "file",
  extraFields,
  accept = DEFAULT_ACCEPT,
  maxBytes = MAX_ATTACHMENT_BYTES,
  onUploaded,
  label = "Dosya ekle",
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > maxBytes) {
      toast.error(`Dosya çok büyük. En fazla ${Math.round(maxBytes / 1024 / 1024)}MB yükleyebilirsiniz.`);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append(field, file);
      if (extraFields) {
        for (const [key, val] of Object.entries(extraFields)) formData.append(key, val);
      }
      const result = await apiClient.upload<Record<string, unknown>>(endpoint, formData);
      onUploaded(result);
      toast.success("Dosya yüklendi");
    } catch (err) {
      toast.error("Dosya yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setUploading(false);
      setFileName(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="w-fit gap-2">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {uploading && fileName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{fileName}</span>
          <Progress value={undefined} className="h-1 w-24 animate-pulse" />
        </div>
      )}
    </div>
  );
}

interface AttachmentChipProps {
  name: string;
  onRemove?: () => void;
}

export function AttachmentChip({ name, onRemove }: AttachmentChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs">
      <FileText className="size-3.5" />
      <span className="max-w-[160px] truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
