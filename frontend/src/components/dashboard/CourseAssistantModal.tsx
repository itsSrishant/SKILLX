"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Send, Bot, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

export function CourseAssistantModal({ 
  courseTitle, 
  district, 
  onClose 
}: { 
  courseTitle: string; 
  district: string; 
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Generate deterministic Indian name based on course title
  const names = ["Vikram", "Priya", "Anand", "Neha", "Rohan", "Sneha", "Karan", "Kavya", "Arjun", "Aditi", "Rahul", "Pooja", "Sanjay", "Anjali"];
  const nameIndex = courseTitle.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % names.length;
  const assistantName = names[nameIndex];
  
  // Deterministic Avatar URL using DiceBear (adventurer or avataaars style)
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${assistantName}${nameIndex}&backgroundColor=c0aede,b6e3f4,ffdfbf`;

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: `Hi there! 👋 I am **${assistantName}**, your specialized AI guide for **${courseTitle}** in **${district}**.\n\nI can help you understand the syllabus, explain complex topics, or tell you what local employers are looking for. What would you like to know?`
      }
    ]);
  }, [courseTitle, district, assistantName]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMsg }
    ]);

    const loadingId = Date.now().toString() + "_loading";
    setMessages(prev => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", loading: true }
    ]);
    setIsTyping(true);

    try {
      const history = messages.filter(m => !m.loading).map(m => ({
        role: m.role,
        content: m.content
      }));

      const API = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API}/api/v1/assistant/course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, course_title: courseTitle, district: district, history })
      });

      const data = await res.json();
      
      setMessages(prev => prev.map(m => 
        m.id === loadingId ? { ...m, content: data.reply || "Sorry, I couldn't process that.", loading: false } : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m => 
        m.id === loadingId ? { ...m, content: "Network error. Please try again later.", loading: false } : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: isExpanded ? "70vw" : 400,
      background: "#ffffff",
      boxShadow: "-10px 0 40px rgba(0,0,0,0.1)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      animation: "slideIn 0.3s ease-out forwards"
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .md-content p { margin-bottom: 0.75rem; line-height: 1.5; }
        .md-content ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .md-content li { margin-bottom: 0.25rem; }
        .md-content strong { color: #0f172a; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "20px 24px",
        background: "linear-gradient(135deg, #0284c7 0%, #0891b2 100%)",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <img src={avatarUrl} alt={assistantName} style={{ width: 36, height: 36, borderRadius: "50%", background: "white", padding: 2 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} color="#cffafe" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#cffafe", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {assistantName} • Course Expert
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>{courseTitle}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s"
          }}>
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s"
          }} onMouseEnter={(e) => e.currentTarget.style.background="rgba(255,255,255,0.3)"} onMouseLeave={(e) => e.currentTarget.style.background="rgba(255,255,255,0.2)"}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", gap: 12, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <img src={avatarUrl} alt={assistantName} style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#ecfeff", border: "1px solid #cffafe" }} />
              </div>
            )}

            <div style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: 16,
              borderTopLeftRadius: msg.role === "assistant" ? 4 : 16,
              borderTopRightRadius: msg.role === "user" ? 4 : 16,
              background: msg.role === "user" ? "#0891b2" : "white",
              color: msg.role === "user" ? "white" : "#334155",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              fontSize: 14
            }}>
              {msg.loading ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
                  <style>{`
                    @keyframes dotBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                    .mdot { animation: dotBounce 1.4s infinite ease-in-out both; width: 6px; height: 6px; background-color: #94a3b8; border-radius: 50%; display: inline-block; }
                    .mdot:nth-child(1) { animation-delay: -0.32s; }
                    .mdot:nth-child(2) { animation-delay: -0.16s; }
                  `}</style>
                  <span className="mdot" />
                  <span className="mdot" />
                  <span className="mdot" />
                </div>
              ) : (
                <div className="md-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: 16, background: "white", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 12, background: "#f1f5f9", borderRadius: 999, padding: "6px 6px 6px 16px" }}>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about this course..."
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: "#0f172a"
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            style={{
              background: input.trim() && !isTyping ? "#0891b2" : "#94a3b8",
              border: "none", width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
              color: "white", transition: "all 0.2s"
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
