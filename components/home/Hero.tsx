"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import OutlineText from "../OutlineText";
import { QueryTerminal } from "./QueryTerminal";

function HudLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
      <span className="w-1.5 h-1.5 bg-[#0ea5e9] rotate-45" />
      {children}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[calc(100dvh-3.5rem)] lg:min-h-[calc(100vh-3.5rem)] flex flex-col justify-center overflow-hidden bg-black">
      {/* Data grid backdrop, anchored to the right half */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(90deg, transparent 30%, black 75%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 30%, black 75%)",
        }}
      />

      {/* Corner glow, pushed to the lower-right terminal quadrant only */}
      <div className="absolute bottom-0 right-0 w-[45vw] h-[60vh] bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.10),transparent_65%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
        {/* ── LEFT: editorial block, anchored not centered ── */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <HudLabel>Entity storage · engineered as a database</HudLabel>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22, duration: 0.6 }}
            className="text-[clamp(2.25rem,5.5vw,4rem)] font-bold leading-[1.06] tracking-[-0.03em] text-white mb-7"
          >
            <span className="block whitespace-nowrap">Your scene</span>
            <span className="block whitespace-nowrap">
              is a <span className="outline-hover"><OutlineText text="database" color="rgba(14, 165, 233, 0.35)" /></span>.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="max-w-md mb-10"
          >
            <p className="text-[15px] leading-relaxed text-white/50 font-light">
              SceneDB is a high-performance, cross-device ECS and spatial database built in Rust:
              a full archetype ECS on paged SoA storage, SIMD spatial queries, streaming residency,
              and network replication primitives baked into the data layer. One API for CPU-only and
              GPU-mirrored worlds: <code className="font-mono text-[13px] text-[#7dd3fc]">#[gpu]</code>{" "}
              is a placement annotation on the same programming model.
            </p>
          </motion.div>

          {/* Integrated CTAs: mono link row, no floating buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <Link
              href="/docs"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:text-[#38bdf8] transition-colors"
            >
              <span className="w-6 h-6 rounded-full border border-[#0ea5e9]/60 group-hover:bg-[#0ea5e9] flex items-center justify-center transition-colors">
                <ArrowRight className="w-3 h-3 text-[#38bdf8] group-hover:text-black transition-colors" />
              </span>
              Get started
            </Link>
            <a
              href="https://github.com/Far-Beyond-Pulsar/SceneDB"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <Link
              href="/architecture"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white transition-colors"
            >
              Architecture
            </Link>
          </motion.div>
        </div>

        {/* ── RIGHT: terminal, bleeding off the right edge ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="relative lg:-mr-10 xl:-mr-20"
        >
          {/* Ghost index */}
          <span className="pointer-events-none absolute -top-16 -right-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/20">
            01 / query
          </span>
          <QueryTerminal />
        </motion.div>
      </div>

      {/* Bottom-left: scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-7 left-5 lg:left-8 hidden lg:flex items-center gap-3"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">Scroll</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-white/25"
        />
      </motion.div>

      {/* Bottom-right: index readout */}
      <div className="absolute bottom-7 right-5 lg:right-8 hidden lg:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">
        <span>v0.1.0</span>
        <span className="w-1 h-1 rounded-full bg-[#0ea5e9]" />
        <span>Rust</span>
      </div>
    </section>
  );
}
