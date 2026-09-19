"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";

type Step = "idle" | "agent2" | "agent3" | "done";

export default function LiveDemo() {
  const [protocol, setProtocol] = useState("tcp");
const [srcBytes, setSrcBytes] = useState(0);
const [anomalyScore, setAnomalyScore] = useState(0.5);
const [step, setStep] = useState<Step>("idle");
const [result, setResult] = useState<{ action: string; reason: string } | null>(null);
const [recordId, setRecordId] = useState<number | null>(null);
const [pickedFromDataset, setPickedFromDataset] = useState(false);


const pickRealTraffic = async () => {
  const res = await fetch("http://127.0.0.1:5001/traffic");
  const data = await res.json();
  const anomalies = data.filter((d: { is_anomaly: boolean }) => d.is_anomaly);
  if (anomalies.length === 0) return;
  const pick = anomalies[Math.floor(Math.random() * anomalies.length)];
  setAnomalyScore(pick.anomaly_score);
  setRecordId(pick.record_id);
  setPickedFromDataset(true);
  setStep("idle");
  setResult(null);
};
  const runPipeline = async () => {
    setResult(null);
    setStep("agent2");

    const res = await fetch("http://127.0.0.1:5000/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_anomaly: true,
        anomaly_score: anomalyScore,
        protocol,
        src_bytes: srcBytes,
        record_id: recordId ?? Math.floor(Math.random() * 100000),
      }),
    });
    const data = await res.json();
    setResult(data);

    if (data.action === "ESCALATE") {
      setStep("agent3");
      await new Promise((r) => setTimeout(r, 1200));
    }

    setStep("done");
  };

  const nodeState = (node: "agent2" | "agent3") => {
    if (node === "agent2") {
      if (step === "agent2") return "active";
      if (step === "agent3" || step === "done") return "passed";
      return "idle";
    }
    if (node === "agent3") {
      if (step === "agent3") return "active";
      if (step === "done" && result?.action === "ESCALATE") return "passed";
      return "idle";
    }
    return "idle";
  };

  const nodeClass = (state: string) => {
    if (state === "active") return "bg-orange-500 text-white border-orange-500 animate-pulse";
    if (state === "passed") return "bg-green-50 text-green-700 border-green-200";
    return "bg-white text-neutral-400 border-neutral-200";
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-900 flex">
      <Sidebar active="overview" />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-semibold mb-2">Live Demo</h1>
        <p className="text-sm text-neutral-500 mb-8">
          Kirim data traffic manual, lihat langsung bagaimana sistem memprosesnya.
        </p>

        <div className="grid grid-cols-[320px_1fr] gap-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 h-fit">
            <p className="text-sm font-medium mb-4">Input traffic</p>

            <label className="block text-xs text-neutral-500 mb-1">Protocol</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="tcp">tcp</option>
              <option value="udp">udp</option>
              <option value="icmp">icmp</option>
            </select>

            <label className="block text-xs text-neutral-500 mb-1">Source bytes</label>
            <input
              type="number"
              value={srcBytes}
              onChange={(e) => setSrcBytes(Number(e.target.value))}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm mb-4"
            />

<button
  onClick={pickRealTraffic}
  className="w-full bg-teal-50 text-teal-700 py-2 rounded-lg text-xs font-medium hover:bg-teal-100 transition mb-4"
>
  🎲 Ambil data traffic asli (Agent 1)
</button>

<label className="block text-xs text-neutral-500 mb-1">
  Anomaly score ({anomalyScore.toFixed(2)})
</label>
            <label className="block text-xs text-neutral-500 mb-1">
              Anomaly score ({anomalyScore.toFixed(2)})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={anomalyScore}
              onChange={(e) => setAnomalyScore(Number(e.target.value))}
              className="w-full mb-6"
            />

            <button
              onClick={runPipeline}
              disabled={step === "agent2" || step === "agent3"}
              className="w-full bg-neutral-900 text-white py-2.5 rounded-full text-sm font-medium hover:bg-neutral-700 transition disabled:opacity-50"
            >
              {step === "idle" || step === "done" ? "Run through pipeline" : "Processing..."}
            </button>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-8">
            <div className="flex items-center justify-center gap-4 mb-8">
  <div
    className={`w-40 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
      pickedFromDataset ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-neutral-400 border-neutral-200"
    }`}
  >
    <span className="text-xs font-medium">Agent 1</span>
    <span className="text-xs opacity-80">Detection (ML)</span>
  </div>

  <div className="text-neutral-300 text-xl">→</div>

  <div
    className={`w-40 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${nodeClass(
      nodeState("agent2")
    )}`}
  >
                <span className="text-xs font-medium">Agent 2</span>
                <span className="text-xs opacity-80">Decision (LLM)</span>
              </div>

              <div className="text-neutral-300 text-xl">→</div>

              <div
                className={`w-40 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${nodeClass(
                  nodeState("agent3")
                )}`}
              >
                <span className="text-xs font-medium">Agent 3</span>
                <span className="text-xs opacity-80">Response</span>
              </div>
            </div>

            {step === "idle" && (
              <p className="text-center text-sm text-neutral-400">
                Isi form di kiri, klik tombol untuk mulai.
              </p>
            )}

            {result && (
              <div className="border-t border-neutral-100 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      result.action === "ESCALATE"
                        ? "bg-red-50 text-red-600"
                        : result.action === "LOG_ONLY"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {result.action}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">{result.reason}</p>

                {result.action === "ESCALATE" && step === "done" && (
                  <p className="text-xs text-green-600 mt-4">
                    ✓ Insiden tercatat ke Agent 3, cek halaman Overview.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}