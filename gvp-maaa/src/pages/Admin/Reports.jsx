import { useState } from "react";

/* ================= ADMIN REPORTS PAGE ================= */

export default function Reports() {

  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  const [reports, setReports] = useState([
    {
      name: "Attendance Report – CSE",
      date: "12 Feb 2026, 10:45 AM",
      user: "Admin",
      status: "Ready",
    },
  ]);

  const generateReport = () => {
    setGenerating(true);

    setTimeout(() => {
      const now = new Date();
      const formatted =
        now.toLocaleDateString() + ", " +
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const newReport = {
        name: "Department Consolidated Report",
        date: formatted,
        user: "Admin",
        status: "Ready",
      };

      setReports([newReport, ...reports]);
      setLastGenerated(formatted);
      setGenerating(false);
    }, 2500);
  };

  return (
    <div className="space-y-14">

      {/* ================= HEADER ================= */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white">
        <h1 className="text-3xl font-semibold">
          Academic Reports Center
        </h1>
        <p className="text-sm opacity-90 mt-2 max-w-3xl">
          Generate official, downloadable academic report snapshots
          for institutional review and governance.
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <Section title="Report Configuration">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Select label="Academic Year" options={["2022-23", "2023-24", "2024-25"]} />
          <Select label="Semester" options={["1","2","3","4","5","6","7","8"]} />
          <Select label="Department" options={["CSE", "ECE", "EEE", "IT"]} />
          <Select
            label="Report Type"
            options={[
              "Attendance Report",
              "CGPA Performance Report",
              "At-Risk Students Report",
              "Faculty Performance Report",
              "Alerts & Interventions Report",
              "Department Consolidated Report"
            ]}
          />
        </div>
      </Section>

      {/* ================= REPORT CARD ================= */}
      <Section title="Generate Report">

        <div className="bg-white border rounded-2xl p-6 space-y-5">

          <div>
            <h3 className="font-semibold text-slate-800">
              Department Consolidated Report
            </h3>
            <p className="text-sm text-gray-500">
              Generates a time-stamped academic snapshot.
            </p>

            {lastGenerated && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                  Generated recently
                </span>
                <span className="text-gray-500">
                  Last generated: {lastGenerated}
                </span>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-4">

            {/* GENERATE */}
            <button
              onClick={generateReport}
              disabled={generating}
              className={`px-6 py-2 rounded-xl text-sm text-white transition-all duration-300
                ${generating
                  ? "bg-slate-400 cursor-not-allowed animate-pulse"
                  : "bg-slate-800 hover:bg-slate-900"}
              `}
            >
              {generating ? "Generating…" : "Generate Report"}
            </button>

            {/* DOWNLOAD */}
            <button className="px-6 py-2 rounded-xl border text-sm transition hover:bg-slate-50 hover:-translate-y-[1px]">
              ⬇ Download PDF
            </button>

            {/* EXCEL */}
            <button className="px-6 py-2 rounded-xl border text-sm transition hover:bg-emerald-50 hover:border-emerald-400 hover:-translate-y-[1px]">
              📊 Export Excel
            </button>

          </div>

          {/* GENERATING STATUS */}
          {generating && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              Preparing report snapshot…
            </div>
          )}

        </div>
      </Section>

      {/* ================= REPORT HISTORY ================= */}
      <Section title="Generated Reports History">

        <div className="bg-white border rounded-2xl p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="text-left py-2">Report Name</th>
                <th className="text-left py-2">Generated On</th>
                <th className="text-left py-2">Generated By</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Action</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {reports.map((r, i) => (
                <ReportRow key={i} {...r} />
              ))}
            </tbody>
          </table>
        </div>

      </Section>

    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Select({ label, options }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        {label}
      </label>
      <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white">
        {options.map((opt, i) => (
          <option key={i}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ReportRow({ name, date, user, status }) {
  return (
    <tr className="border-b last:border-none">
      <td className="py-2">{name}</td>
      <td className="py-2">{date}</td>
      <td className="py-2">{user}</td>
      <td className="py-2">
        <span className={`px-2 py-1 rounded-full text-xs
          ${status === "Ready"
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"}`}>
          {status}
        </span>
      </td>
      <td className="py-2">
        <button className="text-indigo-600 hover:underline transition">
          Download
        </button>
      </td>
    </tr>
  );
}
