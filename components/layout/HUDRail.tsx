export function HUDRail() {
  return (
    <div className="hidden xl:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-6">
      <span className="w-px h-16 bg-gradient-to-b from-transparent to-white/20" />
      <span className="v-text font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">
        SceneDB · GPU-native ECS &amp; spatial database
      </span>
      <span className="w-px h-16 bg-gradient-to-b from-white/20 to-transparent" />
    </div>
  );
}
