
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
  const [msg, setMsg] = useState("Add tasks to start.");
  const [busy, setBusy] = useState(false);

  // API request helper
  async function api(path: string, options?: RequestInit) {
    const response = await fetch(API + path);
    // Use the options passed by the caller for POST, DELETE, etc.
    // This is handled below in the corrected request implementation.
    return response;
  }

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

  // Add a task
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
      setMsg("Simulation completed and saved.");
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Correct metrics structure
  const metrics: Metric[] = sim
    ? Object.entries(sim.result.metrics ?? {})
        .filter(([key]) => key !== "makespan")
        .map(([name, value]) => ({
          name: name.replaceAll("_", " "),
          value: Number(value),
        }))
    : [];

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <p className="uppercase tracking-widest text-blue-300 text-sm">
          Operating Systems • Simulation Lab
        </p>

        <h1 className="text-4xl md:text-5xl font-black mt-3">
          Adaptive <span className="text-blue-400">OS Scheduler</span>
        </h1>

        <p className="text-slate-300 mt-3 max-w-3xl">
          Simulate CPU task scheduling, deadlines, priorities, and compare
          classic algorithms with an adaptive heuristic.
        </p>
      </header>

      {/* Task entry and import */}
      <div className="max-w-7xl mx-auto grid gap-5 lg:grid-cols-2">

        {/* Manual task entry */}
        <section className="panel">
          <h2 className="text-xl font-bold mb-4">
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
              <label
                key={key}
                className="text-sm text-slate-300"
              >
                {key.replaceAll("_", " ")}

                <input
                  className="field mt-1"
                  required
                  type={key === "task_id" ? "text" : "number"}
                  min={
                    key === "arrival_time"
                      ? 0
                      : key === "task_id"
                      ? undefined
                      : 1
                  }
                  max={key === "priority" ? 10 : undefined}
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
              className="primary col-span-2"
              disabled={busy}
            >
              Add task
            </button>
          </form>
        </section>

        {/* Import tasks */}
        <section className="panel">
          <h2 className="text-xl font-bold mb-4">
            02 · Import tasks
          </h2>

          <select
            className="field mb-2"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="auto">Auto detect</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="text">Plain text</option>
          </select>

          <textarea
            className="field min-h-28"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste JSON, CSV, or field: value text here"
          />

          <button
            className="secondary mt-2"
            onClick={importText}
            disabled={busy || !raw.trim()}
          >
            Import text
          </button>

          <hr className="border-slate-700 my-4" />

          <p className="text-sm text-slate-300">
            Upload JSON / CSV / TXT / XLSX (max 5 MB)
          </p>

          <input
            className="mt-2 block text-sm"
            type="file"
            accept=".json,.csv,.txt,.xlsx"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

          <button
            className="secondary mt-3"
            onClick={upload}
            disabled={busy || !file}
          >
            Upload file
          </button>
        </section>
      </div>

      {/* Task queue */}
      <section className="panel max-w-7xl mx-auto mt-5">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">
            03 · Task queue ({tasks.length})
          </h2>

          <button className="secondary" onClick={refresh}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-slate-400 text-left">
                {[
                  "Task",
                  "Arrival",
                  "Burst",
                  "Deadline",
                  "Priority",
                  "",
                ].map((heading) => (
                  <th className="p-3" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tasks.map((t) => (
                <tr
                  className="border-t border-slate-800"
                  key={t.task_id}
                >
                  <td className="p-3">{t.task_id}</td>
                  <td className="p-3">{t.arrival_time}</td>
                  <td className="p-3">{t.burst_time}</td>
                  <td className="p-3">{t.deadline}</td>
                  <td className="p-3">{t.priority}/10</td>

                  <td>
                    <button
                      className="text-rose-300"
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
            <p className="text-slate-400 p-3">
              No tasks yet.
            </p>
          )}
        </div>
      </section>

      {/* Run simulation */}
      <section className="panel max-w-7xl mx-auto mt-5">
        <h2 className="text-xl font-bold mb-3">
          04 · Run simulation
        </h2>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Algorithm

            <select
              className="field mt-1"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value);
                setSim(null);
              }}
            >
              <option value="adaptive">Adaptive Priority</option>
              <option value="fcfs">FCFS</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </label>

          {algorithm === "round_robin" && (
            <label className="text-sm">
              Quantum

              <input
                className="field mt-1 w-24"
                type="number"
                min="1"
                value={quantum}
                onChange={(e) =>
                  setQuantum(Number(e.target.value))
                }
              />
            </label>
          )}

          <button
            className="primary"
            disabled={busy || !tasks.length}
            onClick={run}
          >
            ▶ Run simulation
          </button>
        </div>

        <p
          className="text-sm text-blue-200 mt-3"
          role="status"
        >
          {msg}
        </p>
      </section>

      {/* Simulation results */}
      {sim && (
        <section className="max-w-7xl mx-auto grid gap-5 lg:grid-cols-2 mt-5 w-full">

          {/* CPU timeline */}
          <div className="panel lg:col-span-2">
            <h2 className="text-xl font-bold">
              05 · CPU timeline — {sim.algorithm.toUpperCase()}
            </h2>

            <div className="flex flex-wrap gap-2 mt-4">
              {(sim.result.timeline ?? []).map(
                (event: any, index: number) => (
                  <div
                    key={index}
                    className={
                      "rounded-lg p-3 text-center min-w-20 " +
                      (event.task_id === "IDLE"
                        ? "bg-slate-700"
                        : "bg-blue-900 border border-blue-500")
                    }
                  >
                    <b>{event.task_id}</b>

                    <p className="text-xs">
                      {event.start} → {event.end}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="panel">
            <h2 className="text-xl font-bold mb-3">
              Metrics
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {metrics.map((item) => (
                <div
                  key={item.name}
                  className="bg-slate-900 rounded-lg p-3"
                >
                  <p className="text-xs text-slate-400">
                    {item.name}
                  </p>

                  <b className="text-xl">
                    {String(item.value)}
                  </b>
                </div>
              ))}
            </div>
          </div>

          {/* Performance chart */}
          <div className="panel">
            <h2 className="text-xl font-bold mb-3">
              Performance overview
            </h2>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.slice(0, 4)}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#cbd5e1"
                  />

                  <YAxis stroke="#cbd5e1" />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    fill="#60a5fa"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-slate-400">
              Run each algorithm against the same task set to compare results.
            </p>
          </div>

          {/* Individual task results */}
          <div className="panel lg:col-span-2 overflow-x-auto">
            <h2 className="text-xl font-bold mb-3">
              Task results
            </h2>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  {[
                    "Task",
                    "Response",
                    "Completion",
                    "Waiting",
                    "Turnaround",
                    "Deadline",
                  ].map((heading) => (
                    <th className="p-3" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(sim.result.tasks ?? []).map((result: any) => (
                  <tr
                    className="border-t border-slate-800"
                    key={result.task_id}
                  >
                    <td className="p-3">{result.task_id}</td>
                    <td className="p-3">{result.response_time}</td>
                    <td className="p-3">{result.completion_time}</td>
                    <td className="p-3">{result.waiting_time}</td>
                    <td className="p-3">{result.turnaround_time}</td>

                    <td className="p-3">
                      {result.deadline_missed
                        ? "Missed"
                        : "Met"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto py-8 text-xs text-slate-500">
        Educational simulator. Adaptive priority is a heuristic and
        does not guarantee all deadlines.
      </footer>
    </main>
  );
}
