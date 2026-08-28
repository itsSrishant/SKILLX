import React from "react";

const PARTNER_LOGOS = [
  { name: "DVET Maharashtra", short: "DVET" },
  { name: "MSSDS", short: "MSSDS" },
  { name: "National Career Service", short: "NCS" },
  { name: "Skill India", short: "Skill India" },
  { name: "MSEDCL", short: "MSEDCL" },
  { name: "Ministry of Skill Development", short: "MoSDE" },
  { name: "NSDC", short: "NSDC" },
  { name: "Mahindra & Mahindra", short: "Mahindra" },
  { name: "Tata Motors", short: "Tata" },
  { name: "Bajaj Auto", short: "Bajaj" },
  { name: "Bharat Forge", short: "Bharat Forge" },
  { name: "MIDC Maharashtra", short: "MIDC" },
];

export function PartnerLogos() {
  return (
    <section style={{ borderTop: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", padding: "28px 0" }}>
      <div style={{ overflow: "hidden", width: "100%" }}>
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#8a8a8a", textTransform: "uppercase", marginBottom: 18 }}>
          Maharashtra Skilling Ecosystem Integrations
        </p>
        <div className="logo-track" style={{ display: "flex", gap: 16 }}>
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
            <div key={i} style={{ flexShrink: 0, padding: "0 8px" }}>
              <div style={{
                padding: "8px 20px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.06)",
                background: "white",
                fontSize: 13, fontWeight: 700, color: "#5a5a5a",
                letterSpacing: "0.02em", whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}>
                {logo.short}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
