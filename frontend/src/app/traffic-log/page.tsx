"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

type TrafficRecord = {
  record_id: number;
  is_anomaly: boolean;
  anomaly_score: number;
  protocol?: string | null;
  src_bytes?: number | null;
};

export default function TrafficLog() {
  const [traffic, setTraffic] = useState<TrafficRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ANOMALY" | "NORMAL">("ALL");
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<number>>(new Set());
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchTraffic = () => {
      fetch("http://127.0.0.1:5001/traffic")
        .then((res) => res.json())
        .then((data: TrafficRecord[]) => {
          const currentIds = new Set(data.map((t) => t.record_id));
          const fresh = new Set(
            [...currentIds].filter((id) => !prevIdsRef.current.has(id))
          );
          prevIdsRef.current = currentIds;
          setNewIds(fresh);
          setTraffic(data);
          setLoading(false);
          setLastUpdated(new Date());
        })
        .catch(() => setLoading(false));
    };

    fetchTraffic();
    if (!isLive) return;
    const interval = setInterval(fetchTraffic, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const filtered = traffic
    .filter((t) => {
      if (filter === "ANOMALY") return t.is_anomaly;
      if (filter === "NORMAL") return !t.is_anomaly;
      return true;
    })
    .slice()
    .reverse();

  const anomalyCount = traffic.filter((t) => t.is_anomaly).length;
  const anomalyRate = traffic.length > 0 ? (anomalyCount / traffic.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="traffic-log" />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold">Traffic Log</h1>
          <button
            onClick={() => setIsLive((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${
              isLive
                ? "bg-[#e3f7e3] text-[#006300] hover:bg-[#c9f0c9]"
                : "bg-[#f0efec] text-[#52514e] hover:bg-[#e1e0d9]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-[#0ca30c] animate-pulse" : "bg-[#898781]"}`}
            />
            {isLive ? "Live" : "Paused"}
          </button>
        </div>
        <p className="text-sm text-[#898781] mb-4">
          Hasil deteksi real-time dari Agent 1 (Detection).
          {lastUpdated && (
            <span className="ml-2 text-[#c3c2b7]">
              Update terakhir: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </p>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl px-4 py-3">
            <p className="text-[10px] font-medium text-[#898781] tracking-wide mb-1">TOTAL RECORDS</p>
            <p className="text-lg font-semibold">{traffic.length}</p>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl px-4 py-3">
            <p className="text-[10px] font-medium text-[#898781] tracking-wide mb-1">ANOMALIES</p>
            <p className="text-lg font-semibold text-[#d03b3b]">{anomalyCount}</p>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl px-4 py-3">
            <p className="text-[10px] font-medium text-[#898781] tracking-wide mb-1">ANOMALY RATE</p>
            <p className="text-lg font-semibold">{anomalyRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex gap-1 mb-3">
          {(["ALL", "ANOMALY", "NORMAL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-2 rounded-lg transition ${
                filter === f
                  ? "bg-[#0b0b0b] text-white"
                  : "bg-[#f0efec] text-[#52514e] hover:bg-[#e1e0d9]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-medium text-[#898781] tracking-wide bg-[#f5f5f3] border-b border-[#e1e0d9] divide-x divide-[#e1e0d9]">
                <th className="px-4 py-2.5">RECORD ID</th>
                <th className="px-4 py-2.5">STATUS</th>
                <th className="px-4 py-2.5">PROTOCOL</th>
                <th className="px-4 py-2.5">SRC BYTES</th>
                <th className="px-4 py-2.5">ANOMALY SCORE</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#898781] text-xs">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#898781] text-xs">
                    Belum ada data. Jalankan detection_agent.py dulu.
                  </td>
                </tr>
              )}
              {filtered.map((t, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-[#e1e0d9] last:border-0 hover:bg-[#f9f9f7] transition divide-x divide-[#e1e0d9] ${
                    newIds.has(t.record_id) ? "bg-[#fff8e1]" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs font-mono font-semibold whitespace-nowrap">
                    #{t.record_id}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52514e]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: t.is_anomaly ? "#d03b3b" : "#0ca30c" }}
                      />
                      {t.is_anomaly ? "Anomaly" : "Normal"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] whitespace-nowrap">
                    {t.protocol ? t.protocol.toUpperCase() : <span className="text-[#c3c2b7]">n/a</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] tabular-nums whitespace-nowrap">
                    {t.src_bytes != null ? t.src_bytes : <span className="text-[#c3c2b7]">n/a</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] tabular-nums whitespace-nowrap">
                    {(t.anomaly_score * 100).toFixed(1)}%
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