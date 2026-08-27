import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/shared/error-shell";

export const metadata = { title: "Sayfa bulunamadı — TRUGC" };

export default function NotFound() {
  return (
    <ErrorShell
      icon={Compass}
      eyebrow="404"
      title="Aradığınız sayfa bulunamadı."
      description="Bağlantı hatalı olabilir ya da bu sayfa kaldırılmış olabilir. Ana sayfaya dönebilir veya creator'ları keşfetmeye devam edebilirsiniz."
      actions={
        <>
          <Button asChild className="gap-2 rounded-full bg-gradient-brand hover:opacity-90">
            <Link href="/">
              <Home className="h-4 w-4" /> Ana Sayfa
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-full">
            <Link href="/creators">
              <Compass className="h-4 w-4" /> Creator Keşfet
            </Link>
          </Button>
        </>
      }
    />
  );
}
