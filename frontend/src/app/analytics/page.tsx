"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
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

const PROTOCOL_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#a259d9", "#d03b3b", "#eda100"];

const TOOL_COLORS: Record<string, string> = {
  check_incident_history: "#2a78d6",
  check_active_incident_count: "#eb6834",
  check_traffic_baseline: "#1baf7a",
};

const TOOL_LABELS: Record<string, string> = {
  check_incident_history: "History",
  check_active_incident_count: "Active Count",
  check_traffic_baseline: "Baseline",
};

export default function Analytics() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Protocol breakdown
  const protocolCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    const p = i.protocol ? i.protocol.toUpperCase() : "UNKNOWN";
    protocolCounts[p] = (protocolCounts[p] || 0) + 1;
  });
  const protocolData = Object.entries(protocolCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // --- Tool usage breakdown (persentase, bukan cuma count)
  const toolCounts: Record<string, number> = {};
  incidents.forEach((i) => (i.tools_called || []).forEach((t) => (toolCounts[t] = (toolCounts[t] || 0) + 1)));
  const totalToolCalls = Object.values(toolCounts).reduce((a, b) => a + b, 0);
  const toolData = Object.entries(toolCounts).map(([key, count]) => ({
    name: TOOL_LABELS[key] || key,
    count,
    key,
    pct: totalToolCalls > 0 ? ((count / totalToolCalls) * 100).toFixed(0) : "0",
  }));

  // --- Insiden per jam (0-23), buat lihat jam-jam rawan
  const hourCounts: number[] = Array(24).fill(0);
  incidents.forEach((i) => {
    const d = new Date(i.timestamp);
    if (!isNaN(d.getTime())) hourCounts[d.getHours()] += 1;
  });
  const hourData = hourCounts.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, "0")}h`,
    count,
  }));

  // --- Rata-rata src_bytes per protokol
  const bytesSum: Record<string, number> = {};
  const bytesN: Record<string, number> = {};
  incidents.forEach((i) => {
    if (i.src_bytes == null) return;
    const p = i.protocol ? i.protocol.toUpperCase() : "UNKNOWN";
    bytesSum[p] = (bytesSum[p] || 0) + i.src_bytes;
    bytesN[p] = (bytesN[p] || 0) + 1;
  });
  const avgBytesData = Object.keys(bytesSum).map((p) => ({
    name: p,
    avg: Math.round(bytesSum[p] / bytesN[p]),
  }));

  const isEmpty = incidents.length === 0;

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="analytics" />

      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold mb-1">Analytics</h1>
        <p className="text-sm text-[#898781] mb-4">
          Analisis pola dari {incidents.length} insiden yang tercatat.
        </p>

        {loading && (
          <p className="text-xs text-[#898781]">Loading...</p>
        )}

        {!loading && isEmpty && (
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-8 text-center text-sm text-[#898781]">
            Belum ada insiden untuk dianalisis.
          </div>
        )}

        {!loading && !isEmpty && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Protocol breakdown */}
              <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
                <p className="text-xs font-medium mb-2">Insiden per Protokol</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={protocolData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {protocolData.map((entry, idx) => (
                        <Cell key={entry.name} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1 text-[10px] text-[#52514e]">
                  {protocolData.map((entry, idx) => (
                    <span key={entry.name}>
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ background: PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length] }}
                      />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>

              {/* Tool usage percentage */}
              <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
                <p className="text-xs font-medium mb-2">Distribusi Penggunaan Tool LLM</p>
                {toolData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-xs text-[#898781]">
                    Belum ada tool yang dipanggil
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={toolData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: "#898781" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#52514e" }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${value} kali (${props?.payload?.pct ?? 0}%)`,
                          "Dipanggil",
                        ]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {toolData.map((entry) => (
                          <Cell key={entry.key} fill={TOOL_COLORS[entry.key] || "#2a78d6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Incidents by hour of day */}
              <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
                <p className="text-xs font-medium mb-2">Insiden per Jam (00-23)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourData} margin={{ left: -25, top: 5 }}>
                    <CartesianGrid vertical={false} stroke="#e1e0d9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} interval={1} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#898781" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2a78d6" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Average src_bytes per protocol */}
              <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
                <p className="text-xs font-medium mb-2">Rata-rata Src Bytes per Protokol</p>
                {avgBytesData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-xs text-[#898781]">
                    Data src_bytes belum tersedia
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={avgBytesData} margin={{ left: -10, top: 5 }}>
                      <CartesianGrid vertical={false} stroke="#e1e0d9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#52514e" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#898781" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {avgBytesData.map((entry, idx) => (
                          <Cell key={entry.name} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}