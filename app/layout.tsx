import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CornerCTA } from "@/components/layout/CornerCTA";
import { HUDRail } from "@/components/layout/HUDRail";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
    title: "SceneDB: GPU-Native ECS & Spatial Database",
  description:
    "A high-performance cross-device ECS with network replication primitives, built in Rust. Paged SoA storage, SIMD spatial queries, streaming residency, and delta-synced GPU mirrors.",
  icons: {
    icon: `${BASE}/logos/scenedb.png`,
    shortcut: `${BASE}/logos/scenedb.png`,
    apple: `${BASE}/logos/scenedb.png`,
  },
  openGraph: {
  title: "SceneDB: GPU-Native ECS & Spatial Database",
    description:
      "A high-performance cross-device ECS with network replication primitives, built in Rust.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-black text-white">
        <Header />
        <HUDRail />
        <div className="pt-14">{children}</div>
        <Footer />
        <CornerCTA />
      </body>
    </html>
  );
}
