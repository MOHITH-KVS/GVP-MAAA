export default function Overview() {
  return (
    <>
      {/* HEADER */}
      <h1 className="text-2xl font-semibold mb-2">
        Welcome, <span className="text-indigo-600">Bhanu Sir</span> 👋
      </h1>
      <p className="text-gray-500 mb-8">
        Here’s a high-level snapshot of your teaching impact
      </p>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Students"
          value="180"
          hint="Across all assigned classes"
        />

        <KpiCard
          title="Avg Attendance"
          value="86%"
          hint="Overall (all classes taught)"
        />

        <KpiCard
          title="Avg Pass Percentage"
          value="72%"
          hint="Across all subjects taught"
        />

        <KpiCard
          title="Students at Risk"
          value="14"
          hint="Across all assigned classes"
        />
      </div>

      {/* ANALYTICS AGENT PLACEHOLDER */}
      <div className="mt-10 glass rounded-2xl p-6 text-gray-400 text-center">
        Attendance trends, pass percentage analysis & risk insights
        <br />
        <span className="text-sm">(Rendered by AnalyticsAgent)</span>
      </div>
    </>
  );
}

/* ================= KPI CARD ================= */

function KpiCard({ title, value, hint }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 neo">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{hint}</p>
    </div>
  );
}
