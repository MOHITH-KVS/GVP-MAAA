from .base_agent import BaseAgent

try:
    from ml.task_engine import generate_tasks
except ImportError:
    generate_tasks = None

class TaskAgent(BaseAgent):
    def __init__(self):
        super().__init__("TaskAgent")

    def _execute(self, student_id: int, db, **kwargs):
        if not generate_tasks:
            return {
                "today_tasks": [],
                "week_tasks": [],
                "xp": 0,
                "streak": 0
            }

        try:
            return generate_tasks(student_id, db)
        except Exception as e:
            raise e
