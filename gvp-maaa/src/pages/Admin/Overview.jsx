import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const BRANCH_OPTIONS = ["CSE", "CSM", "ECE", "MECH", "CIVIL"];
const YEAR_OPTIONS = [1, 2, 3, 4];
const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTION_OPTIONS = ["A", "B", "C", "D"];

const defaultOverview = {
  metrics: {
    at_risk_students: 0,
    attendance_risk_percent: 0.0,
    data_completeness: 0.0,
    active_alerts: 0,
    total_students: 0,
    total_teachers: 0,
    active_events: 0,
    events_today: 0,
    events_this_week: 0,
  },
  academic_health: {
    avg_attendance: 0.0,
    avg_cgpa: 0.0,
    at_risk_students: 0,
  },
  faculty_health: {
    avg_classes: 0.0,
    overloaded: 0,
    underutilized: 0,
  },
  system_health: {
    active_users: 0,
    last_sync: "-",
    data_completeness: 0.0,
  },
  alerts: [],
  trend: [],
};

export default function AdminOverview() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(defaultOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const params = {};
        if (branch) params.branch = branch;
        if (year) params.year = parseInt(year, 10);
        if (semester) params.semester = parseInt(semester, 10);
        if (section) params.section = section;

        const response = await api.get("/admin/overview", { params });
        setOverview(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to load admin overview", err);
        setError("Unable to load dashboard data. Please adjust filters or refresh.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchOverview, 250);
    return () => clearTimeout(timer);
  }, [branch, year, semester, section]);

  const handleCardClick = (path) => {
    navigate(path);
  };

  const resetFilters = () => {
    setBranch("");
    setYear("");
    setSemester("");
    setSection("");
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">All branches</option>
              {BRANCH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">All years</option>
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">All semesters</option>
              {SEMESTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">All sections</option>
              {SECTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-50 to-white border border-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">
              A concise summary of academic performance, faculty capacity, and system health.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin/students")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage Students
            </button>
            <button
              onClick={() => navigate("/admin/teachers")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage Faculty
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Loading dashboard data...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <DashboardCard
              title="At-Risk Students"
              value={overview.metrics.at_risk_students}
              subtitle="Students below current thresholds"
              severity="high"
              onClick={() => handleCardClick("/admin/students?risk=warning")}
            />
            <DashboardCard
              title="Attendance Risk"
              value={`${overview.metrics.attendance_risk_percent}%`}
              subtitle="Share of students at risk"
              severity={overview.metrics.attendance_risk_percent > 25 ? "high" : "medium"}
              onClick={() => handleCardClick("/admin/attendance")}
            />
            <DashboardCard
              title="Active Events"
              value={overview.metrics.active_events}
              subtitle={overview.metrics.events_today || overview.metrics.events_this_week ? `${overview.metrics.events_today} today • ${overview.metrics.events_this_week} this week` : "Ongoing & upcoming events"}
              severity="info"
              onClick={() => handleCardClick("/admin/events?status=active")}
            />
            <DashboardCard
              title="Active Alerts"
              value={overview.metrics.active_alerts}
              subtitle="Recent issues requiring attention"
              severity={overview.metrics.active_alerts > 5 ? "high" : "medium"}
              onClick={() => handleCardClick("/admin/alerts")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InfoCard label="Total Students" value={overview.metrics.total_students} />
            <InfoCard label="Total Teachers" value={overview.metrics.total_teachers} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <HealthPanel title="Academic Health" badge="Academic">
              <HealthRow label="Avg Attendance" value={`${overview.academic_health.avg_attendance}%`} />
              <HealthRow label="Avg CGPA" value={overview.academic_health.avg_cgpa.toFixed(2)} />
              <HealthRow label="At-Risk Students" value={overview.academic_health.at_risk_students} danger />
            </HealthPanel>

            <HealthPanel title="Faculty Health" badge="Faculty">
              <HealthRow label="Avg Classes / Teacher" value={overview.faculty_health.avg_classes.toFixed(1)} />
              <HealthRow label="Overloaded Teachers" value={overview.faculty_health.overloaded} warning />
              <HealthRow label="Underutilized Teachers" value={overview.faculty_health.underutilized} good />
            </HealthPanel>

            <HealthPanel title="System Health" badge="System">
              <HealthRow label="Active Users Today" value={overview.system_health.active_users} />
              <HealthRow label="Last Data Sync" value={overview.system_health.last_sync} />
              <HealthRow label="Data Completeness" value={`${overview.system_health.data_completeness}%`} />
            </HealthPanel>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
                <p className="text-sm text-slate-500">Actionable items for immediate response.</p>
              </div>
              <button
                onClick={() => handleCardClick("/admin/alerts")}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                View all alerts
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {overview.alerts.length ? (
                overview.alerts.map((alert) => (
                  <AlertRow key={alert.title + alert.timestamp} alert={alert} onAction={() => handleCardClick("/admin/alerts")} />
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                  No actionable alerts right now.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Student Attendance Trend</h2>
                <p className="text-sm text-slate-500">Last 7 days student attendance performance.</p>
              </div>
            </div>
            <TrendChart data={overview.trend} />
          </div>
        </>
      )}
    </div>
  );
}

function DashboardCard({ title, value, subtitle, severity, onClick }) {
  const severityStyles = {
    high: "border-red-300 bg-red-50 text-red-900",
    medium: "border-amber-300 bg-amber-50 text-amber-900",
    low: "border-emerald-300 bg-emerald-50 text-emerald-900",
    info: "border-sky-300 bg-sky-50 text-sky-900",
  };

  return (
    <button
      onClick={onClick}
      className={`group rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:shadow-lg ${severityStyles[severity] || "border-slate-200 bg-white text-slate-900"}`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em]">{title}</p>
      <p className="mt-4 text-4xl font-semibold">{value}</p>
      <p className="mt-3 text-sm text-slate-600">{subtitle}</p>
    </button>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function HealthPanel({ title, badge, children }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{badge} indicators</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function HealthRow({ label, value, danger, warning, good }) {
  return (
    <div className="flex justify-between py-3 border-b last:border-b-0 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${danger ? "text-red-600" : warning ? "text-amber-600" : good ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

function AlertRow({ alert, onAction }) {
  const severityStyle = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-900">{alert.title}</p>
        <p className="text-sm text-slate-500 mt-1">{alert.type} • {new Date(alert.timestamp).toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyle[alert.severity]}`}>
          {alert.severity}
        </span>
        <button
          onClick={onAction}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {alert.action}
        </button>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
    >
      {label}
    </button>
  );
}

function TrendChart({ data }) {
  const maxAttendance = Math.max(...data.map((item) => item.attendance), 100);
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 400 180" className="w-full h-48">
          <polyline
            fill="none"
            stroke="#4338CA"
            strokeWidth="4"
            points={data
              .map((point, index) => {
                const x = 40 + (index * 52);
                const y = 150 - (point.attendance / maxAttendance) * 120;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {data.map((point, index) => {
            const x = 40 + (index * 52);
            const y = 150 - (point.attendance / maxAttendance) * 120;
            return (
              <g key={point.date}>
                <circle cx={x} cy={y} r="5" fill="#4338CA" />
                <text x={x} y={y - 12} textAnchor="middle" className="text-xs fill-slate-700">
                  {point.attendance}%
                </text>
              </g>
            );
          })}
          {data.map((point, index) => {
            const x = 40 + (index * 52);
            return (
              <text key={point.date + "label"} x={x} y="170" textAnchor="middle" className="text-[11px] fill-slate-500">
                {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
