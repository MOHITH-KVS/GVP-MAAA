import { useEffect, useState } from "react";
import api from "../../utils/api";

const FINAL_STATUS_OPTIONS = ["pending", "selected", "rejected"];

export default function TeacherPlacement() {
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [students, setStudents] = useState([]);
  const [canUpdate, setCanUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [editState, setEditState] = useState({});
  const [busyUpdateId, setBusyUpdateId] = useState(null);

  const fetchDrives = async () => {
    setLoading(true);
    setError("");
    try {
      const drivesRes = await api.get("/api/drives");
      setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
      if (!selectedDriveId && Array.isArray(drivesRes.data) && drivesRes.data[0]?.id) {
        setSelectedDriveId(String(drivesRes.data[0].id));
      }
    } catch (err) {
      setError("Unable to load placement drives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  useEffect(() => {
    const fetchDriveStudents = async () => {
      if (!selectedDriveId) return;
      setTableLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/drives/${selectedDriveId}/students`);
        setStudents(Array.isArray(res.data?.students) ? res.data.students : []);
        setCanUpdate(Boolean(res.data?.can_update));
      } catch (err) {
        setError(err?.response?.data?.detail || "Unable to load students for this drive.");
      } finally {
        setTableLoading(false);
      }
    };
    fetchDriveStudents();
  }, [selectedDriveId]);

  const handleUpdate = async (row) => {
    setBusyUpdateId(row.student_id);
    try {
      const state = editState[row.student_id] || {};
      await api.patch(`/api/drives/${selectedDriveId}/students/${row.student_id}`, {
        current_round: Number(state.current_round ?? row.current_round ?? 0),
        final_status: String(state.final_result ?? row.final_result ?? "pending"),
      });
      const refreshed = await api.get(`/api/drives/${selectedDriveId}/students`);
      setStudents(Array.isArray(refreshed.data?.students) ? refreshed.data.students : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update student status.");
    } finally {
      setBusyUpdateId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Placement</h1>
        <p className="mt-2 text-sm text-slate-600">Assigned faculty can update rounds and final results. Others are read-only.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Drive Selection</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading drives...</p>
        ) : (
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {drives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.company_name || "Company"} - {drive.title || "Drive"}
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Drive Students</h2>
        {!canUpdate && (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Read-only mode: only admin or faculty assigned to this drive can update status.
          </p>
        )}

        {tableLoading ? (
          <p className="text-sm text-slate-500">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500">No students found for this drive.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Roll No</th>
                  <th className="px-3 py-2 font-semibold">Branch</th>
                  <th className="px-3 py-2 font-semibold">Year</th>
                  <th className="px-3 py-2 font-semibold">Section</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Current Round</th>
                  <th className="px-3 py-2 font-semibold">Final Result</th>
                  <th className="px-3 py-2 font-semibold">Updated By</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row) => (
                  <tr key={row.student_id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.student_name}</td>
                    <td className="px-3 py-2 text-slate-700">{row.roll_number || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.branch}</td>
                    <td className="px-3 py-2 text-slate-700">{row.year}</td>
                    <td className="px-3 py-2 text-slate-700">{row.section}</td>
                    <td className="px-3 py-2 text-slate-700">{row.status}</td>
                    <td className="px-3 py-2">
                      <select
                        value={editState[row.student_id]?.current_round ?? row.current_round ?? 0}
                        onChange={(e) => setEditState((prev) => ({ ...prev, [row.student_id]: { ...(prev[row.student_id] || {}), current_round: Number(e.target.value) } }))}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                        disabled={!canUpdate}
                      >
                        {[0, 1, 2, 3, 4, 5].map((num) => <option key={num} value={num}>{num}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={editState[row.student_id]?.final_result ?? row.final_result ?? "pending"}
                        onChange={(e) => setEditState((prev) => ({ ...prev, [row.student_id]: { ...(prev[row.student_id] || {}), final_result: e.target.value } }))}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                        disabled={!canUpdate}
                      >
                        {FINAL_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.updated_by || "System"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleUpdate(row)}
                        disabled={!canUpdate || busyUpdateId === row.student_id}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyUpdateId === row.student_id ? "Updating..." : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
