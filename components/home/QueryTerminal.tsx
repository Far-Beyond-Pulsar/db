"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Line {
  text: string;
  cls?: string;
  type?: "prompt" | "out" | "row" | "header" | "dim" | "ok";
  divider?: boolean;
}

const HEADER =
  "  " +
  "handle".padEnd(18) +
  "  " +
  "type".padEnd(10) +
  "  " +
  "min_x".padStart(6) +
  "  " +
  "min_z".padStart(6) +
  "  " +
  "max_x".padStart(6);

const ROW_DATA: [string, string, string, string, string][] = [
  ["0x0000000000000042", "transform", "-12.4", "-8.2", "14.1"],
  ["0x000000000000007f", "transform", "-3.1", "-2.0", "3.1"],
  ["0x00000000000000a7", "transform", "18.6", "4.9", "21.3"],
  ["0x0000000000000118", "staticmesh", "-6.2", "-10.1", "6.2"],
  ["0x0000000000000145", "transform", "25.4", "-14.9", "27.9"],
  ["0x0000000000000201", "transform", "-18.2", "6.3", "-15.0"],
  ["0x0000000000000309", "staticmesh", "-9.8", "3.4", "9.8"],
];

const ROWS = ROW_DATA.map(
  ([h, t, x, z, mx]) =>
    `  ${h.padEnd(18)}  ${t.padEnd(10)}  ${x.padStart(6)}  ${z.padStart(6)}  ${mx.padStart(6)}`,
);

const LINES: Line[] = [
  { text: "scenedb query --cell city-0 --frustum cam_main", type: "prompt" },
  { text: "" },
  { text: "> SELECT handle, type, aabb", type: "prompt" },
  { text: "  FROM spatial_cell(city-0)", type: "prompt" },
  { text: "  WHERE aabb OVERLAPS frustum(cam_main)", type: "prompt" },
  { text: "" },
  { text: HEADER, type: "header" },
  { text: "", divider: true },
  ...ROWS.map((r) => ({ text: r, type: "row" as const })),
  { text: "" },
  { text: "  7 rows in 0.02 ms · AVX2 · 256 scanned · 0 alloc", type: "ok" },
];

const TYPE_CLASS: Record<string, string> = {
  prompt: "text-[#38bdf8]",
  out: "text-white/70",
  header: "text-white/45",
  dim: "text-white/15",
  row: "text-white/60",
  ok: "text-[#4ade80]",
};

const TICK = 160;
const HOLD_MS = 6000;

function CornerTicks() {
  const tick = "absolute w-3 h-3 border-[#38bdf8]/40";
  return (
    <>
      <span className={`${tick} top-0 left-0 border-t border-l`} />
      <span className={`${tick} top-0 right-0 border-t border-r`} />
      <span className={`${tick} bottom-0 left-0 border-b border-l`} />
      <span className={`${tick} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

export function QueryTerminal() {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    if (count >= LINES.length) {
      timer.current = setTimeout(() => {
        setCount(0);
      }, HOLD_MS);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    timer.current = setTimeout(() => setCount((c) => c + 1), TICK);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [count, running]);

  useEffect(() => {
    const onVisible = () => setRunning(true);
    const onHidden = () => setRunning(false);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("blur", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("blur", onHidden);
    };
  }, []);

  return (
    <div className="relative flex flex-col w-full h-[420px] rounded-lg border border-white/[0.08] bg-[#09090b] overflow-hidden">
      <CornerTicks />
      {/* Chrome */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0c0f]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="font-mono text-[11px] text-white/35 tracking-wide">
          scenedb — spatial query
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
          SIMD · AVX2 / NEON
        </span>
      </div>

      {/* Body — fixed area, scrolls only if content ever outgrows it */}
      <div className="flex-1 min-h-0 overflow-auto p-4 font-mono text-[12px] leading-[1.5]">
        {LINES.slice(0, count).map((line, i) =>
          line.divider ? (
            <div key={i} className="my-1 border-b border-white/[0.08]" />
          ) : (
            <div key={i} className="whitespace-pre">
              <span
                className={cn(
                  TYPE_CLASS[line.type || "out"],
                  line.type === "row" && i % 2 === 1 && "text-white/55",
                )}
              >
                {line.text}
              </span>
            </div>
          ),
        )}
        {count >= LINES.length && (
          <div className="mt-0.5">
            <span className="caret" />
          </div>
        )}
      </div>
    </div>
  );
}

export default QueryTerminal;
