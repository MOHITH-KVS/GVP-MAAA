export default function Sidebar() {
  return (
    <aside className="
      w-64 min-h-screen
      bg-white/50
      backdrop-blur-xl
      border-r border-white/30
      p-5
    ">
      <h2 className="text-xl font-semibold mb-6">
        GVP-MAAA
      </h2>

      <nav className="space-y-3 text-gray-700">
        <MenuItem label="Overview" />
        <MenuItem label="Attendance" />
        <MenuItem label="Marks" />
        <MenuItem label="Assignments" />
        <MenuItem label="Career Profile" />
        <MenuItem label="Timetable" />
      </nav>
    </aside>
  )
}

function MenuItem({ label }) {
  return (
    <div className="
      px-4 py-2
      rounded-xl
      hover:bg-indigo-100
      cursor-pointer
      transition
    ">
      {label}
    </div>
  )
}
