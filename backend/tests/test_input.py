from app.input_handler import parse_content
def test_json(): assert len(parse_content('[{"task_id":"A","arrival_time":0,"burst_time":2,"deadline":5,"priority":7}]',"json"))==1
def test_csv(): assert len(parse_content("task_id,arrival_time,burst_time,deadline,priority\\nA,0,2,5,7","csv"))==1
def test_txt(): assert len(parse_content("task_id: A\\narrival_time: 0\\nburst_time: 2\\ndeadline: 5\\npriority: 7","text"))==1
