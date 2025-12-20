export default function StudentOverview() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-2">
        Welcome, <span className="text-indigo-600">Mohith</span> 👋
      </h1>

      <p className="text-gray-500 mb-8">
        Here’s your academic overview for this semester
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Attendance" value="82%" hint="Good Standing" />
        <KpiCard title="CGPA" value="8.02" hint="Improving" />
        <KpiCard title="Credits" value="92 / 160" hint="On Track" />
        <KpiCard title="Career" value="On Track" hint="Internship Ready" />
      </div>

      <div className="mt-10 glass rounded-2xl p-6 text-gray-400 text-center">
        Attendance & CGPA trends (AnalyticsAgent)
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
