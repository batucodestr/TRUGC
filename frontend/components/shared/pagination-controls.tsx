"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, pageSize, totalCount, onPageChange }: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <p className="text-xs text-muted-foreground">
        {totalCount === 0 ? "0 kayıt" : `${start}–${end} / ${totalCount} kayıt`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
