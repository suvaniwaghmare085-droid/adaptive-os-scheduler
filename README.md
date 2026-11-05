# Adaptive OS Scheduler


A web-based educational CPU scheduling simulator. It compares FCFS, Round Robin, and a preemptive Adaptive Priority heuristic. It simulates scheduling; it does not modify the operating system kernel.

## Requirements
- Python 3.10+
- Node.js 20+
- npm

## Run on Windows

### Backend (terminal 1)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000/docs

### Frontend (terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

If needed, copy `frontend/.env.example` to `.env.local`.

## Task schema
Every task has `task_id`, `arrival_time` (>=0), `burst_time` (>0), `deadline` (>0), and `priority` (1-10, 10 highest). CSV/XLSX headers must match these names. Structured TXT uses `field: value` lines, with a blank line between tasks.

## Algorithms
- FCFS: non-preemptive, arrival-time order.
- Round Robin: preemptive FIFO time slicing; configurable positive quantum.
- Adaptive: reevaluates each ready task every integer time unit.

Adaptive score (larger is better):
- `slack = deadline - current_time - remaining_burst`
- `urgency = clamp(1 - slack / max(deadline - arrival_time, 1), 0, 1)`
- `waiting_factor = clamp(total_wait / max(current_time - arrival_time, 1), 0, 1)`
- `base_priority = (priority - 1) / 9`
- `score = 0.5*urgency + 0.3*waiting_factor + 0.2*base_priority`

Tie-break: earlier deadline, higher base priority, earlier arrival, task ID. This is a deterministic educational heuristic, not an optimality guarantee.

Metrics:
- turnaround = completion - arrival
- waiting = turnaround - burst
- response = first start - arrival
- deadline missed if completion > deadline
- CPU utilization = busy time / (makespan - earliest arrival) * 100
- throughput = completed tasks / measured span

## API
`GET /health`, `POST /tasks`, `GET /tasks`, `DELETE /tasks/{task_id}`,
`POST /tasks/import/text`, `POST /tasks/import/file`, `POST /simulate`,
`GET /simulations`, `GET /simulations/{simulation_id}`.
Interactive API docs are at `/docs`.

## Tests
From `backend`, activate the venv and run `pytest`.

## GitHub
Suggested repository: `adaptive-os-scheduler`.
Description: `A real-time CPU scheduling simulator featuring adaptive priority scheduling, FCFS, Round Robin, and performance analytics.`
Topics: `operating-systems`, `cpu-scheduling`, `python`, `fastapi`, `nextjs`, `real-time-systems`.
Run and test locally before publishing. Never commit `.venv`, `node_modules`, `.env`, or private data.
