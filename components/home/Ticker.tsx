const ITEMS = [
  "256 rows / page",
  "64B aligned",
  "archetype ECS",
  "Bundle",
  "edge-cached",
  "AVX2",
  "NEON",
  "u64 handles",
  "6× f32 AABB",
  "World ↔ GPU",
  "delta-sync",
  "swap-and-pop",
  "GpuBufferRegistry",
  "scatter-write",
  "C0 core",
  "no allocation",
];

export function Ticker() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <div className="border-y border-white/[0.07] bg-[#060606] overflow-hidden py-3.5 mask-fade-x">
      <div className="animate-marquee flex items-center whitespace-nowrap w-max">
        {track.map((item, i) => (
          <span
            key={i}
            className="flex items-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/35"
          >
            <span className="px-6">{item}</span>
            <span className="w-1 h-1 rotate-45 bg-[#0ea5e9]/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
