"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

type DeadLetterEntry = {
  original_message_id: string;
  payload: { record_id?: number };
  error: string;
  retry_count: number;
  failed_by_consumer: string;
  failed_at: number;
};

export default function DeadLetterPage() {
  const [entries, setEntries] = useState<DeadLetterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/dead-letter")
      .then((res) => res.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] flex">
      <Sidebar active="ai-agents" />

      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold mb-1">Dead Letter Queue</h1>
        <p className="text-sm text-[#898781] mb-4">
          Pesan yang gagal diproses berkali-kali oleh Agent 2 dan dipindahkan ke sini supaya tidak menyumbat sistem.
        </p>

        <div className="bg-[#fcfcfb] border border-[rgba(11,11,11,0.10)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-medium text-[#898781] tracking-wide bg-[#f5f5f3] border-b border-[#e1e0d9] divide-x divide-[#e1e0d9]">
                <th className="px-4 py-2.5">RECORD ID</th>
                <th className="px-4 py-2.5">RETRY COUNT</th>
                <th className="px-4 py-2.5">GAGAL DI CONSUMER</th>
                <th className="px-4 py-2.5">ERROR</th>
                <th className="px-4 py-2.5">WAKTU GAGAL</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[#898781] text-xs">Loading...</td></tr>
              )}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[#898781] text-xs">Kosong — belum ada pesan yang gagal total.</td></tr>
              )}
              {entries.map((e, idx) => (
                <tr key={idx} className="border-b border-[#e1e0d9] last:border-0 hover:bg-[#f9f9f7] transition divide-x divide-[#e1e0d9]">
                  <td className="px-4 py-2.5 text-xs font-mono font-semibold whitespace-nowrap">
                    #{e.payload?.record_id ?? "?"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] whitespace-nowrap">{e.retry_count}x</td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] whitespace-nowrap">{e.failed_by_consumer}</td>
                  <td className="px-4 py-2.5 text-xs text-[#52514e] max-w-md">
                    <p title={e.error} className="truncate">{e.error}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#898781] whitespace-nowrap">
                    {e.failed_at ? new Date(e.failed_at * 1000).toLocaleString() : "-"}
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