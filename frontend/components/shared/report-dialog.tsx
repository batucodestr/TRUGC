"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createReport, type ReportTargetType } from "@/lib/api/reports";
import { getErrorMessage } from "@/lib/error-message";

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: number | string;
  targetLabel: string;
  trigger?: React.ReactNode;
}

/** Small, reusable "Report this" dialog — used on creator/brand profiles and campaign pages. */
export function ReportDialog({ targetType, targetId, targetLabel, trigger }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await createReport(targetType, targetId, reason.trim());
      setOpen(false);
      setReason("");
      toast.success("Bildirim gönderildi", { description: "Moderatör ekibimiz en kısa sürede inceleyecek." });
    } catch (err) {
      toast.error("Bildirim gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive">
            <Flag className="h-3.5 w-3.5" /> Bildir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{targetLabel} bildir</DialogTitle>
          <DialogDescription>Bu içerikle ilgili sorunu açıklayın — moderatör ekibimiz inceleyecek.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Sebep</Label>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Neden bildiriyorsunuz?"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason.trim()}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Bildir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
