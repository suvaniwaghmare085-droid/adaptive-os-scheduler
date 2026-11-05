# Scheduling algorithms

FCFS is non-preemptive and runs tasks in arrival order. Round Robin rotates ready tasks using a configurable time quantum. Adaptive Priority is preemptive and recalculates the score at every integer time boundary.

`score = 0.5 * urgency + 0.3 * waiting_factor + 0.2 * base_priority`

All factors are clamped to [0,1]. The score is a deterministic educational heuristic, not an optimal scheduling guarantee.
