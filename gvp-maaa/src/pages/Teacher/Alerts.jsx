import { useState } from "react";


/* ================= MAIN PAGE ================= */

export default function Alerts({ alerts = [], setAlerts, loading }) {
  const [filter, setFilter] = useState("All");

  const markAsRead = async (id) => {
  try {
    const token = localStorage.getItem("access_token");

    const res = await fetch(
      `http://localhost:8000/alerts/${id}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) throw new Error("Failed");

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, is_read: true } : a
      )
    );
  } catch (err) {
    console.error("Failed to mark read", err);
  }
 };



  const applyFilter = (list) =>
  filter === "All"
    ? list
    : list.filter(
        (a) => a.type?.toLowerCase() === filter.toLowerCase()
      );


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
        {["All", "notice", "reminder", "urgent"].map((t) => (
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
              className={`border-l-4 rounded-xl p-4 space-y-2 transition
                ${alert.is_read 
                  ? "bg-gray-100 border-gray-300 opacity-70"
                  : "bg-indigo-50 border-indigo-500"}
              `}
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

              {alert.file_path && (
                <div className="pt-2">
                  <a
                    href={`http://localhost:8000/${alert.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                  >
                    📎 {alert.file_name || "Open Attachment"}
                  </a>
                </div>
              )}


              {/* 🔥 NEW BUTTON SECTION */}
              {!alert.is_read && (
                <div className="pt-2">
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                    Mark as Read
                  </button>
                </div>
              )}

              {alert.is_read && (
                <p className="text-xs text-green-600 font-medium pt-1">
                  ✔ Read
                </p>
              )}
            </div>
            
          ))
          )}

        </section>

        {/* ===== RIGHT : SENT ALERTS ===== */}
        <section className="glass rounded-3xl p-6 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            📤 Alerts Sent to Students
          </h2>

          <EmptyState />
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
