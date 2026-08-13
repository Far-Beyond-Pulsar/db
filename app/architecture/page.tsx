"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/CodeBlock";
import {
  Boxes,
  Cpu,
  Map,
  MonitorUp,
  Database,
  Layers,
  ShieldCheck,
  Radio,
  Cpu as CpuIcon,
  Network,
  ArrowDown,
  HardDrive,
  Box,
  Link2,
} from "lucide-react";

const LAYERS = [
  {
    icon: Boxes,
    name: "Storage",
    tag: "CPU · Layer 1",
    desc: "Paged SoA storage. 256 rows/page, 64B aligned columns, swap-and-pop compaction at frame boundaries. Handles stay stable; generation counters prevent dangling pointers.",
    items: ["CellStorage", "Page", "PageLayout", "LivenessMask", "HandleRegistry"],
  },
  {
    icon: Layers,
    name: "ECS",
    tag: "CPU · Layer 1",
    desc: "World, an archetype ECS: entities grouped by component set into contiguous columns. An archetype-graph edge cache keeps repeated insert/remove transitions to two Vec reads. Bundle spawn resolves the destination archetype once; queries resolve per-archetype once and iterate rows by pointer arithmetic.",
    items: ["World", "Bundle", "WorldQuery", "QueryIter"],
  },
  {
    icon: Cpu,
    name: "Spatial",
    tag: "CPU · Layer 1",
    desc: "Six dedicated f32 columns for AABB min/max per axis. AABB and frustum queries scan column arrays directly. No per-entity iteration, no allocation. Scalar reference must match SIMD bit-for-bit.",
    items: ["SpatialCell", "Aabb", "Frustum"],
  },
  {
    icon: Map,
    name: "Streaming",
    tag: "CPU · Layer 1",
    desc: "Concentric classification into Outer / Margin / Inner domains with hysteresis bands. The bands damp boundary jitter. Multiple observer AABBs and persistent pins coexist on the same grid.",
    items: ["StreamingGrid", "CellCoord", "Domain", "GridConfig"],
  },
  {
    icon: MonitorUp,
    name: "GPU Store",
    tag: "GPU · Layer 2",
    desc: "Region-partitioned SSBOs shared across every registered cell. Delta-sync uploads only dirty rows. Generation buffer + slot mirror in VRAM for GPU-side handle validation, with bulk rebuild for device loss.",
    items: ["SceneGpuStore", "RegionPool", "SceneBuffer", "CellGpuState"],
  },
  {
    icon: HardDrive,
    name: "GPU Buffers",
    tag: "GPU · Layer 2",
    desc: "Row buffers, texture arrays, and asset registries resolve through one keyed GpuBufferRegistry. DynamicGpuBuffer covers pipeline-owned data (cull outputs, draw batches) with transparent growth; GrowableSceneBuffer backs the World mirror.",
    items: ["GpuBufferRegistry", "DynamicGpuBuffer", "GrowableSceneBuffer", "GenerationMirror"],
  },
  {
    icon: Database,
    name: "World Mirror",
    tag: "CPU+GPU · entity storage",
    desc: "A second storage model alongside the paged cells: an archetype ECS (World / Entity / Component) with an opt-in GPU mirror. Build it wired via World::new_with_gpu_mirror and every #[gpu] field auto-registers on first insert and auto-flushes inside step(). Once-mode fields upload on first insert only; DirtyTracked fields batch into one flush per frame. get_mut returns a Mut guard that writes through on drop; scattered churn routes through a GPU scatter-write compute pass.",
    items: ["World", "GpuMirrorHandle", "MirrorMode", "Mut", "GenerationMirror"],
  },
  {
    icon: Box,
    name: "Assets",
    tag: "GPU · Layer 2",
    desc: "GPU-side asset storage with suballocation, keyed through the buffer registry: GeometryArena, MeshRegistry, ClusterBuffer, TextureStore, MeshletBuffer, and MaterialRegistry. Each one carries corruption validation and rebuild gates.",
    items: ["GeometryArena", "MeshRegistry", "ClusterBuffer", "TextureStore", "MeshletBuffer"],
  },
  {
    icon: Layers,
    name: "Harvest",
    tag: "CPU → GPU · Layer 2",
    desc: "Per-view spatial queries with one staging array per view (no shared state), routing hits into mesh-class buckets for indirect draw dispatch.",
    items: ["HarvestPipeline", "HarvestStaging", "View", "MeshClass"],
  },
  {
    icon: ShieldCheck,
    name: "Phase Machine",
    tag: "CPU · compile-time",
    desc: "FrameDriver owns one frame's progression: SimulateA → SimulateB → Harvest → Boundary (retire → compact → sync). Zero-sized witnesses gate every phase. SimulateA and SimulateB are sealed, so invalid transitions are unrepresentable.",
    items: ["FrameDriver", "SimulateA", "SimulateB", "HarvestPhase", "BoundaryPhase"],
  },
  {
    icon: Network,
    name: "SceneDb",
    tag: "CPU+GPU · facade",
    desc: "SceneDb owns a World, a SubsystemRegistry, and a FrameDriver. step() runs every subsystem's simulate hooks and flushes any attached mirror; step_gpu() drives Harvest → Boundary. Subsystems register once, hook only the phases they need, and stay callable by name from scripts via #[scenedb_subsystem] / #[subsystem_method].",
    items: ["SceneDb", "Subsystem", "SubsystemRegistry", "FrameDriver"],
  },
  {
    icon: Link2,
    name: "Relations",
    tag: "CPU · columnar",
    desc: "For component patterns where one entity points at another (portals, multi-body attachments), RelationIndex builds a dense columnar view over World. Confirmed-reciprocal pairs only, with unmatched and conflict buffers for the caller to resolve. Rebuilt once per boundary; reads are zero-allocation slices.",
    items: ["RelationIndex", "RelationView", "ConflictEntry"],
  },
  {
    icon: Radio,
    name: "Replication",
    tag: "CPU · C0",
    desc: "The full primitive suite: change tracking, delta encoding, interest management, authority, events/RPCs, snapshots, and client-side prediction. All graphics-free and always available.",
    items: ["ChangeTracker", "Delta", "RelevanceSet", "AuthorityTable", "Snapshot", "Reconciler"],
  },
];

const FLOW_CODE = `// FrameDriver owns one frame's progression through the phase machine.
//
//   driver.begin()  →  SimulateA   (gameplay mutation)
//         ↓
//   SimulateB           (physics writeback; Release fence)
//         ↓
//   HarvestPhase        (read-only; Acquire fence)
//         ↓
//   BoundaryPhase       (retire → compact → sync)
//         ↓
//   next driver.begin()
//
// SceneDb wraps the same chain: step() = SimulateA → SimulateB plus a
// World-mirror flush; step_gpu() = Harvest → Boundary with your store.`;

function LayerCard({
  layer,
  index,
}: {
  layer: (typeof LAYERS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06 }}
      className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 flex items-center justify-center">
          <layer.icon className="w-[18px] h-[18px] text-[#0ea5e9]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{layer.name}</h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
            {layer.tag}
          </span>
        </div>
      </div>
      <p className="text-xs text-white/45 leading-relaxed mb-4">{layer.desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {layer.items.map((it) => (
          <span
            key={it}
            className="font-mono text-[11px] text-[#7dd3fc] bg-[#0ea5e9]/[0.06] border border-[#0ea5e9]/[0.12] rounded px-2 py-0.5"
          >
            {it}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-12 mb-16"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">
            <span className="text-[#38bdf8]">System design</span>
            <span className="w-px h-4 bg-white/20" />
            <span>layered · bounded · testable</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-none mb-5">
            Architecture
          </h1>
          <p className="text-white/40 max-w-2xl text-sm leading-relaxed">
            SceneDB is layered. The bottom is a paged storage engine and a full archetype ECS;
            spatial, streaming, and GPU layers sit above it; a compile-time phase machine enforces
            ordering; and the replication layer rides on top of the frame boundary.
          </p>
        </motion.div>

        {/* Pipeline strip */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="mb-16"
        >
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            {[
              { icon: CpuIcon, name: "Simulate A" },
              { icon: CpuIcon, name: "Simulate B" },
              { icon: Network, name: "Harvest" },
              { icon: Layers, name: "Boundary" },
            ].map((step, i, arr) => (
              <div key={step.name} className="flex items-center gap-2 flex-1">
                <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                  <step.icon className="w-4 h-4 text-[#0ea5e9]" />
                  <span className="text-sm font-medium text-white/70">{step.name}</span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowDown className="hidden md:block w-4 h-4 text-white/20 shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/30 mt-4 font-mono">
            FrameDriver: simulate → harvest → boundary → repeat
          </p>
        </motion.div>

        {/* Layer grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {LAYERS.map((layer, i) => (
            <LayerCard key={layer.name} layer={layer} index={i} />
          ))}
        </div>

        {/* ECS performance vs bevy_ecs, head-to-head */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="mt-16 grid lg:grid-cols-2 gap-8 items-center"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              ECS performance, <span className="text-[#38bdf8]">measured</span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              A Criterion bench in{" "}
              <code className="text-[#7dd3fc] font-mono text-[13px]">benches/vs_bevy_ecs.rs</code>{" "}
              runs matched, single-threaded <code className="text-[#7dd3fc] font-mono text-[13px]">World</code>/
              <code className="text-[#7dd3fc] font-mono text-[13px]">Query</code> scenarios head-to-head
              against <code className="text-[#7dd3fc] font-mono text-[13px]">bevy_ecs</code> on the exact
              same component shapes and entity counts.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              What gets it there: an archetype-graph edge cache (repeated transitions cost two Vec
              reads), a{" "}
              <code className="text-[#7dd3fc] font-mono text-[13px]">WorldQuery</code> init/fetch split
              (column resolution once per archetype, pointer arithmetic per row), Bundle spawn (one
              destination archetype, every column written directly), and a zero-allocation
              column-move path for migration.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                value: "1.8×",
                label: "faster than bevy_ecs: archetype migration (add → add → remove, 10k entities)",
              },
              {
                value: "parity",
                label: "spawn with 4 components, 1k–10k entities (within measurement noise)",
              },
              {
                value: "6–11%",
                label: "behind bevy_ecs on 2-component query, 1k–50k entities, matched shapes",
              },
              {
                value: "faster",
                label: "than bevy_ecs on 4-component query, 10k entities",
              },
            ].map(({ value, label }) => (
              <div
                key={value}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
              >
                <p className="text-3xl font-bold tracking-tight text-white mb-2">{value}</p>
                <p className="text-xs text-white/45 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Threading + atomics */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Concurrency without <span className="text-[#38bdf8]">locks</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            SceneDB is built around single-writer, shared-reader discipline gated by the phase
            machine. Within Simulate, systems run in parallel on independent handles.{" "}
            <code className="text-[#7dd3fc] font-mono text-[13px]">SceneGpuStore::write_transform</code>{" "}
            is <code className="text-[#7dd3fc] font-mono text-[13px]">&amp;self</code>-safe with interior
            atomics. Harvest scans are read-only on <code className="text-[#7dd3fc] font-mono text-[13px]">SpatialCell</code>{" "}
            and safe to run per-view across a job system. The boundary phase is single-threaded.
          </p>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            <code className="text-[#7dd3fc] font-mono text-[13px]">LivenessMask</code> stores each
            64-row word as an <code className="text-[#7dd3fc] font-mono text-[13px]">AtomicU64</code> with{" "}
            <code className="text-[#7dd3fc] font-mono text-[13px]">Relaxed</code> ordering. Set during
            Simulate (single writer), read during Harvest (concurrent readers with a lease hold). No
            CAS loops, no <code className="text-[#7dd3fc] font-mono text-[13px]">SeqCst</code>, no
            shared-state concurrency inside the storage itself.
          </p>
          <CodeBlock title="frame.rs" code={FLOW_CODE} />
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-20">
          <p className="text-sm text-white/40 mb-4">Ready to write your first query?</p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium text-sm rounded-xl transition-colors"
          >
            Read the Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
