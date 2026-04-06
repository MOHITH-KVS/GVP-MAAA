import React, { useEffect, useMemo, useState } from "react";
import "./SmartTaskManager.css";
import api from "../utils/api";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export default function SmartTaskManager({ studentData }) {
  const studentId = Number(studentData?.studentId || studentData?.id || 0);
  const studentName = studentData?.studentName || "You";

  const [tasks, setTasks] = useState({ today: [], this_week: [], thisWeek: [] });
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rank, setRank] = useState(null);
  const [classId, setClassId] = useState(studentData?.classId || "");

  const [loading, setLoading] = useState(true);
  const [processingTaskId, setProcessingTaskId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const normalizedWeekTasks = useMemo(
    () => tasks.thisWeek || tasks.this_week || [],
    [tasks]
  );

  const allTasks = useMemo(
    () => [...(tasks.today || []), ...normalizedWeekTasks],
    [tasks, normalizedWeekTasks]
  );

  const metrics = useMemo(() => {
    const today = tasks.today || [];
    const week = normalizedWeekTasks;
    const todayCompleted = today.filter((task) => Boolean(task.completed)).length;
    const weekCompleted = week.filter((task) => Boolean(task.completed)).length;

    const weekTotal = week.length;
    const weekProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

    return {
      todayMetric: `${todayCompleted}/${today.length}`,
      weekProgress,
    };
  }, [tasks, normalizedWeekTasks]);

  const badges = useMemo(() => {
    const possible = [];
    if (streak >= 7) possible.push("7 Day Consistency Master");
    if (streak >= 3) possible.push("3 Day Streak");
    if (xp >= 100) possible.push("Momentum Builder");
    if (Number(studentData?.attendance || 0) >= 75) possible.push("Attendance 75%+");
    return possible.slice(0, 3);
  }, [streak, xp, studentData?.attendance]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, xpRes, streakRes, profileRes] = await Promise.all([
        api.get("/student/tasks/today"),
        api.get(`/student/xp/${studentId}`),
        api.get(`/student/streak/${studentId}`),
        api.get("/student/profile"),
      ]);

      const taskPayload = tasksRes?.data || { today: [], this_week: [] };
      setTasks(taskPayload);
      setXp(Number(xpRes?.data?.total_xp || 0));
      setStreak(Number(streakRes?.data?.streak_days || 0));

      const resolvedClassId =
        classId ||
        profileRes?.data?.class_id ||
        (profileRes?.data?.year && profileRes?.data?.section
          ? `${profileRes.data.year}-${profileRes.data.section}`
          : "");

      setClassId(resolvedClassId);

      if (resolvedClassId) {
        const lbRes = await api.get(`/class/leaderboard/${resolvedClassId}`);
        const rows = Array.isArray(lbRes?.data) ? lbRes.data : [];
        setLeaderboard(rows);

        const myIndex = rows.findIndex((item) => Number(item.student_id) === Number(studentId));
        setRank(myIndex >= 0 ? Number(rows[myIndex].rank || myIndex + 1) : null);
      } else {
        setLeaderboard([]);
        setRank(null);
      }
    } catch (error) {
      console.error("Failed to load SMART tasks:", error);
      setFeedback("Could not load task progress data.");
      setFeedbackType("warning");
    } finally {
      setLoading(false);
    }
  };

  const getPredictiveMessage = () => {
    if (allTasks.length === 0) return "No task data available yet";

    const completedCount = allTasks.filter((task) => Boolean(task.completed)).length;
    const compliance = Math.round((completedCount / allTasks.length) * 100);

    if (compliance >= 80) return "Following this plan reduces risk substantially";
    if (compliance >= 50) return "Good progress, maintain consistency";
    if (compliance > 0) return "You started well, keep going";
    return "Start one verified task today to build momentum";
  };

  const handleTaskComplete = async (task) => {
    if (processingTaskId === task.id || task.completed) return;

    setProcessingTaskId(task.id);
    try {
      const payload = {
        type: task.type,
        priority: task.priority,
        verificationType: task.verificationType,
      };

      const res = await api.post(`/student/tasks/complete/${task.id}`, payload);
      const verified = Boolean(res?.data?.verified);
      const taskXp = Number(res?.data?.xp_earned || 0);

      setFeedback(
        verified
          ? `Verified and credited +${taskXp} XP`
          : "Completed. Waiting for backend verification."
      );
      setFeedbackType(verified ? "success" : "info");

      await loadData();
    } catch (error) {
      console.error("Task completion failed:", error);
      setFeedback("Failed to complete task. Please try again.");
      setFeedbackType("warning");
    } finally {
      setProcessingTaskId(null);
      setTimeout(() => setFeedback(""), 3000);
    }
  };

  const TaskItem = ({ task }) => {
    const isCompleted = Boolean(task.completed);
    const isVerified = Boolean(task.verified);
    const priorityColor = {
      HIGH: "#ef4444",
      MEDIUM: "#f97316",
      LOW: "#3b82f6",
    };

    return (
      <div className={`task-item ${isCompleted ? "completed" : ""}`}>
        <div className="task-checkbox-wrapper">
          <button
            className="task-checkbox"
            onClick={() => handleTaskComplete(task)}
            aria-label={`Complete task: ${task.title}`}
            disabled={isCompleted || processingTaskId === task.id}
          >
            {isCompleted ? (
              <CheckCircleIcon className="checked-icon" />
            ) : (
              <RadioButtonUncheckedIcon className="unchecked-icon" />
            )}
          </button>
        </div>

        <div className="task-content">
          <div className="task-header">
            <h4 className="task-title">{task.title}</h4>
            <span
              className="task-priority"
              style={{ backgroundColor: priorityColor[task.priority] || "#64748b" }}
            >
              {task.priority}
            </span>
          </div>
          <p className="task-reason">{task.reason || "Task generated from your current progress data."}</p>
          <div className="task-verification-row">
            {isCompleted && isVerified && <span className="verification-tag verified">Verified</span>}
            {isCompleted && !isVerified && <span className="verification-tag pending">Pending verification</span>}
            {!isCompleted && <span className="verification-tag neutral">{task.verificationType || "system"}</span>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="smart-task-manager">
        <div className="empty-state">
          <h3>Loading smart tasks...</h3>
        </div>
      </div>
    );
  }

  const hasTaskData = allTasks.length > 0;
  const leaderboardVisible = xp > 0 && leaderboard.length > 0;

  return (
    <div className="smart-task-manager">
      <div className="stm-header minimal">
        <div className="top-stats">
          <div className="top-stat-item">XP: {xp}</div>
          <div className="top-stat-item">Streak: {streak} day(s)</div>
          <div className="top-stat-item">
            Rank: {xp > 0 && rank ? `#${rank}` : "Start completing tasks to get ranked"}
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="badges-strip" aria-label="achievement badges">
          {badges.map((badge) => (
            <span key={badge} className="badge-chip">
              {badge}
            </span>
          ))}
        </div>
      )}

      {feedback && <div className={`feedback-message ${feedbackType}`}>{feedback}</div>}

      <div className="stm-metrics">
        <div className="metric-box">
          <div className="metric-label">Today</div>
          <div className="metric-value">{metrics.todayMetric}</div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Weekly Progress</div>
          <div className="metric-value">{metrics.weekProgress}%</div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Class Top 5</div>
          {leaderboardVisible ? (
            <div className="leaderboard-list">
              {leaderboard.slice(0, 5).map((entry) => (
                <div
                  key={`${entry.student_id}-${entry.rank}`}
                  className={`leaderboard-row ${Number(entry.student_id) === Number(studentId) ? "current-user" : ""}`}
                >
                  <span>
                    {entry.rank}. {Number(entry.student_id) === Number(studentId) ? "You" : entry.name}
                  </span>
                  <span>{entry.xp} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="metric-label">No leaderboard data available yet</div>
          )}
        </div>

        <div className="metric-box predictive">
          <TrendingUpIcon className="predictive-icon" />
          <div className="metric-label">{getPredictiveMessage()}</div>
        </div>
      </div>

      {tasks.today && tasks.today.length > 0 && (
        <section className="task-section">
          <h3 className="section-title">
            <span className="section-icon">TODAY</span>
            FOCUS
          </h3>
          <div className="tasks-list">
            {tasks.today.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {normalizedWeekTasks.length > 0 && (
        <section className="task-section">
          <h3 className="section-title">
            <span className="section-icon">WEEK</span>
            PLAN
          </h3>
          <div className="tasks-list">
            {normalizedWeekTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {!hasTaskData && (
        <div className="empty-state">
          <div className="empty-icon">-</div>
          <h3>No data available yet</h3>
          <p>Your smart tasks will appear once attendance, marks, assignments, or events are available.</p>
        </div>
      )}
    </div>
  );
}
