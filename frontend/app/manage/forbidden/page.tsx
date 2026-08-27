import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/shared/error-shell";

export const metadata = { title: "Erişim reddedildi — TRUGC" };

export default function ManageForbiddenPage() {
  return (
    <ErrorShell
      icon={ShieldAlert}
      eyebrow="403"
      title="Erişim reddedildi"
      description="Bu alana yalnızca yetkili yöneticiler erişebilir. Hesabınızın gerekli izinlere sahip olduğunu düşünüyorsanız bir yöneticiyle iletişime geçin."
      actions={
        <Button asChild className="rounded-full bg-gradient-brand hover:opacity-90">
          <Link href="/">Anasayfaya dön</Link>
        </Button>
      }
    />
  );
}
