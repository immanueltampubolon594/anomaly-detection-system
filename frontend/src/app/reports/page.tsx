"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type Incident = {
  record_id: number;
  reason: string;
  protocol: string;
  status: string;
  timestamp: string;
  tools_called?: string[];
};

export default function ReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [modelStats, setModelStats] = useState<any>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:6001/incidents")
      .then((res) => res.json())
      .then(setIncidents)
      .catch(() => {});
    fetch("http://127.0.0.1:5001/model-stats")
      .then((res) => res.json())
      .then(setModelStats)
      .catch(() => {});
  }, []);

  const resolved = incidents.filter((i) => i.status === "RESOLVED").length;
  const resolutionRate = incidents.length > 0 ? Math.round((resolved / incidents.length) * 100) : 0;

  const downloadCSV = () => {
    const header = "record_id,status,protocol,timestamp,reason,tools_called\n";
    const rows = incidents
      .map((i) =>
        [
          i.record_id,
          i.status,
          i.protocol,
          i.timestamp,
          `"${i.reason.replace(/"/g, '""')}"`,
          `"${(i.tools_called || []).join("; ")}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="reports" />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Reports</h1>
          <button
            onClick={downloadCSV}
            className="text-xs bg-[#0b0b0b] text-white px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition"
          >
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-[10px] text-[#898781] tracking-wide">TOTAL INCIDENTS</p>
            <p className="text-2xl font-semibold">{incidents.length}</p>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-[10px] text-[#898781] tracking-wide">RESOLUTION RATE</p>
            <p className="text-2xl font-semibold">{resolutionRate}%</p>
          </div>
          <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-4">
            <p className="text-[10px] text-[#898781] tracking-wide">DETECTION ACCURACY</p>
            <p className="text-2xl font-semibold">
              {modelStats?.accuracy != null
                ? `${(modelStats.accuracy <= 1 ? modelStats.accuracy * 100 : modelStats.accuracy).toFixed(0)}%`
                : "—"}
            </p>
          </div>
        </div>

        <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl p-5">
          <p className="text-sm font-medium mb-2">Model Evaluation</p>
          <p className="text-xs text-[#898781] mb-4">
            Hasil evaluasi Random Forest, Isolation Forest, dan Ensemble pada test set NSL-KDD.
          </p>
          <pre className="text-xs bg-[#f5f5f3] rounded-lg p-3 overflow-x-auto text-[#52514e]">
            {modelStats ? JSON.stringify(modelStats, null, 2) : "Memuat data model-stats..."}
          </pre>
        </div>
      </main>
    </div>
  );
}