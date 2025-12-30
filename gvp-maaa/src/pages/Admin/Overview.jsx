/* ================= ADMIN OVERVIEW ================= */

export default function AdminOverview() {
  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100">
        <h1 className="text-2xl font-semibold text-slate-800">
          Admin Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Institutional overview, risks, and system health
        </p>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard title="Total Students" value="1,284" subtitle="Across all years" />
        <KpiCard title="Total Teachers" value="78" subtitle="Active faculty" />
        <KpiCard
          title="Attendance Risk"
          value="12%"
          subtitle="Below safe limit"
          danger
        />
        <KpiCard
          title="Pending Alerts"
          value="9"
          subtitle="Need admin review"
          warning
        />
      </div>

      {/* ================= ACADEMIC HEALTH ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="p-6 rounded-2xl border bg-white">
          <h2 className="font-semibold mb-4">Academic Health</h2>

          <HealthRow label="Average Attendance" value="82%" />
          <HealthRow label="Average CGPA" value="7.6" />
          <HealthRow label="At-Risk Students" value="154" danger />
        </div>

        <div className="p-6 rounded-2xl border bg-white">
          <h2 className="font-semibold mb-4">Faculty Load</h2>

          <HealthRow label="Avg Classes / Teacher" value="14 / week" />
          <HealthRow label="High Workload Teachers" value="6" warning />
          <HealthRow label="Substitute Required" value="2" />
        </div>

        <div className="p-6 rounded-2xl border bg-white">
          <h2 className="font-semibold mb-4">System Status</h2>

          <HealthRow label="Active Users Today" value="962" />
          <HealthRow label="Last Data Sync" value="10 mins ago" />
          <HealthRow label="System Health" value="Stable" good />
        </div>

      </div>

      {/* ================= RECENT ALERTS ================= */}
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold mb-4">🚨 Alerts Requiring Attention</h2>

        <div className="space-y-3">
          <AlertRow
            title="Attendance drop in 3rd Year CSE"
            type="Academic"
            priority="High"
          />
          <AlertRow
            title="Teacher workload exceeded limits"
            type="Faculty"
            priority="Medium"
          />
          <AlertRow
            title="Timetable conflict detected"
            type="System"
            priority="Low"
          />
        </div>
      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function KpiCard({ title, value, subtitle, danger, warning }) {
  return (
    <div
      className={`p-6 rounded-2xl border bg-white
      ${danger && "border-red-300 bg-red-50"}
      ${warning && "border-amber-300 bg-amber-50"}`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function HealthRow({ label, value, danger, warning, good }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span
        className={`font-medium
        ${danger && "text-red-600"}
        ${warning && "text-amber-600"}
        ${good && "text-green-600"}`}
      >
        {value}
      </span>
    </div>
  );
}

function AlertRow({ title, type, priority }) {
  const priorityStyle = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-gray-500">{type}</p>
      </div>

      <span
        className={`text-xs px-3 py-1 rounded-full ${priorityStyle[priority]}`}
      >
        {priority}
      </span>
    </div>
  );
}
