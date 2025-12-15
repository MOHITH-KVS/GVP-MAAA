import { useState } from "react";

/* ===== SAMPLE DATA ===== */
const ASSIGNMENTS = {
  DBMS: [
    { title: "Assignment 1", due: "2025-09-10", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-15", status: "submitted" },
    { title: "Assignment 3", due: "2025-09-20", status: "pending" },
    { title: "Assignment 4", due: "2025-09-25", status: "pending" },
    { title: "Assignment 5", due: "2025-09-30", status: "Upcoming" },
  ],
  OS: [
    { title: "Assignment 1", due: "2025-09-12", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-18", status: "pending" },
    { title: "Assignment 3", due: "2025-09-24", status: "pending" },
  ],
  CN: [
    { title: "Assignment 1", due: "2025-09-11", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-19", status: "submitted" },
    { title: "Assignment 3", due: "2025-09-26", status: "pending" },
    { title: "Assignment 4", due: "2025-10-01", status: "pending" },
  ],
};

/* ===== STATUS STYLES ===== */
const STATUS_BADGE = {
  submitted: "bg-green-100 text-green-700",
  pending: "bg-red-100 text-red-700",
  locked: "bg-gray-100 text-gray-500",
};

export default function Assignments() {
  const subjects = ["All", ...Object.keys(ASSIGNMENTS)];
  const [activeSubject, setActiveSubject] = useState("All");
  const [openSubject, setOpenSubject] = useState(null);

  /* ===== FILTER DATA ===== */
  const filteredSubjects =
    activeSubject === "All"
      ? ASSIGNMENTS
      : { [activeSubject]: ASSIGNMENTS[activeSubject] };

  const allAssignments = Object.values(filteredSubjects).flat();

  const stats = {
    total: allAssignments.length,
    submitted: allAssignments.filter(a => a.status === "submitted").length,
    pending: allAssignments.filter(a => a.status === "pending").length,
    locked: allAssignments.filter(a => a.status === "Upcoming").length,
  };

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">📝 Assignments</h1>
        <p className="text-gray-500">
          Subject-wise assignment tracking & progress
        </p>
      </div>

      {/* ================= SUBJECT FILTER ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubject(sub)}
            className={`px-4 py-2 rounded-xl text-sm font-medium
              ${activeSubject === sub
                ? "bg-indigo-600 text-white"
                : "bg-white/70 hover:bg-white"}`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard title="Total" value={stats.total} />
        <SummaryCard title="Submitted" value={stats.submitted} color="text-green-600" />
        <SummaryCard title="Pending" value={stats.pending} color="text-red-600" />
        <SummaryCard title="Upcoming" value={stats.locked} color="text-gray-600" />
      </div>

      {/* ================= SUBJECT ACCORDION ================= */}
      <div className="space-y-4">
        {Object.entries(filteredSubjects).map(([subject, items]) => (
          <div
            key={subject}
            className="glass rounded-2xl border border-white/40"
          >
            {/* SUBJECT HEADER */}
            <button
              onClick={() =>
                setOpenSubject(openSubject === subject ? null : subject)
              }
              className="w-full flex justify-between items-center px-6 py-5"
            >
              <div>
                <h2 className="text-lg font-semibold">{subject}</h2>

                {/* CIRCLE PROGRESS */}
                <div className="flex gap-2 mt-2">
                  {items.map((a, i) => (
                    <span
                      key={i}
                      className={`w-3 h-3 rounded-full
                        ${a.status === "submitted"
                          ? "bg-green-500"
                          : a.status === "pending"
                          ? "bg-red-400"
                          : "bg-gray-300"}`}
                    />
                  ))}
                </div>
              </div>

              <span className="text-xl">
                {openSubject === subject ? "−" : "+"}
              </span>
            </button>

            {/* SUBJECT CONTENT */}
            {openSubject === subject && (
              <div className="px-6 pb-6 space-y-3">
                {items.map((a, i) => (
                  <AssignmentItem key={i} data={a} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= ANALYTICS PLACEHOLDER ================= */}
      <div className="glass rounded-2xl p-8 text-center text-gray-400">
        📊 Assignment analytics will appear here
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function SummaryCard({ title, value, color }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/40">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${color || ""}`}>{value}</p>
    </div>
  );
}

function AssignmentItem({ data }) {
  return (
    <div className="flex justify-between items-center bg-white/70 rounded-xl p-4 border">
      <div>
        <p className="font-medium">{data.title}</p>
        <p className="text-sm text-gray-500">Due: {data.due}</p>
      </div>

      <span
        className={`px-3 py-1 text-xs rounded-full font-medium ${STATUS_BADGE[data.status]}`}
      >
        {data.status.toUpperCase()}
      </span>
    </div>
  );
}
