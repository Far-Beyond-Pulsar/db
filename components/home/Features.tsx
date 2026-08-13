"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OutlineText from "../OutlineText";
import { cn } from "@/lib/utils";
import {
  Boxes,
  Cpu,
  Map,
  MonitorUp,
  Database,
  ShieldCheck,
  Radio,
  Layers,
  HardDrive,
  Box,
  Network,
  Link2,
  type LucideIcon,
} from "lucide-react";

interface Layer {
  icon: LucideIcon;
  name: string;
  tag: string;
  desc: string;
  chips: string[];
}

const LAYERS: Layer[] = [
  {
    icon: Boxes,
    name: "Storage",
    tag: "CPU · soa pages",
    desc: "Fixed-capacity pages of 256 rows with 64-byte aligned columns. Swap-and-pop compaction at frame boundaries rearranges physical rows without breaking stable u64 handles.",
    chips: ["CellStorage", "Page", "PageLayout", "LivenessMask"],
  },
  {
    icon: Layers,
    name: "ECS",
    tag: "CPU · archetype",
    desc: "World groups entities by component set into contiguous columns, with an archetype-graph edge cache so repeated insert/remove transitions cost two Vec reads. Bundle spawn resolves the destination archetype once and writes every column directly; queries resolve per-archetype once, then iterate rows by pure pointer arithmetic.",
    chips: ["World", "Bundle", "WorldQuery", "QueryIter"],
  },
  {
    icon: Cpu,
    name: "Spatial",
    tag: "CPU · simd",
    desc: "Six dedicated f32 columns hold AABB min/max per axis. AABB and frustum queries scan the arrays directly. No per-entity iteration, no allocation. AVX2 and NEON paths match a scalar reference bit-for-bit.",
    chips: ["SpatialCell", "Aabb", "Frustum"],
  },
  {
    icon: Map,
    name: "Streaming",
    tag: "CPU · residency",
    desc: "Concentric classification into Outer / Margin / Inner domains with hysteresis bands that damp boundary jitter. Multiple observer AABBs, plus persistent pins that bypass the rules.",
    chips: ["StreamingGrid", "CellCoord", "Domain", "GridConfig"],
  },
  {
    icon: MonitorUp,
    name: "GPU Store",
    tag: "GPU · ssbo",
    desc: "Region-partitioned SSBOs shared across cells. Dirty tracking uploads only changed rows per frame, with generation validation and bulk rebuild for device loss recovery.",
    chips: ["SceneGpuStore", "RegionPool", "SceneBuffer", "CellGpuState"],
  },
  {
    icon: HardDrive,
    name: "GPU Buffers",
    tag: "GPU · one registry",
    desc: "Row buffers, texture arrays, and asset registries resolve through one keyed GpuBufferRegistry. DynamicGpuBuffer covers pipeline-owned data (cull outputs, draw batches) with transparent growth; GrowableSceneBuffer backs the World mirror.",
    chips: ["GpuBufferRegistry", "DynamicGpuBuffer", "GrowableSceneBuffer", "GenerationMirror"],
  },
  {
    icon: Database,
    name: "World Mirror",
    tag: "CPU+GPU · entity storage",
    desc: "An archetype ECS with an opt-in GPU mirror: build a World wired via new_with_gpu_mirror and every #[gpu] field auto-registers on first insert and auto-flushes inside step(). No manual dispatch call. Once-mode fields upload on first insert only; DirtyTracked fields batch into one flush per frame, routed through a GPU scatter-write pass when rows churn. get_mut returns a Mut guard that writes through on drop.",
    chips: ["World", "GpuMirrorHandle", "MirrorMode", "Mut"],
  },
  {
    icon: Box,
    name: "Assets",
    tag: "GPU · vram",
    desc: "GPU-side asset storage with suballocation, keyed through the buffer registry: GeometryArena, MeshRegistry, ClusterBuffer, TextureStore, MeshletBuffer, and MaterialRegistry. Each one carries corruption validation and rebuild gates.",
    chips: ["GeometryArena", "MeshRegistry", "ClusterBuffer", "TextureStore", "MeshletBuffer"],
  },
  {
    icon: ShieldCheck,
    name: "Phase Machine",
    tag: "CPU · compile-time",
    desc: "FrameDriver owns one frame's progression: SimulateA → SimulateB → Harvest → Boundary (retire → compact → sync). Zero-sized witnesses gate every phase. SimulateA and SimulateB are sealed, so passing the wrong witness won't compile.",
    chips: ["FrameDriver", "SimulateA", "HarvestPhase", "BoundaryPhase"],
  },
  {
    icon: Network,
    name: "SceneDb",
    tag: "CPU+GPU · facade",
    desc: "SceneDb owns a World, a SubsystemRegistry, and a FrameDriver. step() runs every subsystem's simulate hooks (and flushes any attached mirror); step_gpu() drives Harvest → Boundary. Subsystems register once, hook only the phases they need, and stay callable by name from scripts via #[scenedb_subsystem] / #[subsystem_method].",
    chips: ["SceneDb", "Subsystem", "SubsystemRegistry", "FrameDriver"],
  },
  {
    icon: Link2,
    name: "Relations",
    tag: "CPU · columnar",
    desc: "For component patterns where one entity points at another (portals, multi-body attachments), RelationIndex builds a dense columnar view over World: confirmed-reciprocal pairs only, with unmatched and conflict buffers for the caller to resolve. Rebuilt once per boundary; reads are zero-allocation slices.",
    chips: ["RelationIndex", "RelationView", "ConflictEntry"],
  },
  {
    icon: Radio,
    name: "Replication",
    tag: "CPU · c0",
    desc: "Change tracking, delta encoding, interest management, authority, events/RPCs, snapshots, and client-side prediction. Multiplayer lives inside the data layer.",
    chips: ["ChangeTracker", "Delta", "RelevanceSet", "AuthorityTable", "Snapshot"],
  },
];

export function Features() {
  const [active, setActive] = useState(0);
  const layer = LAYERS[active];

  return (
    <section className="relative py-24 px-5 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header: anchored left, editorial */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">
              <span className="text-[#38bdf8]">02 / the stack</span>
              <span className="w-px h-4 bg-white/20" />
              <span>select a layer</span>
            </div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] leading-none">
              Layers of <OutlineText text="data" color="rgba(14, 165, 233, 0.35)" />
            </h2>
          </div>
          <p className="max-w-sm text-sm text-white/40 leading-relaxed font-light">
            From the archetype ECS and cache-friendly pages to the frame phase machine, each
            layer is a bounded unit with a single responsibility, and the replication suite rides
            on top of the frame boundary.
          </p>
        </div>

        {/* Inspector: tab rail + detail bay */}
        <div className="grid lg:grid-cols-[380px_1fr] border-t border-white/[0.07]">
          {/* Rail */}
          <div className="lg:border-r border-white/[0.07]">
            {LAYERS.map((l, i) => (
              <button
                key={l.name}
                onClick={() => setActive(i)}
                className={cn(
                  "w-full text-left px-5 py-4 flex items-center gap-4 border-b border-white/[0.05] transition-colors group",
                  active === i
                    ? "bg-white/[0.03]"
                    : "hover:bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-[0.14em] transition-colors",
                    active === i ? "text-[#38bdf8]" : "text-white/25 group-hover:text-white/50",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "flex-1 font-mono text-[13px] uppercase tracking-[0.16em] transition-colors",
                    active === i ? "text-white" : "text-white/50 group-hover:text-white/80",
                  )}
                >
                  {l.name}
                </span>
                <span
                  className={cn(
                    "w-1 h-1 rotate-45 transition-colors",
                    active === i ? "bg-[#38bdf8]" : "bg-white/15",
                  )}
                />
              </button>
            ))}
          </div>

          {/* Detail bay */}
          <div className="relative p-8 lg:p-12 min-h-[360px] flex flex-col justify-center">
            {/* Ghost number */}
            <span className="pointer-events-none absolute -right-2 -top-6 font-bold text-[clamp(6rem,14vw,11rem)] leading-none text-white/[0.04] select-none">
              {String(active + 1).padStart(2, "0")}
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-lg bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 flex items-center justify-center">
                    <layer.icon className="w-5 h-5 text-[#0ea5e9]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{layer.name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                      {layer.tag}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/50 leading-relaxed max-w-xl mb-7">{layer.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {layer.chips.map((chip) => (
                    <span
                      key={chip}
                      className="font-mono text-[11px] text-[#7dd3fc] bg-[#0ea5e9]/[0.06] border border-[#0ea5e9]/[0.12] rounded px-2.5 py-1"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
