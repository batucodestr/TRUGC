"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Registers GSAP plugins exactly once for the whole app and refreshes
 * ScrollTrigger measurements on resize. Pure setup — no DOM output.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <>{children}</>;
}
