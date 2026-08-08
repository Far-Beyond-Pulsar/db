"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Menu, X } from "lucide-react";
import { p } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Overview", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Architecture", href: "/architecture" },
  { label: "Replication", href: "/replication" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-white/[0.07]"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-14 grid grid-cols-[1fr_auto_1fr] items-center">
        {/* Left: Pulsar / SceneDB */}
        <div className="flex items-center gap-2 shrink-0 justify-self-start">
          <a href="https://pulsarnative.com" className="flex items-center gap-2" rel="noopener noreferrer">
            <Image
              src="https://far-beyond-pulsar.github.io/logos/pulsar.png"
              alt="Pulsar"
              width={22}
              height={22}
              className="opacity-80"
            />
          </a>
          <span className="text-white/30 text-sm font-mono">/</span>
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src={p("/logos/scenedb.png")}
              alt=""
              width={20}
              height={20}
              className="opacity-90"
            />
            <span className="text-white font-semibold text-[14px] tracking-tight">
              SceneDB
            </span>
          </Link>
        </div>

        {/* Center: Nav (indexed, HUD) */}
        <nav className="hidden lg:flex items-center gap-0.5 justify-self-center">
          {NAV_LINKS.map(({ label, href }, i) => (
            <Link
              key={label}
              href={href}
              className={cn(
                "px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/45 hover:text-white transition-colors rounded-md hover:bg-white/[0.05]",
              )}
            >
              <span className="text-[#38bdf8]/60 mr-1.5">0{i + 1}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: status + GitHub */}
        <div className="flex items-center gap-3 justify-self-end">
          <span className="hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
            <span className="w-1 h-1 rounded-full bg-[#0ea5e9] animate-pulse-dot" />
            Simulate ready
          </span>
          <a
            href="https://github.com/Far-Beyond-Pulsar/SceneDB"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white/55 hover:text-white transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>

          <button
            className="lg:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-lg border-t border-white/[0.07] px-5 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, href }, i) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] text-white/60 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-[#38bdf8]/60">0{i + 1}</span>
              {label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-white/[0.07]">
            <a
              href="https://github.com/Far-Beyond-Pulsar/SceneDB"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] text-white/60 hover:text-white"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
