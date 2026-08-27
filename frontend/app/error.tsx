"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/shared/error-shell";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Yalnızca tanı amacıyla loglanır — aşağıdaki UI, production'da veya
    // başka bir durumda ziyaretçiye asla error.message veya stack'i göstermez.
    console.error(error);
  }, [error]);

  return (
    <ErrorShell
      icon={TriangleAlert}
      eyebrow="Hata"
      title="Beklenmeyen bir hata oluştu."
      description="Bu sorun ekibimize otomatik olarak bildirildi. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz."
      actions={
        <>
          <Button onClick={reset} className="gap-2 rounded-full bg-gradient-brand hover:opacity-90">
            <RotateCcw className="h-4 w-4" /> Tekrar Dene
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-full">
            <Link href="/">
              <Home className="h-4 w-4" /> Ana Sayfa
            </Link>
          </Button>
        </>
      }
    />
  );
}
