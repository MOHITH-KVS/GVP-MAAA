from .base_agent import BaseAgent

try:
    from services.admin_insights_engine import get_department_insights
except ImportError:
    get_department_insights = None

try:
    from ml.insights_engine import compute_trend
except ImportError:
    compute_trend = None

class InsightsAgent(BaseAgent):
    def __init__(self):
        super().__init__("InsightsAgent")

    def _execute(self, db, department_id=None, **kwargs):
        if not get_department_insights and not compute_trend:
            return {
                "at_risk_count": 0,
                "attendance_risk_pct": 0.0,
                "trend_data": {},
                "interventions": []
            }

        try:
            if callable(get_department_insights):
                try:
                    result = get_department_insights(db, department_id)
                    if isinstance(result, dict):
                        return result
                except Exception:
                    pass

            return {
                "at_risk_count": 0,
                "attendance_risk_pct": 0.0,
                "trend_data": {},
                "interventions": []
            }

        except Exception as e:
            raise e
