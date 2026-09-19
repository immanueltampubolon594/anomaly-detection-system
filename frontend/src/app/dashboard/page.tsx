"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

type Incident = {
  record_id: number;
  reason: string;
  protocol: string;
  src_bytes: number;
  status: string;
  timestamp: string;
  tools_called?: string[];
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#fab219",
  RESOLVED: "#0ca30c",
};

const TOOL_COLORS: Record<string, string> = {
  check_incident_history: "#2a78d6",
  check_active_incident_count: "#eb6834",
  check_traffic_baseline: "#1baf7a",
};

const TOOL_LABELS: Record<string, string> = {
  check_incident_history: "History",
  check_active_incident_count: "Active",
  check_traffic_baseline: "Baseline",
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [avgResponseTime, setAvgResponseTime] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    const fetchIncidents = () => {
      fetch("http://127.0.0.1:6001/incidents")
        .then((res) => res.json())
        .then((data) => {
          setIncidents(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    const fetchStats = () => {
      fetch("http://127.0.0.1:5000/stats")
        .then((res) => res.json())
        .then((data) => setAvgResponseTime(data.avg_response_time))
        .catch(() => {});
    };
    const fetchAccuracy = () => {
      fetch("http://127.0.0.1:5001/model-stats")
        .then((res) => res.json())
        .then((data) => {
          const raw = data.accuracy;
          if (typeof raw === "number") setAccuracy(raw <= 1 ? raw * 100 : raw);
        })
        .catch(() => {});
    };

    fetchIncidents();
    fetchStats();
    fetchAccuracy();
    const interval = setInterval(() => {
      fetchIncidents();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const resolveIncident = (recordId: number) => {
    fetch(`http://127.0.0.1:6001/incidents/${recordId}/resolve`, { method: "POST" }).then(() => {
      setIncidents((prev) =>
        prev.map((i) => (i.record_id === recordId ? { ...i, status: "RESOLVED" } : i))
      );
    });
  };

  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;
  const filteredIncidents = incidents.filter((i) => (filter === "ALL" ? true : i.status === filter));

  const statusData = [
    { name: "Open", value: openCount, key: "OPEN" },
    { name: "Resolved", value: resolvedCount, key: "RESOLVED" },
  ].filter((d) => d.value > 0);

  const toolCounts: Record<string, number> = {};
  incidents.forEach((i) => (i.tools_called || []).forEach((t) => (toolCounts[t] = (toolCounts[t] || 0) + 1)));
  const toolData = Object.entries(toolCounts).map(([key, count]) => ({
    name: TOOL_LABELS[key] || key,
    count,
    key,
  }));

    const trendBucketMap: Record<string, { time: string; ts: number; count: number }> = {};
  incidents
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .forEach((i) => {
      const d = new Date(i.timestamp);
      if (isNaN(d.getTime())) return; // skip timestamp yang rusak/gak valid
      const label = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
      if (!trendBucketMap[key]) {
        trendBucketMap[key] = { time: label, ts: d.getTime(), count: 0 };
      }
      trendBucketMap[key].count += 1;
    });
  const trendData = Object.values(trendBucketMap)
    .sort((a, b) => a.ts - b.ts)
    .map((b) => ({ time: b.time, count: b.count }));

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="overview" />

      <main className="flex-1 p-6 overflow-hidden">
        <h1 className="text-xl font-semibold mb-4">Overview</h1>

        {/* Row 1: three compact chart cards */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-xs font-medium mb-2">Incident Status</p>
            {statusData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-[#898781]">
                Belum ada insiden
              </div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={3}>
                      {statusData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -8 }}>
                  <p className="text-xl font-semibold">{incidents.length}</p>
                  <p className="text-[10px] text-[#898781]">Total</p>
                </div>
                <div className="flex gap-3 justify-center mt-1 text-[10px] text-[#52514e]">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: STATUS_COLORS.OPEN }} />Open {openCount}</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: STATUS_COLORS.RESOLVED }} />Resolved {resolvedCount}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">Incidents Trend</p>
              <p className="text-lg font-semibold">{incidents.length}</p>
            </div>
            {trendData.length < 2 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-[#898781] text-center px-2">
                Butuh min. 2 insiden beda waktu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2a78d6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#898781" }} axisLine={false} tickLine={false} width={20} />
                                   <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2a78d6"
                    strokeWidth={2}
                    fill="url(#trendFill)"
                    dot={{ r: 3, fill: "#2a78d6", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-xs font-medium mb-2">AI Tool Usage</p>
            {toolData.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-xs text-[#898781]">
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={toolData} margin={{ left: -25, top: 5 }}>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#52514e" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#898781" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {toolData.map((entry) => (
                      <Cell key={entry.key} fill={TOOL_COLORS[entry.key] || "#2a78d6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 2: small stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#898781] tracking-wide">OPEN INCIDENTS</p>
              <p className="text-2xl font-semibold" style={{ color: STATUS_COLORS.OPEN }}>{openCount}</p>
            </div>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#898781] tracking-wide">DETECTION ACCURACY</p>
              <p className="text-2xl font-semibold">{accuracy !== null ? `${accuracy.toFixed(0)}%` : "—"}</p>
            </div>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#898781] tracking-wide">AVG RESPONSE TIME</p>
              <p className="text-2xl font-semibold">{avgResponseTime > 0 ? `${avgResponseTime}s` : "—"}</p>
            </div>
          </div>
        </div>

        {/* Row 3: list + agent status */}
        <div className="grid grid-cols-[1.6fr_1fr] gap-3">
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">Escalated Incidents</p>
              <div className="flex gap-1">
                {(["ALL", "OPEN", "RESOLVED"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition ${
                      filter === f ? "bg-[#0b0b0b] text-white" : "bg-[#f0efec] text-[#52514e] hover:bg-[#e1e0d9]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {loading && <p className="text-[#898781] text-xs">Loading...</p>}
              {!loading && filteredIncidents.length === 0 && (
                <p className="text-[#898781] text-xs">No incidents found.</p>
              )}
              {filteredIncidents.map((incident, idx) => (
                <div key={idx} className="flex items-start justify-between border-b border-[#e1e0d9] pb-2 last:border-0">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#52514e]">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: incident.status === "OPEN" ? "#eda100" : "#0ca30c" }}
                        />
                        {incident.status}
                      </span>
                      <span className="text-[10px] text-[#898781]">#{incident.record_id}</span>
                    </div>
                    <p className="text-xs text-[#52514e] max-w-md">{incident.reason}</p>
                    {incident.tools_called && incident.tools_called.length > 0 && (
                      <p className="text-[10px] text-[#2a78d6]">
                        🔧 {incident.tools_called.map((t) => TOOL_LABELS[t] || t).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3">
                    <span className="text-[10px] text-[#898781] whitespace-nowrap">
                      {new Date(incident.timestamp).toLocaleTimeString()}
                    </span>
                    {incident.status === "OPEN" && (
                      <button
                        onClick={() => resolveIncident(incident.record_id)}
                        className="text-[10px] bg-[#e3f7e3] text-[#006300] px-1.5 py-0.5 rounded-full hover:bg-[#c9f0c9] transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-xs font-medium mb-3">Agent Status</p>
            <div className="space-y-3">
              {["Agent 1 — Detection", "Agent 2 — Decision", "Agent 3 — Response"].map((name) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ca30c]" />
                    <span className="text-xs">{name}</span>
                  </div>
                  <span className="text-[10px] text-[#898781]">Active</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#e1e0d9]">
              <p className="text-[10px] text-[#898781] mb-0.5">Ensemble Model</p>
              <p className="text-xs">Isolation Forest + Random Forest</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}