"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import OutlineText from "../OutlineText";

export function CTASection() {
  return (
    <section className="relative py-32 px-5 lg:px-8 overflow-hidden bg-black">
      {/* Bottom glow, anchored */}
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-[radial-gradient(ellipse_at_bottom_center,rgba(14,165,233,0.08),transparent_65%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Editorial heading anchored left */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">
            <span className="text-[#38bdf8]">04 / deploy</span>
            <span className="w-px h-4 bg-white/20" />
            <span>open source · MIT</span>
          </div>
          <h2 className="text-[clamp(2.25rem,6vw,5rem)] font-bold tracking-[-0.03em] leading-[0.95] max-w-3xl">
            <span className="block whitespace-nowrap">Store the world</span>
            <span className="block whitespace-nowrap">
              in <OutlineText text="pages." color="rgba(14, 165, 233, 0.35)" />
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center gap-x-10 gap-y-6 border-t border-white/[0.07] pt-8"
        >
          <p className="max-w-md text-sm text-white/45 leading-relaxed font-light">
            Add the crate to your Cargo.toml and turn your scene into a database. Spatial
            queries, streaming residency, and replication included. No framework lock-in.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/docs"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:text-[#38bdf8] transition-colors"
            >
              <span className="w-6 h-6 rounded-full border border-[#0ea5e9]/60 group-hover:bg-[#0ea5e9] flex items-center justify-center transition-colors">
                <ArrowRight className="w-3 h-3 text-[#38bdf8] group-hover:text-black transition-colors" />
              </span>
              Read the docs
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
              href="/replication"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white transition-colors"
            >
              Replication
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
