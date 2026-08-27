import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillX — Government Admin Dashboard | Maharashtra Skill Gap Intelligence",
  description:
    "Real-time 4-engine skill gap analysis platform for Maharashtra Government officers. Analyse 500+ DVET ITI and MSSDS courses by district, get bridge pack recommendations.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
