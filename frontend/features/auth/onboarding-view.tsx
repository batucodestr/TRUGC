"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, Circle, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/Auth/AuthProvider";
import { DASHBOARD_PATH_BY_ROLE } from "@/lib/auth";
import {
  getOnboardingStatus,
  resendVerificationEmail,
  uploadProfilePhoto,
  validatePhotoFile,
  type OnboardingStatus,
} from "@/lib/api/onboarding";
import { getErrorMessage } from "@/lib/error-message";
import { cn } from "@/lib/utils";

function StepRow({
  done,
  index,
  title,
  description,
  children,
}: {
  done: boolean;
  index: number;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {done ? <CheckCircle2 className="size-5" /> : index}
        </span>
      </div>
      <div className="min-w-0 flex-1 pb-2">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Zorunlu kullanıcı akışı ekranı: e-posta doğrulama + profil fotoğrafı.
 *
 * Durum her zaman backend'den okunur (`/auth/me/onboarding/`). Bu ekran
 * yalnızca kullanıcıyı yönlendirir; iş verme/iş alma uçlarındaki gerçek engel
 * backend'deki izin sınıflarıdır.
 */
export function OnboardingView() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAuth();

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const dashboardPath = session ? (DASHBOARD_PATH_BY_ROLE[session.user.role] ?? "/dashboard") : "/dashboard";

  const refresh = useCallback(async () => {
    try {
      setStatus(await getOnboardingStatus());
    } catch (err) {
      toast.error("Hesap durumu okunamadı", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.replace("/login?redirect=/onboarding");
      return;
    }
    void refresh();
  }, [session, sessionLoading, refresh, router]);

  // Kullanıcı e-postasını başka bir sekmede doğruladığında bu ekranın
  // kendiliğinden ilerlemesi için, doğrulama bekleyen durumda periyodik olarak
  // sunucuya sorulur.
  useEffect(() => {
    if (!status || status.complete || status.email_verified) return;
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [status, refresh]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success("Doğrulama e-postası gönderildi", {
        description: "Gelen kutunuzu ve spam klasörünü kontrol edin.",
      });
    } catch (err) {
      toast.error("E-posta gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setResending(false);
    }
  }

  async function handleFile(file: File) {
    const error = validatePhotoFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const result = await uploadProfilePhoto(file);
      setStatus(result.onboarding);
      setPreview(result.avatar ?? localUrl);
      toast.success("Profil fotoğrafınız kaydedildi");
    } catch (err) {
      setPreview(null);
      toast.error("Fotoğraf yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const emailDone = Boolean(status?.email_verified);
  const photoDone = Boolean(status?.has_profile_photo);
  const complete = Boolean(status?.complete);
  // Profil fotoğrafı zorunluluğu yalnızca yeni hesaplar için geçerlidir; kural
  // getirilmeden önce var olan hesaplarda bu adım hiç gösterilmez (backend
  // kullanıcı başına karar verir, bkz. User.photo_is_required).
  const photoRequired = Boolean(status?.profile_photo_required);

  return (
    <Card className="mx-auto w-full max-w-xl rounded-3xl border-border/70 p-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-violet-600" />
        <div>
          <h1 className="text-xl font-semibold">Hesabınızı tamamlayın</h1>
          <p className="text-sm text-muted-foreground">
            {photoRequired
              ? "İş ilanı oluşturmak ve işe başvurmak için bu iki adım zorunludur."
              : "İş ilanı oluşturmak ve işe başvurmak için e-posta adresinizi doğrulamanız gerekiyor."}
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <StepRow
          done={emailDone}
          index={1}
          title="E-posta adresinizi doğrulayın"
          description={
            emailDone
              ? `${session?.user.email ?? "E-posta adresiniz"} doğrulandı.`
              : `${session?.user.email ?? "E-posta adresinize"} bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra bu sayfa kendiliğinden güncellenir.`
          }
        >
          {!emailDone && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleResend} disabled={resending} variant="outline" size="sm" className="gap-2 rounded-full">
                {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Bağlantıyı tekrar gönder
              </Button>
              <Button onClick={() => void refresh()} variant="ghost" size="sm" className="gap-2 rounded-full">
                <RefreshCw className="size-4" /> Durumu yenile
              </Button>
            </div>
          )}
        </StepRow>

        {photoRequired && (
        <StepRow
          done={photoDone}
          index={2}
          title="Profil fotoğrafı yükleyin"
          description={
            photoDone
              ? "Profil fotoğrafınız yüklendi. Yeni bir fotoğraf yüklerseniz mevcut fotoğrafın yerine geçer."
              : "Hesabınızda bir profil fotoğrafı bulunması zorunludur. JPG, PNG veya WEBP, en fazla 5MB."
          }
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-border/70 bg-muted/40 transition hover:border-primary/60"
              aria-label="Profil fotoğrafı seç"
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Profil fotoğrafı önizlemesi"
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized={preview.startsWith("blob:")}
                />
              ) : (
                <Camera className="size-6 text-muted-foreground" />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </span>
              )}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {photoDone ? "Fotoğrafı değiştir" : "Fotoğraf seç"}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </StepRow>
        )}
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {complete ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" /> Her şey hazır.
            </>
          ) : (
            <>
              <Circle className="size-4" /> Kalan adım: {emailDone ? "profil fotoğrafı" : "e-posta doğrulama"}

            </>
          )}
        </p>
        <Button
          disabled={!complete}
          onClick={() => router.push(dashboardPath)}
          className="rounded-full bg-gradient-brand hover:opacity-90"
        >
          Panele devam et
        </Button>
      </div>
    </Card>
  );
}
