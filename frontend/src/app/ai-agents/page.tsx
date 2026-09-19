"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type ConsumerStat = {
  consumer: string;
  processed_count: number;
};

export default function AIAgents() {
  const agents = [
    {
      name: "Agent 1 — Detection",
      desc: "Ensemble model (Isolation Forest + Random Forest) yang mendeteksi anomali dari traffic jaringan.",
      metrics: [
        { label: "Accuracy", value: "85%" },
        { label: "Recall (anomaly)", value: "90%" },
        { label: "Model", value: "Ensemble" },
      ],
    },
    {
      name: "Agent 2 — Decision",
      desc: "LLM reasoning (Groq gpt-oss-20b) dengan guardrail, memutuskan tindakan dari hasil deteksi. Bisa jalan multi-instance dengan load balancing & fault tolerance lewat Redis Streams consumer group.",
      metrics: [
        { label: "Model", value: "gpt-oss-20b" },
        { label: "Avg latency", value: "~2.4s" },
        { label: "Guardrail", value: "Active" },
      ],
    },
    {
      name: "Agent 3 — Response",
      desc: "Mencatat insiden yang di-escalate dari Agent 2 ke incident log.",
      metrics: [
        { label: "Storage", value: "JSON log" },
        { label: "Endpoint", value: "/escalate" },
        { label: "Status", value: "Active" },
      ],
    },
  ];

  const [stats, setStats] = useState<ConsumerStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = () => {
      fetch("http://127.0.0.1:5000/consumer-stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(Array.isArray(data) ? data : []);
          setLoadingStats(false);
        })
        .catch(() => setLoadingStats(false));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const total = stats.reduce((sum, s) => sum + s.processed_count, 0);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-900 flex">
      <Sidebar active="ai-agents" />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-semibold mb-6">AI Agents</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {agents.map((agent, idx) => (
            <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm font-medium">{agent.name}</p>
              </div>
              <p className="text-xs text-neutral-500 mb-5 leading-relaxed">{agent.desc}</p>
              <div className="space-y-2">
                {agent.metrics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{m.label}</span>
                    <span className="font-medium">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold">Load Distribution — Agent 2</h2>
            {total > 0 && (
              <span className="text-xs text-neutral-400">
                {total} pesan diproses oleh {stats.length} instance
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mb-5">
            Bukti live horizontal scaling: setiap instance Agent 2 yang berjalan (consumer group Redis Streams) otomatis kebagi beban pesan tanpa konfigurasi manual.
          </p>

          {loadingStats && (
            <p className="text-xs text-neutral-400">Loading...</p>
          )}
          {!loadingStats && stats.length === 0 && (
            <p className="text-xs text-neutral-400">
              Belum ada data. Jalankan stream_publisher.py buat lihat pembagian beban antar instance.
            </p>
          )}

          <div className="space-y-3">
            {stats.map((s, idx) => {
              const pct = total > 0 ? (s.processed_count / total) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-medium">{s.consumer}</span>
                    <span className="text-neutral-500">{s.processed_count} pesan ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}