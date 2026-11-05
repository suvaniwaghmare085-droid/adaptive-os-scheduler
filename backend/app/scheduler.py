from collections import deque

def metrics(tasks, events, first, completion, busy):
    start=min(t["arrival_time"] for t in tasks); end=max(completion.values()); span=max(end-start,1)
    rows=[]
    for t in tasks:
        tid=t["task_id"]; ct=completion[tid]; tat=ct-t["arrival_time"]
        rows.append({**t,"completion_time":ct,"turnaround_time":tat,"waiting_time":tat-t["burst_time"],"response_time":first[tid]-t["arrival_time"],"deadline_missed":ct>t["deadline"]})
    missed=sum(r["deadline_missed"] for r in rows)
    return {"timeline":compress(events),"tasks":rows,"metrics":{"average_waiting_time":round(sum(r["waiting_time"] for r in rows)/len(rows),2),"average_turnaround_time":round(sum(r["turnaround_time"] for r in rows)/len(rows),2),"average_response_time":round(sum(r["response_time"] for r in rows)/len(rows),2),"cpu_utilization":round(busy/span*100,2),"throughput":round(len(rows)/span,3),"deadline_misses":missed,"deadline_miss_percentage":round(missed/len(rows)*100,2),"makespan":end}}

def compress(events):
    out=[]
    for e in events:
        if out and out[-1]["task_id"]==e["task_id"] and out[-1]["end"]==e["start"]: out[-1]["end"]=e["end"]
        else: out.append(dict(e))
    return out

def fcfs(tasks):
    tasks=[dict(t) for t in tasks]; time=0; events=[]; first={}; done={}; busy=0
    for t in sorted(tasks,key=lambda x:(x["arrival_time"],x["task_id"])):
        if time<t["arrival_time"]: events.append({"task_id":"IDLE","start":time,"end":t["arrival_time"]}); time=t["arrival_time"]
        tid=t["task_id"]; first[tid]=time; begin=time; time+=t["burst_time"]; busy+=t["burst_time"]
        events.append({"task_id":tid,"start":begin,"end":time}); done[tid]=time
    return metrics(tasks,events,first,done,busy)

def round_robin(tasks,quantum=2):
    if quantum<1: raise ValueError("Quantum must be >= 1.")
    tasks=[dict(t) for t in tasks]; ordered=sorted(tasks,key=lambda x:(x["arrival_time"],x["task_id"]))
    rem={t["task_id"]:t["burst_time"] for t in ordered}; q=deque(); i=0; time=0; events=[]; first={}; done={}; busy=0
    while len(done)<len(tasks):
        while i<len(ordered) and ordered[i]["arrival_time"]<=time: q.append(ordered[i]["task_id"]); i+=1
        if not q:
            nxt=ordered[i]["arrival_time"]; events.append({"task_id":"IDLE","start":time,"end":nxt}); time=nxt; continue
        tid=q.popleft(); first.setdefault(tid,time); run=min(quantum,rem[tid]); begin=time; time+=run; rem[tid]-=run; busy+=run
        events.append({"task_id":tid,"start":begin,"end":time})
        while i<len(ordered) and ordered[i]["arrival_time"]<=time: q.append(ordered[i]["task_id"]); i+=1
        if rem[tid]: q.append(tid)
        else: done[tid]=time
    return metrics(tasks,events,first,done,busy)

def adaptive(tasks):
    tasks=[dict(t) for t in tasks]; rem={t["task_id"]:t["burst_time"] for t in tasks}; waits={t["task_id"]:0 for t in tasks}
    first={}; done={}; events=[]; time=min(t["arrival_time"] for t in tasks); busy=0
    while len(done)<len(tasks):
        ready=[t for t in tasks if t["arrival_time"]<=time and rem[t["task_id"]]>0]
        if not ready:
            nxt=min(t["arrival_time"] for t in tasks if rem[t["task_id"]]>0)
            events.append({"task_id":"IDLE","start":time,"end":nxt}); time=nxt; continue
        def score(t):
            tid=t["task_id"]; slack=t["deadline"]-time-rem[tid]
            urgency=max(0,min(1,1-slack/max(t["deadline"]-t["arrival_time"],1)))
            wait=max(0,min(1,waits[tid]/max(time-t["arrival_time"],1)))
            base=(t["priority"]-1)/9
            return .5*urgency+.3*wait+.2*base
        chosen=sorted(ready,key=lambda t:(-score(t),t["deadline"],-t["priority"],t["arrival_time"],t["task_id"]))[0]
        tid=chosen["task_id"]; first.setdefault(tid,time); events.append({"task_id":tid,"start":time,"end":time+1})
        for t in ready:
            if t["task_id"]!=tid: waits[t["task_id"]]+=1
        rem[tid]-=1; time+=1; busy+=1
        if rem[tid]==0: done[tid]=time
    return metrics(tasks,events,first,done,busy)

def run_algorithm(tasks,algorithm,quantum=2):
    if algorithm=="fcfs": return fcfs(tasks)
    if algorithm=="round_robin": return round_robin(tasks,quantum)
    if algorithm=="adaptive": return adaptive(tasks)
    raise ValueError("Unknown algorithm.")
