import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function PlacementDriveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ drive: null, assigned_faculty: [], eligible_students: [], applied_students: [], interview_progress: [], selection_results: [] });
  const [students, setStudents] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState([]);
  const [busyAssign, setBusyAssign] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [filters, setFilters] = useState({ branch: "", year: "", section: "", status: "" });
  const [editState, setEditState] = useState({});

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.branch) params.append("branch", filters.branch);
    if (filters.year) params.append("year", filters.year);
    if (filters.section) params.append("section", filters.section);
    if (filters.status) params.append("status", filters.status);
    return params.toString();
  }, [filters]);

  const showSuccessModal = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), 2000);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const [detailsRes, facultyRes] = await Promise.all([
          api.get(`/api/drives/${id}/details`),
          api.get("/api/faculty/list"),
        ]);
        setData(detailsRes.data || {});
        setFacultyList(Array.isArray(facultyRes.data) ? facultyRes.data : []);
      } catch (err) {
        console.error("[AdminPlacementDriveDetails] fetchDetails error", err);
        setError("Unable to load drive details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  useEffect(() => {
    const fetchFilteredStudents = async () => {
      if (!id) return;
      setTableLoading(true);
      try {
        const url = filterQuery ? `/api/drives/${id}/students?${filterQuery}` : `/api/drives/${id}/students`;
        const res = await api.get(url);
        setStudents(Array.isArray(res.data?.students) ? res.data.students : []);
      } catch (err) {
        setError("Unable to load students with current filters.");
      } finally {
        setTableLoading(false);
      }
    };
    fetchFilteredStudents();
  }, [id, filterQuery]);

  const handleAssignFaculty = async () => {
    if (!selectedFacultyIds.length) {
      setError("Select faculty to assign.");
      return;
    }
    setBusyAssign(true);
    setError("");
    try {
      const res = await api.post(`/api/drives/${id}/assign-faculty`, { faculty_ids: selectedFacultyIds });
      setData((prev) => ({ ...prev, assigned_faculty: res.data?.assigned_faculty || prev.assigned_faculty }));
      setSelectedFacultyIds([]);
      showSuccessModal("Faculty assigned successfully");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to assign faculty.");
    } finally {
      setBusyAssign(false);
    }
  };

  const handleUpdateStudent = async (row) => {
    setBusyAction(true);
    setError("");
    try {
      const state = editState[row.student_id] || {};
      await api.patch(`/api/drives/${id}/students/${row.student_id}`, {
        current_round: Number(state.current_round ?? row.current_round ?? 0),
        final_status: String(state.final_result ?? row.final_result ?? "pending").toLowerCase(),
      });
      showSuccessModal("Student status updated successfully");
      const url = filterQuery ? `/api/drives/${id}/students?${filterQuery}` : `/api/drives/${id}/students`;
      const refreshed = await api.get(url);
      setStudents(Array.isArray(refreshed.data?.students) ? refreshed.data.students : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update student status.");
    } finally {
      setBusyAction(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setBusyAction(true);
    setError("");
    try {
      if (confirmAction.type === "notify_bulk") {
        await api.post(`/api/drives/${id}/notify`, {});
        showSuccessModal("Bulk notification sent");
      }
      if (confirmAction.type === "notify_filtered") {
        await api.post(`/api/drives/${id}/notify-filtered`, {
          branch: filters.branch ? [filters.branch] : [],
          year: filters.year ? [Number(filters.year)] : [],
          status: filters.status ? [filters.status] : [],
        });
        showSuccessModal("Filtered notification sent");
      }
      if (confirmAction.type === "notify_single") {
        await api.post(`/api/students/${confirmAction.studentId}/notify`, {
          title: `Placement Update - ${data.drive?.company_name || "Drive"}`,
          message: "Your placement status was updated. Check placement page for details.",
          drive_id: Number(id),
        });
        showSuccessModal("Student notification sent");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Action failed.");
    } finally {
      setBusyAction(false);
      setConfirmAction(null);
    }
  };

  const eligibleStudents = students.filter((row) => row.status === "not_applied" || row.status === "applied" || row.status === "in_progress");
  const appliedStudents = students.filter((row) => row.status !== "not_applied");
  const resultStudents = students;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between rounded-3xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Drive Details</h1>
          <p className="mt-1 text-sm text-slate-600">Eligible students, applications, interview tracking, faculty ownership, and notifications.</p>
        </div>
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm" onClick={() => navigate("/admin/placement")}>
          Back
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Loading drive details...</div>
      ) : (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Drive Info</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>Title: {data.drive?.title || "N/A"}</p>
              <p>Company: {data.drive?.company_name || "N/A"}</p>
              <p>Date: {data.drive?.date || "N/A"}</p>
              <p>Mode: {data.drive?.mode || "N/A"}</p>
              <p>Status: {data.drive?.status || "N/A"}</p>
              <p>Location: {data.drive?.location || "N/A"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => setConfirmAction({ type: "notify_bulk" })}>Notify All</button>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => setConfirmAction({ type: "notify_filtered" })}>Notify Filtered</button>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Faculty Assignment</h2>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
              <select
                multiple
                value={selectedFacultyIds.map(String)}
                onChange={(e) => setSelectedFacultyIds(Array.from(e.target.selectedOptions).map((item) => Number(item.value)))}
                className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:max-w-xl"
              >
                {facultyList.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>{faculty.name} ({faculty.email})</option>
                ))}
              </select>
              <button disabled={busyAssign} onClick={handleAssignFaculty} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busyAssign ? "Assigning..." : "Assign Faculty"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(data.assigned_faculty || []).length ? data.assigned_faculty.map((item) => (
                <span key={item.faculty_id} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs">{item.name}</span>
              )) : <p className="text-sm text-slate-500">No faculty assigned yet.</p>}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <input placeholder="Branch" value={filters.branch} onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Year" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Section" value={filters.section} onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All statuses</option>
                <option value="applied">Applied</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </section>

          <DetailTable title="Eligible Students" rows={eligibleStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => setConfirmAction({ type: "notify_single", studentId })} loading={tableLoading || busyAction} />

          <DetailTable title="Applied Students" rows={appliedStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => setConfirmAction({ type: "notify_single", studentId })} loading={tableLoading || busyAction} />

          <DetailTable title="Interview Progress / Selection Results" rows={resultStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => setConfirmAction({ type: "notify_single", studentId })} loading={tableLoading || busyAction} />
        </>
      )}

      {confirmAction && (
        <ConfirmModal
          onCancel={() => setConfirmAction(null)}
          onConfirm={executeConfirmAction}
          busy={busyAction}
          message="Send notification?"
        />
      )}

      {showSuccess && <SuccessModal message={successMessage} />}
    </div>
  );
}

function DetailTable({ title, rows, editState, onEditState, onUpdate, onNotify, loading }) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {!Array.isArray(rows) || rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records found.</p>
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
              {rows.map((row) => (
                <tr key={`${title}-${row.student_id}`} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{row.student_name}</td>
                  <td className="px-3 py-2 text-slate-700">{row.roll_number || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.branch}</td>
                  <td className="px-3 py-2 text-slate-700">{row.year}</td>
                  <td className="px-3 py-2 text-slate-700">{row.section}</td>
                  <td className="px-3 py-2 text-slate-700">{row.status}</td>
                  <td className="px-3 py-2 text-slate-700">
                    <select
                      value={editState[row.student_id]?.current_round ?? row.current_round ?? 0}
                      onChange={(e) => onEditState((prev) => ({ ...prev, [row.student_id]: { ...(prev[row.student_id] || {}), current_round: Number(e.target.value) } }))}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      {[0, 1, 2, 3, 4, 5].map((num) => <option key={num} value={num}>{num}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <select
                      value={editState[row.student_id]?.final_result ?? row.final_result ?? "pending"}
                      onChange={(e) => onEditState((prev) => ({ ...prev, [row.student_id]: { ...(prev[row.student_id] || {}), final_result: e.target.value } }))}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option value="pending">pending</option>
                      <option value="selected">selected</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.updated_by || "System"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button disabled={loading || !row.can_update} onClick={() => onUpdate(row)} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                        Update
                      </button>
                      <button disabled={loading} onClick={() => onNotify(row.student_id)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                        Notify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ConfirmModal({ onCancel, onConfirm, busy, message }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">Confirm</h4>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm" disabled={busy}>Cancel</button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" disabled={busy}>{busy ? "Sending..." : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ message }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl" style={{ animation: "placement-success-pop 300ms ease-out" }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <p className="text-lg font-semibold text-slate-900">Success</p>
        <p className="mt-1 text-sm text-slate-600">{message || "Action completed successfully"}</p>
      </div>
      <style>{`@keyframes placement-success-pop { from { opacity: 0; transform: scale(0.8);} to { opacity: 1; transform: scale(1);} }`}</style>
    </div>
  );
}
