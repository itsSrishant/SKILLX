"use client";
import React, { useState, useEffect, useRef } from "react";
import { Bell, Zap, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight, Briefcase } from "lucide-react";

export type NotificationItem = {
  id: string;
  type: "alert" | "success" | "info" | "recommendation";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function NotificationCenter({ items, onMarkAllRead, align = "right" }: { items: NotificationItem[], onMarkAllRead?: () => void, align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "recommendations">("notifications");
  const ref = useRef<HTMLDivElement>(null);

  const notifications = items.filter(i => i.type !== "recommendation");
  const recommendations = items.filter(i => i.type === "recommendation");
  
  const unreadCount = items.filter(i => !i.isRead).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "alert": return <AlertTriangle size={16} color="#ef4444" />;
      case "success": return <CheckCircle2 size={16} color="#22c55e" />;
      case "recommendation": return <Lightbulb size={16} color="#f59e0b" />;
      case "info": default: return <Briefcase size={16} color="#3b82f6" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case "alert": return "#fef2f2";
      case "success": return "#f0fdf4";
      case "recommendation": return "#fffbeb";
      case "info": default: return "#eff6ff";
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button 
        onClick={() => {
          setOpen(!open);
          if (!open && onMarkAllRead) onMarkAllRead();
        }}
        style={{
          position: "relative",
          background: open ? "#f1f5f9" : "transparent",
          border: "none",
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
        onMouseLeave={(e) => { if(!open) e.currentTarget.style.background = "transparent"; }}
      >
        <Bell size={22} color="#334155" />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 12,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#ef4444",
            border: "2px solid white",
            animation: "pulse 2s infinite"
          }} />
        )}
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          ...(align === "right" ? { right: 0 } : { left: 0 }),
          marginTop: 8,
          width: 360,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
          zIndex: 1000,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Activity Hub</div>
            <button onClick={onMarkAllRead} style={{ background: "none", border: "none", color: "#0891b2", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Mark all as read</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <button 
              onClick={() => setActiveTab("notifications")}
              style={{
                flex: 1, padding: "12px", border: "none", background: "none",
                fontSize: 13, fontWeight: activeTab === "notifications" ? 700 : 500,
                color: activeTab === "notifications" ? "#0891b2" : "#64748b",
                borderBottom: activeTab === "notifications" ? "2px solid #0891b2" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              Notifications <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 999, fontSize: 10, color: "#475569" }}>{notifications.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("recommendations")}
              style={{
                flex: 1, padding: "12px", border: "none", background: "none",
                fontSize: 13, fontWeight: activeTab === "recommendations" ? 700 : 500,
                color: activeTab === "recommendations" ? "#0891b2" : "#64748b",
                borderBottom: activeTab === "recommendations" ? "2px solid #0891b2" : "2px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              Recommendations <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 999, fontSize: 10, color: "#475569" }}>{recommendations.length}</span>
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto", padding: 12 }}>
            {activeTab === "notifications" && notifications.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No new notifications</div>
            )}
            {activeTab === "recommendations" && recommendations.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No recommendations right now</div>
            )}

            {(activeTab === "notifications" ? notifications : recommendations).map((item, idx) => (
              <div key={item.id} style={{
                padding: 16,
                borderRadius: 12,
                background: item.isRead ? "transparent" : "#f8fafc",
                display: "flex",
                gap: 14,
                marginBottom: 8,
                transition: "all 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = item.isRead ? "transparent" : "#f8fafc"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: getBg(item.type),
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {getIcon(item.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: 8 }}>{item.time}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: item.actionLabel ? 10 : 0 }}>
                    {item.message}
                  </div>
                  {item.actionLabel && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (item.onAction) item.onAction(); }}
                      style={{
                        background: "none", border: "none", padding: 0,
                        color: "#0891b2", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center"
                      }}
                    >
                      {item.actionLabel} <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Zap size={12} color="#0891b2" /> AI-Powered Personalized Feed
            </span>
          </div>
        </div>
      )}

      {/* Adding a global pulse animation for the red dot */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
