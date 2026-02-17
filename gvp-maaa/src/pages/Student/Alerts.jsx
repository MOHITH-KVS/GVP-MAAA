import { useEffect, useState } from "react";

export default function Alerts({ alerts = [], setAlerts, loading }) {
  const [filter, setFilter] = useState("All");

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch("http://localhost:8000/student/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch alerts");

      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("access_token");

      await fetch(`http://localhost:8000/alerts/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, is_read: true } : a
        )
      );
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const filteredAlerts =
  filter === "All"
    ? alerts
    : alerts.filter(
        (a) =>
          a.type &&
          a.type.toLowerCase() === filter.toLowerCase()
      );


  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100">
        <h1 className="text-2xl font-semibold">🔔 Alerts Center</h1>
        <p className="text-gray-600 mt-1">
          Alerts received from admin
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        {[
            "All",
            "class timetable",
            "mid exam",
            "semester exam",
            "event timetable"
          ].map((tab) => (

          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm border transition
              ${
                filter === tab
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-gray-100"
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ALERT LIST */}
      <div className="glass rounded-3xl p-6 space-y-5">
        {loading ? (
          <EmptyState />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState />
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 rounded-xl p-4 space-y-2 transition
                ${
                  alert.is_read
                    ? "bg-gray-100 border-gray-300 opacity-70"
                    : "bg-indigo-50 border-indigo-500"
                }
              `}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white border">
                  {alert.type?.replace(/\b\w/g, c => c.toUpperCase())}
                </span>

                <span className="text-xs text-gray-500">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </div>

              <h3 className="font-semibold">{alert.title}</h3>
              <p className="text-sm text-gray-700">{alert.message}</p>

              {!alert.is_read && (
                <button
                  onClick={() => markAsRead(alert.id)}
                  className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Mark as Read
                </button>
              )}

              {alert.is_read && (
                <p className="text-xs text-green-600 font-medium">
                  ✔ Read
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-3xl mb-2">🔔</div>
      <p className="font-medium">No alerts found</p>
      <p className="text-sm">Try a different filter</p>
    </div>
  );
}
