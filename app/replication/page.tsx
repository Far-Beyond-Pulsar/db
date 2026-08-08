"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/CodeBlock";
import {
  ClipboardList,
  ArrowRight,
  Filter,
  Shield,
  Zap,
  Camera,
  GitBranch,
  Box,
} from "lucide-react";

const STEPS = [
  { icon: ClipboardList, name: "Change Tracking", desc: "Every mutation during Simulate is recorded." },
  { icon: Box, name: "Delta Encoding", desc: "Field deltas encoded per component schema." },
  { icon: Filter, name: "Interest Mgmt", desc: "RelevanceSet filters what each client sees." },
  { icon: Shield, name: "Authority", desc: "AuthorityTable resolves who may write what." },
  { icon: Zap, name: "Events / RPCs", desc: "One-shot messages outside state deltas." },
  { icon: Camera, name: "Snapshots", desc: "Full state baselines for resync and joins." },
  { icon: GitBranch, name: "Prediction", desc: "Client-side prediction + reconciliation." },
];

const SCHEMA_CODE = `use pulsar_scenedb::{ReplicationRegistry, ReplicationEncoding, ReplicationCondition,
    EventChannel, SchemaBuilder, Component};

let mut registry = ReplicationRegistry::new();

let builder = registry.register::<Transform>();
registry.insert(
    builder.whole_field("matrix", ReplicationEncoding::Pod, ReplicationCondition::Always)
);

let builder = registry.register::<Health>();
registry.insert(
    builder.whole_field("value", ReplicationEncoding::DeltaCompressed, ReplicationCondition::SimulatedOnly)
);

// Serialize schemas for the connection handshake.
let handshake = registry.handshake_message();
let remote_registry = ReplicationRegistry::from_handshake(&handshake).unwrap();`;

const SERVER_TICK_CODE = `fn server_tick(
    world: &mut World,
    witness: &CpuSimulateWitness,
    registry: &ReplicationRegistry,
    authority: &AuthorityTable,
    clients: &[ClientId],
    spatial_cells: &[SpatialCell],
    entity_cell_map: &EntityCellMap,
    liveness: &LivenessSnapshot,
    scratch: &mut Scratchpad,
) -> Vec<(Delta, Vec<EventBatch>)> {
    // 1. Track all changes and drain into a Delta in one call.
    let mut tracker = ChangeTracker::new();
    let delta = witness.run_tracked(world, &mut tracker, |world, tracker| {
        run_systems(world, tracker);
    });

    // 2. Build per-client outputs.
    let mut outputs = Vec::new();
    for &client in clients {
        // Spatial relevance, resolved to ECS entities via EntityCellMap.
        let relevance = RelevanceSet::from_frustum_mapped(
            spatial_cells, &client_frustum(client), liveness, scratch, entity_cell_map,
        );

        // Filter by relevance + conditions.
        let view = relevance.filter(&delta, authority, registry, client);

        // Build event batch with direction enforcement.
        let batch = events_to_batch(&view, delta.frame, registry, ClientId(0), client);

        outputs.push((delta.clone(), batch.into_iter().collect()));
    }
    outputs
}`;

const RECONCILER_CODE = `let mut reconciler = Reconciler::new();

// Each local tick, push the player's input.
reconciler.push_input(ClientInput {
    frame: local_frame,
    entity: player_entity,
    component: component_id::<Movement>(),
    field_data: vec![(0, serialize_movement(&input))],
});

// When a server delta arrives, apply it, then reconcile.
server_delta.apply(&mut world, &registry).unwrap();
reconciler.reconcile(&server_delta, &mut world, |world, input| {
    apply_input_to_world(world, input);
});`;

const PATTERNS: [string, string][] = [
  ["Server-authoritative projectile", "position/velocity replicated Always · on_impact is a Multicast event"],
  ["Client-authoritative input", "move_direction ClientAuthority delta-compressed · on_jump is a ClientToServer event"],
  ["Multi-user editor metadata", "selected Shared · custom_properties Shared, serialized Vec"],
  ["Visibility-gated game state", "world_position Always · minimap_blips OwnerOnly · fog_of_war_reveal SkipOwner · proxy_mesh SimulatedOnly GpuHandle"],
];

const ENCODINGS = [
  ["Pod", "0", "Plain memcpy — the fastest path"],
  ["Serialized", "1", "Self-framing owned/heap data (String, Vec<T>, Option<T>)"],
  ["GpuHandle", "2", "Only the 8-byte handle index travels, not the resource"],
  ["DeltaCompressed", "3", "Stateful delta compression per field"],
  ["Event", "4", "One-shot RPC, never in state deltas"],
  ["Opaque", "5", "Engine-defined byte blob"],
];

export default function ReplicationPage() {
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
            <span className="text-[#38bdf8]">Network layer</span>
            <span className="w-px h-4 bg-white/20" />
            <span>server-authoritative · C0</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-none mb-5">
            Replication <span className="text-outline-accent">primitives</span>
          </h1>
          <p className="text-white/40 max-w-2xl text-sm leading-relaxed">
            Multiplayer and multi-user-editor support built into the data layer — change tracking,
            delta encoding, interest management, authority, events/RPCs, snapshots, and client-side
            prediction. Server-authoritative from the ground up, with per-field conditions driving
            everything.
          </p>
        </motion.div>

        {/* Pipeline */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <step.icon className="w-4 h-4 text-[#0ea5e9]" />
                <span className="font-mono text-[10px] text-white/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{step.name}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Schema */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Schema <span className="text-[#38bdf8]">first</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Declare which fields replicate, how they encode, and under what conditions. The
            handshake serializes the whole schema set so every client can decode any delta it
            receives. Hand-rolled schemas compose with{" "}
            <code className="text-[#7dd3fc] font-mono text-[13px]">SchemaBuilder</code> — or use{" "}
            <code className="text-[#7dd3fc] font-mono text-[13px]">#[derive(Replicate)]</code> and let
            the macro register real field accessors for you.
          </p>
          <CodeBlock title="schema.rs" code={SCHEMA_CODE} />
        </motion.div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Server tick */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            One tick, per-client <span className="text-[#38bdf8]">outputs</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Track changes during Simulate, drain into a <code className="text-[#7dd3fc] font-mono text-[13px]">Delta</code> at the
            frame boundary, then filter and encode per client — relevance, conditions, and event
            direction all enforced in one pass.
          </p>
          <CodeBlock title="server_tick.rs" code={SERVER_TICK_CODE} />
        </motion.div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Prediction &amp; <span className="text-[#38bdf8]">reconciliation</span>
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            The reconciler keeps a history ring buffer of server snapshots and a queue of
            unacknowledged local inputs. When a server delta arrives, it discards acknowledged
            inputs and replays the remaining predicted inputs on top of the corrected world.
          </p>
          <CodeBlock title="client.rs" code={RECONCILER_CODE} />
        </motion.div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Patterns */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
            Pattern <span className="text-[#38bdf8]">library</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PATTERNS.map(([name, desc]) => (
              <div
                key={name}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
              >
                <h3 className="text-sm font-semibold text-white mb-2">{name}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="divider max-w-4xl mx-auto my-16" />

        {/* Encodings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
            Wire <span className="text-[#38bdf8]">encodings</span>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-[#0c0c0f]">
                  <th className="px-4 py-3 font-semibold text-white/60">Encoding</th>
                  <th className="px-4 py-3 font-semibold text-white/60">Value</th>
                  <th className="px-4 py-3 font-semibold text-white/60">What travels</th>
                </tr>
              </thead>
              <tbody>
                {ENCODINGS.map((row) => (
                  <tr key={row[0]} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-4 py-3 text-[#7dd3fc] align-top whitespace-nowrap">{row[0]}</td>
                    <td className="px-4 py-3 text-white/50 align-top">{row[1]}</td>
                    <td className="px-4 py-3 text-white/45 align-top">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-20">
          <p className="text-sm text-white/40 mb-4">Want the full replication deep-dive?</p>
          <Link
            href="/docs#replication"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium text-sm rounded-xl transition-colors"
          >
            Replication Docs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
