import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

function App() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 to-teal-100">

      {/* Sidebar */}
      <Sidebar />

      {/* Right side */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="p-6 flex-1 overflow-auto">

          {/* Page Title */}
          <h2 className="text-2xl font-semibold mb-2">
            Overview
          </h2>
          <p className="text-gray-600 mb-6">
            Track your academic progress and improve yourself
          </p>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            <KpiCard
              title="Attendance"
              value="82%"
              status="Good Standing"
            />

            <KpiCard
              title="CGPA"
              value="8.02"
              status="Improving"
            />

            <KpiCard
              title="Credits Completed"
              value="92 / 160"
              status="In Progress"
            />

            <KpiCard
              title="Career Status"
              value="On Track"
              status="Ready for Internships"
            />

          </div>

          {/* NEXT SECTIONS WILL COME HERE */}
          {/* Attendance Trend, Alerts, Assignments, Timetable */}

        </main>

      </div>
    </div>
  )
}

/* KPI CARD COMPONENT */
function KpiCard({ title, value, status }) {
  return (
    <div
      className="
        bg-white/50
        backdrop-blur-xl
        rounded-2xl
        shadow-lg
        border border-white/30
        p-5
        transition
        hover:scale-[1.03]
      "
    >
      <p className="text-sm text-gray-600">
        {title}
      </p>
      <p className="text-3xl font-semibold text-gray-800">
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {status}
      </p>
    </div>
  )
}

export default App;
