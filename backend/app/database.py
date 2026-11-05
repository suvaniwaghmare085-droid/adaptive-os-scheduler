import sqlite3, json
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).resolve().parents[1] / "scheduler.db"

@contextmanager
def connection():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    finally:
        db.close()

def initialize():
    with connection() as db:
        db.execute("CREATE TABLE IF NOT EXISTS tasks (task_id TEXT PRIMARY KEY, arrival_time INTEGER NOT NULL, burst_time INTEGER NOT NULL, deadline INTEGER NOT NULL, priority INTEGER NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS simulations (id INTEGER PRIMARY KEY AUTOINCREMENT, algorithm TEXT NOT NULL, quantum INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, result_json TEXT NOT NULL)")

def add_tasks(tasks):
    with connection() as db:
        for t in tasks:
            db.execute("INSERT INTO tasks VALUES (?, ?, ?, ?, ?)", (t.task_id,t.arrival_time,t.burst_time,t.deadline,t.priority))

def get_tasks():
    with connection() as db:
        return [dict(r) for r in db.execute("SELECT * FROM tasks ORDER BY arrival_time, task_id")]

def delete_task(task_id):
    with connection() as db:
        return db.execute("DELETE FROM tasks WHERE task_id=?", (task_id,)).rowcount > 0

def save_simulation(algorithm, quantum, result):
    with connection() as db:
        cur=db.execute("INSERT INTO simulations (algorithm,quantum,result_json) VALUES (?,?,?)",(algorithm,quantum,json.dumps(result)))
        return cur.lastrowid

def get_simulations():
    with connection() as db:
        return [dict(r) for r in db.execute("SELECT id,algorithm,quantum,created_at FROM simulations ORDER BY id DESC")]

def get_simulation(simulation_id):
    with connection() as db:
        row=db.execute("SELECT * FROM simulations WHERE id=?",(simulation_id,)).fetchone()
        if row is None: return None
        item=dict(row); item["result"]=json.loads(item.pop("result_json")); return item
