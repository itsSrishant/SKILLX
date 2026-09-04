"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const C = {
  orange:      "#f97316",
  orangeLight: "#fff7ed",
  sky:         "#0284c7",
  green:       "#16a34a",
  purple:      "#7c3aed",
  bg:          "#fafcfd",
  card:        "#ffffff",
  border:      "rgba(0,0,0,0.06)",
  text:        "#0f172a",
  textSub:     "#475569",
  textMuted:   "#94a3b8",
};

export default function EnrollPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id ? String(params.id) : "";
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const numId = Number(courseId) || 0;
  const rating = 4.0 + (numId % 10) / 10 || 4.5;
  const reviews = 50 + (numId * 13) % 400 || 120;
  
  const [courseData, setCourseData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "");
    fetch(`${API}/api/v1/recommendations/bridge-pack/${courseId}`)
      .then(r => r.json())
      .then(d => {
        setCourseData(d);
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [courseId]);

  const isITI = courseData?.institute_type === "ITI";
  const price = isITI ? "₹0 (Govt Subsidized)" : courseData ? `₹${1500 + (numId * 100) % 3000}` : "Loading...";
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };
  
  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "white", padding: 60, borderRadius: 24, textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.05)", maxWidth: 500, width: "100%", border: `1px solid ${C.border}` }}>
          <div style={{ width: 80, height: 80, background: C.green, color: "white", borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 24px" }}>
            ✓
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 12, fontFamily: "'Playfair Display', serif" }}>Enrollment Confirmed!</h1>
          <p style={{ fontSize: 15, color: C.textSub, marginBottom: 32, lineHeight: 1.6 }}>
            You have successfully registered for Course #{courseId}. Your confirmation and next steps have been sent to your email.
          </p>
          <button onClick={() => router.push("/student")} style={{
            padding: "14px 28px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
            color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(249,115,22,0.3)"
          }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "inline-block", marginBottom: 24, padding: 0 }}>
          ← Go Back
        </button>
        
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          
          {/* Left: Course Summary Card */}
          <div style={{ flex: "1 1 300px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: 32, borderRadius: 24, color: "white", boxShadow: "0 20px 40px rgba(15,23,42,0.15)" }}>
            <div style={{ display: "inline-block", padding: "4px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
              Course #{courseId}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 16, lineHeight: 1.3 }}>
              Professional Skill Certification
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
              <span style={{ color: "#fbbf24", fontSize: 16 }}>★</span>
              <span style={{ fontWeight: 800 }}>{rating.toFixed(1)}</span>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>({reviews} reviews)</span>
            </div>
            
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Fee</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{price}</div>
            </div>
            
            <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
              <strong style={{ color: "white" }}>What's included:</strong><br/>
              ✓ 100% Placement Assistance<br/>
              ✓ Official DVET Certification<br/>
              ✓ Hands-on Industry Training
            </div>
          </div>
          
          {/* Right: Registration Form */}
          <div style={{ flex: "2 1 400px", background: "white", padding: 40, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>Secure Your Spot</h1>
            <p style={{ fontSize: 14, color: C.textSub, marginBottom: 32 }}>Fill out your details below to officially register for this course.</p>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.textSub, marginBottom: 6, textTransform: "uppercase" }}>Full Name</label>
                <input required type="text" placeholder="Rahul Sharma" style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              </div>
              
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.textSub, marginBottom: 6, textTransform: "uppercase" }}>Email Address</label>
                  <input required type="email" placeholder="rahul@example.com" style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.textSub, marginBottom: 6, textTransform: "uppercase" }}>Phone Number</label>
                  <input required type="tel" placeholder="+91 98765 43210" style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.textSub, marginBottom: 6, textTransform: "uppercase" }}>Highest Qualification</label>
                <select required style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 15, outline: "none", boxSizing: "border-box" }}>
                  <option value="">Select Qualification...</option>
                  <option value="10th">10th Pass</option>
                  <option value="12th">12th Pass</option>
                  <option value="iti">ITI Certificate</option>
                  <option value="diploma">Diploma</option>
                  <option value="degree">Degree</option>
                </select>
              </div>
              
              <button disabled={loading} type="submit" style={{
                marginTop: 12, padding: "16px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.orange}, #ea580c)`,
                color: "white", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 6px 20px rgba(249,115,22,0.3)", transition: "all 0.2s",
                opacity: loading ? 0.7 : 1
              }}>
                {loading ? "Processing..." : "Confirm & Register"}
              </button>
              
              <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
                By clicking confirm, you agree to the Maharashtra State Board terms and conditions.
              </p>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
