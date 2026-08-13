"use client";

import { motion } from "framer-motion";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TOC = [
  { id: "installation", label: "Installation" },
  { id: "core-concepts", label: "Core Concepts" },
  { id: "ecs-world", label: "ECS · World" },
  { id: "spatial-cells", label: "Spatial Cells" },
  { id: "streaming-grid", label: "Streaming Grid" },
  { id: "world-mirror", label: "World ↔ GPU Mirror" },
  { id: "macros", label: "Derive Macros" },
  { id: "scene-db", label: "SceneDb + Subsystems" },
  { id: "relations", label: "Relational Indexing" },
  { id: "phase-machine", label: "Frame Phase Machine" },
  { id: "replication", label: "Replication Primitives" },
  { id: "layers", label: "Layer Reference" },
];

const INSTALL_CODE = `[workspace.dependencies]
pulsar_scenedb = { git = "https://github.com/Far-Beyond-Pulsar/SceneDB" }
pulsar_scenedb_derive = { git = "https://github.com/Far-Beyond-Pulsar/SceneDB" }

[dependencies]
pulsar_scenedb = { workspace = true, features = ["gpu"] }
pulsar_scenedb_derive = { workspace = true }

# "gpu" is opt-in (off by default) -- enables wgpu and every #[gpu]-mirrored
# path (SceneGpuStore, the World mirror, GPU asset storage). The storage,
# spatial, streaming, and replication layers need nothing beyond the
# default feature set.
#
# "telemetry" (also opt-in; pulls in "gpu") enables TelemetryServer -- the
# TCP monitoring socket that streams world/gpu snapshots to dashboards such
# as the companion scenedb_dashboard crate.`;

const SPATIAL_CODE = `use pulsar_scenedb::{SpatialCell, Aabb, Handle};

// A spatial cell is a page of entities with six dedicated f32 columns
// for AABB min/max per axis. No per-entity iteration in queries.
let mut cell = SpatialCell::new(256).unwrap();

let handle: Handle = cell.alloc(Aabb {
    min: [0.0, 0.0, 0.0],
    max: [1.0, 1.0, 1.0],
}).unwrap();

// Query scans directly over the column arrays, no allocation.
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

// Two players: overlapping load areas work correctly. A cell promotes
// if ANY player is close enough and demotes only when ALL have left.
grid.classify(&[
    Aabb { min: [-10.0, -10.0, -10.0], max: [10.0, 10.0, 10.0] },
    Aabb { min: [490.0, -10.0, -10.0], max: [510.0, 10.0, 10.0] },
]);

let transitions = grid.take_transitions();

// Pin a cell to keep it loaded regardless of player positions.
grid.pin(CellCoord { x: 5, z: 3 }, Domain::Inner);
grid.unpin(CellCoord { x: 5, z: 3 });`;

const ECS_CODE = `use pulsar_scenedb::{World, Entity};

struct Pos(f32, f32, f32);
struct Vel(f32, f32, f32);
struct Health(u32);

let mut world = World::new();

let e = world.spawn();
world.insert(e, Pos(0.0, 0.0, 0.0));
world.insert(e, Vel(1.0, 0.0, 0.0));

for (entity, (pos, vel)) in world.query::<(&Pos, &Vel)>() {
    // entity: Entity, pos: &Pos, vel: &Vel
}

// Don't need the entity handle? query_items skips fetching it.
for (pos, vel) in world.query_items::<(&Pos, &Vel)>() {
    // pos: &Pos, vel: &Vel
}

// Bundle: one destination archetype, every column written directly.
world.reserve_bundle::<(Pos, Vel, Health)>(10_000);
let e = world.spawn_bundle((Pos(0.0, 0.0, 0.0), Vel(1.0, 0.0, 0.0), Health(100)));

// get_mut returns a Mut guard. On a mirrored World its #[gpu] fields
// write through to the GPU when the guard drops.
{
    let mut health = world.get_mut::<Health>(e).unwrap();
    health.0 = 50;
}`;

const WORLD_MIRROR_CODE = `use pulsar_scenedb::{World, gpu::{GpuMirrorHandle, SceneGpuStore}};
use pulsar_scenedb_derive::SceneStore;
use std::sync::Arc;

/// #[gpu(layout = packed)] interleaves every #[gpu] field into one SSBO
/// row instead of one buffer per field.
#[derive(SceneStore, Clone, Copy)]
#[gpu(layout = packed)]
struct Instance {
    #[gpu(mirror = Once)]    // written on first insert, never again
    model: [f32; 16],
    #[gpu(mirror = Once)]
    normal_mat: [f32; 16],
    #[gpu]                   // DirtyTracked (the default): re-synced on change
    mesh_id: u32,
}

// Setup, once. No register_gpu_columns call needed -- the first insert of
// a #[gpu]-bearing type registers its columns for you.
let store = Arc::new(SceneGpuStore::new(&ctx, cfg));
let mut world = World::new_with_gpu_mirror(GpuMirrorHandle::new(Arc::clone(&store), queue.clone()));

let entity = world.spawn();
world.insert(entity, Instance { model, normal_mat, mesh_id: 7 });
// Every #[gpu] field above already wrote or dirty-marked itself inside
// insert() -- no manual dispatch call.

// Once per frame, after your simulation step:
world.flush_gpu_mirror(&queue);`;

const WORLD_MIRROR_CAPACITY_CODE = `// Ahead of a known-size batch (streaming a sublevel, spawning a wave):
world.reserve_gpu_mirror_capacity(&queue, 10_000)
    .expect("mirror attached")
    .expect("reserve succeeds");

// At a natural boundary after a peak-then-drop (not every frame --
// this is a real GPU-to-GPU copy, same cost as growth):
world.shrink_gpu_mirror_to_fit(&queue, highest_live_entity_index, 1.5);`;

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

    // No #[gpu]: CPU only. No VRAM, no dirty tracking.
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

const PHASE_CODE = `// FrameDriver owns one frame's progression. Each transition consumes the
// previous witness, so reordering or skipping a phase won't compile.

let sim_a = driver.begin();                       // SimulateA -- gameplay mutation
let sim_b = sim_a.end();                          // SimulateB -- physics writeback
let harvest = sim_b.end();                        // HarvestPhase -- read-only snapshots
let boundary = harvest.end();                     // BoundaryPhase
let (retired, _drained) = boundary.retire(store, cells);  // RetiredPhase
let stats = retired.compact(store, cells).sync(store, cells); // SyncStats

// store/cells are the caller's SceneGpuStore and CellSlot slices.
// SceneDb's step()/step_gpu() drive exactly this chain for you.`;

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
// changes, each already encoded via the field's Replicable impl.`;

const SNAPSHOT_CODE = `use pulsar_scenedb::{Snapshot, RelevanceSet};

// Full world state.
let full = Snapshot::capture_full(&world, &registry, current_frame);

// Only entities relevant to a specific client.
let relevant = Snapshot::capture_relevant(&world, &registry, &relevance, current_frame);

// Restore into a World, e.g. a client resyncing after a connection gap.
let mut client_world = pulsar_scenedb::World::new();
full.restore_to_world(&mut client_world, &registry).unwrap();`;

const SCENEDB_CODE = `use std::any::Any;
use pulsar_scenedb::{SceneDb, Subsystem, World};
use pulsar_scenedb::gpu::{SimulateA, SimulateB, RetiredPhase};

struct PhysicsSubsystem { gravity: [f32; 3] }

impl Subsystem for PhysicsSubsystem {
    fn name(&self) -> &'static str { "physics" }

    fn simulate_a(&mut self, _world: &mut World, _witness: &SimulateA) {
        // gameplay mutation is permitted here
    }

    fn simulate_b(&mut self, _world: &mut World, _witness: &SimulateB) {
        // physics writeback
    }

    fn boundary(&mut self, _phase: &RetiredPhase) {
        // after retire, before compact
    }

    fn as_any(&self) -> &dyn Any { self }
    fn as_any_mut(&mut self) -> &mut dyn Any { self }
}

let mut db = SceneDb::new();
db.register_subsystem(PhysicsSubsystem { gravity: [0.0, -9.8, 0.0] });

db.step(); // SimulateA -> SimulateB across every subsystem; flushes the World mirror if attached

let physics = db.subsystem_mut::<PhysicsSubsystem>().unwrap();
physics.gravity = [0.0, -1.6, 0.0];

// By-name path for scripts/events: invoke a #[subsystem_method] through
// the reflection registry.
db.dispatch("physics", "apply_impulse", vec![Box::new(42u64), Box::new([1.0f32, 0.0, 0.0])])
    .expect("dispatch succeeds");`;

const RELATIONS_CODE = `use pulsar_scenedb::{RelationIndex, Entity};

struct PortalLink { linked_to: Entity }

// Rebuild once per boundary: scan every PortalLink in the world and
// classify each into a confirmed pair, unmatched, or a conflict.
let mut index = RelationIndex::new();
index.build::<PortalLink>(&world, |link| link.linked_to);

let view = index.view();
// view.pairs:     &[(Entity, Entity)] -- reciprocal links, emitted once each
// view.unmatched: &[Entity]           -- target has no link back (or no component)
// view.conflicts: &[ConflictEntry]    -- target reciprocates with someone else;
//   each entry carries source, target, and ConflictReason::NotReciprocated(
//   what_the_target_links_to_instead)`;

const LAYERS_TABLE: [string, string, string, string][] = [
  ["Storage", "CPU", "CellStorage, Page, PageLayout, LivenessMask", "SoA pages, alloc/free, swap-and-pop compaction, handle→row indirection"],
  ["ECS", "CPU", "World, Entity, Bundle, WorldQuery, QueryIter, QueryItemsIter, Mut", "Archetype storage with edge-cached migration, bundle spawn/insert, typed queries, GPU write-through on Mut drop"],
  ["Spatial", "CPU", "SpatialCell, Aabb, Frustum", "Six bounds columns, AABB + frustum queries, scalar + SIMD"],
  ["Streaming", "CPU", "StreamingGrid, CellCoord, Domain, GridConfig", "Concentric classification, hysteresis, cross-fade, persistent pinning"],
  ["GPU store", "GPU", "SceneGpuStore, RegionPool, SceneBuffer, CellGpuState", "Region-partitioned SSBOs, delta-sync, generation validation, device loss rebuild"],
  ["GPU buffers", "GPU", "GpuBufferRegistry, DynamicGpuBuffer, GrowableSceneBuffer", "One keyed registry for every GPU buffer; pipeline-owned dynamic/growable SSBOs; explicit register/set/flush path for tooling"],
  ["World mirror", "CPU+GPU", "World, Entity, GpuMirrorHandle, MirrorMode, Mut, DirtyTrackedSceneBuffer, GenerationMirror", "Automatic per-field write/dirty-mark on insert, write-through on Mut drop, batched flush, GPU scatter-write for scattered churn, GPU liveness mirror"],
  ["Harvest", "CPU→GPU", "HarvestPipeline, HarvestStaging, View, MeshClass", "Per-view spatial queries, DEI compact, per-class token routing, upload to VRAM"],
  ["SceneDb", "CPU+GPU", "SceneDb, Subsystem, SubsystemRegistry, FrameDriver", "Frame facade: owns World + subsystem registry + frame driver; step()/step_gpu(); typed or by-name subsystem access; reflection dispatch"],
  ["Relations", "CPU", "RelationIndex, RelationView, ConflictEntry, ConflictReason", "Columnar relational view over World component links; reciprocal pairs + unmatched/conflict buffers"],
  ["Scheduler", "CPU", "Schedule, SystemFn", "Ordered per-tick systems receiving (&mut World, GameTime)"],
  ["Actors", "CPU", "Actor, ActorRegistry", "Lifecycle-driven autonomous objects (begin_play/tick/end_play) backed by one Entity each"],
  ["Telemetry", "CPU", "TelemetryServer, TelemetrySnapshot", "TCP monitoring snapshots of world/gpu state (feature: telemetry)"],
  ["Phase machine", "CPU", "FrameDriver, SimulateA, SimulateB, HarvestPhase, BoundaryPhase, RetiredPhase", "Compile-time frame phase guards"],
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
                SceneDB is a Cargo workspace with three crates. Add <Code>pulsar_scenedb</Code> for
                the core library, <Code>pulsar_scenedb_derive</Code> for the derive macros.
                Replication is always available, no feature gate. Everything GPU-related sits behind
                the <Code>gpu</Code> feature, off by default. C0: the core has zero graphics
                dependencies. Enable it for <Code>SceneGpuStore</Code>, the World mirror, or GPU
                asset storage.
              </P>
              <CodeBlock title="Cargo.toml" code={INSTALL_CODE} />
            </Section>

            <Section id="core-concepts" title="Core Concepts" index={1}>
              <P>
                Every row gets a <Code>Handle</Code>, a packed u64 with a slot index, generation
                counter, and type tag. Storage lives in fixed-capacity SoA pages (256 rows default,
                1024 max) with 64-byte aligned columns and a 128-byte per-element stride ceiling.
                Frame-boundary compaction is swap-and-pop: physical rows rearrange without breaking
                handles. Generation counters guarantee no dangling pointers.
              </P>
              <P>
                Fields live in CPU columns by default. Adding <Code>#[gpu]</Code> creates an
                additional GPU-side mirror, an SSBO column updated by delta-sync. Only rows changed
                since the last sync upload. CPU-only fields consume no VRAM and generate no dirty
                words. They still participate in replication and spatial queries.
              </P>
              <P>
                Two independent storage models share the same <Code>#[gpu]</Code> attribute. Inside
                a <Code>SpatialCell</Code>/<Code>CellStorage</Code> page, the mirror is written
                explicitly through the phase machine&apos;s witnesses. Inside a <Code>World</Code>{" "}
                (the archetype ECS, see{" "}
                <a href="#ecs-world" className="text-[#38bdf8] hover:text-[#7dd3fc]">ECS · World</a>{" "}
                and{" "}
                <a href="#world-mirror" className="text-[#38bdf8] hover:text-[#7dd3fc]">World ↔ GPU Mirror</a>{" "}
                below) with a mirror attached, the same attribute is written automatically inside{" "}
                <Code>world.insert()</Code> itself. No explicit write call.
              </P>
            </Section>

            <Section id="ecs-world" title="ECS · World" index={2}>
              <P>
                <Code>World</Code> is SceneDB&apos;s archetype ECS. Every <Code>Entity</Code> lives
                in exactly one archetype, its exact set of component types. Inserting a component
                migrates the entity to a different archetype and moves only that entity&apos;s
                data. Queries iterate archetypes directly over dense per-component column slices.
              </P>
              <CodeBlock title="ecs.rs" code={ECS_CODE} />
              <P>
                <Code>get_mut</Code> returns a <Code>Mut</Code> guard. On a mirrored World, a{" "}
                <Code>#[gpu]</Code> field written through that guard writes through to the GPU when
                the guard drops, exactly like <Code>insert</Code>. <Code>query_items</Code> drops
                the entity handle from the iteration entirely when you don&apos;t need it.
              </P>
            </Section>

            <Section id="spatial-cells" title="Spatial Cells" index={3}>
              <P>
                A spatial cell wraps a page with six dedicated f32 columns for AABB min/max per
                axis. Queries scan the column arrays directly. No per-entity iteration, no
                allocation in the hot path. The SIMD layer accelerates with AVX2 (x86) and NEON
                (ARM), and a scalar reference matches them bit-for-bit.
              </P>
              <CodeBlock title="src/main.rs" code={SPATIAL_CODE} />
            </Section>

            <Section id="streaming-grid" title="Streaming Grid" index={4}>
              <P>
                The streaming grid classifies cells into <Code>Outer</Code>, <Code>Margin</Code>, or{" "}
                <Code>Inner</Code> domains using a concentric distance model with hysteresis bands.
                The bands damp boundary jitter. You pass a slice of observer AABBs, so overlapping
                players work correctly: a cell promotes if any player is close enough, and demotes
                only when all players have left. Cells can be pinned to any domain directly,
                bypassing distance rules.
              </P>
              <CodeBlock title="streaming.rs" code={GRID_CODE} />
            </Section>

            <Section id="world-mirror" title="World ↔ GPU Mirror" index={5}>
              <P>
                Alongside the paged <Code>SpatialCell</Code>/<Code>CellStorage</Code> model above
                sits a second, independent storage model: <Code>World</Code>, an archetype ECS
                (<Code>Entity</Code>, <Code>Component</Code>, archetype migration on insert). It
                works standalone, no GPU dependency. Attach a <Code>GpuMirrorHandle</Code> via{" "}
                <Code>World::new_with_gpu_mirror</Code> at construction, or{" "}
                <Code>World::attach_gpu_mirror</Code> later, and every <Code>#[gpu]</Code> field
                mirrors automatically. Until then, <Code>World::insert</Code> behaves as if the{" "}
                <Code>gpu</Code> feature were disabled.
              </P>
              <P>
                Each <Code>#[gpu]</Code> field declares its own mirror mode.{" "}
                <Code>#[gpu(mirror = Once)]</Code> writes on the entity&apos;s first insert of that
                component, never again. The right choice for static data, a base transform or a mesh
                id. Plain <Code>#[gpu]</Code> (<Code>DirtyTracked</Code>, the default) marks the row
                dirty on every insert, writing nothing immediately. Nothing reaches the GPU until{" "}
                <Code>world.flush_gpu_mirror</Code>, once per frame. Both modes coalesce a
                frame&apos;s worth of writes. Adjacent rows upload as one contiguous range. Scattered
                rows take a different path: a GPU-side scatter-write compute pass instead of one
                upload call per row. Scattering is the common shape at scale, when entities churn
                (despawn/respawn) and a recycled entity index bears no relation to physical row
                adjacency. Either way the flush cost stays roughly constant.
              </P>
              <CodeBlock title="instance.rs" code={WORLD_MIRROR_CODE} />
              <P>
                Growth is lazy and unbounded by default. The first insert whose entity index
                doesn&apos;t fit the current buffer grows it, a real GPU-to-GPU copy. Reserve
                capacity up front when a batch size is known ahead of time. Symmetrically,{" "}
                <Code>shrink_gpu_mirror_to_fit</Code> reclaims capacity after a load spike settles.
              </P>
              <CodeBlock title="capacity.rs" code={WORLD_MIRROR_CAPACITY_CODE} />
              <P>
                A GPU-resident generation buffer (<Code>GpuMirrorHandle::generations()</Code>) tracks
                entity liveness automatically, in lockstep with <Code>World::is_alive</Code>&apos;s
                own CPU-side check. A shader holding a captured <Code>(row, generation)</Code> pair
                detects a stale reference the same way the CPU does. Entities with no{" "}
                <Code>#[gpu]</Code> field pay nothing: the liveness entry is written lazily, on the
                entity&apos;s first <Code>#[gpu]</Code>-bearing insert.
              </P>
            </Section>

            <Section id="macros" title="Derive Macros" index={6}>
              <P>
                <Code>#[derive(SceneStore)]</Code> generates a <Code>Pod</Code> impl, the{" "}
                <Code>SceneColumnSet</Code> column layout, <Code>GpuColumnSet</Code> GPU write
                dispatch, and <Code>MirrorMode</Code> wiring from a <Code>repr(C)</Code> struct. It
                only processes <Code>#[gpu(...)]</Code> attributes. Any other attribute passes
                through unmodified.
              </P>
              <CodeBlock title="material.rs" code={SCENESTORE_CODE} />
              <P>
                <Code>#[derive(Replicate)]</Code> reads <Code>#[replicate(...)]</Code> attributes
                and generates a <Code>register_replication</Code> function. It registers a real
                per-named-field accessor with the <Code>ReplicationRegistry</Code>, driving delta
                encoding and interest management. The two derives are orthogonal. Stack them on the
                same struct, even the same field, since each only reads its own attributes.
              </P>
              <CodeBlock title="player_state.rs" code={REPLICATE_CODE} />
            </Section>

            <Section id="scene-db" title="SceneDb + Subsystems" index={7}>
              <P>
                <Code>SceneDb</Code> is the frame facade. It owns a <Code>World</Code>, a{" "}
                <Code>SubsystemRegistry</Code>, and a <Code>FrameDriver</Code>. Subsystems are
                named, phase-gated plugins whose hooks (<Code>simulate_a</Code>/<Code>simulate_b</Code>,{" "}
                <Code>harvest</Code>, <Code>boundary</Code>) all default to no-ops. Implement only
                what you need. <Code>db.step()</Code> runs SimulateA → SimulateB across every
                subsystem and flushes the World mirror when one is attached.{" "}
                <Code>step_gpu</Code> additionally runs the harvest and boundary stages against a
                caller-supplied <Code>SceneGpuStore</Code>.
              </P>
              <CodeBlock title="physics.rs" code={SCENEDB_CODE} />
              <P>
                Subsystems are addressable two ways. Typed via <Code>subsystem_mut::&lt;T&gt;</Code>{" "}
                for ordinary Rust. By registered name via <Code>dispatch</Code> /{" "}
                <Code>subsystem_by_name_mut</Code> for scripts and editor tooling.{" "}
                <Code>#[scenedb_subsystem]</Code> marks an impl block,{" "}
                <Code>#[subsystem_method]</Code> marks the callable methods on it.
              </P>
            </Section>

            <Section id="relations" title="Relational Indexing" index={8}>
              <P>
                <Code>RelationIndex</Code> turns a component&apos;s cross-entity links into dense,
                columnar buffers. Rebuild it once per boundary; harvest reads borrow the result with
                no allocation. A pair is confirmed only when both sides link back to each other, and
                is then emitted exactly once. Everything else lands in <Code>unmatched</Code> (the
                target has no link back) or <Code>conflicts</Code> (the target reciprocates with
                someone else). Each conflict carries what the target links to instead, so the
                caller decides how to resolve.
              </P>
              <CodeBlock title="relations.rs" code={RELATIONS_CODE} />
            </Section>

            <Section id="phase-machine" title="Frame Phase Machine" index={9}>
              <P>
                A compile-time frame phase machine turns the frame&apos;s phase into a type.
                Holding a <Code>SimulateA</Code>/<Code>SimulateB</Code> permits mutation (A =
                gameplay, B = physics writeback), a <Code>HarvestPhase</Code> permits read-back,
                and a <Code>RetiredPhase</Code> permits compaction. Each transition consumes the
                previous witness, so reordering or skipping a phase won&apos;t compile. No runtime
                checks, no lock contention, no phase-order bugs. A <Code>FrameDriver</Code> owns
                the frame&apos;s progression; <Code>SceneDb::step</Code>/<Code>step_gpu</Code> drive
                it for you.
              </P>
              <CodeBlock title="frame.rs" code={PHASE_CODE} />
            </Section>

            <Section id="replication" title="Replication Primitives" index={10}>
              <P>
                SceneDB records every mutation during Simulate (change tracking), encodes field
                deltas per a component schema (delta encoding), filters which client sees what
                (interest management + conditions), resolves who is allowed to write what (authority
                table), handles one-shot RPCs (event channel), and supports client-side prediction
                with server reconciliation (snapshots + reconciler).
              </P>
              <P>
                <Code>Delta::apply</Code> carries no ordering guard. Frame ordering belongs to the
                transport. SceneDB does not own transport, encryption, or asset streaming. It
                produces <Code>Delta</Code> and <Code>EventBatch</Code> byte payloads and specifies
                per-field encodings.
              </P>
              <CodeBlock title="server_tick.rs" code={TRACK_CODE} />
              <CodeBlock title="resync.rs" code={SNAPSHOT_CODE} />
            </Section>

            <Section id="layers" title="Layer Reference" index={11}>
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
