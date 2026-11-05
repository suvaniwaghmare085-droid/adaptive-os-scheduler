from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .models import Task, TextImport, SimulationRequest
from . import database
from .input_handler import parse_content, parse_excel
from .scheduler import run_algorithm

app=FastAPI(title="Adaptive OS Scheduler API",version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:3000","http://127.0.0.1:3000"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.on_event("startup")
def startup(): database.initialize()

@app.get("/")
def root(): return {"message":"Adaptive OS Scheduler API","docs":"/docs"}

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/tasks")
def create_task(task:Task):
    try: database.add_tasks([task])
    except Exception as e:
        if "UNIQUE" in str(e): raise HTTPException(409,"Task ID already exists.")
        raise
    return {"message":"Task created","task":task.model_dump()}

@app.get("/tasks")
def list_tasks(): return database.get_tasks()

@app.delete("/tasks/{task_id}")
def remove_task(task_id:str):
    if not database.delete_task(task_id): raise HTTPException(404,"Task not found.")
    return {"message":"Task deleted"}

@app.post("/tasks/import/text")
def import_text(payload:TextImport):
    try:
        tasks=parse_content(payload.content,payload.format); database.add_tasks(tasks)
    except ValueError as e: raise HTTPException(422,str(e))
    except Exception as e:
        if "UNIQUE" in str(e): raise HTTPException(409,"One or more task IDs already exist.")
        raise
    return {"message":f"Imported {len(tasks)} task(s)","tasks":[t.model_dump() for t in tasks]}

@app.post("/tasks/import/file")
async def import_file(file:UploadFile=File(...)):
    name=(file.filename or "").lower(); data=await file.read(5*1024*1024+1)
    if len(data)>5*1024*1024: raise HTTPException(413,"Maximum file size is 5 MB.")
    try:
        if name.endswith(".xlsx"): tasks=parse_excel(data)
        elif name.endswith(".json"): tasks=parse_content(data.decode("utf-8-sig"),"json")
        elif name.endswith(".csv"): tasks=parse_content(data.decode("utf-8-sig"),"csv")
        elif name.endswith(".txt"): tasks=parse_content(data.decode("utf-8-sig"),"text")
        else: raise HTTPException(415,"Upload .json, .csv, .txt, or .xlsx.")
        database.add_tasks(tasks)
    except UnicodeDecodeError: raise HTTPException(400,"Text files must be UTF-8.")
    except ValueError as e: raise HTTPException(422,str(e))
    except HTTPException: raise
    except Exception as e:
        if "UNIQUE" in str(e): raise HTTPException(409,"One or more task IDs already exist.")
        raise
    return {"message":f"Imported {len(tasks)} task(s)","tasks":[t.model_dump() for t in tasks]}

@app.post("/simulate")
def simulate(payload:SimulationRequest):
    tasks=[t for t in database.get_tasks() if payload.task_ids is None or t["task_id"] in payload.task_ids]
    if not tasks: raise HTTPException(400,"Add tasks before simulating.")
    try: result=run_algorithm(tasks,payload.algorithm,payload.quantum)
    except ValueError as e: raise HTTPException(422,str(e))
    sid=database.save_simulation(payload.algorithm,payload.quantum,result)
    return {"simulation_id":sid,"algorithm":payload.algorithm,"result":result}

@app.get("/simulations")
def simulations(): return database.get_simulations()

@app.get("/simulations/{simulation_id}")
def simulation_detail(simulation_id:int):
    item=database.get_simulation(simulation_id)
    if item is None: raise HTTPException(404,"Simulation not found.")
    return item
