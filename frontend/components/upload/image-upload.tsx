"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-message";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadProps {
  /** Current image URL to display, or null/undefined for an empty state. */
  value?: string | null;
  /** Django endpoint to PATCH the file to, e.g. ENDPOINTS.myCreator or ENDPOINTS.myBrand. */
  endpoint: string;
  /** Form field name the backend expects (e.g. "avatar", "cover", "logo"). */
  field: string;
  /** Called with the new URL from the server response after a successful upload. */
  onUploaded: (url: string) => void;
  shape?: "circle" | "rect";
  label?: string;
  className?: string;
}

/**
 * Single-image upload control: click/drop to select, client-side MIME/size
 * pre-check, PATCHes the file as multipart/form-data to `endpoint`, then
 * reports the new URL back via `onUploaded`. Used for avatar/cover/logo.
 */
export function ImageUpload({ value, endpoint, field, onUploaded, shape = "circle", label, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Desteklenmeyen dosya türü. JPG, PNG, WEBP veya GIF yükleyin.";
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return "Dosya çok büyük. En fazla 5MB yükleyebilirsiniz.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const error = validate(file);
    if (error) {
      toast.error(error);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append(field, file);
      const result = await apiClient.upload<Record<string, unknown>>(endpoint, formData, "PATCH");
      const url = (result?.[field] as string) ?? localUrl;
      setPreview(url);
      onUploaded(url);
      toast.success("Görsel yüklendi");
    } catch (err) {
      toast.error("Görsel yüklenemedi", { description: getErrorMessage(err) });
      setPreview(value ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex items-center justify-center overflow-hidden border border-dashed border-border/70 bg-muted/40 transition hover:border-primary/60",
          shape === "circle" ? "size-24 rounded-full" : "h-32 w-full rounded-2xl",
        )}
        aria-label={label ?? "Görsel yükle"}
      >
        {preview ? (
          <Image src={preview} alt={label ?? "Yüklenen görsel"} fill sizes="200px" className="object-cover" unoptimized={preview.startsWith("blob:")} />
        ) : (
          <Camera className="size-6 text-muted-foreground" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          {uploading ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

interface UploadTriggerButtonProps {
  onSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

/** A plain button that opens a file picker — used where ImageUpload's fixed avatar/cover shape doesn't fit (e.g. inline "add portfolio item" actions). */
export function UploadTriggerButton({ onSelect, accept, disabled, children }: UploadTriggerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
