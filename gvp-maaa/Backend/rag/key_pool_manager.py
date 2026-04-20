"""
API Key Pool Manager - Tracks Gemini API key quotas and optimizes key selection
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy import Column, Integer, String, DateTime, Float, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
import time

Base = declarative_base()


class GeminiKeyUsage(Base):
    """Tracks Gemini API key quota status and performance metrics"""
    __tablename__ = "gemini_key_usage"
    
    id = Column(Integer, primary_key=True)
    api_key_id = Column(Integer, nullable=False)  # 1, 2, or 3
    model = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # 'success', '429_quota', '404_model', 'timeout'
    attempt_time = Column(DateTime, default=datetime.utcnow)
    error_message = Column(String(500), nullable=True)
    
    def __repr__(self):
        return f"<GeminiKeyUsage key_id={self.api_key_id}, model={self.model}, status={self.status}>"


class KeyPoolManager:
    """Manages API key pool, tracks quota exhaustion, and optimizes key selection"""
    
    # Cooldown period after 429 (seconds)
    QUOTA_COOLDOWN_SECONDS = 300  # 5 minutes
    
    # Max consecutive failures before marking key as bad
    FAILURE_THRESHOLD = 3
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.key_cache = {}  # In-memory cache for quick lookups
        self._refresh_cache()
    
    def _refresh_cache(self):
        """Load recent key status from DB into memory"""
        recent_cutoff = datetime.utcnow() - timedelta(hours=1)
        usage_logs = self.db.query(GeminiKeyUsage).filter(
            GeminiKeyUsage.attempt_time >= recent_cutoff
        ).all()
        
        # Group by key_id and model
        for log in usage_logs:
            key = f"{log.api_key_id}_{log.model}"
            self.key_cache[key] = {
                "status": log.status,
                "last_attempt": log.attempt_time,
                "message": log.error_message
            }
    
    def log_attempt(self, api_key_id: int, model: str, status: str, error_msg: str = None):
        """Log an API call attempt"""
        usage = GeminiKeyUsage(
            api_key_id=api_key_id,
            model=model,
            status=status,
            error_message=error_msg
        )
        self.db.add(usage)
        self.db.commit()
        
        # Update cache
        key = f"{api_key_id}_{model}"
        self.key_cache[key] = {
            "status": status,
            "last_attempt": datetime.utcnow(),
            "message": error_msg
        }
    
    def is_key_in_cooldown(self, api_key_id: int, model: str) -> bool:
        """Check if key is in cooldown after 429 error"""
        key = f"{api_key_id}_{model}"
        
        if key not in self.key_cache:
            return False
        
        cache = self.key_cache[key]
        if cache["status"] != "429_quota":
            return False
        
        elapsed = (datetime.utcnow() - cache["last_attempt"]).total_seconds()
        return elapsed < self.QUOTA_COOLDOWN_SECONDS
    
    def get_next_retry_after(self, api_key_id: int, model: str) -> Optional[int]:
        """Get seconds until key is ready to retry (None if ready now)"""
        key = f"{api_key_id}_{model}"
        
        if key not in self.key_cache:
            return None
        
        cache = self.key_cache[key]
        if cache["status"] != "429_quota":
            return None
        
        elapsed = (datetime.utcnow() - cache["last_attempt"]).total_seconds()
        remaining = self.QUOTA_COOLDOWN_SECONDS - elapsed
        
        return max(0, int(remaining)) if remaining > 0 else None
    
    def get_key_status(self) -> Dict:
        """Get status of all API keys"""
        status_summary = {
            "key_1": {"status": "unknown", "last_check": None, "models": []},
            "key_2": {"status": "unknown", "last_check": None, "models": []},
            "key_3": {"status": "unknown", "last_check": None, "models": []},
        }
        
        # Get last 24 hours of logs
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_logs = self.db.query(GeminiKeyUsage).filter(
            GeminiKeyUsage.attempt_time >= cutoff
        ).all()
        
        for log in recent_logs:
            key_name = f"key_{log.api_key_id}"
            
            # Track unique models tried
            if log.model not in status_summary[key_name]["models"]:
                status_summary[key_name]["models"].append({
                    "name": log.model,
                    "status": log.status,
                    "last_attempt": log.attempt_time.isoformat()
                })
            
            # Update last check time
            if status_summary[key_name]["last_check"] is None or \
               log.attempt_time > datetime.fromisoformat(status_summary[key_name]["last_check"]):
                status_summary[key_name]["last_check"] = log.attempt_time.isoformat()
        
        # Determine overall key status
        for key_id in [1, 2, 3]:
            key_name = f"key_{key_id}"
            models = status_summary[key_name]["models"]
            
            if not models:
                status_summary[key_name]["status"] = "untested"
            else:
                success_models = [m for m in models if m["status"] == "success"]
                quota_models = [m for m in models if m["status"] == "429_quota"]
                
                if len(success_models) > 0:
                    status_summary[key_name]["status"] = "active"
                    # Show working models
                    status_summary[key_name]["working_models"] = [m["name"] for m in success_models]
                elif len(quota_models) == len(models):
                    status_summary[key_name]["status"] = "exhausted"
                    status_summary[key_name]["retry_after_seconds"] = self.get_next_retry_after(
                        key_id, 
                        models[0]["name"]
                    )
                else:
                    status_summary[key_name]["status"] = "degraded"
        
        return status_summary
    
    def get_best_key_for_model(self, model: str, available_keys: List[int]) -> Optional[int]:
        """Select best key to use for given model"""
        for key_id in available_keys:
            if not self.is_key_in_cooldown(key_id, model):
                return key_id
        
        return None  # All keys in cooldown
    
    def get_success_rate(self, api_key_id: int) -> float:
        """Calculate success rate for a key over last 24 hours"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        total = self.db.query(GeminiKeyUsage).filter(
            and_(
                GeminiKeyUsage.api_key_id == api_key_id,
                GeminiKeyUsage.attempt_time >= cutoff
            )
        ).count()
        
        if total == 0:
            return 0.0
        
        success = self.db.query(GeminiKeyUsage).filter(
            and_(
                GeminiKeyUsage.api_key_id == api_key_id,
                GeminiKeyUsage.status == "success",
                GeminiKeyUsage.attempt_time >= cutoff
            )
        ).count()
        
        return round(success / total * 100, 2)
