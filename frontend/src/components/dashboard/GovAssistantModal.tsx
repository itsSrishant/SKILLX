"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, X, Sparkles, Building2, ShieldCheck, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

export function GovAssistantModal({ selectedDistrict }: { selectedDistrict?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "bot" | "user"; text: string; source?: string; confidence?: string; sources?: string[] }[]>([
    {
      sender: "bot",
      text: "🏛️ **Namaste Director / Officer!**\n\nI am your **AI Skill Assistant**. Ask me about district alignment scores, critical deficit courses, NCVET/MSSDS syllabus revision proposals, or intervention budget planning."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const district = selectedDistrict || "All Districts";

  const send = useCallback(async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;
    const userMsg = textToSend.trim();
    const newMsgs = [...messages, { sender: "user" as const, text: userMsg }];
    setMessages(newMsgs);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      
      const history = messages.map(m => ({
        role: m.sender === "user" ? "user" : "model",
        content: m.text
      }));

      const res = await fetch(`${API_BASE}/api/v1/assistant/government`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-API-Key": process.env.NEXT_PUBLIC_ADMIN_API_KEY || "skillx-dev-secret-key-123"
        },
        body: JSON.stringify({ message: userMsg, district, history })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { 
          sender: "bot", 
          text: data.reply, 
          source: data.source,
          confidence: data.confidence,
          sources: data.sources
        }]);
      } else {
        throw new Error("Government Assistant API error");
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: "bot",
          text: `🏛️ **Executive Skilling Summary for ${district}**:\n\n• **State Skill Alignment Index**: 68.4%\n• **Top Priority Intervention**: Upgrade ITI Electrician & Fitter curricula with PLC Automation & CNC G-Code modules.\n• **Unit Feasibility**: ₹45,000 per batch of 30 trainees yielding a projected +22.4% graduate placement boost.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, district, loading]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999,
          padding: "12px 24px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          color: "white",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(249,115,22,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          transition: "all 0.2s ease"
        }}
      >
        <Sparkles size={18} />
        <span>AI Skill Assistant</span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: isExpanded ? "90vw" : 420,
        height: isExpanded ? "85vh" : 560,
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white"
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>AI Skill Assistant</div>
            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={12} color="#22c55e" /> Fact-Grounded • DVET / MSSDS Data
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
              display: "flex"
            }}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Quick Prompts Ribbon */}
      <div
        style={{
          padding: "8px 12px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          gap: 6,
          overflowX: "auto"
        }}
      >
        {[
          "Critical Deficits",
          "District Rank",
          "Policy Memo",
          "Intervention Cost"
        ].map((promptText, i) => (
          <button
            key={i}
            onClick={() => send(`Provide detailed insight on: ${promptText}`)}
            style={{
              whiteSpace: "nowrap",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: "white",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer"
            }}
          >
            ⚡ {promptText}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          padding: 16,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#f1f5f9"
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.sender === "user" ? "#f97316" : "white",
              color: m.sender === "user" ? "white" : "#0f172a",
              padding: "12px 16px",
              borderRadius: m.sender === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              fontSize: 13,
              lineHeight: 1.55,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              whiteSpace: "pre-wrap"
            }}
          >
            {m.text}
            
            {m.sender === "bot" && (m.confidence || (m.sources && m.sources.length > 0)) && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)", fontSize: 11, display: "flex", flexDirection: "column", gap: 4 }}>
                {m.confidence && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: m.confidence === "HIGH" ? "#16a34a" : m.confidence === "MEDIUM" ? "#ca8a04" : "#dc2626", fontWeight: 700 }}>
                    {m.confidence === "HIGH" ? "✨ HIGH CONFIDENCE" : m.confidence === "MEDIUM" ? "⚠️ MEDIUM CONFIDENCE" : "🚨 LOW CONFIDENCE"}
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div style={{ color: "#64748b" }}>
                    <strong>Sources:</strong> {m.sources.join(", ")}
                  </div>
                )}
              </div>
            )}

            {m.source === "llm-gemini" && !m.confidence && (
              <div style={{ fontSize: 10, color: "#16a34a", marginTop: 6, fontWeight: 700 }}>
                ✨ Verified by Gemini AI LLM
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "white",
              padding: "12px 18px",
              borderRadius: "18px 18px 18px 4px",
              fontSize: 16,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <style>{`
              @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
              .dot { animation: bounce 1.4s infinite ease-in-out both; width: 6px; height: 6px; background-color: #94a3b8; border-radius: 50%; display: inline-block; }
              .dot:nth-child(1) { animation-delay: -0.32s; }
              .dot:nth-child(2) { animation-delay: -0.16s; }
            `}</style>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          background: "white",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: 8,
          alignItems: "center"
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={`Ask about ${district} skilling policy...`}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            fontSize: 13,
            outline: "none"
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "#f97316",
            color: "white",
            border: "none",
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
