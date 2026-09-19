"use client";

import Link from "next/link";
import {
  LayoutDashboard, AlertTriangle, FileText, Bot, BarChart2, ListOrdered, PlayCircle, ArrowLeft,
  Users, Trash2,
} from "lucide-react";

type SidebarProps = {
  active:
    | "overview"
    | "incidents"
    | "reports"
    | "ai-agents"
    | "analytics"
    | "traffic-log"
    | "live-demo"
    | "consumer-stats"
    | "dead-letter";
};

const MENU_ITEMS = [
  { key: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { key: "incidents", label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { key: "reports", label: "Reports", href: "/reports", icon: FileText },
] as const;

const MONITOR_ITEMS = [
  { key: "ai-agents", label: "AI Agents", href: "/ai-agents", icon: Bot },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: BarChart2 },
  { key: "traffic-log", label: "Traffic Log", href: "/traffic-log", icon: ListOrdered },
  { key: "consumer-stats", label: "Consumer Stats", href: "/consumer-stats", icon: Users },
  { key: "dead-letter", label: "Dead Letter Queue", href: "/dead-letter", icon: Trash2 },
  { key: "live-demo", label: "Live Demo", href: "/live-demo", icon: PlayCircle },
] as const;

export default function Sidebar({ active }: SidebarProps) {
  const renderItem = (item: { key: string; label: string; href: string; icon: typeof LayoutDashboard }) => {
    const isActive = active === item.key;
    const Icon = item.icon;
    return (
      <Link
        key={item.key}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
          isActive
            ? "bg-[#2a78d6] text-white font-medium"
            : "text-[#a8b0a8] hover:bg-[#1c241f] hover:text-white"
        }`}
      >
        <Icon size={16} strokeWidth={2} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-60 min-h-screen bg-[#10140f] flex flex-col justify-between py-6 px-4">
      <div>
        <div className="flex items-center gap-2 font-semibold px-2 mb-8 text-white">
          <span className="w-7 h-7 rounded-lg bg-[#2a78d6] text-white flex items-center justify-center text-sm">
            A
          </span>
          AnomalyGuard
        </div>

        <p className="text-[10px] text-[#6b756c] font-medium px-2 mb-2 tracking-wider">MENU</p>
        <nav className="space-y-1 mb-6">{MENU_ITEMS.map(renderItem)}</nav>

        <p className="text-[10px] text-[#6b756c] font-medium px-2 mb-2 tracking-wider">MONITOR</p>
        <nav className="space-y-1">{MONITOR_ITEMS.map(renderItem)}</nav>
      </div>

      <Link href="/" className="flex items-center gap-2 text-xs text-[#6b756c] px-2 hover:text-white transition">
        <ArrowLeft size={14} />
        Back to home
      </Link>
    </aside>
  );
}