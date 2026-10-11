"use client";

// Kopyalanabilir bilgi satırı (IBAN, tutar, referans kodu).
//
// IBAN veya tutarın elle yanlış kopyalanması ödemenin kaybolması demek
// olduğundan, ödeme bilgisi gösteren her yerde tek dokunuşluk bir kopyalama
// düğmesi bulunur.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyFieldProps {
  label: string;
  /** Ekranda görünen biçim (ör. boşluklu IBAN). */
  value: string;
  /** Panoya yazılan biçim — verilmezse `value` kullanılır. */
  copyValue?: string;
  /** Kopyalama sonrası bildirimde geçen ad. */
  copyLabel?: string;
  mono?: boolean;
  className?: string;
}

export function CopyField({ label, value, copyValue, copyLabel, mono = true, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const name = copyLabel ?? label;

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      toast.success(`${name} kopyalandı`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard izni yoksa kullanıcı değeri elle seçebilir.
      toast.error(`${name} kopyalanamadı, elle kopyalayabilirsiniz.`);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("select-all break-all text-sm font-medium", mono && "font-mono tracking-tight")}>
          {value}
        </span>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 rounded-full" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </Button>
      </div>
    </div>
  );
}
