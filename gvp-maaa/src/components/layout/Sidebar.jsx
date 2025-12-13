export default function Sidebar() {
  return (
    <aside className="w-60 p-6">
      <h2 className="text-xl font-semibold mb-8 text-indigo-600">
        GVP-MAAA
      </h2>

      <nav className="space-y-3 text-sm">
        <MenuItem label="Overview" active />
        <MenuItem label="Attendance" />
        <MenuItem label="Marks" />
        <MenuItem label="Assignments" />
        <MenuItem label="Career Profile" />
        <MenuItem label="Timetable" />
      </nav>
    </aside>
  )
}

function MenuItem({ label, active }) {
  return (
    <div className={`
      px-4 py-2 rounded-lg cursor-pointer
      ${active 
        ? "bg-indigo-100 text-indigo-600 font-medium"
        : "text-gray-500 hover:bg-gray-100"}
    `}>
      {label}
    </div>
  )
}
