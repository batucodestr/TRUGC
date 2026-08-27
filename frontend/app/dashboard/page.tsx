import Link from "next/link";
import { ArrowRight, Megaphone, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";

// Admin is deliberately never listed here — it lives at the hidden,
// unlinked /manage entry point instead.
const ROLES = [
  { label: "Marka Paneli", description: "Kampanyalarını yönet, başvuruları incele, ödemeleri takip et.", href: "/dashboard/brand", icon: Megaphone },
  { label: "Creator Paneli", description: "Portfolyonu yönet, başvurularını takip et, kazançlarını gör.", href: "/dashboard/creator", icon: UserCog },
];

export default function DashboardIndexPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-16">
      <Logo className="mb-10" />
      <h1 className="text-center text-2xl font-semibold tracking-tight">Panele git</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Bu, dahili panellere erişmek için kullanılan bir yönlendirme sayfasıdır — genel siteden bağlantı verilmez.
      </p>

      <div className="mt-10 grid w-full max-w-xl grid-cols-1 gap-5 sm:grid-cols-2">
        {ROLES.map((role) => (
          <Link key={role.href} href={role.href} className="group block">
            <Card className="flex h-full flex-col rounded-2xl border-border/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-600/40 hover:shadow-lg hover:shadow-violet-600/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
                <role.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold">{role.label}</p>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{role.description}</p>
              <span className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-600">
                Aç <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
