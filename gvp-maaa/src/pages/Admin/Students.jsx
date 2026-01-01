import { useState } from "react";

/* ===== SAMPLE DATA ===== */
const STUDENTS = [
  {
    id: 1,
    roll: "21CSE001",
    name: "Arjun Reddy",
    year: "3rd Year",
    section: "A",
    attendance: 72,
    cgpa: 6.8,
    marks: { mid1: 18, mid2: 14 },
    backlogs: 1,
    alertsSent: 3,
    lastAlert: "12 Mar 2025",
  },
  {
    id: 2,
    roll: "21CSE014",
    name: "Sanjana Rao",
    year: "3rd Year",
    section: "B",
    attendance: 86,
    cgpa: 8.2,
    marks: { mid1: 24, mid2: 22 },
    backlogs: 0,
    alertsSent: 0,
    lastAlert: "-",
  },
  {
    id: 3,
    roll: "20CSE032",
    name: "Vishal Kumar",
    year: "4th Year",
    section: "A",
    attendance: 68,
    cgpa: 6.1,
    marks: { mid1: 16, mid2: 13 },
    backlogs: 2,
    alertsSent: 4,
    lastAlert: "01 Feb 2025",
  },
];

export default function Students() {
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ===== FILTER ===== */
  const filtered = STUDENTS.filter((s) => {
    return (
      (year === "All" || s.year === year) &&
      (section === "All" || s.section === section) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase()))
    );
  });

  /* ===== SORT AT RISK FIRST ===== */
  const sortedStudents = [...filtered].sort((a, b) => {
    const aRisk = a.attendance < 75 || a.cgpa < 7;
    const bRisk = b.attendance < 75 || b.cgpa < 7;
    return bRisk - aRisk;
  });

  const atRiskCount = STUDENTS.filter(
    (s) => s.attendance < 75 || s.cgpa < 7
  ).length;

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="bg-white p-6 rounded-2xl border flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Student Management</h1>
          <p className="text-sm text-gray-500">
            Monitor performance, risks, and insights
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => alert("PDF available after DB setup")}
            className="px-4 py-2 rounded-lg bg-red-600 text-white"
          >
            Download At-Risk PDF
          </button>

          <button
            onClick={() => setShowAlertModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white"
          >
            Alert At-Risk Students
          </button>
        </div>
      </div>

      {/* ================= FILTERS (UNCHANGED) ================= */}
      <div className="bg-white p-4 rounded-xl border flex gap-4 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option>All</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option>All</option>
          <option>A</option>
          <option>B</option>
        </select>

        <input
          placeholder="Search by name or roll no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-lg flex-1"
        />
      </div>

      {/* ================= CHARTS ================= */}
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Analytics Overview</h2>

          <select className="border px-3 py-2 rounded-lg text-sm">
            <option>Attendance Trend</option>
            <option>CGPA Trend</option>
            <option>Marks Analysis</option>
            <option>Backlogs Overview</option>
          </select>
        </div>

        <div className="border border-dashed rounded-xl p-6 text-center text-gray-500 text-sm">
          📊 Charts rendered by <b>Analytics Agent</b>  
          <br />
          Auto-updated based on filters (Year / Section)
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Roll</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Sec</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">CGPA</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {sortedStudents.map((s) => {
              const atRisk = s.attendance < 75 || s.cgpa < 7;

              return (
                <tr key={s.id} className="border-t text-sm">
                  <td className="px-4 py-3">{s.roll}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-center">{s.year}</td>
                  <td className="px-4 py-3 text-center">{s.section}</td>
                  <td className="px-4 py-3 text-center">{s.attendance}%</td>
                  <td className="px-4 py-3 text-center">{s.cgpa}</td>
                  <td className="px-4 py-3 text-center">
                    {atRisk ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        At Risk
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        Safe
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg"
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

      {/* ================= MODALS ================= */}
      {showAlertModal && (
        <AlertModal count={atRiskCount} onClose={() => setShowAlertModal(false)} />
      )}

      {selectedStudent && (
        <StudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

/* ================= ALERT MODAL ================= */

function AlertModal({ count, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Alert At-Risk Students ({count})
        </h2>

        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Alert Title" />
        <textarea className="w-full border px-3 py-2 rounded-lg" rows={4} placeholder="Message" />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg">
            Send Alert
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STUDENT PROFILE ================= */

function StudentProfile({ student, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white max-w-3xl w-full rounded-2xl p-6 space-y-6">

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Student Profile — Admin View</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Info label="Roll" value={student.roll} />
          <Info label="Name" value={student.name} />
          <Info label="Attendance" value={`${student.attendance}%`} />
          <Info label="CGPA" value={student.cgpa} />
          <Info label="Backlogs" value={student.backlogs} />
          <Info label="Alerts Sent" value={student.alertsSent} />
          <Info label="Last Alert" value={student.lastAlert} />
          <Info label="Risk Status" value={student.attendance < 75 || student.cgpa < 7 ? "At Risk" : "Safe"} />
        </div>

        <div className="border border-dashed rounded-xl p-4 text-center text-gray-500 text-sm">
          📈 Attendance / Marks / CGPA trend  
          <br />
          Rendered by Analytics Agent
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
