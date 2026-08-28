import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LockedCreatorsTeaser({ reason }: { reason: "login" | "payment" }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/30 px-6 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-2 gap-4 p-6 opacity-40 blur-sm sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20" />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
          <Lock className="h-5 w-5 text-violet-600" />
        </span>

        {reason === "login" ? (
          <>
            <h3 className="text-xl font-semibold">İçerik üreticilerini görüntülemek için giriş yapın</h3>
            <p className="text-sm text-muted-foreground">
              TRUGC&apos;deki onaylı creator&apos;ları keşfetmek için markanızla giriş yapmanız gerekiyor.
            </p>
            <Button className="rounded-full bg-gradient-brand hover:opacity-90" asChild>
              <Link href="/login">Giriş yap</Link>
            </Button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold">Creator dizinine erişim için ödeme onayı gerekiyor</h3>
            <p className="text-sm text-muted-foreground">
              Markanızın creator dizinini görüntüleyebilmesi için ödemenizin ekibimiz tarafından onaylanmış olması gerekir.
            </p>
            <Button className="rounded-full bg-gradient-brand hover:opacity-90" asChild>
              <Link href="/fiyatlandirma">Planları incele</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
