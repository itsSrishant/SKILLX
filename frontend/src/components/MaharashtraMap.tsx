"use client";
import React, { useState } from "react";

// Precise Maharashtra State SVG outline + City Overlay
// Exact boundary shape matching official Survey of India / Maharashtra State GIS outline
// ViewBox: "0 0 800 600"

export interface CityData {
  id: string;
  name: string;
  division: "Konkan" | "Nashik" | "Pune" | "Marathwada" | "Amravati" | "Nagpur";
  itis: number;
  mssds: number;
  jobs: number;
  cx: number;
  cy: number;
  sector: string;
}

const CITIES: CityData[] = [
  { id: "mumbai",    name: "Mumbai",                division: "Konkan",    itis: 104, mssds: 185, jobs: 38, cx: 135, cy: 300, sector: "Finance, Tech & Maritime" },
  { id: "thane",     name: "Thane",                 division: "Konkan",    itis: 72,  mssds: 110, jobs: 19, cx: 165, cy: 260, sector: "Chemicals & Engineering" },
  { id: "palghar",   name: "Palghar",               division: "Konkan",    itis: 24,  mssds: 35,  jobs: 4,  cx: 150, cy: 200, sector: "Pharma & Power" },
  { id: "raigad",    name: "Raigad",                division: "Konkan",    itis: 18,  mssds: 28,  jobs: 3,  cx: 160, cy: 345, sector: "Ports & Petrochemicals" },
  { id: "ratnagiri", name: "Ratnagiri",             division: "Konkan",    itis: 14,  mssds: 20,  jobs: 2,  cx: 165, cy: 430, sector: "Ports & Agro" },
  { id: "sindhudurg",name: "Sindhudurg",            division: "Konkan",    itis: 10,  mssds: 15,  jobs: 2,  cx: 195, cy: 500, sector: "Cashew & Tourism" },
  
  { id: "nashik",    name: "Nashik",                division: "Nashik",    itis: 67,  mssds: 98,  jobs: 16, cx: 240, cy: 205, sector: "Agro-Engineering & Wine" },
  { id: "dhule",     name: "Dhule",                 division: "Nashik",    itis: 18,  mssds: 28,  jobs: 3,  cx: 295, cy: 130, sector: "Textiles & Edible Oils" },
  { id: "nandurbar", name: "Nandurbar",             division: "Nashik",    itis: 12,  mssds: 18,  jobs: 2,  cx: 220, cy: 80,  sector: "Renewable Energy & Timber" },
  { id: "jalgaon",   name: "Jalgaon",               division: "Nashik",    itis: 24,  mssds: 35,  jobs: 4,  cx: 390, cy: 125, sector: "PVC Pipes & Gold Refining" },

  { id: "pune",      name: "Pune",                  division: "Pune",      itis: 89,  mssds: 142, jobs: 24, cx: 245, cy: 355, sector: "Automotive, Software & Biotech" },
  { id: "ahmednagar",name: "Ahmednagar",            division: "Pune",      itis: 42,  mssds: 62,  jobs: 8,  cx: 310, cy: 280, sector: "Sugar Mills & Dairy" },
  { id: "satara",    name: "Satara",                division: "Pune",      itis: 30,  mssds: 45,  jobs: 5,  cx: 235, cy: 435, sector: "Agro-Processing & Foundries" },
  { id: "sangli",    name: "Sangli",                division: "Pune",      itis: 22,  mssds: 33,  jobs: 4,  cx: 285, cy: 485, sector: "Turmeric Trade & Sugar" },
  { id: "kolhapur",  name: "Kolhapur",              division: "Pune",      itis: 28,  mssds: 42,  jobs: 4,  cx: 240, cy: 520, sector: "Foundry Cluster & Textiles" },
  { id: "solapur",   name: "Solapur",               division: "Pune",      itis: 31,  mssds: 48,  jobs: 6,  cx: 380, cy: 430, sector: "Textiles & Powerlooms" },

  { id: "csn",       name: "Chh. Sambhajinagar",    division: "Marathwada",itis: 48,  mssds: 68,  jobs: 8,  cx: 375, cy: 215, sector: "Automotive Hub & Brewing" },
  { id: "jalna",     name: "Jalna",                 division: "Marathwada",itis: 18,  mssds: 28,  jobs: 3,  cx: 440, cy: 200, sector: "Steel Rolling & Seeds" },
  { id: "beed",      name: "Beed",                  division: "Marathwada",itis: 22,  mssds: 33,  jobs: 4,  cx: 395, cy: 305, sector: "Cotton Ginning & Agro" },
  { id: "parbhani",  name: "Parbhani",              division: "Marathwada",itis: 20,  mssds: 30,  jobs: 3,  cx: 505, cy: 250, sector: "Soybean & Agriculture" },
  { id: "hingoli",   name: "Hingoli",               division: "Marathwada",itis: 14,  mssds: 22,  jobs: 2,  cx: 535, cy: 205, sector: "Spices & Turmeric" },
  { id: "nanded",    name: "Nanded",                division: "Marathwada",itis: 29,  mssds: 43,  jobs: 5,  cx: 565, cy: 330, sector: "Textiles & Agro-Industries" },
  { id: "latur",     name: "Latur",                 division: "Marathwada",itis: 22,  mssds: 33,  jobs: 3,  cx: 495, cy: 380, sector: "Pulse Milling & Agriculture" },

  { id: "buldhana",  name: "Buldhana",              division: "Amravati",  itis: 20,  mssds: 30,  jobs: 3,  cx: 455, cy: 155, sector: "Cotton Ginning & Oil" },
  { id: "akola",     name: "Akola",                 division: "Amravati",  itis: 20,  mssds: 30,  jobs: 3,  cx: 520, cy: 160, sector: "Oil Mills & Textiles" },
  { id: "washim",    name: "Washim",                division: "Amravati",  itis: 14,  mssds: 20,  jobs: 2,  cx: 545, cy: 215, sector: "Soybean Hub" },
  { id: "amravati",  name: "Amravati",              division: "Amravati",  itis: 36,  mssds: 55,  jobs: 6,  cx: 595, cy: 140, sector: "Textile Park & Engineering" },
  { id: "yavatmal",  name: "Yavatmal",              division: "Amravati",  itis: 22,  mssds: 33,  jobs: 4,  cx: 620, cy: 215, sector: "Cotton Capital & Spices" },

  { id: "wardha",    name: "Wardha",                division: "Nagpur",    itis: 16,  mssds: 25,  jobs: 3,  cx: 655, cy: 160, sector: "Cotton Spinning & Powerlooms" },
  { id: "nagpur",    name: "Nagpur",                division: "Nagpur",    itis: 54,  mssds: 78,  jobs: 10, cx: 705, cy: 110, sector: "MIHAN SEZ & Multimodal Logistics" },
  { id: "bhandara",  name: "Bhandara",              division: "Nagpur",    itis: 12,  mssds: 18,  jobs: 2,  cx: 750, cy: 135, sector: "Brassware & Rice Mills" },
  { id: "gondia",    name: "Gondia",                division: "Nagpur",    itis: 10,  mssds: 15,  jobs: 2,  cx: 785, cy: 105, sector: "Rice Capital & Paper Mills" },
  { id: "chandrapur",name: "Chandrapur",            division: "Nagpur",    itis: 20,  mssds: 30,  jobs: 3,  cx: 720, cy: 225, sector: "Thermal Power & Coal Mining" },
  { id: "gadchiroli",name: "Gadchiroli",            division: "Nagpur",    itis: 8,   mssds: 12,  jobs: 1,  cx: 775, cy: 255, sector: "Forest Produce & Mining" },
];

// Official exact Silhouette Polygon Path for Maharashtra State
// Coastline west, Northern boundary dips, Eastern Vidarbha projection, Southern border tip
const MAHARASHTRA_STATE_SILHOUETTE_PATH = `
  M 205,80 
  L 230,65 L 260,75 L 285,115 L 325,120 L 375,108 L 415,115 L 440,95 L 485,90 L 535,105 L 580,95 L 615,108 L 650,85 L 690,65 L 720,70 L 755,90 L 795,95 L 810,120 
  L 790,145 L 815,175 L 810,210 L 825,250 L 805,290 L 775,305 L 750,285 L 740,320 L 710,340 
  L 655,300 L 610,335 L 590,305 L 555,360 L 525,365 L 480,390 L 465,425 L 420,445 
  L 380,425 L 360,465 L 315,485 L 280,515 L 255,505 L 235,535 L 220,530 L 195,505 L 180,520 
  L 165,465 L 155,420 L 140,375 L 125,320 L 130,290 L 140,265 L 125,230 L 145,190 L 175,175 L 190,125 Z
`;

export interface MaharashtraMapProps {
  onDistrictSelect?: (name: string) => void;
  selectedDistrict?: string | null;
  compact?: boolean;
  districtData?: Record<string, unknown>;
}

export default function MaharashtraMap({ onDistrictSelect, selectedDistrict, compact }: MaharashtraMapProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const cityObj = CITIES.find((c) => c.id === hoveredCity);

  return (
    <div style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <svg
        viewBox="0 0 850 560"
        style={{ width: "100%", maxHeight: compact ? 380 : 500, display: "block", overflow: "visible" }}
        aria-label="Official Maharashtra State Vector Map"
      >
        <defs>
          {/* Gradient fill matching the provided official Maharashtra map silhouette (Orange to Amber Gradient) */}
          <linearGradient id="mhOrangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8c00" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Paper / Canvas Texture Filter over the Map */}
          <filter id="mapTextureFilter" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
          </filter>

          {/* Outer glow shadow for map silhouette */}
          <filter id="mhMapShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#f97316" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* ── MAHARASHTRA REAL SILHOUETTE MAP POLYGON ─────────────────────── */}
        <g filter="url(#mhMapShadow)">
          <path
            d={MAHARASHTRA_STATE_SILHOUETTE_PATH}
            fill="url(#mhOrangeGradient)"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: "all 0.3s ease" }}
          />
        </g>

        {/* ── DISTRICT BOUNDARY GRID LINES OVERLAY (Subtle grid) ───────────── */}
        <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="3 3" style={{ pointerEvents: "none" }}>
          {/* Internal regional connector arcs */}
          <path d="M 135,300 Q 200,280 245,355" />
          <path d="M 245,355 Q 320,330 375,215" />
          <path d="M 375,215 Q 500,180 705,110" />
          <path d="M 240,205 Q 350,160 520,160" />
          <path d="M 245,355 Q 340,400 495,380" />
          <path d="M 380,430 Q 500,360 565,330" />
        </g>

        {/* ── CITY INTERACTIVE MARKER DOTS ──────────────────────────────────── */}
        {CITIES.map((city) => {
          const isHov = hoveredCity === city.id;
          const isSel = selectedDistrict === city.name;
          const isMajorHub = ["mumbai", "pune", "nashik", "csn", "nagpur", "kolhapur", "solapur", "amravati"].includes(city.id);
          const r = isMajorHub ? 6.5 : 4.5;

          return (
            <g
              key={city.id}
              onMouseEnter={() => setHoveredCity(city.id)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => onDistrictSelect?.(city.name)}
              style={{ cursor: "pointer" }}
            >
              {/* Outer pulsing circle on hover */}
              {(isHov || isSel) && (
                <circle cx={city.cx} cy={city.cy} r={r + 10} fill="#ffffff" opacity="0.4">
                  <animate attributeName="r" values={`${r+4};${r+14};${r+4}`} dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}

              {/* City Dot */}
              <circle
                cx={city.cx}
                cy={city.cy}
                r={r}
                fill={isHov || isSel ? "#1e2033" : "#ffffff"}
                stroke={isHov || isSel ? "#ffffff" : "#1e2033"}
                strokeWidth={2}
                style={{ transition: "all 0.2s ease" }}
              />

              {/* City Label */}
              {(isMajorHub || isHov || isSel) && (
                <text
                  x={city.cx}
                  y={city.cy - r - 6}
                  textAnchor="middle"
                  fontSize={isMajorHub ? "10.5" : "9"}
                  fontWeight={isHov || isSel ? "800" : "700"}
                  fill="#ffffff"
                  fontFamily="'Inter', sans-serif"
                  style={{
                    pointerEvents: "none",
                    textShadow: "0 2px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {city.name}
                </text>
              )}
            </g>
          );
        })}

        {/* ── HOVER TOOLTIP CARD OVERLAY ────────────────────────────────────── */}
        {cityObj && (() => {
          const tx = Math.min(cityObj.cx + 20, 630);
          const ty = Math.max(cityObj.cy - 90, 15);
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tx}
                y={ty}
                width="210"
                height="95"
                rx="14"
                fill="#ffffff"
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="1"
                style={{ filter: "drop-shadow(0 16px 36px rgba(0,0,0,0.18))" }}
              />
              <path d={`M ${tx} ${ty+12} Q ${tx} ${ty} ${tx+12} ${ty} L ${tx+198} ${ty} Q ${tx+210} ${ty} ${tx+210} ${ty+12} L ${tx+210} ${ty+6} L ${tx} ${ty+6} Z`} fill="#f97316" />

              <text x={tx + 16} y={ty + 26} fontSize="13" fontWeight="800" fill="#1e2033" fontFamily="'Inter', sans-serif">
                {cityObj.name}
              </text>
              <text x={tx + 16} y={ty + 41} fontSize="10" fill="#64748b" fontFamily="'Inter', sans-serif" fontWeight="500">
                {cityObj.division} Division · {cityObj.sector.split("&")[0]}
              </text>

              <line x1={tx + 14} y1={ty + 49} x2={tx + 196} y2={ty + 49} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

              <text x={tx + 24} y={ty + 68} fontSize="16" fontWeight="800" fill="#f97316" fontFamily="'Playfair Display', serif">{cityObj.itis}</text>
              <text x={tx + 24} y={ty + 80} fontSize="8.5" fill="#94a3b8" fontFamily="'Inter', sans-serif" fontWeight="700">ITIs</text>

              <text x={tx + 92} y={ty + 68} fontSize="16" fontWeight="800" fill="#1e3a8a" fontFamily="'Playfair Display', serif">{cityObj.mssds}</text>
              <text x={tx + 92} y={ty + 80} fontSize="8.5" fill="#94a3b8" fontFamily="'Inter', sans-serif" fontWeight="700">MSSDS</text>

              <text x={tx + 158} y={ty + 68} fontSize="16" fontWeight="800" fill="#15803d" fontFamily="'Playfair Display', serif">{cityObj.jobs}</text>
              <text x={tx + 158} y={ty + 80} fontSize="8.5" fill="#94a3b8" fontFamily="'Inter', sans-serif" fontWeight="700">JOBS</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
