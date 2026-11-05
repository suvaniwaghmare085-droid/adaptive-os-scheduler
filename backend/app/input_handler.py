import csv, io, json
from openpyxl import load_workbook
from pydantic import ValidationError
from .models import Task

FIELDS={"task_id","arrival_time","burst_time","deadline","priority"}

def validate_records(records):
    if isinstance(records,dict): records=[records]
    if not isinstance(records,list) or not records: raise ValueError("Input must contain at least one task.")
    result=[]; seen=set()
    for i,record in enumerate(records,1):
        if not isinstance(record,dict): raise ValueError(f"Row {i} must be an object.")
        data={str(k).strip().lower():v for k,v in record.items() if k is not None}
        missing=FIELDS-set(data)
        if missing: raise ValueError(f"Row {i} missing fields: {', '.join(sorted(missing))}")
        try: task=Task(**{k:data[k] for k in FIELDS})
        except (ValidationError,TypeError) as e: raise ValueError(f"Invalid task at row {i}: {e}") from e
        if task.task_id in seen: raise ValueError(f"Duplicate task_id in input: {task.task_id}")
        seen.add(task.task_id); result.append(task)
    return result

def parse_json(content):
    try: return validate_records(json.loads(content))
    except json.JSONDecodeError as e: raise ValueError(f"Invalid JSON: {e.msg}") from e

def parse_csv(content):
    reader=csv.DictReader(io.StringIO(content))
    if not reader.fieldnames: raise ValueError("CSV needs a header row.")
    missing=FIELDS-{h.strip().lower() for h in reader.fieldnames if h}
    if missing: raise ValueError(f"CSV missing columns: {', '.join(sorted(missing))}")
    return validate_records(list(reader))

def parse_text(content):
    blocks=[]; current={}
    for line in content.splitlines()+[""]:
        line=line.strip()
        if not line:
            if current: blocks.append(current); current={}
            continue
        if ":" in line: key,value=line.split(":",1)
        elif "=" in line: key,value=line.split("=",1)
        else: raise ValueError(f"Use field: value format. Invalid line: {line}")
        current[key.strip().lower()]=value.strip()
    return validate_records(blocks)

def parse_excel(data):
    try:
        wb=load_workbook(io.BytesIO(data),read_only=True,data_only=True)
        ws=wb.active; rows=ws.iter_rows(values_only=True); headers=next(rows,None)
        if not headers: raise ValueError("Excel sheet is empty.")
        names=[str(v).strip().lower() if v is not None else "" for v in headers]
        records=[dict(zip(names,row)) for row in rows if any(v is not None for v in row)]
        wb.close(); return validate_records(records)
    except ValueError: raise
    except Exception as e: raise ValueError("Invalid XLSX file.") from e

def parse_content(content,fmt="auto"):
    fmt=fmt.lower()
    if fmt=="auto":
        stripped=content.lstrip()
        if stripped.startswith(("{","[")): fmt="json"
        elif content.splitlines() and "," in content.splitlines()[0]: fmt="csv"
        else: fmt="text"
    if fmt=="json": return parse_json(content)
    if fmt=="csv": return parse_csv(content)
    if fmt in ("text","txt"): return parse_text(content)
    raise ValueError("Supported pasted formats: JSON, CSV, TXT.")
