"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { completeOAuth, OAUTH_PLATFORMS, type OAuthPlatform } from "@/lib/api/social";
import { getErrorMessage } from "@/lib/error-message";

/** Platformun yönlendirdiği adres: code + state sunucuya iletilir, hesap sunucuda doğrulanıp bağlanır. */
function Inner() {
  const { platform } = useParams<{ platform: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    const oauthState = params.get("state");
    const denied = params.get("error");
    if (denied || !code || !oauthState || !OAUTH_PLATFORMS.includes(platform as OAuthPlatform)) {
      setState("error");
      setMessage(denied ? "Bağlantı izni verilmedi." : "Geçersiz bağlantı isteği.");
      return;
    }
    completeOAuth(platform as OAuthPlatform, code, oauthState)
      .then((r) => {
        setState("ok");
        setMessage(`@${r.handle} hesabı doğrulandı (${r.followers_count.toLocaleString("tr-TR")} takipçi).`);
        setTimeout(() => router.replace("/dashboard/creator/profile"), 1800);
      })
      .catch((err) => {
        setState("error");
        setMessage(getErrorMessage(err));
      });
  }, [params, platform, router]);

  return (
    <Card className="mx-auto mt-24 max-w-md text-center">
      <div className="space-y-3 px-6 py-4">
        {state === "working" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-light" />}
        {state === "ok" && <CheckCircle2 className="mx-auto h-10 w-10 text-success" />}
        {state === "error" && <XCircle className="mx-auto h-10 w-10 text-red-400" />}
        <h1 className="text-xl font-bold text-white">{state === "working" ? "Hesabın doğrulanıyor…" : state === "ok" ? "Hesap bağlandı" : "Hesap bağlanamadı"}</h1>
        {message && <p className="text-sm text-text-soft">{message}</p>}
        {state === "error" && <Button asChild><Link href="/dashboard/creator/profile">Profile dön</Link></Button>}
      </div>
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
