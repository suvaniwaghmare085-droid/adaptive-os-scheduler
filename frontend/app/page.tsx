"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Task = {
  task_id: string;
  arrival_time: number;
  burst_time: number;
  deadline: number;
  priority: number;
};

type Metric = {
  name: string;
  value: number;
};

const ALGO_LABELS: Record<string, string> = {
  adaptive: "Adaptive Priority",
  fcfs: "FCFS",
  round_robin: "Round Robin",
};

const ALGO_COLORS: Record<string, string> = {
  adaptive: "#ffffff",
  fcfs: "#a3a3a3",
  round_robin: "#525252",
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [task, setTask] = useState<Task>({
    task_id: "T1",
    arrival_time: 0,
    burst_time: 4,
    deadline: 8,
    priority: 7,
  });

  const [raw, setRaw] = useState("");
  const [format, setFormat] = useState("auto");
  const [file, setFile] = useState<File | null>(null);

  const [algorithm, setAlgorithm] = useState("adaptive");
  const [quantum, setQuantum] = useState(2);

  const [sim, setSim] = useState<any>(null);
  const [history, setHistory] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("Add tasks to start.");
  const [busy, setBusy] = useState(false);

  const isAdaptive = algorithm === "adaptive";

  // API request helper with error handling
  async function request(path: string, options?: RequestInit) {
    const response = await fetch(API + path, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }

    return data;
  }

  // Refresh task queue
  async function refresh() {
    try {
      const data = await request("/tasks");
      setTasks(data);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Switch algorithm while preserving comparison history for the current task set
  function handleAlgorithmChange(nextAlgo: string) {
    setAlgorithm(nextAlgo);
    setSim(history[nextAlgo] ?? null);
  }

  // Add a task (always sends all 5 fields)
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    try {
      await request("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      });

      setMsg("Task added.");
      setHistory({});
      setSim(null);

      setTask({
        ...task,
        task_id: "T" + (tasks.length + 2),
      });

      await refresh();
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Import tasks using text
  async function importText() {
    setBusy(true);

    try {
      const data = await request("/tasks/import/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: raw,
          format,
        }),
      });

      setMsg(data.message);
      setRaw("");
      setHistory({});
      setSim(null);

      await refresh();
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Upload task file
  async function upload() {
    if (!file) return;

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await request("/tasks/import/file", {
        method: "POST",
        body: formData,
      });

      setMsg(data.message);
      setFile(null);
      setHistory({});
      setSim(null);

      await refresh();
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete task
  async function remove(id: string) {
    try {
      await request("/tasks/" + encodeURIComponent(id), {
        method: "DELETE",
      });

      await refresh();

      setHistory({});
      setSim(null);
      setMsg("Task deleted.");
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  // Run scheduling simulation
  async function run() {
    setBusy(true);

    try {
      const data = await request("/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm,
          quantum,
        }),
      });

      setSim(data);
      setHistory((prev) => ({
        ...prev,
        [algorithm]: data,
      }));
      setMsg("Simulation completed and saved.");
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Metrics cards structure
  const metrics: Metric[] = sim
    ? Object.entries(sim.result.metrics ?? {})
      .filter(([key]) => key !== "makespan")
      .map(([name, value]) => ({
        name: name.replaceAll("_", " "),
        value: Number(value),
      }))
    : [];

  // Dynamic time-based comparison chart across executed algorithms
  const executedAlgos = Object.keys(history);
  const chartData = [
    { key: "average_waiting_time", label: "Avg Waiting" },
    { key: "average_turnaround_time", label: "Avg Turnaround" },
    { key: "average_response_time", label: "Avg Response" },
  ].map(({ key, label }) => {
    const row: Record<string, string | number> = { metric: label };
    for (const algoKey of executedAlgos) {
      row[algoKey] = Number(history[algoKey]?.result?.metrics?.[key] ?? 0);
    }
    return row;
  });

  // Table columns filtered by the selected process in section 04
  const queueHeaders = isAdaptive
    ? ["Task", "Arrival", "Burst", "Deadline", "Priority", ""]
    : ["Task", "Arrival", "Burst", ""];

  const resultHeaders = isAdaptive
    ? ["Task", "Response", "Completion", "Waiting", "Turnaround", "Deadline"]
    : ["Task", "Response", "Completion", "Waiting", "Turnaround"];

  const panelStyle =
    "rounded-2xl bg-[#121212] border border-neutral-800 p-6";
  const fieldStyle =
    "w-full rounded-xl bg-[#0B0B0B] border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-white focus:outline-none transition";
  const primaryStyle =
    "rounded-full bg-white text-black font-semibold px-6 py-2.5 text-sm hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer";
  const secondaryStyle =
    "rounded-full bg-neutral-900 text-white border border-neutral-800 font-medium px-5 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer";

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-white px-5 py-8 md:px-10 selection:bg-white selection:text-black">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <p className="inline-block rounded-full bg-neutral-900 border border-neutral-800 px-4 py-1.5 uppercase tracking-widest text-neutral-300 text-xs">
          Operating Systems • Simulation Lab
        </p>

        <h1 className="text-4xl md:text-5xl font-black mt-4 text-emerald-400">
          Adaptive{" "}
          <span className="inline-block bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-500 bg-clip-text text-transparent">
            OS Scheduler
          </span>
        </h1>

        <p className="text-neutral-400 mt-3 max-w-3xl">
          Benchmark FCFS, Round Robin, and Adaptive Priority scheduling across deadlines, latency metrics, and CPU utilization.
        </p>
      </header>

      {/* Task entry and import */}
      <div className="max-w-7xl mx-auto grid gap-5 lg:grid-cols-2">
        {/* Manual task entry — always collects all 5 parameters */}
        <section className={panelStyle}>
          <h2 className="text-xl font-bold mb-4 text-white">
            01 · Manual task entry
          </h2>

          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            {(
              [
                "task_id",
                "arrival_time",
                "burst_time",
                "deadline",
                "priority",
              ] as const
            ).map((key) => (
              <label key={key} className="text-sm text-neutral-400">
                {key.replaceAll("_", " ")}

                <input
                  className={`${fieldStyle} mt-1`}
                  required
                  type={key === "task_id" ? "text" : "number"}
                  min={
                    key === "arrival_time" || key === "priority"
                      ? 0
                      : key === "task_id"
                        ? undefined
                        : 1
                  }
                  max={key === "priority" ? 100 : undefined}
                  value={task[key]}
                  onChange={(e) =>
                    setTask({
                      ...task,
                      [key]:
                        key === "task_id"
                          ? e.target.value
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}

            <button
              className={`${primaryStyle} col-span-2 mt-1`}
              disabled={busy}
            >
              Add task
            </button>
          </form>
        </section>

        {/* Import tasks */}
        <section className={panelStyle}>
          <h2 className="text-xl font-bold mb-4 text-white">
            02 · Import tasks
          </h2>

          <select
            className={`${fieldStyle} mb-2`}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="auto">Auto detect</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="text">Plain text</option>
          </select>

          <textarea
            className={`${fieldStyle} min-h-28`}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste JSON, CSV, or field: value text here"
          />

          <button
            className={`${secondaryStyle} mt-2`}
            onClick={importText}
            disabled={busy || !raw.trim()}
          >
            Import text
          </button>

          <hr className="border-neutral-800 my-4" />

          <p className="text-sm text-neutral-400">
            Upload JSON / CSV / TXT / XLSX (max 5 MB)
          </p>

          <input
            className="mt-2 block text-sm text-neutral-400 file:mr-3 file:rounded-full file:border file:border-solid file:border-neutral-800 file:bg-neutral-900 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-zinc-400 hover:file:bg-neutral-800 file:cursor-pointer"
            type="file"
            accept=".json,.csv,.txt,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            className={`${secondaryStyle} mt-3`}
            onClick={upload}
            disabled={busy || !file}
          >
            Upload file
          </button>
        </section>
      </div>

      {/* Task queue */}
      <section className={`${panelStyle} max-w-7xl mx-auto mt-5`}>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-xl font-bold text-white">
              03 · Task queue ({tasks.length})
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Showing columns used by{" "}
              <span className="text-neutral-300">
                {ALGO_LABELS[algorithm]}
              </span>
              {!isAdaptive && " (deadline & priority remain saved)"}
            </p>
          </div>

          <button className={secondaryStyle} onClick={refresh}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-neutral-400 text-left border-b border-neutral-800">
                {queueHeaders.map((heading, idx) => (
                  <th className="p-3" key={idx}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tasks.map((t) => (
                <tr
                  className="border-t border-neutral-800/80 hover:bg-neutral-900/40"
                  key={t.task_id}
                >
                  <td className="p-3 font-semibold text-white">{t.task_id}</td>
                  <td className="p-3 text-neutral-300">{t.arrival_time}</td>
                  <td className="p-3 text-neutral-300">{t.burst_time}</td>
                  {isAdaptive && (
                    <>
                      <td className="p-3 text-neutral-300">{t.deadline}</td>
                      <td className="p-3 text-neutral-300">{t.priority}/100</td>
                    </>
                  )}

                  <td className="p-3">
                    <button
                      className="text-neutral-400 hover:text-white underline underline-offset-4 cursor-pointer"
                      onClick={() => remove(t.task_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!tasks.length && (
            <p className="text-neutral-500 p-3">No tasks yet.</p>
          )}
        </div>
      </section>

      {/* Run simulation */}
      <section className={`${panelStyle} max-w-7xl mx-auto mt-5`}>
        <h2 className="text-xl font-bold mb-3 text-white">
          04 · Run simulation
        </h2>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-neutral-400">
            Algorithm
            <select
              className={`${fieldStyle} mt-1`}
              value={algorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value)}
            >
              <option value="adaptive">Adaptive Priority</option>
              <option value="fcfs">FCFS</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </label>

          {algorithm === "round_robin" && (
            <label className="text-sm text-neutral-400">
              Quantum
              <input
                className={`${fieldStyle} mt-1 w-24`}
                type="number"
                min="1"
                value={quantum}
                onChange={(e) => setQuantum(Number(e.target.value))}
              />
            </label>
          )}

          <button
            className={primaryStyle}
            disabled={busy || !tasks.length}
            onClick={run}
          >
            ▶ Run simulation
          </button>
        </div>

        <p className="text-sm text-neutral-300 mt-3" role="status">
          {msg}
        </p>
      </section>

      {/* Simulation results */}
      {sim && (
        <section className="max-w-7xl mx-auto grid gap-5 lg:grid-cols-2 mt-5 w-full">
          {/* CPU timeline */}
          <div className={`${panelStyle} lg:col-span-2`}>
            <h2 className="text-xl font-bold text-white">
              05 · CPU timeline — {sim.algorithm.toUpperCase()}
            </h2>

            <div className="flex flex-wrap gap-2 mt-4">
              {(sim.result.timeline ?? []).map((event: any, index: number) => (
                <div
                  key={index}
                  className={
                    "rounded-xl p-3 text-center min-w-20 " +
                    (event.task_id === "IDLE"
                      ? "bg-[#0B0B0B] border border-dashed border-neutral-800 text-neutral-500"
                      : "bg-white text-black border border-white")
                  }
                >
                  <b>{event.task_id}</b>

                  <p
                    className={`text-xs ${event.task_id === "IDLE"
                      ? "text-neutral-500"
                      : "text-neutral-700"
                      }`}
                  >
                    {event.start} → {event.end}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className={panelStyle}>
            <h2 className="text-xl font-bold mb-3 text-white">Metrics</h2>

            <div className="grid grid-cols-2 gap-3">
              {metrics.map((item) => (
                <div
                  key={item.name}
                  className="bg-[#0B0B0B] border border-neutral-800 rounded-xl p-3"
                >
                  <p className="text-xs text-neutral-400">{item.name}</p>

                  <b className="text-xl text-white">{String(item.value)}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Performance chart */}
          <div className={panelStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white">
                Performance overview
              </h2>
              <span className="text-xs text-neutral-400">
                {executedAlgos.length} of 3 algorithms compared
              </span>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />

                  <XAxis dataKey="metric" stroke="#a3a3a3" />

                  <YAxis stroke="#a3a3a3" />

                  <Tooltip
                    cursor={{ fill: "rgba(255, 255, 255, 0.06)" }}
                    contentStyle={{
                      backgroundColor: "#121212",
                      borderColor: "#262626",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                  />

                  <Legend />

                  {executedAlgos.map((algoKey) => (
                    <Bar
                      key={algoKey}
                      dataKey={algoKey}
                      name={ALGO_LABELS[algoKey] ?? algoKey}
                      fill={ALGO_COLORS[algoKey] ?? "#ffffff"}
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={450}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-neutral-500 mt-2">
              Run Adaptive Priority, FCFS, and Round Robin on the same task set
              to compare latency bars side by side.
            </p>
          </div>

          {/* Individual task results */}
          <div className={`${panelStyle} lg:col-span-2 overflow-x-auto`}>
            <h2 className="text-xl font-bold mb-3 text-white">Task results</h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-800">
                  {resultHeaders.map((heading) => (
                    <th className="p-3" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(sim.result.tasks ?? []).map((result: any) => (
                  <tr
                    className="border-t border-neutral-800/80"
                    key={result.task_id}
                  >
                    <td className="p-3 font-semibold text-white">
                      {result.task_id}
                    </td>
                    <td className="p-3 text-neutral-300">
                      {result.response_time}
                    </td>
                    <td className="p-3 text-neutral-300">
                      {result.completion_time}
                    </td>
                    <td className="p-3 text-neutral-300">
                      {result.waiting_time}
                    </td>
                    <td className="p-3 text-neutral-300">
                      {result.turnaround_time}
                    </td>

                    {isAdaptive && (
                      <td className="p-3">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-xs ${result.deadline_missed
                            ? "bg-neutral-900 text-neutral-400 border border-neutral-700"
                            : "bg-white text-black font-semibold"
                            }`}
                        >
                          {result.deadline_missed ? "Missed" : "Met"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-full mx-auto mt-10 border-t border-neutral-800 pt-6 pb-8 text-xs text-neutral-500">
        {/* Top */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Section 1 */}
          <div className="max-w-xl space-y-1.5">
            <p className="text-sm font-semibold text-white">
              Adaptive OS Scheduler
            </p>
            <p className="text-neutral-400 leading-relaxed">
              Full-stack CPU task scheduling simulator built with Next.js and
              FastAPI to compare FCFS, Round Robin, and an adaptive priority
              heuristic across latency, utilization, and deadline metrics.
            </p>
            <p className="text-neutral-500">
              Built for OS scheduling analysis. Adaptive Priority uses a
              weighted heuristic and operates on a best-effort basis rather than
              hard real-time guarantees.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5 shrink-0">
            <p className="text-sm font-semibold text-white">
              Developed by Team
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400">
              <li>
                <span className="font-semibold text-white">Anshika</span>: Data
                Ingestion, Persistence &amp; QA
              </li>
              <li>
                <span className="font-semibold text-white">Shaivi</span>:
                Frontend UI &amp; Visualization
              </li>
              <li>
                <span className="font-semibold text-white">Suvani</span>:
                Backend API &amp; Scheduling Engine
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 border-t border-neutral-800/80 pt-4 text-neutral-500">
          <p>© 2026 Adaptive OS Scheduler Contributors. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}