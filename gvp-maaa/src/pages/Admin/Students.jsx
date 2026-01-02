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
    backlogs: 2,
    alertsSent: 4,
    lastAlert: "01 Feb 2025",
  },
];

export default function Students() {
  const [students, setStudents] = useState(STUDENTS);
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ===== FILTER ===== */
  const filtered = students.filter((s) => {
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

  const atRiskCount = students.filter(
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

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAddStudent(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            + Add Student
          </button>

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

      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex gap-4 flex-wrap">
        <select value={year} onChange={(e) => setYear(e.target.value)} className="border px-3 py-2 rounded-lg">
          <option>All</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <select value={section} onChange={(e) => setSection(e.target.value)} className="border px-3 py-2 rounded-lg">
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
              <th />
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
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">At Risk</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Safe</span>
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
      {showAlertModal && <AlertModal count={atRiskCount} onClose={() => setShowAlertModal(false)} />}
      {showAddStudent && <AddStudentModal onAdd={setStudents} onClose={() => setShowAddStudent(false)} />}
      {showBulkAdd && <BulkAddModal onAdd={setStudents} onClose={() => setShowBulkAdd(false)} />}
      {selectedStudent && <StudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
    </div>
  );
}

function AddStudentModal({ onAdd, onClose }) {
  const [mode, setMode] = useState("single");

  /* ===== SINGLE STUDENT ===== */
  const [single, setSingle] = useState({
    roll: "",
    name: "",
    year: "3rd Year",
    section: "A",
  });

  /* ===== BULK META ===== */
  const [bulkMeta, setBulkMeta] = useState({
    year: "3rd Year",
    section: "A",
    batch: "2021",
    department: "CSE",
  });

  /* ===== BULK MANUAL LIST ===== */
  const [bulkStudents, setBulkStudents] = useState([
    { roll: "", name: "" },
  ]);

  /* ===== FILE UPLOAD ===== */
  const [file, setFile] = useState(null);

  /* ===== ADD SINGLE ===== */
  const addSingleStudent = () => {
    if (!single.roll || !single.name) return;

    onAdd((prev) => [
      ...prev,
      {
        id: Date.now(),
        roll: single.roll,
        name: single.name,
        year: single.year,
        section: single.section,
        attendance: 0,
        cgpa: 0,
        backlogs: 0,
        alertsSent: 0,
        lastAlert: "-",
      },
    ]);

    /*
      🔐 DB FUTURE:
      POST /students
      body: single student object
    */

    onClose();
  };

  /* ===== ADD BULK MANUAL ===== */
  const addBulkManual = () => {
    const prepared = bulkStudents
      .filter((s) => s.roll && s.name)
      .map((s, i) => ({
        id: Date.now() + i,
        roll: s.roll,
        name: s.name,
        year: bulkMeta.year,
        section: bulkMeta.section,
        attendance: 0,
        cgpa: 0,
        backlogs: 0,
        alertsSent: 0,
        lastAlert: "-",
      }));

    if (prepared.length === 0) return;

    onAdd((prev) => [...prev, ...prepared]);

    /*
      🔐 DB FUTURE:
      POST /students/bulk
      body: prepared[]
    */

    onClose();
  };

  /* ===== FILE UPLOAD HANDLER ===== */
  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);

    /*
      🔐 DB FUTURE FLOW:
      1. Upload file → backend
      2. Backend parses PDF/Excel
      3. Validate rows
      4. Insert into DB
    */
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Student</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* MODE SELECTOR */}
        <div className="flex gap-3">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 rounded-lg border ${
              mode === "single" ? "bg-indigo-600 text-white" : ""
            }`}
          >
            Single Student
          </button>

          <button
            onClick={() => setMode("bulk")}
            className={`px-4 py-2 rounded-lg border ${
              mode === "bulk" ? "bg-amber-500 text-white" : ""
            }`}
          >
            ⚡ Bulk Students
          </button>
        </div>

        {/* ================= SINGLE ================= */}
        {mode === "single" && (
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Roll No"
              value={single.roll}
              onChange={(e) =>
                setSingle({ ...single, roll: e.target.value })
              }
              className="border px-3 py-2 rounded-lg"
            />
            <input
              placeholder="Student Name"
              value={single.name}
              onChange={(e) =>
                setSingle({ ...single, name: e.target.value })
              }
              className="border px-3 py-2 rounded-lg"
            />
            <select
              className="border px-3 py-2 rounded-lg"
              value={single.year}
              onChange={(e) =>
                setSingle({ ...single, year: e.target.value })
              }
            >
              <option>3rd Year</option>
              <option>4th Year</option>
            </select>
            <select
              className="border px-3 py-2 rounded-lg"
              value={single.section}
              onChange={(e) =>
                setSingle({ ...single, section: e.target.value })
              }
            >
              <option>A</option>
              <option>B</option>
            </select>
          </div>
        )}

        {/* ================= BULK ================= */}
        {mode === "bulk" && (
          <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-200">

            <p className="text-sm text-amber-700 font-medium">
              ⚠ Bulk Mode: Academic details are common. Student names & rolls are individual.
            </p>

            {/* COMMON DETAILS */}
            <div className="grid grid-cols-2 gap-3">
              <select
                className="border px-3 py-2 rounded-lg"
                value={bulkMeta.year}
                onChange={(e) =>
                  setBulkMeta({ ...bulkMeta, year: e.target.value })
                }
              >
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>

              <select
                className="border px-3 py-2 rounded-lg"
                value={bulkMeta.section}
                onChange={(e) =>
                  setBulkMeta({ ...bulkMeta, section: e.target.value })
                }
              >
                <option>A</option>
                <option>B</option>
              </select>

              <input
                placeholder="Batch (e.g. 2021)"
                className="border px-3 py-2 rounded-lg"
                value={bulkMeta.batch}
                onChange={(e) =>
                  setBulkMeta({ ...bulkMeta, batch: e.target.value })
                }
              />

              <input
                placeholder="Department (e.g. CSE)"
                className="border px-3 py-2 rounded-lg"
                value={bulkMeta.department}
                onChange={(e) =>
                  setBulkMeta({ ...bulkMeta, department: e.target.value })
                }
              />
            </div>

            {/* FILE UPLOAD */}
            <div className="border border-dashed rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-600 mb-2">
                Upload PDF / Excel / CSV (Optional)
              </p>
              <input type="file" onChange={handleFileUpload} />
              {file && (
                <p className="text-xs text-green-600 mt-1">
                  File selected: {file.name}
                </p>
              )}
            </div>

            {/* MANUAL ENTRY */}
            <div className="space-y-2">
              {bulkStudents.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Roll No"
                    value={s.roll}
                    onChange={(e) => {
                      const copy = [...bulkStudents];
                      copy[i].roll = e.target.value;
                      setBulkStudents(copy);
                    }}
                    className="border px-3 py-2 rounded-lg w-1/2"
                  />
                  <input
                    placeholder="Student Name"
                    value={s.name}
                    onChange={(e) => {
                      const copy = [...bulkStudents];
                      copy[i].name = e.target.value;
                      setBulkStudents(copy);
                    }}
                    className="border px-3 py-2 rounded-lg w-1/2"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setBulkStudents([...bulkStudents, { roll: "", name: "" }])
              }
              className="text-sm text-indigo-600"
            >
              + Add Another Student
            </button>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>

          {mode === "single" ? (
            <button
              onClick={addSingleStudent}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Add Student
            </button>
          ) : (
            <button
              onClick={addBulkManual}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg"
            >
              Add Students
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= REUSABLE ================= */
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Form({ data, setData }) {
  return Object.keys(data).map((key) => (
    <input
      key={key}
      placeholder={key.toUpperCase()}
      value={data[key]}
      onChange={(e) => setData({ ...data, [key]: e.target.value })}
      className="w-full border px-3 py-2 rounded-lg"
    />
  ));
}

function ActionButtons({ onClose, onSubmit, label }) {
  return (
    <div className="flex justify-end gap-3">
      <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
      <button onClick={onSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{label}</button>
    </div>
  );
}
