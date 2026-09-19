"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Incident = {
  record_id: number;
  reason: string;
  protocol: string;
  src_bytes: number;
  status: string;
  timestamp: string;
  tools_called?: string[];
  processed_by?: string;
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [search, setSearch] = useState("");

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

  const resolveIncident = (recordId: number) => {
    fetch(`http://127.0.0.1:6001/incidents/${recordId}/resolve`, { method: "POST" }).then(() => {
      setIncidents((prev) =>
        prev.map((i) => (i.record_id === recordId ? { ...i, status: "RESOLVED" } : i))
      );
    });
  };

  const filtered = incidents
    .filter((i) => (statusFilter === "ALL" ? true : i.status === statusFilter))
    .filter((i) =>
      search.trim() === ""
        ? true
        : i.reason.toLowerCase().includes(search.toLowerCase()) ||
          i.protocol?.toLowerCase().includes(search.toLowerCase()) ||
          String(i.record_id).includes(search)
    )
    .slice()
    .reverse();

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="incidents" />

      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold mb-4">Incidents</h1>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan record ID, protokol, atau reason..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-[rgba(11,11,11,0.10)] bg-[#fcfcfb] outline-none focus:border-[#2a78d6]"
          />
          <div className="flex gap-1">
            {(["ALL", "OPEN", "RESOLVED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-xs px-3 py-2 rounded-lg transition ${
                  statusFilter === f
                    ? "bg-[#0b0b0b] text-white"
                    : "bg-[#f0efec] text-[#52514e] hover:bg-[#e1e0d9]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-medium text-[#898781] tracking-wide bg-[#f5f5f3] border-b border-[#e1e0d9] divide-x divide-[#e1e0d9]">
                <th className="px-4 py-2.5">ID</th>
                <th className="px-4 py-2.5">STATUS</th>
                <th className="px-4 py-2.5">PROTOCOL</th>
                <th className="px-4 py-2.5">REASON</th>
                <th className="px-4 py-2.5">TOOLS USED</th>
                <th className="px-4 py-2.5">PROCESSED BY</th>
                <th className="px-4 py-2.5">TIME</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-[#898781] text-xs">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-[#898781] text-xs">Tidak ada insiden yang cocok.</td></tr>
              )}
              {filtered.map((i, idx) => (
                <tr key={idx} className="border-b border-[#e1e0d9] last:border-0 hover:bg-[#f9f9f7] transition divide-x divide-[#e1e0d9]">
                  <td className="px-4 py-2.5 text-[#0b0b0b] text-xs whitespace-nowrap font-mono font-semibold">#{i.record_id}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52514e]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: i.status === "OPEN" ? "#eda100" : "#0ca30c" }}
                      />
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] whitespace-nowrap">
                    {i.protocol ? i.protocol.toUpperCase() : <span className="text-[#c3c2b7]">n/a</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[#52514e] text-xs max-w-md">
                    <p title={i.reason} className="truncate">
                      {i.reason}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] max-w-[160px] truncate">
                    {i.tools_called && i.tools_called.length > 0 ? i.tools_called.join(", ") : <span className="text-[#c3c2b7]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] max-w-[180px] truncate" title={i.processed_by || ""}>
                    {i.processed_by ? i.processed_by : <span className="text-[#c3c2b7]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[#898781] text-xs whitespace-nowrap">
                    {new Date(i.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {i.status === "OPEN" && (
                      <button
                        onClick={() => resolveIncident(i.record_id)}
                        className="text-[10px] bg-[#e3f7e3] text-[#006300] px-2 py-1 rounded-full hover:bg-[#c9f0c9] transition"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}