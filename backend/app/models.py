from pydantic import BaseModel, Field, ConfigDict, model_validator

class Task(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_id: str = Field(min_length=1, max_length=50)
    arrival_time: int = Field(ge=0)
    burst_time: int = Field(gt=0)
    deadline: int = Field(gt=0)
    priority: int = Field(ge=1, le=10)

    @model_validator(mode="after")
    def check_deadline(self):
        if self.deadline < self.arrival_time:
            raise ValueError("deadline cannot be earlier than arrival_time")
        return self

class TextImport(BaseModel):
    content: str
    format: str = "auto"

class SimulationRequest(BaseModel):
    algorithm: str = Field(pattern="^(fcfs|round_robin|adaptive)$")
    quantum: int = Field(default=2, ge=1, le=100)
    task_ids: list[str] | None = None
