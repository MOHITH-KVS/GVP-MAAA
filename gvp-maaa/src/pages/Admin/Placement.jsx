import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BASE_URL = "http://127.0.0.1:8000";
const BRANCH_OPTIONS = ["CSE", "CSM", "ECE", "EEE", "MECH", "CIVIL"];
const YEAR_OPTIONS = [1, 2, 3, 4];

const DRIVE_DEFAULT = {
  title: "",
  company_name: "",
  role: "",
  package: "",
  min_cgpa: "",
  max_backlogs: "",
  date: "",
  location: "",
  registration_deadline: "",
  apply_link: "",
  details_pdf: "",
  eligible_years: [],
  branches: [],
  selection_process: [],
  mode: "online",
  status: "open",
};

export default function AdminPlacement() {
  const navigate = useNavigate();
  const successTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingDrive, setSubmittingDrive] = useState(false);

  const [dashboard, setDashboard] = useState({
    total_companies: 0,
    active_drives: 0,
    total_eligible_students: 0,
    total_selections: 0,
    success_rate: 0,
  });
  const [analytics, setAnalytics] = useState({
    selection_rate_by_company: [],
    branch_performance: [],
    cgpa_vs_selection: [],
  });
  const [drives, setDrives] = useState([]);

  const [showDriveForm, setShowDriveForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Action completed successfully");
  const [actionBusyByDrive, setActionBusyByDrive] = useState({});
  const [driveForm, setDriveForm] = useState(DRIVE_DEFAULT);
  const [editingDrive, setEditingDrive] = useState(null);
  const [previewAction, setPreviewAction] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const selectionRateBars = useMemo(
    () => (analytics.selection_rate_by_company || []).map((item) => ({ name: item.company_name, rate: item.selection_rate })),
    [analytics.selection_rate_by_company]
  );

  const branchBars = useMemo(
    () => (analytics.branch_performance || []).map((item) => ({ name: item.branch, rate: item.selection_rate })),
    [analytics.branch_performance]
  );

  const readErrorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.message || err?.message || fallback;

  const showSuccessModal = (message, afterClose) => {
    setSuccessMessage(message || "Action completed successfully");
    setShowSuccess(true);
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = window.setTimeout(async () => {
      setShowSuccess(false);
      if (typeof afterClose === "function") {
        await afterClose();
      }
    }, 1600);
  };

  const buildDrivePayload = (form) => ({
    title: form.title.trim(),
    company_name: form.company_name.trim(),
    role: form.role.trim(),
    package: Number(form.package),
    min_cgpa: Number(form.min_cgpa),
    max_backlogs: Number(form.max_backlogs),
    date: form.date,
    location: form.location.trim(),
    registration_deadline: form.registration_deadline,
    apply_link: form.apply_link.trim() || null,
    details_pdf: form.details_pdf.trim() || null,
    eligible_years: form.eligible_years.map((y) => Number(y)),
    branches: form.branches,
    selection_process: form.selection_process,
    mode: form.mode,
    status: form.status,
  });

  const toDriveForm = (drive) => ({
    title: drive.title || "",
    company_name: drive.company_name || "",
    role: drive.role || "",
    package: drive.package ?? "",
    min_cgpa: drive.min_cgpa ?? "",
    max_backlogs: drive.max_backlogs ?? "",
    date: drive.drive_date || "",
    location: drive.location || "",
    registration_deadline: drive.registration_deadline || "",
    apply_link: drive.apply_link || "",
    details_pdf: drive.details_pdf || "",
    eligible_years: Array.isArray(drive.eligible_years) ? drive.eligible_years : [],
    branches: Array.isArray(drive.branches) ? drive.branches : [],
    selection_process: Array.isArray(drive.selection_process) ? drive.selection_process : [],
    mode: drive.mode || "online",
    status: drive.status || "open",
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [drivesRes, analyticsRes, dashboardRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/drives`, { headers: authHeaders }),
        axios.get(`${BASE_URL}/api/admin/placement/analytics`, { headers: authHeaders }),
        axios.get(`${BASE_URL}/api/admin/placement/dashboard`, { headers: authHeaders }),
      ]);

      setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
      setAnalytics(analyticsRes.data || {});
      setDashboard(dashboardRes.data || {});
    } catch (err) {
      setError(readErrorMessage(err, "Failed to load placement data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const validateDrive = () => {
    if (!driveForm.title.trim()) return "Drive title is required.";
    if (!driveForm.company_name.trim()) return "Company name is required.";
    if (!driveForm.role.trim()) return "Role is required.";

    const packageValue = Number(driveForm.package);
    if (Number.isNaN(packageValue) || packageValue <= 0) return "Package must be greater than 0.";

    const minCgpa = Number(driveForm.min_cgpa);
    if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) return "Min CGPA must be between 0 and 10.";

    const maxBacklogs = Number(driveForm.max_backlogs);
    if (Number.isNaN(maxBacklogs) || maxBacklogs < 0) return "Max backlogs must be 0 or higher.";

    if (!driveForm.date) return "Drive date is required.";
    if (!driveForm.registration_deadline) return "Registration deadline is required.";
    if (driveForm.registration_deadline > driveForm.date) return "Registration deadline must be on or before drive date.";
    if (!driveForm.location.trim()) return "Location is required.";

    if (driveForm.apply_link && !/^https?:\/\//i.test(driveForm.apply_link.trim())) return "Apply link must be a valid URL.";
    if (driveForm.details_pdf && !/^https?:\/\//i.test(driveForm.details_pdf.trim())) return "Details PDF must be a valid URL.";

    if (!driveForm.eligible_years.length) return "Select at least one eligible year.";
    if (!driveForm.branches.length) return "Select at least one branch.";

    return "";
  };

  const submitDrive = async () => {
    const payload = buildDrivePayload(driveForm);

    if (editingDrive) {
      try {
        setSubmittingDrive(true);
        setError("");
        const previewRes = await axios.post(`${BASE_URL}/api/drives/${editingDrive.id}/edit-preview`, payload, { headers: authHeaders });
        setPreviewAction({ kind: "edit", driveId: editingDrive.id, payload, preview: previewRes.data });
        setShowPreview(true);
        setShowDriveForm(false);
      } catch (err) {
        setError(readErrorMessage(err, "Failed to preview drive update."));
      } finally {
        setSubmittingDrive(false);
      }
      return;
    }

    try {
      setSubmittingDrive(true);
      setError("");

      await axios.post(`${BASE_URL}/api/drives`, payload, { headers: authHeaders });
      setShowDriveForm(false);

      showSuccessModal("Drive created successfully", async () => {
        setDriveForm(DRIVE_DEFAULT);
        await fetchData();
      });
    } catch (err) {
      setError(readErrorMessage(err, "Failed to create drive"));
    } finally {
      setSubmittingDrive(false);
      setShowConfirm(false);
    }
  };

  const openCreateConfirm = (e) => {
    e.preventDefault();
    const validationError = validateDrive();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (editingDrive) {
      submitDrive();
      return;
    }
    setShowConfirm(true);
  };

  const openEditDrive = (drive) => {
    setEditingDrive(drive);
    setDriveForm(toDriveForm(drive));
    setShowDriveForm(true);
  };

  const loadPreview = async (kind, drive, requestData = {}) => {
    const driveId = drive.id;
    setActionBusyByDrive((prev) => ({ ...prev, [`${kind}-${driveId}`]: true }));
    try {
      let response;
      if (kind === "notify") {
        response = await axios.get(`${BASE_URL}/api/drives/${driveId}/notify-preview`, { headers: authHeaders });
      } else if (kind === "close") {
        response = await axios.get(`${BASE_URL}/api/drives/${driveId}/close-preview`, { headers: authHeaders });
      } else if (kind === "reopen") {
        response = await axios.get(`${BASE_URL}/api/drives/${driveId}/reopen-preview`, { headers: authHeaders });
      } else {
        response = await axios.post(`${BASE_URL}/api/drives/${driveId}/edit-preview`, requestData, { headers: authHeaders });
      }

      setPreviewAction({ kind, driveId, drive, payload: requestData, preview: response.data });
      setShowPreview(true);
    } catch (err) {
      setError(readErrorMessage(err, `Failed to preview ${kind} action.`));
    } finally {
      setActionBusyByDrive((prev) => ({ ...prev, [`${kind}-${driveId}`]: false }));
    }
  };

  const notifyStudents = async (drive) => {
    await loadPreview("notify", drive);
  };

  const closeDrive = async (drive) => {
    await loadPreview("close", drive);
  };

  const reopenDrive = async (drive) => {
    await loadPreview("reopen", drive);
  };

  const confirmPreviewAction = async () => {
    if (!previewAction) return;

    const { kind, driveId, payload } = previewAction;
    setActionBusyByDrive((prev) => ({ ...prev, [`confirm-${kind}-${driveId}`]: true }));
    try {
      if (kind === "notify") {
        await axios.post(`${BASE_URL}/api/drives/${driveId}/notify`, {}, { headers: authHeaders });
        showSuccessModal("Notifications sent successfully");
      } else if (kind === "close") {
        await axios.put(`${BASE_URL}/api/drives/${driveId}/close`, {}, { headers: authHeaders });
        showSuccessModal("Drive closed successfully");
      } else if (kind === "reopen") {
        await axios.post(`${BASE_URL}/api/drives/${driveId}/reopen`, {}, { headers: authHeaders });
        showSuccessModal("Drive reopened successfully");
      } else if (kind === "edit") {
        await axios.patch(`${BASE_URL}/api/drives/${driveId}`, payload, { headers: authHeaders });
        showSuccessModal("Drive updated successfully");
      }

      setShowPreview(false);
      setPreviewAction(null);
      await fetchData();
    } catch (err) {
      setError(readErrorMessage(err, `Failed to complete ${kind} action.`));
    } finally {
      setActionBusyByDrive((prev) => ({ ...prev, [`confirm-${kind}-${driveId}`]: false }));
    }
  };

  if (loading) {
    return <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">Loading placement data...</div>;
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Placement Drive Control Center</h1>
        <p className="mt-2 text-sm text-slate-600">Create and monitor real placement drives with clean workflow and live analytics.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Companies" value={dashboard.total_companies || 0} />
        <KpiCard label="Total Drives" value={drives.length} />
        <KpiCard label="Eligible Students" value={dashboard.total_eligible_students || 0} />
        <KpiCard label="Selected Students" value={dashboard.total_selections || 0} />
        <KpiCard label="Success Rate" value={`${Number(dashboard.success_rate || 0).toFixed(2)}%`} />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Drive Management</h2>
          <button
            onClick={() => {
              setEditingDrive(null);
              setDriveForm(DRIVE_DEFAULT);
              setShowDriveForm(true);
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create Drive
          </button>
        </div>

        {drives.length === 0 ? (
          <p className="text-sm text-slate-500">No placement drives available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Company</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Package</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Eligible</th>
                  <th className="px-3 py-2 font-semibold">Applied</th>
                  <th className="px-3 py-2 font-semibold">Selected</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{drive.title || "Untitled"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.company_name || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.role || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.package ? `${drive.package} LPA` : "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.drive_date || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.status || "open"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.eligible_count || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.applied_count || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.selected_count || 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg bg-slate-100 px-2 py-1 text-xs" onClick={() => navigate(`/admin/placement/drives/${drive.id}`)}>
                          Details
                        </button>
                        <button className="rounded-lg bg-blue-100 px-2 py-1 text-xs text-blue-700" onClick={() => notifyStudents(drive)}>
                          {actionBusyByDrive[`notify-${drive.id}`] ? "Notifying..." : "Notify"}
                        </button>
                        <button className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-700" onClick={() => openEditDrive(drive)}>
                          Edit
                        </button>
                        {drive.status === "closed" ? (
                          <button className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-700" onClick={() => reopenDrive(drive)}>
                            {actionBusyByDrive[`reopen-${drive.id}`] ? "Previewing..." : "Reopen"}
                          </button>
                        ) : (
                          <button className="rounded-lg bg-red-100 px-2 py-1 text-xs text-red-700" onClick={() => closeDrive(drive)}>
                            {actionBusyByDrive[`close-${drive.id}`] ? "Previewing..." : "Close"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Selection Rate by Company">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={selectionRateBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Branch-wise Performance">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={branchBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CGPA vs Selection">
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="cgpa" name="CGPA" domain={[0, 10]} />
              <YAxis type="number" dataKey="selected" name="Selected" domain={[0, 1]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={analytics.cgpa_vs_selection || []} fill="#1d4ed8">
                {(analytics.cgpa_vs_selection || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.selected ? "#16a34a" : "#dc2626"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {showDriveForm && (
        <Modal title={editingDrive ? "Edit Drive" : "Create Drive"} onClose={() => { setShowDriveForm(false); setEditingDrive(null); }}>
          <form className="space-y-5" onSubmit={openCreateConfirm}>
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Section 1: Company Info</h3>
              <Field required label="Drive Title" value={driveForm.title} onChange={(value) => setDriveForm((prev) => ({ ...prev, title: value }))} />
              <Field required label="Company Name" value={driveForm.company_name} onChange={(value) => setDriveForm((prev) => ({ ...prev, company_name: value }))} />
              <Field required label="Role" value={driveForm.role} onChange={(value) => setDriveForm((prev) => ({ ...prev, role: value }))} />
              <Field required label="Package (LPA)" type="number" step="0.01" value={driveForm.package} onChange={(value) => setDriveForm((prev) => ({ ...prev, package: value }))} />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selection Process (optional)</label>
              <TagInput values={driveForm.selection_process} onChange={(values) => setDriveForm((prev) => ({ ...prev, selection_process: values }))} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Section 2: Eligibility</h3>
              <Field required label="Min CGPA" type="number" step="0.01" value={driveForm.min_cgpa} onChange={(value) => setDriveForm((prev) => ({ ...prev, min_cgpa: value }))} />
              <Field required label="Max Backlogs" type="number" value={driveForm.max_backlogs} onChange={(value) => setDriveForm((prev) => ({ ...prev, max_backlogs: value }))} />

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligible Years</label>
              <YearToggle selected={driveForm.eligible_years} onToggle={(year) => setDriveForm((prev) => ({ ...prev, eligible_years: toggleInArray(prev.eligible_years, year) }))} />

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branches</label>
              <MultiSelectChips options={BRANCH_OPTIONS} selected={driveForm.branches} onToggle={(value) => setDriveForm((prev) => ({ ...prev, branches: toggleInArray(prev.branches, value) }))} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Section 3: Drive Info</h3>
              <Field required label="Date" type="date" value={driveForm.date} onChange={(value) => setDriveForm((prev) => ({ ...prev, date: value }))} />
              <Field required label="Registration Deadline" type="date" value={driveForm.registration_deadline} onChange={(value) => setDriveForm((prev) => ({ ...prev, registration_deadline: value }))} />
              <Field required label="Location" value={driveForm.location} onChange={(value) => setDriveForm((prev) => ({ ...prev, location: value }))} />
              <Field label="Apply Link (URL)" value={driveForm.apply_link} onChange={(value) => setDriveForm((prev) => ({ ...prev, apply_link: value }))} />
              <Field label="Details PDF (URL)" value={driveForm.details_pdf} onChange={(value) => setDriveForm((prev) => ({ ...prev, details_pdf: value }))} />

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={driveForm.mode} onChange={(e) => setDriveForm((prev) => ({ ...prev, mode: e.target.value }))}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={driveForm.status} onChange={(e) => setDriveForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </section>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white pt-3">
              <button disabled={submittingDrive} type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submittingDrive ? (editingDrive ? "Preparing preview..." : "Creating...") : editingDrive ? "Preview Update" : "Create Drive"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Confirm Drive Creation"
          message={`Create drive ${driveForm.title.trim()} for ${driveForm.company_name.trim()}?`}
          onCancel={() => setShowConfirm(false)}
          onConfirm={submitDrive}
          loading={submittingDrive}
        />
      )}

      {showPreview && previewAction && (
        <PreviewModal
          action={previewAction}
          loading={Boolean(actionBusyByDrive[`confirm-${previewAction.kind}-${previewAction.driveId}`])}
          onCancel={() => {
            setShowPreview(false);
            setPreviewAction(null);
          }}
          onConfirm={confirmPreviewAction}
        />
      )}

      {showSuccess && <SuccessModal message={successMessage} />}
    </div>
  );
}

function PreviewModal({ action, onCancel, onConfirm, loading }) {
  const preview = action.preview || {};
  const changedFields = preview.changed_fields || {};
  const previewTitle =
    action.kind === "notify"
      ? "Preview Notify"
      : action.kind === "close"
        ? "Preview Close"
        : action.kind === "reopen"
          ? "Preview Reopen"
          : "Preview Update";

  const previewBody =
    action.kind === "notify"
      ? [
          `Eligible students: ${preview.eligible_count ?? 0}`,
          `Total students: ${preview.total_students ?? 0}`,
        ]
      : action.kind === "close"
        ? [
            `Eligible students: ${preview.eligible ?? 0}`,
            `Applied students: ${preview.applied ?? 0}`,
            `Selected students: ${preview.selected ?? 0}`,
          ]
        : action.kind === "reopen"
          ? ["This will reopen the drive and clear the closed state."]
          : Object.keys(changedFields).length
            ? Object.entries(changedFields).map(([key, value]) => `${key}: ${JSON.stringify(value.old)} -> ${JSON.stringify(value.new)}`)
            : ["No changes detected."];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{previewTitle}</h4>
        <p className="mt-1 text-sm text-slate-600">Drive #{action.driveId}</p>
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {previewBody.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Working..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ message }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl"
        style={{
          animation: "success-pop 300ms ease-out",
        }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <p className="text-lg font-semibold text-slate-900">Success</p>
        <p className="mt-1 text-sm text-slate-600">{message || "Action completed successfully"}</p>
      </div>
      <style>{`@keyframes success-pop { from { opacity: 0; transform: scale(0.8);} to { opacity: 1; transform: scale(1);} }`}</style>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Creating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = "text", step }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? " *" : ""}
      </label>
      <input required={required} type={type} step={step} value={value} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function MultiSelectChips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            type="button"
            key={option}
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function YearToggle({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {YEAR_OPTIONS.map((year) => {
        const active = selected.includes(year);
        return (
          <button
            type="button"
            key={year}
            onClick={() => onToggle(year)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600"}`}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({ values, onChange }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="rounded-xl border border-slate-300 p-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {tag}
            <button type="button" className="ml-2 text-slate-500" onClick={() => onChange(values.filter((item) => item !== tag))}>
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Add step"
        />
        <button type="button" className="rounded-lg bg-slate-200 px-3 py-2 text-sm" onClick={addTag}>
          Add
        </button>
      </div>
    </div>
  );
}

function toggleInArray(arr, value) {
  return arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];
}
