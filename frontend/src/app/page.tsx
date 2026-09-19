import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fafaf9] text-neutral-900">
           <nav className="relative z-20 flex items-center justify-between px-8 md:px-16 py-6 bg-[#fafaf9]">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-sm">
            A
          </span>
          AnomalyGuard
        </div>
              <div className="hidden md:flex gap-10 text-sm text-neutral-500 font-medium">
          <a href="/dashboard" className="hover:text-neutral-900 transition">Detection</a>
          <a href="/ai-agents" className="hover:text-neutral-900 transition">Agent</a>
          <a href="/reports" className="hover:text-neutral-900 transition">Reports</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="bg-neutral-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-700 transition">
            Open Dashboard
          </a>
        </div>
      </nav>
<section className="grid md:grid-cols-[420px_1fr_260px] gap-0 px-6 md:px-10 pt-6 pb-24 max-w-[1400px] mx-auto items-center">
  <div className="pl-8">
    <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 tracking-wide">
      AI MULTI-AGENT
    </span>
    <h1 className="text-4xl font-bold leading-[1.15] mb-5 tracking-tight">
      AI Agent That Detects Network Anomalies
    </h1>
    <p className="text-neutral-500 mb-8 leading-relaxed text-sm">
      Autonomous multi-agent system that detects, analyzes, and responds to network threats automatically, 24/7.
    </p>
          <a href="/dashboard" className="inline-flex items-center gap-2 bg-orange-500 text-white px-7 py-3.5 rounded-full font-medium hover:bg-orange-600 transition shadow-lg shadow-orange-200">
            Open Dashboard
          </a>

          <div className="flex items-center gap-3 mt-10">
            <div className="flex -space-x-3">
              <span className="w-9 h-9 rounded-full bg-neutral-300 border-2 border-white" />
              <span className="w-9 h-9 rounded-full bg-neutral-400 border-2 border-white" />
              <span className="w-9 h-9 rounded-full bg-neutral-500 border-2 border-white" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-orange-500">★★★★★ <span className="text-neutral-500 font-normal">4.9</span></p>
              <p className="text-neutral-400 text-xs">Trusted by 10,000+ security teams</p>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center -ml-10">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-orange-50/40 to-transparent rounded-[3rem] -z-10" />
             <Image
  src="/hero.png"
  alt="AI Security Agent"
  width={1100}
  height={1400}
  className="object-contain w-full h-auto scale-125 pointer-events-none"
  priority
/>
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-900 text-white rounded-2xl p-5 flex items-center gap-4">
            <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              &#9679;
            </span>
            <div>
              <p className="text-xs text-neutral-400">Agent Active</p>
              <p className="font-medium text-sm">Real-time detection</p>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-2xl p-5 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <span className="text-neutral-700">Agent 1 — ML Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
              <span className="text-neutral-400">Agent 2 — LLM Decision</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
              <span className="text-neutral-400">Agent 3 — Incident Response</span>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-2xl p-5">
            <p className="text-sm text-neutral-400 mb-1">Detection Accuracy</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">85%</span>
              <span className="text-xs text-orange-500 font-medium">Ensemble model</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-16 pb-20 max-w-7xl mx-auto">
        <p className="text-center text-xs text-neutral-400 tracking-widest mb-6">
          BUILT WITH
        </p>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-neutral-400 font-medium text-sm">
          <span>Python</span>
          <span>scikit-learn</span>
          <span>Flask</span>
          <span>Groq LLM</span>
          <span>Next.js</span>
          <span>Tailwind CSS</span>
        </div>
      </section>
    </main>
  );
}