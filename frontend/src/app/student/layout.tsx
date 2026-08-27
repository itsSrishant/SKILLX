import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "SkillX — Student Portal | Find Your Course & Skill Bridge Plan",
  description:
    "Maharashtra ITI & MSSDS student portal. Discover courses in your district, see your skill gap, and get a free 20-hour Skill Bridge Pack recommendation.",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LangProvider>{children}</LangProvider>;
}
