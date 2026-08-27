"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAnalyticsCsv } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await downloadAnalyticsCsv();
    } catch (err) {
      toast.error("İndirilemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="gap-2 rounded-full" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      CSV dışa aktar
    </Button>
  );
}
