from .base_agent import BaseAgent

try:
    from services.alert_rules import generate_alerts
except ImportError:
    generate_alerts = None

try:
    from ml.alert_engine import trigger_alerts
except ImportError:
    trigger_alerts = None

class AlertAgent(BaseAgent):
    def __init__(self):
        super().__init__("AlertAgent")

    def _execute(self, student_id: int, db, **kwargs):
        if not generate_alerts and not trigger_alerts:
            return {
                "alerts": [],
                "alert_count": 0,
                "severity_breakdown": {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
            }

        try:
            if callable(generate_alerts):
                try:
                    result = generate_alerts(student_id, db)
                    if isinstance(result, list):
                        return {
                            "alerts": result,
                            "alert_count": len(result),
                            "severity_breakdown": {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
                        }
                    elif isinstance(result, dict) and "alerts" in result:
                        return result
                except Exception:
                    pass
                    
            return {
                "alerts": [],
                "alert_count": 0,
                "severity_breakdown": {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
            }

        except Exception as e:
            raise e
