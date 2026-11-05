from app.scheduler import fcfs, round_robin, adaptive
TASKS=[{"task_id":"T1","arrival_time":0,"burst_time":5,"deadline":8,"priority":8},{"task_id":"T2","arrival_time":1,"burst_time":3,"deadline":7,"priority":6},{"task_id":"T3","arrival_time":2,"burst_time":2,"deadline":10,"priority":4}]
def test_fcfs(): assert len(fcfs(TASKS)["tasks"])==3
def test_rr(): assert len(round_robin(TASKS,2)["tasks"])==3
def test_adaptive(): assert len(adaptive(TASKS)["tasks"])==3
def test_idle(): 
    r=fcfs([{"task_id":"L","arrival_time":3,"burst_time":1,"deadline":6,"priority":5}])
    assert r["timeline"][0]=={"task_id":"IDLE","start":0,"end":3}
