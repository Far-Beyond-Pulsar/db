"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import OutlineText from "../OutlineText";
import { p } from "@/lib/utils";

const SECTIONS = [
  {
    title: "SceneDB",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Architecture", href: "/architecture" },
      { label: "Replication", href: "/replication" },
      { label: "GitHub", href: "https://github.com/Far-Beyond-Pulsar/SceneDB" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Spatial Cells", href: "/docs#spatial-cells" },
      { label: "Streaming Grid", href: "/docs#streaming-grid" },
      { label: "Derive Macros", href: "/docs#macros" },
      { label: "Phase Machine", href: "/docs#phase-machine" },
    ],
  },
  {
    title: "Pulsar",
    links: [
      { label: "Pulsar Engine", href: "https://pulsarnative.com" },
      { label: "WGPUI", href: "https://far-beyond-pulsar.github.io/UI" },
      { label: "GitHub Org", href: "https://github.com/Far-Beyond-Pulsar" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.07] bg-black overflow-hidden">
      {/* Ghost wordmark behind the foreground content */}
      <div className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        <span className="font-bold tracking-[-0.04em] leading-[1.05] text-[clamp(5rem,16vw,15rem)] whitespace-nowrap">
          <OutlineText text="SCENEDB" color="rgba(255, 255, 255, 0.14)" strokeWidth={2} />
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-16 pb-24 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image src={p("/logos/scenedb.png")} alt="" width={24} height={24} className="opacity-90" />
              <span className="text-sm font-semibold text-white">SceneDB</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-[220px]">
              A GPU-native ECS and spatial database for game engines, built in Rust. Paged SoA
              storage, SIMD spatial queries, and replication built into the data layer.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://github.com/Far-Beyond-Pulsar/SceneDB"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/35 hover:text-white/70 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-white/25 mb-4">
                {s.title}
              </p>
              <ul className="space-y-2.5">
                {s.links.map(({ label, href }) => {
                  const isExternal = href.startsWith("http");
                  return (
                    <li key={label}>
                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white/45 hover:text-white/80 transition-colors"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link href={href} className="text-sm text-white/45 hover:text-white/80 transition-colors">
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mb-8" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/25">
            &copy; {new Date().getFullYear()} SceneDB · Open source under MIT
          </p>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-white/25">
            <span>Rows: 256</span>
            <span>Align: 64B</span>
            <a
              href="https://github.com/Far-Beyond-Pulsar/SceneDB"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/50 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
