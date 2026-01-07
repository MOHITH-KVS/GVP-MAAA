import { useState } from "react";

/* ================= UTILS ================= */
const isExpired = (expiresAt) => new Date() > new Date(expiresAt);

export default function Alerts() {
  const [showSend, setShowSend] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [tab, setTab] = useState("active"); // active | history

  /* ✅ SUCCESS STATE (FIXED) */
  const [success, setSuccess] = useState({
    message: "",
    type: "", // "success" | "delete"
  });

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      message: "Mid exam postponed to tomorrow",
      priority: "Critical",
      audience: "Students",
      sentAt: "2026-01-12T09:30:00",
      expiresAt: "2026-01-12T23:59:00",
      deleted: false,
    },
    {
      id: 2,
      message: "Faculty meeting at 2 PM",
      priority: "Warning",
      audience: "Teachers",
      sentAt: "2026-01-11T16:00:00",
      expiresAt: "2026-01-13T23:59:00",
      deleted: false,
    },
  ]);

  /* ================= SEND ALERT ================= */
  const handleSendAlert = (data) => {
    setAlerts((prev) => [
      {
        id: Date.now(),
        sentAt: new Date().toISOString(),
        deleted: false,
        ...data,
      },
      ...prev,
    ]);

    setShowSend(false);
    setSuccess({ message: "Alert sent successfully", type: "success" });
    setTimeout(() => setSuccess({ message: "", type: "" }), 2000);
  };

  /* ================= DELETE ALERT ================= */
  const confirmDelete = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === deleteAlert.id
          ? { ...a, deleted: true, deleteReason }
          : a
      )
    );

    setDeleteAlert(null);
    setDeleteReason("");

    setSuccess({ message: "Alert deleted successfully", type: "delete" });
    setTimeout(() => setSuccess({ message: "", type: "" }), 2000);
  };

  /* ================= DERIVED DATA ================= */
  const activeAlerts = alerts.filter(
    (a) => !a.deleted && !isExpired(a.expiresAt)
  );

  const historyAlerts = alerts.filter(
    (a) => a.deleted || isExpired(a.expiresAt)
  );

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-50 to-amber-50 border">
        <h1 className="text-2xl font-semibold text-slate-800">
          Alerts Management
        </h1>
        <p className="text-sm text-slate-600">
          Control urgent institutional communication
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          label="Active Alerts"
          value={activeAlerts.length}
          color="green"
          icon="🔔"
        />
        <SummaryCard
          label="Expired Alerts"
          value={historyAlerts.filter(a => !a.deleted).length}
          color="gray"
          icon="⏱"
        />
        <SummaryCard
          label="Deleted Alerts"
          value={historyAlerts.filter(a => a.deleted).length}
          color="red"
          icon="🗑"
        />
      </div>

      {/* SEND ALERT */}
      <div className="bg-white border rounded-2xl p-6 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Send Alert</h3>
          <p className="text-sm text-gray-500">
            Alerts are time-bound and auto-expire
          </p>
        </div>
        <button
          onClick={() => setShowSend(true)}
          className="px-5 py-2 bg-red-600 text-white rounded-xl"
        >
          Send Alert
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 rounded-lg border ${
            tab === "active" ? "bg-red-600 text-white" : ""
          }`}
        >
          Active Alerts
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg border ${
            tab === "history" ? "bg-gray-800 text-white" : ""
          }`}
        >
          Alert History
        </button>
      </div>

      {/* TABLE */}
      <AlertTable
        data={tab === "active" ? activeAlerts : historyAlerts}
        onDelete={setDeleteAlert}
      />

      {/* SEND MODAL */}
      {showSend && (
        <SendAlertModal
          onCancel={() => setShowSend(false)}
          onSend={handleSendAlert}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteAlert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-600">
              Delete Alert
            </h3>

            <textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason for deletion (mandatory)"
              className="w-full border px-3 py-2 rounded-lg"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteAlert(null);
                  setDeleteReason("");
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!deleteReason}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS ANIMATION (FIXED COLORS) */}
      {success.message && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl text-center space-y-3 animate-bounce">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto
              ${success.type === "delete" ? "bg-red-100" : "bg-green-100"}`}
            >
              <span
                className={`text-3xl
                ${success.type === "delete" ? "text-red-600" : "text-green-600"}`}
              >
                ✓
              </span>
            </div>
            <h3
              className={`font-semibold
              ${success.type === "delete" ? "text-red-600" : "text-green-600"}`}
            >
              {success.message}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function SummaryCard({ label, value, color, icon }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-200 text-gray-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function AlertTable({ data, onDelete }) {
  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">Message</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Audience</th>
            <th className="px-4 py-3">Valid Till</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => {
            const status = a.deleted
              ? "Deleted"
              : isExpired(a.expiresAt)
              ? "Expired"
              : "Active";

            return (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3">{a.message}</td>
                <td className="px-4 py-3">{a.priority}</td>
                <td className="px-4 py-3">{a.audience}</td>
                <td className="px-4 py-3">
                  {new Date(a.expiresAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">{status}</td>
                <td className="px-4 py-3">
                  {!a.deleted && (
                    <button
                      onClick={() => onDelete(a)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-full"
                    >
                      🗑
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SendAlertModal({ onCancel, onSend }) {
  const [data, setData] = useState({
    message: "",
    priority: "Info",
    audience: "Students",
    expiresAt: "",
  });

  const setDurationDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    setData({ ...data, expiresAt: d.toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">Send Alert</h3>

        <select
          className="w-full border px-3 py-2 rounded-lg"
          onChange={(e) => setData({ ...data, priority: e.target.value })}
        >
          <option>Info</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>

        <select
          className="w-full border px-3 py-2 rounded-lg"
          onChange={(e) => setData({ ...data, audience: e.target.value })}
        >
          <option>Students</option>
          <option>Teachers</option>
          <option>Both</option>
        </select>

        <textarea
          rows={3}
          placeholder="Alert message"
          className="w-full border px-3 py-2 rounded-lg"
          onChange={(e) => setData({ ...data, message: e.target.value })}
        />

        <select
          className="w-full border px-3 py-2 rounded-lg"
          onChange={(e) => setDurationDays(Number(e.target.value))}
        >
          <option value="">Valid for...</option>
          <option value="1">1 Day</option>
          <option value="2">2 Days</option>
          <option value="3">3 Days</option>
          <option value="5">5 Days</option>
          <option value="7">7 Days</option>
        </select>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            disabled={!data.message || !data.expiresAt}
            onClick={() => onSend(data)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
          >
            Send Alert
          </button>
        </div>
      </div>
    </div>
  );
}
