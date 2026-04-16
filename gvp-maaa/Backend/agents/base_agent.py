from abc import ABC, abstractmethod

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    def run(self, **kwargs):
        try:
            return self._execute(**kwargs)
        except Exception as e:
            return {
                "error": str(e),
                "agent": self.name,
                "fallback": True,
                "data": {}
            }

    @abstractmethod
    def _execute(self, **kwargs):
        pass
