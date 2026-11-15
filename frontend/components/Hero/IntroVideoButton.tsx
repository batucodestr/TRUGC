"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** "Tanıtım Videosu" outline butonu: videoyu bir modalda oynatır. */
export function IntroVideoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <Play className="h-4 w-4 fill-white" aria-hidden /> Tanıtım Videosu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>TRUGC tanıtım videosu</DialogTitle>
        </DialogHeader>
        <video className="aspect-[9/16] max-h-[80vh] w-full bg-black object-cover" src="/videos/lifestyle.mp4" controls autoPlay playsInline />
      </DialogContent>
    </Dialog>
  );
}
