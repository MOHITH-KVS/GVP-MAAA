import { useEffect, useState } from "react";
import api from "../../utils/axios";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchAlerts = async () => {
      try {
        const [adminRes, proactiveRes] = await Promise.all([
          api.get("/admin/alerts"),
          api.get("/chat/alert-notifications"),
        ]);

        if (!mounted) return;

        const adminAlerts = Array.isArray(adminRes.data)
          ? adminRes.data.map((item) => ({
              id: item.id,
              title: item.title || "Admin Alert",
              message: item.message || "",
              type: item.type || "notice",
              created_at: item.created_at,
              source: "admin",
            }))
          : [];

        const proactiveAlerts = Array.isArray(proactiveRes.data)
          ? proactiveRes.data.map((item) => ({
              id: `proactive-${item.id || Date.now()}`,
              title: item.title || "Proactive Alert",
              message: item.message || "",
              type: item.type || "proactive",
              created_at: item.created_at,
              source: "chatbot",
            }))
          : [];

        const merged = [...proactiveAlerts, ...adminAlerts].sort(
          (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
        );

        setAlerts(merged);
      } catch (err) {
        console.error("Failed to fetch admin alerts", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAlerts();
    const timer = setInterval(fetchAlerts, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-50 to-amber-50 border">
        <h1 className="text-2xl font-semibold text-slate-800">Alerts Management</h1>
        <p className="text-sm text-slate-600">System alerts plus proactive chatbot alerts</p>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Recent Alerts</p>
          <span className="text-xs text-gray-500">Total: {alerts.length}</span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No alerts available.</p>
        ) : (
          <div className="divide-y">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-5 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-800">{alert.title}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white text-gray-600">
                    {alert.type}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Source: {alert.source}</span>
                  <span>{alert.created_at ? new Date(alert.created_at).toLocaleString() : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
