import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillX — Maharashtra Labour Market Intelligence Platform",
  description:
    "SkillX is a real-time AI-powered skill gap analysis platform for Maharashtra ITI & MSSDS courses, connecting 85 DVET trades with MIDC employer demands via a 4-engine data pipeline.",
  keywords: "SkillX, Maharashtra, ITI, MSSDS, DVET, skill gap, SIH 2026, vocational training",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950">{children}</body>
    </html>
  );
}
