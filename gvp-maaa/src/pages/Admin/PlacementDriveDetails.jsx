import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

const BRANCH_OPTIONS = ["CSE", "CSM", "ECE", "EEE", "MECH", "CIVIL"];
const YEAR_OPTIONS = [1, 2, 3, 4];
const SECTION_OPTIONS = ["A", "B", "C", "D"];
const STATUS_OPTIONS = ["not_applied", "applied", "in_progress", "selected", "rejected"];

export default function PlacementDriveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ drive: null, assigned_faculty: [], coordinator_assignments: [], eligible_students: [], applied_students: [], interview_progress: [], selection_results: [] });
  const [students, setStudents] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ faculty_id: "", department: "", assigned_from: "", assigned_to: "" });
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [busyAssign, setBusyAssign] = useState(false);
  const [busyCoordinator, setBusyCoordinator] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAction, setPreviewAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [filters, setFilters] = useState({ branch: "", year: "", section: "", status: "" });
  const [editState, setEditState] = useState({});
  const [coordinatorForm, setCoordinatorForm] = useState({ faculty_id: "", assigned_from: "", assigned_to: "" });

  const toDateTimeInput = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 16);
  };

  const toIsoString = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

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
        const url = filterQuery ? `/api/drives/${id}/eligible-students?${filterQuery}` : `/api/drives/${id}/eligible-students`;
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
    if (!pendingAssignments.length) {
      setError("Add at least one assignment item.");
      return;
    }
    setBusyAssign(true);
    setError("");
    try {
      const res = await api.post(`/api/drives/${id}/assign-faculty`, { assignments: pendingAssignments });
      setData((prev) => ({ ...prev, assigned_faculty: res.data?.assigned_faculty || prev.assigned_faculty }));
      setPendingAssignments([]);
      setAssignmentForm({ faculty_id: "", department: "", assigned_from: "", assigned_to: "" });
      showSuccessModal("Faculty assigned successfully");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to assign faculty.");
    } finally {
      setBusyAssign(false);
    }
  };

  const addAssignmentItem = () => {
    if (!assignmentForm.faculty_id || !assignmentForm.department || !assignmentForm.assigned_from || !assignmentForm.assigned_to) {
      setError("Faculty, department, from date and to date are required.");
      return;
    }
    if (assignmentForm.assigned_to < assignmentForm.assigned_from) {
      setError("To date must be on or after from date.");
      return;
    }

    setPendingAssignments((prev) => [
      ...prev,
      {
        faculty_id: Number(assignmentForm.faculty_id),
        department: assignmentForm.department,
        assigned_from: assignmentForm.assigned_from,
        assigned_to: assignmentForm.assigned_to,
      },
    ]);
    setAssignmentForm({ faculty_id: "", department: "", assigned_from: "", assigned_to: "" });
  };

  const updateFacultyAssignment = async (mapping) => {
    setBusyAssign(true);
    setError("");
    try {
      await api.put(`/api/drives/${id}/faculty/${mapping.id}`, {
        assigned_from: mapping.assigned_from,
        assigned_to: mapping.assigned_to,
        is_active: mapping.is_active,
      });
      showSuccessModal("Faculty validity updated");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update faculty assignment.");
    } finally {
      setBusyAssign(false);
    }
  };

  const removeFacultyAssignment = async (mappingId) => {
    setBusyAssign(true);
    setError("");
    try {
      await api.delete(`/api/drives/${id}/faculty/${mappingId}`);
      setData((prev) => ({
        ...prev,
        assigned_faculty: (prev.assigned_faculty || []).map((item) => (item.id === mappingId ? { ...item, is_active: false } : item)),
      }));
      showSuccessModal("Faculty assignment removed");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to remove faculty assignment.");
    } finally {
      setBusyAssign(false);
    }
  };

  const handleAssignCoordinator = async () => {
    if (!coordinatorForm.faculty_id || !coordinatorForm.assigned_from || !coordinatorForm.assigned_to) {
      setError("Coordinator faculty and date range are required.");
      return;
    }

    const assignedFrom = toIsoString(coordinatorForm.assigned_from);
    const assignedTo = toIsoString(coordinatorForm.assigned_to);
    if (!assignedFrom || !assignedTo) {
      setError("Invalid coordinator assignment dates.");
      return;
    }
    if (assignedTo < assignedFrom) {
      setError("Coordinator end time must be on or after start time.");
      return;
    }

    setBusyCoordinator(true);
    setError("");
    try {
      const res = await api.post("/api/admin/coordinator/assign", {
        faculty_id: Number(coordinatorForm.faculty_id),
        drive_id: Number(id),
        assigned_from: assignedFrom,
        assigned_to: assignedTo,
      });
      const newAssignment = res.data?.assignment;
      setData((prev) => ({
        ...prev,
        coordinator_assignments: newAssignment ? [newAssignment, ...(prev.coordinator_assignments || [])] : prev.coordinator_assignments,
      }));
      setCoordinatorForm({ faculty_id: "", assigned_from: "", assigned_to: "" });
      showSuccessModal("Coordinator assigned successfully");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to assign coordinator.");
    } finally {
      setBusyCoordinator(false);
    }
  };

  const updateCoordinatorAssignment = async (assignment) => {
    const assignedFrom = toIsoString(assignment.assigned_from);
    const assignedTo = toIsoString(assignment.assigned_to);
    if (!assignedTo) {
      setError("Coordinator end time is required.");
      return;
    }
    if (assignedFrom && assignedTo < assignedFrom) {
      setError("Coordinator end time must be on or after start time.");
      return;
    }

    setBusyCoordinator(true);
    setError("");
    try {
      const res = await api.put(`/api/admin/coordinator/assignments/${assignment.id}/extend`, {
        assigned_from: assignedFrom,
        assigned_to: assignedTo,
      });
      const updated = res.data?.assignment;
      if (updated) {
        setData((prev) => ({
          ...prev,
          coordinator_assignments: (prev.coordinator_assignments || []).map((item) => (item.id === updated.id ? updated : item)),
        }));
      }
      showSuccessModal("Coordinator assignment updated");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update coordinator assignment.");
    } finally {
      setBusyCoordinator(false);
    }
  };

  const revokeCoordinatorAssignment = async (assignmentId) => {
    setBusyCoordinator(true);
    setError("");
    try {
      await api.delete(`/api/admin/coordinator/assignments/${assignmentId}`);
      setData((prev) => ({
        ...prev,
        coordinator_assignments: (prev.coordinator_assignments || []).map((item) => (item.id === assignmentId ? { ...item, is_active: false, active_now: false } : item)),
      }));
      showSuccessModal("Coordinator assignment revoked");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to revoke coordinator assignment.");
    } finally {
      setBusyCoordinator(false);
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
      const url = filterQuery ? `/api/drives/${id}/eligible-students?${filterQuery}` : `/api/drives/${id}/eligible-students`;
      const refreshed = await api.get(url);
      setStudents(Array.isArray(refreshed.data?.students) ? refreshed.data.students : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update student status.");
    } finally {
      setBusyAction(false);
    }
  };

  const openNotifyPreview = async (type, studentId = null) => {
    setBusyAction(true);
    setError("");
    try {
      if (type === "notify_bulk") {
        const previewRes = await api.get(`/api/drives/${id}/notify-preview`);
        setPreviewAction({ type, preview: previewRes.data || {} });
      } else if (type === "notify_filtered") {
        setPreviewAction({
          type,
          preview: {
            total_students: students.length,
            eligible_count: students.filter((row) => row.is_eligible).length,
            branch_wise_count: students.reduce((acc, row) => {
              const branch = row.branch || "N/A";
              acc[branch] = (acc[branch] || 0) + 1;
              return acc;
            }, {}),
            recipients: students.slice(0, 12),
          },
        });
      } else if (type === "notify_single" && studentId) {
        const student = students.find((row) => row.student_id === studentId) || {};
        setPreviewAction({
          type,
          studentId,
          preview: {
            total_students: 1,
            eligible_count: student.is_eligible ? 1 : 0,
            recipients: [student],
          },
        });
      }
      setShowPreview(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to preview notification.");
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

  const executePreviewAction = async () => {
    if (!previewAction) return;
    setBusyAction(true);
    setError("");
    try {
      if (previewAction.type === "notify_bulk") {
        await api.post(`/api/drives/${id}/notify`, {});
        showSuccessModal("Bulk notification sent");
      }
      if (previewAction.type === "notify_filtered") {
        await api.post(`/api/drives/${id}/notify-filtered`, {
          branch: filters.branch ? [filters.branch] : [],
          year: filters.year ? [Number(filters.year)] : [],
          status: filters.status ? [filters.status] : [],
        });
        showSuccessModal("Filtered notification sent");
      }
      if (previewAction.type === "notify_single") {
        await api.post(`/api/students/${previewAction.studentId}/notify`, {
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
      setShowPreview(false);
      setPreviewAction(null);
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
              <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => openNotifyPreview("notify_bulk")}>Notify All</button>
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => openNotifyPreview("notify_filtered")}>Notify Filtered</button>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Faculty Assignment</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <select value={assignmentForm.faculty_id} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, faculty_id: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select faculty</option>
                {facultyList.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>{faculty.name} ({faculty.email})</option>
                ))}
              </select>
              <select value={assignmentForm.department} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">Department</option>
                {BRANCH_OPTIONS.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <input type="date" value={assignmentForm.assigned_from} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assigned_from: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input type="date" value={assignmentForm.assigned_to} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assigned_to: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={addAssignmentItem} className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                Add
              </button>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending Assignments</p>
              {pendingAssignments.length === 0 ? (
                <p className="text-sm text-slate-500">No pending assignments.</p>
              ) : (
                <div className="space-y-2">
                  {pendingAssignments.map((item, index) => {
                    const faculty = facultyList.find((f) => f.id === item.faculty_id);
                    return (
                      <div key={`${item.faculty_id}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <span>{faculty?.name || item.faculty_id} | {item.department} | {item.assigned_from} to {item.assigned_to}</span>
                        <button type="button" onClick={() => setPendingAssignments((prev) => prev.filter((_, idx) => idx !== index))} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4">
              <button disabled={busyAssign || pendingAssignments.length === 0} onClick={handleAssignFaculty} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busyAssign ? "Assigning..." : "Assign Faculty"}
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-2">Faculty</th>
                    <th className="px-2 py-2">Department</th>
                    <th className="px-2 py-2">From</th>
                    <th className="px-2 py-2">To</th>
                    <th className="px-2 py-2">Assigned By</th>
                    <th className="px-2 py-2">Active</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.assigned_faculty || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{item.name}</td>
                      <td className="px-2 py-2">{item.department || "N/A"}</td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={item.assigned_from || ""}
                          onChange={(e) => setData((prev) => ({
                            ...prev,
                            assigned_faculty: (prev.assigned_faculty || []).map((row) => (row.id === item.id ? { ...row, assigned_from: e.target.value } : row)),
                          }))}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={item.assigned_to || ""}
                          onChange={(e) => setData((prev) => ({
                            ...prev,
                            assigned_faculty: (prev.assigned_faculty || []).map((row) => (row.id === item.id ? { ...row, assigned_to: e.target.value } : row)),
                          }))}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">{item.assigned_by || "System"}</td>
                      <td className="px-2 py-2">{item.is_active ? "Yes" : "No"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button type="button" className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => updateFacultyAssignment(item)}>
                            Save
                          </button>
                          <button type="button" className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white" onClick={() => removeFacultyAssignment(item.id)} disabled={!item.is_active}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <select value={filters.branch} onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All branches</option>
                {BRANCH_OPTIONS.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <select value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All years</option>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={filters.section} onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All sections</option>
                {SECTION_OPTIONS.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Assign Placement Coordinator</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <select
                value={coordinatorForm.faculty_id}
                onChange={(e) => setCoordinatorForm((prev) => ({ ...prev, faculty_id: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select faculty</option>
                {facultyList.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>{faculty.name} ({faculty.email})</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={coordinatorForm.assigned_from}
                onChange={(e) => setCoordinatorForm((prev) => ({ ...prev, assigned_from: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={coordinatorForm.assigned_to}
                onChange={(e) => setCoordinatorForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busyCoordinator}
                onClick={handleAssignCoordinator}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busyCoordinator ? "Assigning..." : "Assign Coordinator"}
              </button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-2">Faculty</th>
                    <th className="px-2 py-2">Scope</th>
                    <th className="px-2 py-2">From</th>
                    <th className="px-2 py-2">To</th>
                    <th className="px-2 py-2">Assigned By</th>
                    <th className="px-2 py-2">Active</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.coordinator_assignments || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{item.faculty_name || item.faculty_email || item.faculty_id}</td>
                      <td className="px-2 py-2">{item.scope === "global" ? "Global" : "Drive"}</td>
                      <td className="px-2 py-2">
                        <input
                          type="datetime-local"
                          value={toDateTimeInput(item.assigned_from)}
                          onChange={(e) => setData((prev) => ({
                            ...prev,
                            coordinator_assignments: (prev.coordinator_assignments || []).map((row) => (row.id === item.id ? { ...row, assigned_from: e.target.value } : row)),
                          }))}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="datetime-local"
                          value={toDateTimeInput(item.assigned_to)}
                          onChange={(e) => setData((prev) => ({
                            ...prev,
                            coordinator_assignments: (prev.coordinator_assignments || []).map((row) => (row.id === item.id ? { ...row, assigned_to: e.target.value } : row)),
                          }))}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">{item.created_by || "System"}</td>
                      <td className="px-2 py-2">{item.active_now ? "Active" : item.is_active ? "Scheduled/Expired" : "Revoked"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyCoordinator}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            onClick={() => updateCoordinatorAssignment(item)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={busyCoordinator || !item.is_active}
                            className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            onClick={() => revokeCoordinatorAssignment(item.id)}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <DetailTable title="Eligible Students" rows={eligibleStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => openNotifyPreview("notify_single", studentId)} loading={tableLoading || busyAction} />

          <DetailTable title="Applied Students" rows={appliedStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => openNotifyPreview("notify_single", studentId)} loading={tableLoading || busyAction} />

          <DetailTable title="Interview Progress / Selection Results" rows={resultStudents} onEditState={setEditState} editState={editState} onUpdate={handleUpdateStudent} onNotify={(studentId) => openNotifyPreview("notify_single", studentId)} loading={tableLoading || busyAction} />
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

      {showPreview && previewAction && (
        <PreviewModal action={previewAction} onCancel={() => { setShowPreview(false); setPreviewAction(null); }} onConfirm={executePreviewAction} busy={busyAction} />
      )}

      {showSuccess && <SuccessModal message={successMessage} />}
    </div>
  );
}

function PreviewModal({ action, onCancel, onConfirm, busy }) {
  const preview = action.preview || {};
  const items =
    action.type === "notify_bulk"
      ? [
          `Total students: ${preview.total_students ?? 0}`,
          `Eligible students: ${preview.eligible_count ?? 0}`,
          `Recipients preview: ${(preview.recipients || []).length}`,
        ]
      : action.type === "notify_filtered"
        ? [
            `Filtered students: ${preview.total_students ?? 0}`,
            `Eligible in filter: ${preview.eligible_count ?? 0}`,
            `Recipients preview: ${(preview.recipients || []).length}`,
          ]
        : [
            `Student: ${(preview.recipients?.[0]?.student_name) || "N/A"}`,
            `Branch: ${(preview.recipients?.[0]?.branch) || "N/A"}`,
            `Eligible: ${preview.eligible_count ? "Yes" : "No"}`,
          ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">Preview Notification</h4>
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {items.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700" disabled={busy}>
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy}>
            {busy ? "Sending..." : "Confirm"}
          </button>
        </div>
      </div>
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
