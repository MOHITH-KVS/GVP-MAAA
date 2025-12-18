import { useState } from "react";

/* ===== SAMPLE TASK DATA ===== */
const TASKS = [
  {
    title: "DBMS Assignment – Unit 3",
    subject: "DBMS",
    dueDate: "20 Jan 2025",
    status: "Pending",
    type: "Theory",
  },
  {
    title: "OS Lab Record Submission",
    subject: "Operating Systems",
    dueDate: "15 Jan 2025",
    status: "Overdue",
    type: "Lab",
  },
  {
    title: "CN Mini Project Report",
    subject: "Computer Networks",
    dueDate: "10 Jan 2025",
    status: "Submitted",
    type: "Project",
  },
  {
    title: "AI Seminar PPT",
    subject: "Artificial Intelligence",
    dueDate: "25 Jan 2025",
    status: "Pending",
    type: "Theory",
  },
];

/* ===== STATUS STYLES ===== */
const STATUS_STYLE = {
  Submitted: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700",
};

export default function Submissions() {
  const [filter, setFilter] = useState("All");

  const filteredTasks =
    filter === "All"
      ? TASKS
      : TASKS.filter((t) => t.status === filter);

  /* ===== BASIC STATS ===== */
  const stats = {
    total: TASKS.length,
    submitted: TASKS.filter((t) => t.status === "Submitted").length,
    pending: TASKS.filter((t) => t.status === "Pending").length,
    overdue: TASKS.filter((t) => t.status === "Overdue").length,
  };

  /* ===== MICRO ANALYSIS ===== */
  const overdueTasks = TASKS.filter((t) => t.status === "Overdue");
  const upcomingTasks = TASKS.filter((t) => t.status === "Pending");

  const lateLabs = TASKS.filter(
    (t) => t.type === "Lab" && t.status !== "Submitted"
  ).length;

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">📤 Submissions</h1>
        <p className="text-gray-500">
          Track your assignments, records, and academic tasks
        </p>
      </div>

      {/* ================= MICRO ANALYSIS ================= */}
      <div className="rounded-2xl p-5 bg-indigo-50 border border-indigo-100 space-y-2">
        <p className="text-sm font-medium text-indigo-700">
          🔍 Submission Insight
        </p>

        <ul className="text-sm text-indigo-600 space-y-1">
          {overdueTasks.length > 0 ? (
            <li>
              • {overdueTasks.length} task(s) are overdue and may affect internals.
            </li>
          ) : (
            <li>• No overdue submissions. Good job staying on track.</li>
          )}

          {upcomingTasks.length > 0 && (
            <li>
              • {upcomingTasks.length} task(s) are still pending.
            </li>
          )}

          {lateLabs > 0 && (
            <li>
              • Lab records are often delayed. Submitting them early improves evaluation.
            </li>
          )}
        </ul>

        {/* SUGGESTED ACTION */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <p className="text-sm text-indigo-700 mt-2">
            ✅ <span className="font-medium">Suggested Action:</span>{" "}
            Prioritize{" "}
            <span className="font-semibold">
              {overdueTasks[0]?.title || upcomingTasks[0]?.title}
            </span>{" "}
            to reduce backlog risk.
          </p>
        )}
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={stats.total} />
        <StatCard title="Submitted" value={stats.submitted} />
        <StatCard title="Pending" value={stats.pending} />
        <StatCard title="Overdue" value={stats.overdue} />
      </div>

      {/* ================= FILTERS ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {["All", "Pending", "Submitted", "Overdue"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition
              ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ================= TASK LIST ================= */}
      <div className="space-y-4">
        {filteredTasks.map((task, i) => (
          <div
            key={i}
            className="glass rounded-2xl p-5 flex justify-between items-center border border-white/40"
          >
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-gray-500">
                {task.subject} • Due: {task.dueDate}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 text-xs rounded-full ${STATUS_STYLE[task.status]}`}
              >
                {task.status}
              </span>

              {task.status !== "Submitted" && (
                <button className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Mark as Submitted
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-gray-400">
            No tasks found
          </div>
        )}
      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ title, value }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/40">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
