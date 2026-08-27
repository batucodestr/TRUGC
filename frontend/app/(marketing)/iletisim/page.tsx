"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/Motion/Reveal";

export default function IletisimPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      toast.success("Mesajınız gönderildi!", {
        description: "En kısa sürede size dönüş yapacağız.",
      });
    }, 700);
  }

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-medium text-violet-600">İletişim</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Bizimle <span className="text-gradient-brand">iletişime geçin</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Sorularınız, önerileriniz veya iş birliği talepleriniz için ekibimiz her zaman size yardımcı olmaya hazır.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <Reveal variant="slide-up">
            <Card className="rounded-3xl border-border/70 p-7 shadow-sm">
              <h2 className="text-lg font-semibold">Bize mesaj gönderin</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Formu doldurun, ekibimiz en kısa sürede size geri dönüş yapsın.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adınız Soyadınız"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@eposta.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Konu</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Mesajınızın konusu"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mesaj</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Size nasıl yardımcı olabileceğimizi anlatın..."
                    rows={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={sending}
                  className="w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90 sm:w-auto"
                >
                  <Send className="h-4 w-4" /> {sending ? "Gönderiliyor..." : "Mesajı gönder"}
                </Button>
              </form>
            </Card>
          </Reveal>

          <Reveal variant="slide-up" delay={0.1} className="space-y-5">
            <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <Mail className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">E-posta</h3>
              <p className="mt-1 text-sm text-muted-foreground">destek@trugc.com</p>
            </Card>
            <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <Clock className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">Destek Saatleri</h3>
              <p className="mt-1 text-sm text-muted-foreground">Hafta içi 09:00 - 19:00</p>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
