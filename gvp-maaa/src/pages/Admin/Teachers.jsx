import { useState } from "react";

/* ===== TEMP DATA ===== */
const TEACHERS = [
  {
    id: 1,
    name: "Bhanu Prasad",
    department: "CSE",
    designation: "Associate Professor",
    experience: "12 Years",
    email: "bhanu@gvp.edu",
    phone: "+91 XXXXX XXXXX",
    subjects: ["DBMS", "OS", "CN"],
    alertsSent: 5,
    classes: [
      { year: "3rd", section: "A", students: 60, attendance: 68 },
      { year: "3rd", section: "B", students: 58, attendance: 70 },
      { year: "4th", section: "A", students: 62, attendance: 72 },
    ],
  },
  {
    id: 2,
    name: "Sowmya Rani",
    department: "ECE",
    designation: "Assistant Professor",
    experience: "6 Years",
    email: "sowmya@gvp.edu",
    phone: "+91 XXXXX XXXXX",
    subjects: ["Signals", "Networks"],
    alertsSent: 2,
    classes: [
      { year: "2nd", section: "A", students: 55, attendance: 82 },
      { year: "2nd", section: "B", students: 50, attendance: 80 },
    ],
  },
];

/* ================= PAGE ================= */

export default function Teachers() {
  const [department, setDepartment] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  /* ===== FILTER ===== */
  const filtered = TEACHERS.filter((t) => {
    const matchDept = department === "All" || t.department === department;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.designation.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  /* ===== CONDITION LOGIC ===== */
  const getCondition = (teacher) => {
    const avgAttendance =
      teacher.classes.reduce((a, c) => a + c.attendance, 0) /
      teacher.classes.length;

    const totalStudents = teacher.classes.reduce(
      (a, c) => a + c.students,
      0
    );

    if (avgAttendance < 70 && totalStudents > 120)
      return { label: "Action Recommended", color: "bg-red-100 text-red-700" };

    if (avgAttendance < 75)
      return { label: "Needs Attention", color: "bg-amber-100 text-amber-700" };

    return { label: "Stable", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="bg-white p-6 rounded-2xl border">
        <h1 className="text-2xl font-semibold">Teacher Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Academic performance, class health & intervention insights
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex gap-4 flex-wrap items-center">
        {["All", "CSE", "CSM", "MECH", "ECE", "CIVIL"].map((d) => (
          <button
            key={d}
            onClick={() => setDepartment(d)}
            className={`px-4 py-2 rounded-lg border text-sm
              ${department === d
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-50"}`}
          >
            {d}
          </button>
        ))}

        {/* 🔍 SEARCH – INCREASED WIDTH */}
        <input
          placeholder="Search teacher name or designation"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto border px-4 py-2 rounded-lg w-[420px]"
        />
      </div>

      {/* ================= ANALYTICS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Avg Student Attendance by Department"
          description="Overall classroom health by department"
        />
        <AnalyticsCard
          title="Teaching Condition Distribution"
          description="Stable vs Attention vs Action Required"
        />
        <AnalyticsCard
          title="Student Strength vs Attendance"
          description="Impact signal for teaching stress zones"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Teacher</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Avg Attendance</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((t) => {
              const condition = getCondition(t);
              const totalStudents = t.classes.reduce(
                (a, c) => a + c.students,
                0
              );
              const avgAttendance =
                t.classes.reduce((a, c) => a + c.attendance, 0) /
                t.classes.length;

              return (
                <tr key={t.id} className="border-t text-sm">
                  <td className="px-4 py-3 font-medium">
                    {t.name}
                    <div className="text-xs text-gray-400">
                      {t.designation}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{t.department}</td>
                  <td className="px-4 py-3 text-center">{t.classes.length}</td>
                  <td className="px-4 py-3 text-center">{totalStudents}</td>
                  <td className="px-4 py-3 text-center">
                    {avgAttendance.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${condition.color}`}
                    >
                      {condition.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedTeacher(t)}
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {selectedTeacher && (
        <TeacherProfileModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
        />
      )}
    </div>
  );
}

/* ================= ANALYTICS CARD ================= */

function AnalyticsCard({ title, description }) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
      <div className="h-40 mt-4 flex items-center justify-center rounded-lg bg-gray-50 border border-dashed text-sm text-gray-400">
        📊 Analytics Agent will render chart here
      </div>
    </div>
  );
}

/* ================= PROFILE MODAL ================= */

function TeacherProfileModal({ teacher, onClose }) {
  const totalStudents = teacher.classes.reduce((a, c) => a + c.students, 0);
  const avgAttendance =
    teacher.classes.reduce((a, c) => a + c.attendance, 0) /
    teacher.classes.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl rounded-2xl p-6 space-y-6">

        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold tracking-wide">
            PROFILE · TEACHER OVERVIEW
          </h2>
          <button onClick={onClose} className="text-sm text-gray-500">
            Close
          </button>
        </div>

        {/* ===== BASIC INFO ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <Info label="Name" value={teacher.name} />
          <Info label="Department" value={teacher.department} />
          <Info label="Designation" value={teacher.designation} />
          <Info label="Experience" value={teacher.experience} />
          <Info label="Email" value={teacher.email} />
          <Info label="Phone" value={teacher.phone} />
          <Info label="Subjects" value={teacher.subjects.join(", ")} />
          <Info label="Alerts Sent" value={teacher.alertsSent} />
        </div>

        {/* ===== KEY INSIGHTS ===== */}
        <div className="grid grid-cols-3 gap-6">
          <InsightCard label="Total Students Handled" value={totalStudents} />
          <InsightCard
            label="Avg Student Attendance"
            value={`${avgAttendance.toFixed(1)}%`}
          />
          <InsightCard
            label="Classes Assigned"
            value={teacher.classes.length}
          />
        </div>

        {/* ===== CLASS TABLE ===== */}
        <div>
          <h3 className="font-medium mb-3">Class-wise Breakdown</h3>
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Avg Attendance</th>
              </tr>
            </thead>
            <tbody>
              {teacher.classes.map((c, i) => (
                <tr key={i} className="border-t text-center">
                  <td className="px-3 py-2">{c.year}</td>
                  <td className="px-3 py-2">{c.section}</td>
                  <td className="px-3 py-2">{c.students}</td>
                  <td className="px-3 py-2">{c.attendance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== PROFILE ANALYTICS ===== */}
        <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-400 text-center">
          📊 Individual teacher analytics will be rendered by Analytics Agent
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function InsightCard({ label, value }) {
  return (
    <div className="border rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
