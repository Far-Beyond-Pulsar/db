import { Hero } from "@/components/home/Hero";
import { Ticker } from "@/components/home/Ticker";
import { Features } from "@/components/home/Features";
import { CodeShowcase } from "@/components/home/CodeShowcase";
import { CTASection } from "@/components/home/CTASection";

export const dynamic = "force-static";

export default function Page() {
  return (
    <main className="bg-black text-white overflow-x-hidden">
      <Hero />
      <Ticker />
      <Features />
      <CodeShowcase />
      <CTASection />
    </main>
  );
}
