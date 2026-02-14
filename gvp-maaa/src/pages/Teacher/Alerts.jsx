import { useState } from "react";


/* ================= MAIN PAGE ================= */

export default function Alerts({ alerts = [], loading }) {
  const [filter, setFilter] = useState("All");

  const applyFilter = (list) =>
    filter === "All" ? list : list.filter((a) => a.type === filter);

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          🔔 Alerts Center
        </h1>
        <p className="text-gray-600 mt-1">
          Alerts received from admin and alerts sent by you to students
        </p>
      </div>

      {/* ================= FILTERS (FIXED POSITION) ================= */}
      <div className="flex gap-3 flex-wrap">
        {["All", "Emergency", "Announcement", "Info"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm border transition
              ${
                filter === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-gray-100"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ================= TWO COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ===== LEFT : ADMIN ALERTS ===== */}
        <section className="glass rounded-3xl p-6 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📥 Alerts from Admin
          </h2>

          {loading ? (
            <EmptyState />
          ) : applyFilter(alerts).length === 0 ? (
            <EmptyState />
          ) : (
            applyFilter(alerts).map((alert) => (
              <div
                key={alert.id}
                className="border-l-4 border-indigo-500 bg-indigo-50 rounded-xl p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white border">
                    {alert.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <h3 className="font-semibold">{alert.title}</h3>
                <p className="text-sm text-gray-700">{alert.message}</p>
              </div>
            ))
          )}

        </section>

        {/* ===== RIGHT : SENT ALERTS ===== */}
        <section className="glass rounded-3xl p-6 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📤 Alerts Sent to Students
          </h2>

          {applyFilter(sentAlertsData).length === 0 ? (
            <EmptyState />
          ) : (
            applyFilter(sentAlertsData).map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 ${alert.color} rounded-xl p-4 space-y-3 transition hover:scale-[1.01]`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white border">
                    {alert.type}
                  </span>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>

                <h3 className="font-semibold">{alert.title}</h3>

                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <span className="font-medium">Target:</span>{" "}
                    {alert.target}
                  </p>
                  <p>
                    <span className="font-medium">Students:</span>{" "}
                    {alert.students}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="px-4 py-1.5 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition">
                    View
                  </button>
                  <button className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-100 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  );
}

/* ================= EMPTY STATE ================= */

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-3xl mb-2">🔔</div>
      <p className="font-medium">No alerts found</p>
      <p className="text-sm">Try a different filter</p>
    </div>
  );
}
