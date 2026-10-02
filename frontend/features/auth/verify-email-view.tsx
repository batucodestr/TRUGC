"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MailWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/Auth/AuthProvider";
import { confirmEmailVerification, resendVerificationEmail } from "@/lib/api/onboarding";
import { getErrorMessage } from "@/lib/error-message";

type State = "verifying" | "success" | "error" | "missing";

/**
 * E-posta doğrulama bağlantısının açıldığı ekran.
 *
 * Bağlantıdaki `uid`/`token` çifti backend'e gönderilir; doğrulama kararı
 * tamamen sunucuda verilir (token HMAC imzalı ve süreli). Başarılı olduğunda
 * kullanıcı akışın sonraki adımına (profil fotoğrafı) yönlendirilir.
 */
export function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [state, setState] = useState<State>(uid && token ? "verifying" : "missing");
  const [message, setMessage] = useState("");
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  // Doğrulama isteği tek seferlik: React 18 strict-mode çifte effect
  // çalıştırmasında token'ı iki kez harcamayı (ikinci istek "zaten
  // doğrulandı" hatası döner) önler.
  const attempted = useRef(false);

  useEffect(() => {
    if (!uid || !token || attempted.current) return;
    attempted.current = true;

    confirmEmailVerification(uid, token)
      .then((result) => {
        setState("success");
        setNextStep(result.onboarding?.next_step ?? null);
      })
      .catch((err) => {
        setState("error");
        setMessage(getErrorMessage(err));
      });
  }, [uid, token]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Doğrulama e-postası gönderildi", {
        description: "Gelen kutunuzu (ve spam klasörünü) kontrol edin.",
      });
    } catch (err) {
      toast.error("E-posta gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border-border/70 p-8 text-center">
      {state === "verifying" && (
        <div className="space-y-4">
          <Loader2 className="mx-auto size-10 animate-spin text-violet-600" />
          <h1 className="text-xl font-semibold">E-posta adresiniz doğrulanıyor</h1>
          <p className="text-sm text-muted-foreground">Bu işlem birkaç saniye sürebilir.</p>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-5">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">E-posta adresiniz doğrulandı</h1>
            <p className="text-sm text-muted-foreground">
              {nextStep === "upload_photo"
                ? "Son bir adım kaldı: profil fotoğrafınızı yükleyin."
                : "Hesabınız kullanıma hazır."}
            </p>
          </div>
          {nextStep === "upload_photo" ? (
            <Button asChild className="w-full rounded-full bg-gradient-brand hover:opacity-90">
              <Link href="/onboarding">Profil fotoğrafı yükle</Link>
            </Button>
          ) : (
            <Button
              className="w-full rounded-full bg-gradient-brand hover:opacity-90"
              onClick={() => router.push(session ? "/dashboard" : "/login")}
            >
              {session ? "Panele git" : "Giriş yap"}
            </Button>
          )}
        </div>
      )}

      {(state === "error" || state === "missing") && (
        <div className="space-y-5">
          <MailWarning className="mx-auto size-12 text-amber-600" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Doğrulama tamamlanamadı</h1>
            <p className="text-sm text-muted-foreground">
              {state === "missing"
                ? "Bağlantı eksik görünüyor. E-postadaki bağlantıya tekrar tıklayın."
                : message || "Bağlantı geçersiz veya süresi dolmuş."}
            </p>
          </div>
          {session ? (
            <Button onClick={handleResend} disabled={resending} variant="outline" className="w-full gap-2 rounded-full">
              {resending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Yeni doğrulama bağlantısı gönder
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/login">Giriş yapıp tekrar dene</Link>
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
