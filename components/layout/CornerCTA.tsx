"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CornerCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-40 hidden md:block transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <Link
        href="/docs"
        className="group flex items-center gap-2.5 pl-4 pr-3.5 py-2 rounded-full border border-white/[0.14] bg-black/80 backdrop-blur-md hover:border-[#38bdf8]/60 transition-colors"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 group-hover:text-white transition-colors">
          Get started
        </span>
        <span className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center transition-colors group-hover:bg-[#38bdf8]">
          <ArrowUpRight className="w-3 h-3 text-black" />
        </span>
      </Link>
    </div>
  );
}
