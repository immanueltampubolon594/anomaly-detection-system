"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type ConsumerStat = {
  consumer: string;
  processed_count: number;
};

export default function ConsumerStatsPage() {
  const [stats, setStats] = useState<ConsumerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = () => {
      fetch("http://127.0.0.1:5000/consumer-stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const total = stats.reduce((sum, s) => sum + s.processed_count, 0);

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="ai-agents" />

      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold mb-1">Consumer Load Distribution</h1>
        <p className="text-sm text-[#898781] mb-4">
          Jumlah pesan yang sudah ditangani tiap instance Agent 2 (decision-agent) — bukti beban kerja terbagi antar consumer, bukan numpuk di satu proses.
        </p>

        <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-medium text-[#898781] tracking-wide bg-[#f5f5f3] border-b border-[#e1e0d9] divide-x divide-[#e1e0d9]">
                <th className="px-4 py-2.5">CONSUMER</th>
                <th className="px-4 py-2.5">PESAN DIPROSES</th>
                <th className="px-4 py-2.5">PORSI BEBAN</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[#898781] text-xs">Loading...</td></tr>
              )}
              {!loading && stats.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[#898781] text-xs">Belum ada data. Jalankan publisher dulu.</td></tr>
              )}
              {stats.map((s, idx) => {
                const pct = total > 0 ? (s.processed_count / total) * 100 : 0;
                return (
                  <tr key={idx} className="border-b border-[#e1e0d9] last:border-0 hover:bg-[#f9f9f7] transition divide-x divide-[#e1e0d9]">
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold whitespace-nowrap">{s.consumer}</td>
                    <td className="px-4 py-2.5 text-xs text-[#52514e] whitespace-nowrap">{s.processed_count}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#e1e0d9] rounded-full overflow-hidden max-w-[160px]">
                          <div
                            className="h-full bg-[#2a78d6] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#898781] whitespace-nowrap">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <p className="text-xs text-[#898781] mt-3">
            Total {total} pesan diproses oleh {stats.length} consumer instance.
          </p>
        )}
      </main>
    </div>
  );
}