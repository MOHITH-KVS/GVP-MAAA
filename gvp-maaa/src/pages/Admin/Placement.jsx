import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

export default function AdminPlacement() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [drives, setDrives] = useState([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [error, setError] = useState("");

  const [companyForm, setCompanyForm] = useState({
    name: "",
    min_cgpa: "",
    max_backlogs: "",
  });

  const [driveForm, setDriveForm] = useState({
    company_id: "",
    drive_date: "",
    mode: "online",
  });

  const companyNameById = useMemo(() => {
    return companies.reduce((acc, company) => {
      acc[company.id] = company.name;
      return acc;
    }, {});
  }, [companies]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [companiesRes, drivesRes] = await Promise.all([
        api.get("/api/companies"),
        api.get("/api/drives"),
      ]);

      console.log("[AdminPlacement] GET /api/companies", companiesRes.data);
      console.log("[AdminPlacement] GET /api/drives", drivesRes.data);

      setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
    } catch (err) {
      console.error("[AdminPlacement] fetchData error", err);
      setError("Unable to load placement data. Verify DB records and API access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCompany = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: companyForm.name.trim(),
        min_cgpa: Number(companyForm.min_cgpa || 0),
        max_backlogs: Number(companyForm.max_backlogs || 0),
      };
      const res = await api.post("/api/companies", payload);
      console.log("[AdminPlacement] POST /api/companies", res.data);
      setShowCompanyForm(false);
      setCompanyForm({ name: "", min_cgpa: "", max_backlogs: "" });
      fetchData();
    } catch (err) {
      console.error("[AdminPlacement] createCompany error", err);
      setError("Unable to create company. Check API response and DB connection.");
    }
  };

  const createDrive = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        company_id: Number(driveForm.company_id),
        drive_date: driveForm.drive_date,
        mode: driveForm.mode,
      };
      const res = await api.post("/api/drives", payload);
      console.log("[AdminPlacement] POST /api/drives", res.data);
      setShowDriveForm(false);
      setDriveForm({ company_id: "", drive_date: "", mode: "online" });
      fetchData();
    } catch (err) {
      console.error("[AdminPlacement] createDrive error", err);
      setError("Unable to create drive. Check API response and DB connection.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Placement Management</h1>
        <p className="mt-2 text-sm text-slate-600">Manage companies and placement drives from one place.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Company Management</h2>
          <button
            onClick={() => setShowCompanyForm(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add Company
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading companies...</p>
        ) : companies.length === 0 ? (
          <p className="text-sm text-slate-500">No companies available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Company Name</th>
                  <th className="px-3 py-2 font-semibold">Min CGPA</th>
                  <th className="px-3 py-2 font-semibold">Max Backlogs</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{company.name}</td>
                    <td className="px-3 py-2 text-slate-700">{company.min_cgpa}</td>
                    <td className="px-3 py-2 text-slate-700">{company.max_backlogs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Placement Drives</h2>
          <button
            onClick={() => setShowDriveForm(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create Drive
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading drives...</p>
        ) : drives.length === 0 ? (
          <p className="text-sm text-slate-500">No placement drives available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Company</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Mode</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => (
                  <tr key={drive.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{drive.company_name || companyNameById[drive.company_id] || "Unknown"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.drive_date || "N/A"}</td>
                    <td className="px-3 py-2 text-slate-700">{drive.mode || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCompanyForm && (
        <Modal title="Add Company" onClose={() => setShowCompanyForm(false)}>
          <form className="space-y-4" onSubmit={createCompany}>
            <input
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Company name"
              value={companyForm.name}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              required
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Minimum CGPA"
              value={companyForm.min_cgpa}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, min_cgpa: e.target.value }))}
            />
            <input
              required
              type="number"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Maximum backlogs"
              value={companyForm.max_backlogs}
              onChange={(e) => setCompanyForm((prev) => ({ ...prev, max_backlogs: e.target.value }))}
            />
            <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Save Company
            </button>
          </form>
        </Modal>
      )}

      {showDriveForm && (
        <Modal title="Create Drive" onClose={() => setShowDriveForm(false)}>
          <form className="space-y-4" onSubmit={createDrive}>
            <select
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={driveForm.company_id}
              onChange={(e) => setDriveForm((prev) => ({ ...prev, company_id: e.target.value }))}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              required
              type="date"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={driveForm.drive_date}
              onChange={(e) => setDriveForm((prev) => ({ ...prev, drive_date: e.target.value }))}
            />
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={driveForm.mode}
              onChange={(e) => setDriveForm((prev) => ({ ...prev, mode: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
              Save Drive
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
