import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillX — Student Portal | Discover Your Skill Path",
  description:
    "Maharashtra ITI & MSSDS student portal. Discover courses in your district, see your skill gap, get a personalised 20-hour Skill Bridge Pack, and navigate your career pathway.",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
