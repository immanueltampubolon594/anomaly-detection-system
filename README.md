# AnomalyGuard — Multi-Agent Network Anomaly Detection System

A multi-agent system for detecting and responding to anomalous network traffic. Three cooperating agents — Detection, Decision, and Response — communicate through Redis Streams, with an LLM-powered decision layer (Groq, tool-calling) and a real-time Next.js dashboard for monitoring.

## Architecture

```
┌──────────────────┐      Redis Stream       ┌──────────────────┐      Redis Stream       ┌──────────────────┐
│   Agent 1         │  stream:anomali        │   Agent 2         │  stream:decisions       │   Agent 3         │
│   Detection        │ ─────────────────────▶ │   Decision         │ ─────────────────────▶ │   Response         │
│   (port 5001)      │                        │   (port 5000)      │                        │   (port 6001)      │
│                    │                        │                    │                        │                    │
│ Isolation Forest + │                        │ Groq LLM +         │                        │ Incident tracking  │
│ Random Forest      │                        │ tool-calling       │                        │ & escalation       │
└──────────────────┘                        └──────────────────┘                        └──────────────────┘
                                                                                                    │
                                                                                                    ▼
                                                                                        ┌──────────────────┐
                                                                                        │    Frontend        │
                                                                                        │    Next.js          │
                                                                                        │    (port 3000)      │
                                                                                        └──────────────────┘
```

**Agent 1 — Detection** (`detection-agent/`)
Scores incoming traffic records with an ensemble of Isolation Forest and Random Forest models, publishes results to a Redis stream, and exposes them over HTTP.

**Agent 2 — Decision** (`decision-agent/`)
Consumes anomalies from the stream and decides how to act. For anomalies above a score threshold, it calls an LLM (Groq, `openai/gpt-oss-20b`) with function-calling tools to reason about the incident:
- `check_incident_history` — has this protocol pattern happened before?
- `check_active_incident_count` — is the system currently under a broader attack?
- `check_traffic_baseline` — how far off is this from normal traffic for the protocol?

Includes a score threshold (skips the LLM for low-risk traffic) and a circuit breaker (backs off automatically on API rate limits) so the pipeline keeps running even when the LLM is unavailable.

**Agent 3 — Response** (`response-agent/`)
Receives escalated incidents, tracks their status (OPEN/RESOLVED), and serves them to the dashboard.

**Frontend** (`frontend/`)
Next.js + Recharts dashboard with live views: Overview, Incidents, Analytics, Traffic Log, Consumer Stats, Dead Letter Queue, AI Agents, Live Demo, and Reports.

## Tech Stack

- **Backend:** Python, Flask, Redis Streams
- **ML:** scikit-learn (Isolation Forest, Random Forest ensemble)
- **LLM:** Groq API (`openai/gpt-oss-20b`) with function/tool calling
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Recharts
- **Message broker:** Redis (Upstash-compatible)

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Redis instance (e.g. [Upstash](https://upstash.com))
- A [Groq API key](https://console.groq.com)

### Setup

Clone the repo:

```bash
git clone https://github.com/immanueltampubolon594/anomaly-detection-system.git
cd anomaly-detection-system
```

For each backend service (`decision-agent`, `detection-agent`, `response-agent`), create a virtual environment and install dependencies:

```bash
cd decision-agent
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Repeat for `detection-agent` and `response-agent`.

Install frontend dependencies:

```bash
cd frontend
npm install
```

### Environment variables

Each backend service that needs them requires a `.env` file (not committed to this repo — see `.gitignore`). At minimum, `decision-agent/.env` needs:

```env
GROQ_API_KEY=your_groq_api_key_here
REDIS_URL=your_redis_connection_url_here
```

### Running

The easiest way to start everything at once (Windows):

```bash
start-all.bat
```

This launches all four services in separate terminal windows:
- Decision Agent → `http://localhost:5000`
- Response Agent → `http://localhost:6001`
- Detection Agent → `http://localhost:5001`
- Frontend → `http://localhost:3000`

Or start each service manually in its own terminal:

```bash
# Detection Agent
cd detection-agent && venv\Scripts\activate && python traffic_server.py

# Decision Agent
cd decision-agent && venv\Scripts\activate && python server.py

# Response Agent
cd response-agent && venv\Scripts\activate && python server.py

# Frontend
cd frontend && npm run dev
```

Then open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## API Overview

| Service | Endpoint | Description |
|---|---|---|
| Detection (5001) | `GET /traffic` | Latest scored traffic records |
| Detection (5001) | `GET /model-stats` | ML model accuracy |
| Decision (5000) | `POST /decide` | Run a single decision synchronously |
| Decision (5000) | `GET /stats` | Response time & LLM/quota statistics |
| Decision (5000) | `GET /consumer-stats` | Per-consumer processed message counts |
| Decision (5000) | `GET /dead-letter` | Messages that failed processing |
| Response (6001) | `GET /incidents` | All tracked incidents |
| Response (6001) | `POST /incidents/:id/resolve` | Mark an incident resolved |

## Project Structure

```
anomaly-detection-system/
├── detection-agent/      # Agent 1 — ML-based anomaly scoring
├── decision-agent/       # Agent 2 — LLM-based decision making
├── response-agent/       # Agent 3 — incident tracking & escalation
├── frontend/             # Next.js monitoring dashboard
└── start-all.bat         # Launches all services at once
```

## Notes

- The LLM decision layer includes a score threshold and a rate-limit circuit breaker, so the system degrades gracefully to rule-based fallback decisions if the LLM is unreachable or its quota is exhausted.
- Traffic data used for detection is sourced from a labeled dataset (`train.csv` / `test.csv`) rather than live packet capture.
