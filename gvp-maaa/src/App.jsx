export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">

      {/* Dashboard Shell */}
      <div className="glass max-w-7xl mx-auto rounded-3xl flex min-h-[90vh]">

        {/* Sidebar */}
        <aside className="w-64 p-6 border-r border-white/40">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-8">
            GVP-MAAA
          </h2>

          <nav className="space-y-2 text-gray-700">
            <MenuItem label="Overview" active />
            <MenuItem label="Attendance" />
            <MenuItem label="Marks" />
            <MenuItem label="Assignments" />
            <MenuItem label="Career Profile" />
            <MenuItem label="Timetable" />
          </nav>
        </aside>

        {/* Main Area */}
        <main className="flex-1 p-8 flex gap-6">

          {/* Academic Overview */}
          <div className="flex-1">

            {/* Welcome */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold">
                Welcome, <span className="text-indigo-600">Mohith</span> 👋
              </h1>
              <p className="text-gray-500">
                Here’s your academic overview for this semester
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard title="Attendance" value="82%" hint="Good Standing" />
              <KpiCard title="CGPA" value="8.02" hint="Improving" />
              <KpiCard title="Credits" value="92 / 160" hint="On Track" />
              <KpiCard title="Career" value="On Track" hint="Internship Ready" />
            </div>

            {/* Placeholder for charts (future AnalyticsAgent) */}
            <div className="mt-10 bg-white/70 rounded-2xl p-6 text-gray-400 text-center">
              Attendance & CGPA trends (AnalyticsAgent will render here)
            </div>
          </div>

          {/* Right Profile Panel */}
          <StudentProfile />
        </main>
      </div>
    </div>
  )
}

/* Sidebar Item */
function MenuItem({ label, active }) {
  return (
    <div
      className={`px-4 py-2 rounded-xl cursor-pointer transition
        ${active
          ? "bg-indigo-500/10 text-indigo-700 font-medium"
          : "hover:bg-white/60"}
      `}
    >
      {label}
    </div>
  )
}

/* KPI Card */
function KpiCard({ title, value, hint }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 neo">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{hint}</p>
    </div>
  )
}

/* Student Profile Panel */
function StudentProfile() {
  return (
    <div className="w-72 bg-white rounded-2xl p-6 shadow-lg text-center">

      {/* Avatar */}
      <div className="w-24 h-24 mx-auto rounded-full bg-indigo-500 text-white flex items-center justify-center text-3xl font-semibold">
        M
      </div>

      {/* Name */}
      <h3 className="mt-4 text-lg font-semibold">
        Mohith
      </h3>
      <p className="text-sm text-gray-500">
        B.Tech · CSE
      </p>

      {/* Details */}
      <div className="mt-6 space-y-3 text-sm text-gray-600 text-left">
        <ProfileRow label="Roll No" value="21XX1A05XX" />
        <ProfileRow label="Year" value="3rd Year" />
        <ProfileRow label="Semester" value="Sem 6" />
        <ProfileRow label="Status" value="Active" />
      </div>
    </div>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
