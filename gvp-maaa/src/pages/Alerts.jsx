import { useState } from "react";

/* ===== SAMPLE ALERT DATA ===== */
const ALERTS = [
  {
    id: 1,
    type: "Academic",
    priority: "High",
    label: "🚨 Needs Action Now",
    title: "Attendance Below Safe Limit",
    message:
      "Attendance is at 73%. Attend at least 3 more classes to stay eligible.",
    metrics: ["Attendance: 73%", "Safe Limit: 75%", "Classes Needed: 3"],
    action: "View Attendance",
    unread: true,
    createdAt: Date.now(), // Just now
  },
  {
    id: 2,
    type: "Placement",
    priority: "High",
    label: "🚨 Needs Action Now",
    title: "Interview Update Pending",
    message:
      "You attended an interview. Updating the outcome helps generate better insights.",
    metrics: ["Interview: Completed", "Status: Not Updated"],
    action: "Update Interview",
    unread: true,
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  },
  {
    id: 3,
    type: "Placement",
    priority: "Medium",
    label: "⚠️ Important – Review Soon",
    title: "New Company Eligibility",
    message:
      "You are now eligible for TCS based on your CGPA and attendance.",
    metrics: ["CGPA: 8.02", "Attendance: 82%"],
    action: "View Details",
    unread: true,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
  },
  {
    id: 4,
    type: "Academic",
    priority: "Medium",
    label: "⚠️ Important – Review Soon",
    title: "Marks Dropped in Mid Exam",
    message: "Your performance dropped compared to the previous exam.",
    metrics: ["Mid-1: 18", "Mid-2: 14"],
    action: "View Marks",
    unread: false,
    createdAt: Date.now() - 2 * 7 * 24 * 60 * 60 * 1000, // 2 weeks ago
  },
  {
    id: 5,
    type: "System",
    priority: "Low",
    label: "ℹ️ For Your Information",
    title: "New Resources Uploaded",
    message: "Operating Systems notes were uploaded by faculty.",
    metrics: [],
    action: "View Resources",
    unread: false,
    createdAt: Date.now() - 2 * 30 * 24 * 60 * 60 * 1000, // 2 months ago
  },
];

/* ===== PRIORITY STYLES ===== */
const PRIORITY_STYLE = {
  High: { border: "border-red-500", bg: "bg-red-50" },
  Medium: { border: "border-yellow-400", bg: "bg-yellow-50" },
  Low: { border: "border-blue-400", bg: "bg-blue-50" },
};

export default function Alerts() {
  const [alerts] = useState(ALERTS);
  const [filter, setFilter] = useState("All");

  const filteredAlerts =
    filter === "All"
      ? alerts
      : alerts.filter((a) => a.type === filter);

  const urgentAlerts = filteredAlerts.filter(
    (a) => a.priority === "High"
  );

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100">
        <h1 className="text-2xl font-semibold">🔔 Alerts Center</h1>
        <p className="text-gray-600 mt-1">
          Warnings, reminders, and opportunities you should not miss
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {["All", "Academic", "Placement", "System"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition
              ${
                filter === tab
                  ? "bg-indigo-600 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ================= REQUIRES ATTENTION ================= */}
      {urgentAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-red-600">
            🚨 Requires Your Attention
          </h2>

          {urgentAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* ================= ALL ALERTS ================= */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Alerts</h2>

        {filteredAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

    </div>
  );
}

/* ================= ALERT CARD ================= */

function AlertCard({ alert }) {
  const style = PRIORITY_STYLE[alert.priority];

  return (
    <div
      className={`rounded-2xl p-5 flex justify-between items-start gap-4
      border-l-4 ${style.border} ${style.bg}
      ${alert.priority === "High" && alert.unread ? "alert-pulse" : ""}`}
    >
      <div className="space-y-3">

        {/* TAGS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white border">
            {alert.type}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">
            {alert.label}
          </span>
          {alert.unread && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-700">
              NEW
            </span>
          )}
        </div>

        {/* CONTENT */}
        <h3 className="font-semibold">{alert.title}</h3>
        <p className="text-sm text-gray-700">{alert.message}</p>

        {/* METRICS */}
        {alert.metrics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alert.metrics.map((m, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-lg bg-white border"
              >
                {m}
              </span>
            ))}
          </div>
        )}

        {/* TIME */}
        <p className="text-xs text-gray-500">
          ⏱ {formatTime(alert.createdAt)}
        </p>
      </div>

      {/* ACTION */}
      <button className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
        {alert.action}
      </button>
    </div>
  );
}

/* ================= TIME FORMAT (SAFE) ================= */

function formatTime(timestamp) {
  // 🔒 Defensive: never allow NaN
  if (!timestamp || typeof timestamp !== "number") {
    return "Just now";
  }

  const diff = Date.now() - timestamp;
  if (diff < 0) return "Just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hrs ago`;
  if (diff < week) return `${Math.floor(diff / day)} days ago`;
  if (diff < month) return `${Math.floor(diff / week)} weeks ago`;

  return `${Math.floor(diff / month)} months ago`;
}
