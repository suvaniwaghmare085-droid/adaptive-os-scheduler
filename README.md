# Adaptive OS Scheduler

A full-stack CPU task scheduling simulator built to benchmark **FCFS**, **Round Robin**, and a preemptive **Adaptive Priority** heuristic across latency, CPU utilization, and deadline metrics.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Recharts
- **Backend:** Python 3.10+, FastAPI, Pydantic, SQLite, OpenPyXL
- **Testing:** Pytest

## Local Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd adaptive-os-scheduler
```

### 2. Start the Backend (Terminal 1)

```bash
cd backend
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API runs at `http://127.0.0.1:8000` (interactive API docs at `http://127.0.0.1:8000/docs`).

### 3. Start the Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. *(Optional: copy `frontend/.env.example` to `frontend/.env.local` if using a custom backend URL.)*

## Task Schema & Bulk Import

Tasks can be added manually or imported via **JSON**, **CSV**, **TXT** (`field: value` blocks separated by blank lines), or **XLSX** (up to 5 MB) using the following fields:

| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `task_id` | `string` | Required, 1–50 chars | Unique task identifier |
| `arrival_time` | `int` | `>= 0` | Time unit when the task enters the ready queue |
| `burst_time` | `int` | `> 0` | Total CPU execution time required |
| `deadline` | `int` | `> 0` | Target completion time |
| `priority` | `int` | `0–100` | Base task priority (`100` = highest) |

## Scheduling Algorithms

- **FCFS (First-Come, First-Served):** Non-preemptive execution ordered by arrival time.
- **Round Robin:** Preemptive FIFO time-slicing with a configurable positive quantum.
- **Adaptive Priority:** Re-evaluates all ready tasks at every integer tick using a weighted composite score:
  - `slack = deadline - current_time - remaining_burst`
  - `urgency = clamp(1 - slack / max(deadline - arrival_time, 1), 0, 1)`
  - `waiting_factor = clamp(total_wait / max(current_time - arrival_time, 1), 0, 1)`
  - `base_priority = priority / 100`
  - `score = 0.5 * urgency + 0.3 * waiting_factor + 0.2 * base_priority`
  - *Tie-breaker:* Earlier deadline → higher base priority → earlier arrival → task ID. Operates on a best-effort basis rather than hard real-time guarantees.

## API Endpoints

- `GET /health` — Health check
- `GET /tasks` | `POST /tasks` | `DELETE /tasks/{task_id}` — Manage task queue
- `POST /tasks/import/text` | `POST /tasks/import/file` — Import tasks from text or file
- `POST /simulate` | `GET /simulations` | `GET /simulations/{simulation_id}` — Execute and retrieve simulation runs

## Running Tests

With the backend virtual environment activated:

```bash
cd backend
pytest
```

## Contributors

- **[Anshika](https://github.com/Anshika-2322)** — Data Ingestion, Persistence & QA
- **[Shaivi](https://github.com/iamshaivi)** — Frontend UI & Visualization
- **[Suvani](https://github.com/suvaniwaghmare085-droid)** — Backend API & Scheduling Engine
