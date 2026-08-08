"use client";

import { motion } from "framer-motion";
import OutlineText from "../OutlineText";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { TerminalSquare, Wand2 } from "lucide-react";

const SPATIAL_CODE = `use pulsar_scenedb::{SpatialCell, Aabb, Handle};

let mut cell = SpatialCell::new(256).unwrap();

let handle: Handle = cell.alloc(Aabb {
    min: [0.0, 0.0, 0.0],
    max: [1.0, 1.0, 1.0],
}).unwrap();

let mut results = vec![0u32; cell.rows_in_use() as usize];
let hit_count = cell.query_aabb(
    &Aabb { min: [-1.0; 3], max: [2.0; 3] },
    &mut results,
);
// results[0] == 0 (the handle's row passed the query)`;

const MACRO_CODE = `use pulsar_scenedb_derive::{SceneStore, Replicate};
use pulsar_scenedb::ReplicationEncoding::*;
use pulsar_scenedb::ReplicationCondition::*;

/// A fully wired engine component: SceneStore generates Pod + GPU
/// dispatch, Replicate generates the replication schema.
#[derive(SceneStore, Replicate, Default)]
#[repr(C)]
struct Character {
    /// Server-authoritative position, plain memcpy on the wire.
    #[replicate(encoding = Pod, condition = ServerAuthority)]
    position: [f32; 3],

    /// GPU mirror + network-replicated every frame.
    #[gpu]
    #[replicate(encoding = GpuHandle, condition = Always)]
    skinned_mesh: Handle,

    /// One-shot RPC: play an animation on all clients.
    #[replicate(encoding = Event, condition = Multicast)]
    on_play_animation: AnimationEvent,
}`;

export function CodeShowcase() {
  return (
    <section className="relative py-28 px-5 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">
            <span className="text-[#38bdf8]">03 / zero boilerplate</span>
            <span className="w-px h-4 bg-white/20" />
            <span>derive, don&apos;t write</span>
          </div>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.02em] leading-none max-w-2xl">
            Wired, not <OutlineText text="written" color="rgba(14, 165, 233, 0.35)" />
          </h2>
        </div>

        {/* Staggered banners */}
        <div className="relative">
          {/* A1 — spatial query, upper left */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative max-w-xl lg:w-[56%] lg:mr-auto"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#38bdf8]">A / 01</span>
              <TerminalSquare className="w-4 h-4 text-[#0ea5e9]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                Spatial query
              </span>
            </div>
            <CodeBlock title="src/main.rs" code={SPATIAL_CODE} />
          </motion.div>

          {/* A2 — macros, lower right */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative max-w-xl lg:w-[56%] lg:ml-auto mt-12 lg:mt-14"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#38bdf8]">B / 02</span>
              <Wand2 className="w-4 h-4 text-[#0ea5e9]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                Derive macros
              </span>
            </div>
            <CodeBlock title="component.rs" code={MACRO_CODE} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
