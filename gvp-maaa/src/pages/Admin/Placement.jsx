import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import api from "../../utils/api";

const BRANCH_OPTIONS = ["CSE", "CSM", "ECE", "EEE", "MECH", "CIVIL"];
const YEAR_OPTIONS = [1, 2, 3, 4];

const COMPANY_DEFAULT = {
  name: "",
  role: "",
  package_lpa: "",
  min_cgpa: "",
  max_backlogs: "",
  branches: [],
  selection_process: [],
};

const DRIVE_DEFAULT = {
  title: "",
  company_id: "",
  drive_date: "",
  mode: "online",
  location: "",
  registration_deadline: "",
  eligible_years: [],
  status: "open",
  branches: [],
};

export default function AdminPlacement() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardUnavailable, setDashboardUnavailable] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: "success", message: "" });

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

  const [companies, setCompanies] = useState([]);
  const [drives, setDrives] = useState([]);

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [companyForm, setCompanyForm] = useState(COMPANY_DEFAULT);
  const [driveForm, setDriveForm] = useState(DRIVE_DEFAULT);

  const [submittingCompany, setSubmittingCompany] = useState(false);
  const [submittingDrive, setSubmittingDrive] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const selectionRateBars = useMemo(
    () => (analytics.selection_rate_by_company || []).map((item) => ({ name: item.company_name, rate: item.selection_rate })),
    [analytics.selection_rate_by_company]
  );

  const branchBars = useMemo(
    () => (analytics.branch_performance || []).map((item) => ({ name: item.branch, rate: item.selection_rate })),
    [analytics.branch_performance]
  );

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    window.setTimeout(() => {
      setToast({ visible: false, message: "", type: "success" });
    }, 2200);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    setDashboardUnavailable(false);

    try {
      const [companiesRes, drivesRes, analyticsRes] = await Promise.all([
        api.get("/api/companies"),
        api.get("/api/drives"),
        api.get("/api/admin/placement/analytics"),
      ]);

      console.log("[AdminPlacement] GET /api/companies", companiesRes.data);
      console.log("[AdminPlacement] GET /api/drives", drivesRes.data);
      console.log("[AdminPlacement] GET /api/admin/placement/analytics", analyticsRes.data);

      setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
      setAnalytics(analyticsRes.data || {});

      try {
        const dashboardRes = await api.get("/api/admin/placement/dashboard");
        console.log("[AdminPlacement] GET /api/admin/placement/dashboard", dashboardRes.data);
        setDashboard(dashboardRes.data || {});
      } catch (dashboardErr) {
        console.error("[AdminPlacement] dashboard fetch failed", dashboardErr);
        const status = dashboardErr?.response?.status;
        if (status === 404) {
          setDashboardUnavailable(true);
        } else {
          setError("Failed to load dashboard data. Please try again.");
        }
      }
    } catch (err) {
      console.error("[AdminPlacement] fetchData error", err);
      setError("Failed to load placement data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const validateCompany = () => {
    if (!companyForm.name.trim()) {
      return "Company name is required.";
    }
    const minCgpa = Number(companyForm.min_cgpa);
    if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) {
      return "Min CGPA must be between 0 and 10.";
    }
    const packageValue = Number(companyForm.package_lpa);
    if (!companyForm.package_lpa || Number.isNaN(packageValue) || packageValue <= 0) {
      return "Package (LPA) must be greater than 0.";
    }
    return "";
  };

  const validateDrive = () => {
    if (!driveForm.title.trim()) {
      return "Drive title is required.";
    }
    if (!driveForm.company_id) {
      return "Select a company.";
    }
    if (!driveForm.drive_date) {
      return "Drive date is required.";
    }
    if (!driveForm.location.trim()) {
      return "Drive location is required.";
    }
    if (driveForm.registration_deadline && driveForm.registration_deadline > driveForm.drive_date) {
      return "Registration deadline must be on or before drive date.";
    }
    return "";
  };

  const submitCompany = async () => {
    const payload = {
      name: companyForm.name.trim(),
      role: companyForm.role.trim() || null,
      package_lpa: Number(companyForm.package_lpa),
      min_cgpa: Number(companyForm.min_cgpa),
      max_backlogs: Number(companyForm.max_backlogs || 0),
      branches: companyForm.branches,
      selection_process: companyForm.selection_process,
    };

    setSubmittingCompany(true);
    try {
      if (editingCompany) {
        const res = await api.put(`/api/companies/${editingCompany.id}`, payload);
        console.log(`[AdminPlacement] PUT /api/companies/${editingCompany.id}`, res.data);
        showToast("Company updated successfully");
      } else {
        const res = await api.post("/api/companies", payload);
        console.log("[AdminPlacement] POST /api/companies", res.data);
        showToast("Company created successfully");
      }
      closeCompanyModal();
      await fetchData();
    } catch (err) {
      console.error("[AdminPlacement] submitCompany error", err);
      setError("Failed to create. Please try again.");
    } finally {
      setSubmittingCompany(false);
    }
  };

  const submitDrive = async () => {
    const payload = {
      title: driveForm.title.trim(),
      company_id: Number(driveForm.company_id),
      drive_date: driveForm.drive_date,
      mode: driveForm.mode,
      location: driveForm.location.trim(),
      registration_deadline: driveForm.registration_deadline || null,
      eligible_years: driveForm.eligible_years,
      status: driveForm.status,
      branches: driveForm.branches,
    };

    setSubmittingDrive(true);
    try {
      const res = await api.post("/api/drives", payload);
      console.log("[AdminPlacement] POST /api/drives", res.data);
      setShowDriveForm(false);
      setDriveForm(DRIVE_DEFAULT);
      showToast("Drive created successfully");
      await fetchData();
    } catch (err) {
      console.error("[AdminPlacement] submitDrive error", err);
      setError("Failed to create. Please try again.");
    } finally {
      setSubmittingDrive(false);
    }
  };

  const onCompanySubmitClick = (e) => {
    e.preventDefault();
    const validationError = validateCompany();
    if (validationError) {
      setError(validationError);
      return;
    }

    setConfirmConfig({
      open: true,
      title: editingCompany ? "Confirm Company Update" : "Confirm Company Creation",
      message: "Are you sure you want to create this company/drive?",
      onConfirm: submitCompany,
    });
  };

  const onDriveSubmitClick = (e) => {
    e.preventDefault();
    const validationError = validateDrive();
    if (validationError) {
      setError(validationError);
      return;
    }

    setConfirmConfig({
      open: true,
      title: "Confirm Drive Creation",
      message: "Are you sure you want to create this company/drive?",
      onConfirm: submitDrive,
    });
  };

  const deleteCompany = async (companyId) => {
    setConfirmConfig({
      open: true,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this company?",
      onConfirm: async () => {
        try {
          const res = await api.delete(`/api/companies/${companyId}`);
          console.log(`[AdminPlacement] DELETE /api/companies/${companyId}`, res.data);
          showToast("Company deleted successfully");
          await fetchData();
        } catch (err) {
          console.error("[AdminPlacement] deleteCompany error", err);
          setError("Failed to create. Please try again.");
        }
      },
    });
  };

  const notifyStudents = async (driveId) => {
    try {
      const res = await api.post(`/api/drives/${driveId}/notify-students`, {});
      console.log(`[AdminPlacement] POST /api/drives/${driveId}/notify-students`, res.data);
      showToast("Students notified successfully");
    } catch (err) {
      console.error("[AdminPlacement] notifyStudents error", err);
      setError("Failed to create. Please try again.");
    }
  };

  const closeDrive = async (driveId) => {
    setConfirmConfig({
      open: true,
      title: "Confirm Close Drive",
      message: "Are you sure you want to close this drive?",
      onConfirm: async () => {
        try {
          const res = await api.put(`/api/drives/${driveId}/close`);
          console.log(`[AdminPlacement] PUT /api/drives/${driveId}/close`, res.data);
          showToast("Drive closed successfully");
          await fetchData();
        } catch (err) {
          console.error("[AdminPlacement] closeDrive error", err);
          setError("Failed to create. Please try again.");
        }
      },
    });
  };

  const uploadResults = async (driveId, file) => {
    if (!file) {
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/api/drives/${driveId}/upload-results`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(`[AdminPlacement] POST /api/drives/${driveId}/upload-results`, res.data);
      showToast("Results uploaded successfully");
      await fetchData();
    } catch (err) {
      console.error("[AdminPlacement] uploadResults error", err);
      setError("Failed to create. Please try again.");
    }
  };

  const startEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name || "",
      role: company.role || "",
      package_lpa: company.package_lpa ?? "",
      min_cgpa: company.min_cgpa ?? "",
      max_backlogs: company.max_backlogs ?? "",
      branches: company.branches || [],
      selection_process: company.selection_process || [],
    });
    setShowCompanyForm(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyForm(false);
    setEditingCompany(null);
    setCompanyForm(COMPANY_DEFAULT);
  };

  const closeDriveModal = () => {
    setShowDriveForm(false);
    setDriveForm(DRIVE_DEFAULT);
  };

  if (loading) {
    return <div className="rounded-3xl border bg-white p-8 text-sm text-slate-500 shadow-sm">Loading placement data...</div>;
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Placement Control Center</h1>
        <p className="mt-2 text-sm text-slate-600">Real-time placement operations, analytics, and execution management.</p>
      </div>

      {dashboardUnavailable && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Dashboard data not available</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Companies" value={dashboard.total_companies || 0} />
        <KpiCard label="Active Drives" value={dashboard.active_drives || 0} />
        <KpiCard label="Total Eligible Students" value={dashboard.total_eligible_students || 0} />
        <KpiCard label="Total Selections" value={dashboard.total_selections || 0} />
        <KpiCard label="Success Rate %" value={`${Number(dashboard.success_rate || 0).toFixed(2)}%`} />
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Company Management</h2>
          <button onClick={() => setShowCompanyForm(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Add Company
          </button>
        </div>

        {companies.length === 0 ? (
          <p className="text-sm text-slate-500">No companies available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Company Name</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Package</th>
                  <th className="px-3 py-2 font-semibold">Min CGPA</th>
                  <th className="px-3 py-2 font-semibold">Max Backlogs</th>
                  <th className="px-3 py-2 font-semibold">Drives Count</th>
                  <th className="px-3 py-2 font-semibold">Success Rate</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{company.name}</td>
                    <td className="px-3 py-2 text-slate-700">{company.role || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{company.package_lpa == null ? "N/A" : `${company.package_lpa} LPA`}</td>
                    <td className="px-3 py-2 text-slate-700">{company.min_cgpa}</td>
                    <td className="px-3 py-2 text-slate-700">{company.max_backlogs}</td>
                    <td className="px-3 py-2 text-slate-700">{company.drives_count || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{Number(company.success_rate || 0).toFixed(2)}%</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-slate-100 px-2 py-1 text-xs" onClick={() => startEditCompany(company)}>
                          Edit
                        </button>
                        <button className="rounded-lg bg-red-100 px-2 py-1 text-xs text-red-700" onClick={() => deleteCompany(company.id)}>
                          Delete
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

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Drive Management</h2>
          <button onClick={() => setShowDriveForm(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
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
                  <th className="px-3 py-2 font-semibold">Drive Title</th>
                  <th className="px-3 py-2 font-semibold">Company</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Mode</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Eligible Students</th>
                  <th className="px-3 py-2 font-semibold">Applied</th>
                  <th className="px-3 py-2 font-semibold">Selected</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{drive.title || "Untitled Drive"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.company_name}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.drive_date || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.mode || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.status || "open"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.eligible_count || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.applied_count || 0}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.selected_count || 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg bg-slate-100 px-2 py-1 text-xs" onClick={() => navigate(`/admin/placement/drives/${drive.id}`)}>
                          Details
                        </button>
                        <button className="rounded-lg bg-blue-100 px-2 py-1 text-xs text-blue-700" onClick={() => notifyStudents(drive.id)}>
                          Notify
                        </button>
                        <label className="cursor-pointer rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          Upload CSV
                          <input className="hidden" type="file" accept=".csv" onChange={(e) => uploadResults(drive.id, e.target.files?.[0])} />
                        </label>
                        <button className="rounded-lg bg-red-100 px-2 py-1 text-xs text-red-700" onClick={() => closeDrive(drive.id)}>
                          Close
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

      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Selection rate per company">
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

        <ChartCard title="Branch-wise performance">
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

        <ChartCard title="CGPA vs selection">
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

      {showCompanyForm && (
        <Modal title={editingCompany ? "Edit Company" : "Add Company"} onClose={closeCompanyModal}>
          <form className="space-y-4" onSubmit={onCompanySubmitClick}>
            <Field required label="Company Name" value={companyForm.name} onChange={(value) => setCompanyForm((prev) => ({ ...prev, name: value }))} />
            <Field label="Role" value={companyForm.role} onChange={(value) => setCompanyForm((prev) => ({ ...prev, role: value }))} />
            <Field required label="Package (LPA)" type="number" step="0.01" value={companyForm.package_lpa} onChange={(value) => setCompanyForm((prev) => ({ ...prev, package_lpa: value }))} />
            <Field required label="Min CGPA" type="number" step="0.01" value={companyForm.min_cgpa} onChange={(value) => setCompanyForm((prev) => ({ ...prev, min_cgpa: value }))} />
            <Field required label="Max Backlogs" type="number" value={companyForm.max_backlogs} onChange={(value) => setCompanyForm((prev) => ({ ...prev, max_backlogs: value }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Branches</label>
            <MultiSelectChips options={BRANCH_OPTIONS} selected={companyForm.branches} onToggle={(value) => setCompanyForm((prev) => ({ ...prev, branches: toggleInArray(prev.branches, value) }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selection Process</label>
            <TagInput values={companyForm.selection_process} onChange={(values) => setCompanyForm((prev) => ({ ...prev, selection_process: values }))} />

            <div className="sticky bottom-0 border-t border-slate-200 bg-white pt-3">
              <button disabled={submittingCompany} type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submittingCompany ? "Saving..." : editingCompany ? "Update Company" : "Create Company"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDriveForm && (
        <Modal title="Create Drive" onClose={closeDriveModal}>
          <form className="space-y-4" onSubmit={onDriveSubmitClick}>
            <Field required label="Drive Title" value={driveForm.title} onChange={(value) => setDriveForm((prev) => ({ ...prev, title: value }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company *</label>
            <select required className="w-full rounded-xl border border-slate-300 px-3 py-2" value={driveForm.company_id} onChange={(e) => setDriveForm((prev) => ({ ...prev, company_id: e.target.value }))}>
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <Field required label="Date" type="date" value={driveForm.drive_date} onChange={(value) => setDriveForm((prev) => ({ ...prev, drive_date: value }))} />
            <Field required label="Location" value={driveForm.location} onChange={(value) => setDriveForm((prev) => ({ ...prev, location: value }))} />
            <Field label="Registration Deadline" type="date" value={driveForm.registration_deadline} onChange={(value) => setDriveForm((prev) => ({ ...prev, registration_deadline: value }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible Years</label>
            <YearToggle selected={driveForm.eligible_years} onToggle={(year) => setDriveForm((prev) => ({ ...prev, eligible_years: toggleInArray(prev.eligible_years, year) }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Branches</label>
            <MultiSelectChips options={BRANCH_OPTIONS} selected={driveForm.branches} onToggle={(value) => setDriveForm((prev) => ({ ...prev, branches: toggleInArray(prev.branches, value) }))} />

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mode</label>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={driveForm.mode} onChange={(e) => setDriveForm((prev) => ({ ...prev, mode: e.target.value }))}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={driveForm.status} onChange={(e) => setDriveForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="open">Open</option>
              <option value="scheduled">Scheduled</option>
              <option value="closed">Closed</option>
            </select>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white pt-3">
              <button disabled={submittingDrive} type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submittingDrive ? "Creating..." : "Create Drive"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmConfig.open && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          onCancel={() => setConfirmConfig({ open: false, title: "", message: "", onConfirm: null })}
          onConfirm={async () => {
            const action = confirmConfig.onConfirm;
            setConfirmConfig({ open: false, title: "", message: "", onConfirm: null });
            if (action) {
              await action();
            }
          }}
        />
      )}

      {toast.visible && <Toast type={toast.type} message={toast.message} />}
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

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ type, message }) {
  const bgClass = type === "success" ? "bg-emerald-600" : "bg-red-600";
  return <div className={`fixed bottom-6 right-6 z-[70] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${bgClass}`}>{`✔ ${message}`}</div>;
}

function Field({ label, value, onChange, required = false, type = "text", step }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
    if (!trimmed) {
      return;
    }
    if (!values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag) => {
    onChange(values.filter((item) => item !== tag));
  };

  return (
    <div className="rounded-xl border border-slate-300 p-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {tag}
            <button type="button" className="ml-2 text-slate-500" onClick={() => removeTag(tag)}>
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
          placeholder="Add process step"
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
