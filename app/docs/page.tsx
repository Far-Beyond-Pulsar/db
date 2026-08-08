"use client";

import { motion } from "framer-motion";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TOC = [
  { id: "installation", label: "Installation" },
  { id: "core-concepts", label: "Core Concepts" },
  { id: "spatial-cells", label: "Spatial Cells" },
  { id: "streaming-grid", label: "Streaming Grid" },
  { id: "macros", label: "Derive Macros" },
  { id: "phase-machine", label: "Frame Phase Machine" },
  { id: "replication", label: "Replication Primitives" },
  { id: "layers", label: "Layer Reference" },
];

const INSTALL_CODE = `[workspace.dependencies]
pulsar_scenedb = { git = "https://github.com/Far-Beyond-Pulsar/SceneDB" }
pulsar_scenedb_derive = { git = "https://github.com/Far-Beyond-Pulsar/SceneDB" }

[dependencies]
pulsar_scenedb = { workspace = true }
pulsar_scenedb_derive = { workspace = true }`;

const SPATIAL_CODE = `use pulsar_scenedb::{SpatialCell, Aabb, Handle};

// A spatial cell is a page of entities with six dedicated f32 columns
// for AABB min/max per axis. No per-entity iteration in queries.
let mut cell = SpatialCell::new(256).unwrap();

let handle: Handle = cell.alloc(Aabb {
    min: [0.0, 0.0, 0.0],
    max: [1.0, 1.0, 1.0],
}).unwrap();

// Query scans directly over the column arrays — no allocation.
let mut results = vec![0u32; cell.rows_in_use() as usize];
let hit_count = cell.query_aabb(
    &Aabb { min: [-1.0; 3], max: [2.0; 3] },
    &mut results,
);
// results[0] == 0 (the handle's row passed the query)`;

const GRID_CODE = `use pulsar_scenedb::gpu::grid::{StreamingGrid, GridConfig, CellCoord, Domain, StreamingBudget};

let mut grid = StreamingGrid::new(
    GridConfig {
        cell_width: 100.0,
        margin_radius: 150.0,
        pad_fraction: 0.10,
        hysteresis: 20.0,
    },
    StreamingBudget {
        vram_hlod_budget: 256_000_000,
        vram_geometry_budget: 1_000_000_000,
        max_materialized_cells: 1024,
        proxy_mesh_bytes: 4096,
        mean_cell_geometry_bytes: 1_048_576,
    },
    &[], // inner region classes
).unwrap();

grid.materialize(CellCoord { x: 0, z: 0 });

// Two players — overlapping load areas work correctly. A cell promotes
// if ANY player is close enough and demotes only when ALL have left.
grid.classify(&[
    Aabb { min: [-10.0, -10.0, -10.0], max: [10.0, 10.0, 10.0] },
    Aabb { min: [490.0, -10.0, -10.0], max: [510.0, 10.0, 10.0] },
]);

let transitions = grid.take_transitions();

// Pin a cell to keep it loaded regardless of player positions.
grid.pin(CellCoord { x: 5, z: 3 }, Domain::Inner);
grid.unpin(CellCoord { x: 5, z: 3 });`;

const SCENESTORE_CODE = `use pulsar_scenedb_derive::SceneStore;

/// A material component with mixed storage locations:
///   - color, roughness, metallic → CPU + GPU (dirty-tracked mirror)
///   - name → CPU only (no GPU mirror, no VRAM cost)
#[derive(SceneStore)]
#[repr(C)]
pub struct Material {
    #[gpu]                        // CPU + GPU, DirtyTracked
    pub albedo: [f32; 4],

    #[gpu(mirror = DirtyTracked)] // CPU + GPU, explicit
    pub roughness: f32,

    #[gpu]                        // CPU + GPU, DirtyTracked
    pub metallic: f32,

    // No #[gpu] — CPU only. No VRAM, no dirty tracking.
    pub name: [u8; 64],
}`;

const REPLICATE_CODE = `use pulsar_scenedb_derive::Replicate;
use pulsar_scenedb::ReplicationEncoding::{self, *};
use pulsar_scenedb::ReplicationCondition::{self, *};

/// A player state component with per-field replication control.
#[derive(Replicate, Default)]
struct PlayerState {
    /// Full transform: replicated every frame as raw Pod bytes.
    #[replicate(encoding = Pod, condition = Always)]
    position: [f32; 3],

    /// Health: only sent to non-owning simulated proxies.
    #[replicate(encoding = DeltaCompressed, condition = SimulatedOnly)]
    health: f32,

    /// Ammo: only relevant to the owning client.
    #[replicate(encoding = Pod, condition = AutonomousOnly)]
    ammo: u32,

    /// Sent once at spawn, never again.
    #[replicate(encoding = Serialized, condition = InitialOnly)]
    inventory: Vec<Item>,

    /// One-shot event, delivered via the RPC channel.
    #[replicate(encoding = Event, condition = Multicast)]
    on_damage_taken: DamageEvent,
}

let mut registry = ReplicationRegistry::new();
PlayerState::register_replication(&mut registry);`;

const PHASE_CODE = `// Compile-time witnesses enforce phase ordering. You CANNOT call a
// function for a phase you don't hold a witness for.

// 1. Simulate — hold SimulateWitness to write.
let witness = SimulateWitness::new();
cell.write_transform(handle, &transform, &witness);

// 2. Harvest — read back with a HarvestPhase.
let phase: HarvestPhase = witness.finish_simulate();
let liveness = cell.snapshot_liveness(&phase);

// 3. Retired — compact at the frame boundary.
let retired: RetiredPhase = phase.finish_harvest();
cell.compact(&retired);

// Pass the wrong witness → compile error. No runtime checks needed.`;

const TRACK_CODE = `use pulsar_scenedb::{World, ChangeTracker, CpuSimulateWitness};

let mut world = World::new();
let mut tracker = ChangeTracker::new();
let witness = CpuSimulateWitness::new();

let delta = witness.run_tracked(&mut world, &mut tracker, |world, tracker| {
    // Systems write to the world and track changes here.
    let entity = world.spawn_tracked(tracker);
    world.insert_tracked(entity, 100.0f32, tracker);
});

// delta contains spawned entities, despawned entities, and component
// changes — each already encoded via the field's Replicable impl.`;

const SNAPSHOT_CODE = `use pulsar_scenedb::{Snapshot, RelevanceSet};

// Full world state.
let full = Snapshot::capture_full(&world, &registry, current_frame);

// Only entities relevant to a specific client.
let relevant = Snapshot::capture_relevant(&world, &registry, &relevance, current_frame);

// Restore into a World — e.g. a client resyncing after a connection gap.
let mut client_world = pulsar_scenedb::World::new();
full.restore_to_world(&mut client_world, &registry).unwrap();`;

const LAYERS_TABLE: [string, string, string, string][] = [
  ["Storage", "CPU", "CellStorage, Page, PageLayout, LivenessMask", "SoA pages, alloc/free, swap-and-pop compaction, handle→row indirection"],
  ["Spatial", "CPU", "SpatialCell, Aabb, Frustum", "Six bounds columns, AABB + frustum queries, scalar + SIMD"],
  ["Streaming", "CPU", "StreamingGrid, CellCoord, Domain, GridConfig", "Concentric classification, hysteresis, cross-fade, persistent pinning"],
  ["GPU store", "GPU", "SceneGpuStore, RegionPool, SceneBuffer, CellGpuState", "Region-partitioned SSBOs, delta-sync, generation validation, device loss rebuild"],
  ["Harvest", "CPU→GPU", "HarvestPipeline, HarvestStaging, View, MeshClass", "Per-view spatial queries, DEI compact, per-class token routing, upload to VRAM"],
  ["Phase machine", "CPU", "SimulateWitness, HarvestPhase, RetiredPhase", "Compile-time frame phase guards"],
  ["Assets", "GPU", "GeometryArena, MeshRegistry, ClusterBuffer, TextureStore, MeshletBuffer", "GPU-side asset storage with suballocation"],
  ["Lease", "CPU", "Lease, LeaseMask, Scratchpad", "RAII read leases, decaying per-frame scratch buffers"],
  ["Replication", "CPU", "ChangeTracker, CpuSimulateWitness, Delta, Replicable, ReplicationRegistry, SchemaBuilder, RelevanceSet, EntityCellMap, AuthorityTable, EventBatch, Snapshot, Reconciler, DeltaCompressor", "Change tracking, delta encoding, interest management, ownership, condition filtering, RPC channel, snapshots + resync, prediction reconciliation"],
];

function Section({
  id,
  title,
  children,
  index,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="mb-14 scroll-mt-24"
    >
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      {children}
    </motion.div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/50 leading-relaxed mb-4">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-[#7dd3fc] font-mono text-[13px]">{children}</code>;
}

export default function DocsPage() {
  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 pb-24">
        <div className="grid lg:grid-cols-[220px_1fr] gap-12 pt-12">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1 border-l border-white/[0.06] pl-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/25 mb-4">
                Docs
              </p>
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className={cn(
                    "block text-sm py-1 text-white/45 hover:text-white transition-colors",
                  )}
                >
                  {t.label}
                </a>
              ))}
              <div className="pt-4">
                <Link
                  href="/replication"
                  className="text-sm text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
                >
                  Replication →
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">
                <span className="text-[#38bdf8]">Reference</span>
                <span className="w-px h-4 bg-white/20" />
                <span>a database engine for your scene graph</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] mb-2">
                Documentation
              </h1>
            </motion.div>

            <Section id="installation" title="Installation" index={0}>
              <P>
                SceneDB is a Cargo workspace with three crates. Add <Code>pulsar_scenedb</Code> for the
                core library and <Code>pulsar_scenedb_derive</Code> for the derive macros.
                The replication layer is always available — no feature gate — and the core is
                graphics-free (C0), working with <Code>--no-default-features</Code>.
              </P>
              <CodeBlock title="Cargo.toml" code={INSTALL_CODE} />
            </Section>

            <Section id="core-concepts" title="Core Concepts" index={1}>
              <P>
                Every row gets a <Code>Handle</Code> — a packed u64 with a slot index, generation
                counter, and type tag. Storage is organized into fixed-capacity SoA pages (256 rows
                default, 1024 max) with 64-byte aligned columns and a 128-byte per-element stride
                ceiling. Swap-and-pop compaction at frame boundaries rearranges physical rows
                without breaking handles, and generation counters mean compaction never leaves a
                dangling pointer.
              </P>
              <P>
                Fields live in CPU columns by default. Adding <Code>#[gpu]</Code> creates an
                additional GPU-side mirror (an SSBO column in <Code>SceneGpuStore</Code>) that is
                delta-synced — only rows that changed since the last sync are uploaded. CPU-only
                fields consume no VRAM, generate no dirty words, and never participate in
                delta-sync, but they DO participate in replication and spatial queries.
              </P>
            </Section>

            <Section id="spatial-cells" title="Spatial Cells" index={2}>
              <P>
                A spatial cell wraps a page with six dedicated f32 columns for AABB min/max per
                axis. Queries scan directly over the column arrays — no per-entity iteration, no
                allocation in the hot path. The SIMD layer accelerates these with AVX2 (x86) and
                NEON (ARM), plus a scalar reference that the vectorized paths match bit-for-bit.
              </P>
              <CodeBlock title="src/main.rs" code={SPATIAL_CODE} />
            </Section>

            <Section id="streaming-grid" title="Streaming Grid" index={3}>
              <P>
                The streaming grid classifies cells into <Code>Outer</Code>, <Code>Margin</Code>, or{" "}
                <Code>Inner</Code> domains using a concentric distance model with hysteresis bands
                that damp boundary jitter. You pass a slice of observer AABBs, so multiple players
                with overlapping load areas work correctly — a cell promotes if any player is close
                enough and demotes only when all players have left. Cells can also be pinned to any
                domain directly, bypassing the distance-based rules entirely.
              </P>
              <CodeBlock title="streaming.rs" code={GRID_CODE} />
            </Section>

            <Section id="macros" title="Derive Macros" index={4}>
              <P>
                <Code>#[derive(SceneStore)]</Code> generates a <Code>Pod</Code> impl, the{" "}
                <Code>SceneColumnSet</Code> column layout, <Code>GpuColumnSet</Code> GPU write
                dispatch, and <Code>MirrorMode</Code> wiring from a <Code>repr(C)</Code> struct. The
                macro only processes <Code>#[gpu(...)]</Code> attributes — any other attribute
                passes through unmodified.
              </P>
              <CodeBlock title="material.rs" code={SCENESTORE_CODE} />
              <P>
                <Code>#[derive(Replicate)]</Code> reads <Code>#[replicate(...)]</Code> attributes
                and generates a <Code>register_replication</Code> function that registers a real
                per-named-field accessor with the <Code>ReplicationRegistry</Code>, driving delta
                encoding and interest management. The two derives are orthogonal — stack them on the
                same struct (even the same field) because each only reads its own attributes.
              </P>
              <CodeBlock title="player_state.rs" code={REPLICATE_CODE} />
            </Section>

            <Section id="phase-machine" title="Frame Phase Machine" index={5}>
              <P>
                A compile-time frame phase machine enforces the ordering: you hold a{" "}
                <Code>SimulateWitness</Code> to write, a <Code>HarvestPhase</Code> to read back, and
                a <Code>RetiredPhase</Code> to compact. Pass the wrong witness to a function and it
                won&apos;t compile. No runtime checks, no lock contention, no phase-order bugs.
              </P>
              <CodeBlock title="frame.rs" code={PHASE_CODE} />
            </Section>

            <Section id="replication" title="Replication Primitives" index={6}>
              <P>
                SceneDB records every mutation during Simulate (change tracking), encodes field
                deltas per a component schema (delta encoding), filters which client sees what
                (interest management + conditions), resolves who is allowed to write what (authority
                table), handles one-shot RPCs (event channel), and supports client-side prediction
                with server reconciliation (snapshots + reconciler).
              </P>
              <P>
                <Code>Delta::apply</Code> has no ordering guard — frame ordering is the
                transport&apos;s job. SceneDB does not own transport, encryption, or asset
                streaming; it produces <Code>Delta</Code> and <Code>EventBatch</Code> byte payloads
                and specifies per-field encodings.
              </P>
              <CodeBlock title="server_tick.rs" code={TRACK_CODE} />
              <CodeBlock title="resync.rs" code={SNAPSHOT_CODE} />
            </Section>

            <Section id="layers" title="Layer Reference" index={7}>
              <P>Every layer is a bounded unit with a single responsibility:</P>
              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-[#0c0c0f]">
                      <th className="px-4 py-3 font-semibold text-white/60">Layer</th>
                      <th className="px-4 py-3 font-semibold text-white/60">Location</th>
                      <th className="px-4 py-3 font-semibold text-white/60">Types</th>
                      <th className="px-4 py-3 font-semibold text-white/60">Responsibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LAYERS_TABLE.map((row) => (
                      <tr key={row[0]} className="border-b border-white/[0.05] last:border-0">
                        <td className="px-4 py-3 text-white font-medium align-top">{row[0]}</td>
                        <td className="px-4 py-3 text-white/50 align-top whitespace-nowrap">{row[1]}</td>
                        <td className="px-4 py-3 text-[#7dd3fc] align-top">{row[2]}</td>
                        <td className="px-4 py-3 text-white/45 align-top">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
