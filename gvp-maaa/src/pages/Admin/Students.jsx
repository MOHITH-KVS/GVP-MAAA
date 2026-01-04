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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteStudent, setShowDeleteStudent] = useState(false);
  const [showUpdateStudent, setShowUpdateStudent] = useState(false);



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
      <div className="bg-white p-6 rounded-2xl border">
        <h1 className="text-2xl font-semibold">Student Management</h1>
        <p className="text-sm text-gray-500">
          Monitor performance, risks, and insights
        </p>
      </div>

      {/* ================= ADMIN ACTIONS ================= */}
      <div className="bg-white px-4 py-3 rounded-xl border flex gap-3 flex-wrap items-center">

        {/* PRIMARY ACTION */}
        <button
          onClick={() => setShowAddStudent(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
        >
          + Add Student
        </button>

        {/* SECONDARY ACTION */}
        <button
          onClick={() => setShowUpdateStudent(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition"
        >
          Update Students
        </button>

        {/* DESTRUCTIVE ACTION */}
        <button
          onClick={() => setShowDeleteStudent(true)}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
        >
          Delete Students
        </button>

        {/* WARNING / ATTENTION ACTION (push to right) */}
        <button
          onClick={() => setShowAlertModal(true)}
          className="ml-auto px-4 py-2 rounded-lg border border-amber-300 text-amber-600 text-sm hover:bg-amber-50 transition"
        >
          Alert At-Risk
        </button>

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

            {/* ================= STUDENT ANALYTICS ================= */}
      <div className="space-y-4">

        <h2 className="text-lg font-semibold">
          Student Analytics & Insights
        </h2>
        <p className="text-sm text-gray-500">
          Performance distribution, risk analysis, and academic health overview
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1 */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium mb-1">
              At-Risk vs Safe Students
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Overall academic risk distribution
            </p>

            <div className="h-40 border border-dashed rounded-lg flex items-center justify-center text-sm text-gray-400">
              📊 Analytics Agent will render chart here
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium mb-1">
              Attendance Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Attendance range across students
            </p>

            <div className="h-40 border border-dashed rounded-lg flex items-center justify-center text-sm text-gray-400">
              📊 Analytics Agent will render chart here
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium mb-1">
              CGPA Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Academic performance breakdown
            </p>

            <div className="h-40 border border-dashed rounded-lg flex items-center justify-center text-sm text-gray-400">
              📊 Analytics Agent will render chart here
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-medium mb-1">
              Section-wise Risk Analysis
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Risk comparison between sections
            </p>

            <div className="h-40 border border-dashed rounded-lg flex items-center justify-center text-sm text-gray-400">
              📊 Analytics Agent will render chart here
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODALS ================= */}
      {showAlertModal && (<AlertModal students={students} onClose={() => setShowAlertModal(false)}/>)}
      {showAddStudent && <AddStudentModal onAdd={setStudents} onClose={() => setShowAddStudent(false)} />}
      {selectedStudent && <StudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      {showDeleteStudent && (<DeleteStudentModal students={students} onDelete={setStudents} onClose={() => setShowDeleteStudent(false)} /> )}
      {showUpdateStudent && (<UpdateStudentModal students={students} setStudents={setStudents} onClose={() => setShowUpdateStudent(false)}/>)}


    </div>
  );
}

function AddStudentModal({ onAdd, onClose }) {
  const [mode, setMode] = useState("single");

  /* ===== COMMON ===== */
  const [step, setStep] = useState("form"); // form | review | success

  /* ===== SINGLE MODE ===== */
  const [singleList, setSingleList] = useState([
    { roll: "", name: "", year: "3rd Year", section: "A" },
  ]);

  /* ===== BULK MODE ===== */
  const [file, setFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);

  /* ===== ADD SINGLE ROW ===== */
  const addSingleRow = () => {
    setSingleList([
      ...singleList,
      { roll: "", name: "", year: "3rd Year", section: "A" },
    ]);
  };

  /* ===== HANDLE SINGLE INPUT ===== */
  const updateSingle = (index, key, value) => {
    const copy = [...singleList];
    copy[index][key] = value;
    setSingleList(copy);
  };

  /* ===== PREPARE SINGLE FOR REVIEW ===== */
  const reviewSingle = () => {
    const valid = singleList.filter(s => s.roll && s.name);
    if (valid.length === 0) return;
    setSingleList(valid);
    setStep("review");
  };

  /* ===== HANDLE FILE UPLOAD (DUMMY PARSE) ===== */
  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    setFile(uploaded);

    // 🔹 Dummy parsed data (replace with backend later)
    setBulkPreview([
      { roll: "21CSE101", name: "Ravi Kumar", year: "3rd Year", section: "A" },
      { roll: "21CSE102", name: "Neha Sharma", year: "3rd Year", section: "A" },
    ]);
  };

  /* ===== FINAL PUBLISH ===== */
  const finalPublish = () => {
    const prepared =
      mode === "single"
        ? singleList.map((s, i) => ({
            id: Date.now() + i,
            ...s,
            attendance: 0,
            cgpa: 0,
            backlogs: 0,
            alertsSent: 0,
            lastAlert: "-",
          }))
        : bulkPreview.map((s, i) => ({
            id: Date.now() + i,
            ...s,
            attendance: 0,
            cgpa: 0,
            backlogs: 0,
            alertsSent: 0,
            lastAlert: "-",
          }));

    onAdd(prev => [...prev, ...prepared]);
    setStep("success");

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Student</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* MODE */}
        {step === "form" && (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("single")}
              className={`px-4 py-2 rounded-lg border ${mode === "single" ? "bg-indigo-600 text-white" : ""}`}
            >
              Single Student
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`px-4 py-2 rounded-lg border ${mode === "bulk" ? "bg-amber-500 text-white" : ""}`}
            >
              Bulk Students
            </button>
          </div>
        )}

        {/* ================= SINGLE FORM ================= */}
        {mode === "single" && step === "form" && (
          <div className="space-y-4">
            {singleList.map((s, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input
                  placeholder="Roll"
                  value={s.roll}
                  onChange={e => updateSingle(i, "roll", e.target.value)}
                  className="border px-3 py-2 rounded-lg"
                />
                <input
                  placeholder="Name"
                  value={s.name}
                  onChange={e => updateSingle(i, "name", e.target.value)}
                  className="border px-3 py-2 rounded-lg"
                />
                <select
                  value={s.year}
                  onChange={e => updateSingle(i, "year", e.target.value)}
                  className="border px-3 py-2 rounded-lg"
                >
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
                <select
                  value={s.section}
                  onChange={e => updateSingle(i, "section", e.target.value)}
                  className="border px-3 py-2 rounded-lg"
                >
                  <option>A</option>
                  <option>B</option>
                </select>
              </div>
            ))}

            <button onClick={addSingleRow} className="text-indigo-600 text-sm">
              + Add Another Student
            </button>

            <div className="flex justify-end gap-3">
              <button onClick={reviewSingle} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                Review Students
              </button>
            </div>
          </div>
        )}

        {/* ================= BULK FORM ================= */}
        {mode === "bulk" && step === "form" && (
          <div className="space-y-4 border p-4 rounded-xl bg-amber-50">
            <input type="file" onChange={handleFileUpload} />
            {file && <p className="text-sm text-green-600">File selected: {file.name}</p>}

            {bulkPreview.length > 0 && (
              <button
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg"
              >
                Review Uploaded Students
              </button>
            )}
          </div>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <>
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">Roll</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Year</th>
                  <th className="p-2">Section</th>
                </tr>
              </thead>
              <tbody>
                {(mode === "single" ? singleList : bulkPreview).map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{s.roll}</td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.year}</td>
                    <td className="p-2">{s.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep("form")} className="px-4 py-2 border rounded-lg">
                Back & Edit
              </button>
              <button onClick={finalPublish} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                Final Publish
              </button>
            </div>
          </>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-10 space-y-3 animate-pulse">
            <div className="text-4xl">✅</div>
            <p className="text-lg font-semibold text-green-600">
              Successfully updated to database
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteStudentModal({ students, onDelete, onClose }) {
  const [mode, setMode] = useState("single"); // single | bulk
  const [step, setStep] = useState("form"); // form | review | success

  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [search, setSearch] = useState("");
  const [selectedRoll, setSelectedRoll] = useState("");

  /* ===== FILTERED STUDENTS ===== */
  const filteredStudents = students.filter(
    (s) =>
      s.year === year &&
      s.section === section &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedStudent = filteredStudents.find(
    (s) => s.roll === selectedRoll
  );

  /* ===== FINAL DELETE ===== */
  const handleFinalDelete = () => {
    if (mode === "single" && selectedStudent) {
      onDelete((prev) =>
        prev.filter((s) => s.roll !== selectedStudent.roll)
      );
    }

    if (mode === "bulk") {
      onDelete((prev) =>
        prev.filter((s) => !(s.year === year && s.section === section))
      );
    }

    setStep("success");
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6 animate-fadeIn">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-red-600">
            Delete Students
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* MODE SELECT */}
        {step === "form" && (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("single")}
              className={`px-4 py-2 rounded-lg border ${
                mode === "single" ? "bg-red-600 text-white" : ""
              }`}
            >
              Single Remove
            </button>
            <button
              onClick={() => setMode("bulk")}
              className={`px-4 py-2 rounded-lg border ${
                mode === "bulk" ? "bg-red-500 text-white" : ""
              }`}
            >
              Bulk Remove
            </button>
          </div>
        )}

        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* FILTERS */}
            <div className="grid grid-cols-3 gap-3">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>

              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                <option>A</option>
                <option>B</option>
              </select>

              {mode === "single" && (
                <input
                  placeholder="Search by name or roll"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border px-3 py-2 rounded-lg"
                />
              )}
            </div>

            {/* SINGLE LIST */}
            {mode === "single" && (
              <select
                className="border px-3 py-2 rounded-lg w-full"
                value={selectedRoll}
                onChange={(e) => setSelectedRoll(e.target.value)}
              >
                <option value="">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.roll}>
                    {s.roll} — {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* BULK INFO */}
            {mode === "bulk" && (
              <p className="text-sm text-gray-600">
                This will remove <b>{filteredStudents.length}</b> students
                from <b>{year} - Section {section}</b>
              </p>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 border rounded-lg">
                Cancel
              </button>
              <button
                disabled={mode === "single" && !selectedStudent}
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Review Delete
              </button>
            </div>
          </>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <>
            <p className="text-sm text-gray-600">
              Please recheck the students before confirming removal.
            </p>

            <div className="border rounded-lg max-h-48 overflow-auto">
              {(mode === "single"
                ? [selectedStudent]
                : filteredStudents
              ).map(
                (s, i) =>
                  s && (
                    <div
                      key={i}
                      className="px-3 py-2 border-b text-sm flex justify-between"
                    >
                      <span>{s.roll}</span>
                      <span>{s.name}</span>
                    </div>
                  )
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>
              <button
                onClick={handleFinalDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Confirm Remove
              </button>
            </div>
          </>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-10 space-y-2 animate-fadeIn">
            <div className="text-2xl font-semibold text-red-600">
              Students Removed Successfully
            </div>
            <p className="text-sm text-gray-500">
              Records have been updated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function UpdateStudentModal({ students, setStudents, onClose }) {
  const [flow, setFlow] = useState(""); // single | bulk
  const [step, setStep] = useState("form"); // form | review | success
  const [submitting, setSubmitting] = useState(false);


  /* ===== SINGLE UPDATE ===== */
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [editFields, setEditFields] = useState({
    name: false,
    roll: false,
    year: false,
    section: false,
  });

  const [singleUpdate, setSingleUpdate] = useState({});

  const filteredStudents = students.filter(
    (s) =>
      (!filterYear || s.year === filterYear) &&
      (!filterSection || s.section === filterSection) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedStudent = students.find(
    (s) => s.id === selectedStudentId
  );

  /* ===== BULK UPDATE ===== */
  const [bulkFilter, setBulkFilter] = useState({
    year: "",
    section: "",
    newYear: "",
    newSection: "",
  });

  const bulkStudents = students.filter(
    (s) =>
      s.year === bulkFilter.year &&
      (!bulkFilter.section || s.section === bulkFilter.section)
  );

  /* ===== CONFIRM UPDATE ===== */
  const confirmUpdate = () => {
  setSubmitting(true);

  setStudents((prev) =>
    prev.map((s) => {
      if (flow === "single" && s.id === selectedStudentId) {
        return {
          ...s,
          name: singleUpdate.name ?? s.name,
          roll: singleUpdate.roll ?? s.roll,
          year: singleUpdate.year ?? s.year,
          section: singleUpdate.section ?? s.section,
        };
      }

      if (
        flow === "bulk" &&
        s.year === bulkFilter.year &&
        (!bulkFilter.section || s.section === bulkFilter.section)
      ) {
        return {
          ...s,
          year: bulkFilter.newYear || s.year,
          section: bulkFilter.newSection || s.section,
        };
      }

      return s;
    })
  );

  setStep("success");
  setTimeout(onClose, 2500);
};


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Update Students</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* FLOW SELECT */}
        {!flow && (
          <div className="space-y-4">
            <p className="font-medium">Choose update type</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFlow("single")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Single Student (Correction)
              </button>
              <button
                onClick={() => setFlow("bulk")}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg"
              >
                Bulk Update (Promotion)
              </button>
            </div>
          </div>
        )}

        {/* ================= SINGLE UPDATE ================= */}
        {flow === "single" && step === "form" && (
          <div className="space-y-4">

            {/* FILTERS */}
            <div className="grid grid-cols-2 gap-3">
              <select
                className="border px-3 py-2 rounded-lg"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">Select Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>

              <select
                className="border px-3 py-2 rounded-lg"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="">Select Section (optional)</option>
                <option>A</option>
                <option>B</option>
              </select>
            </div>

            {/* SEARCH */}
            <input
              placeholder="Search by name or roll number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full"
            />

            {/* STUDENT LIST */}
            <div className="max-h-40 overflow-y-auto border rounded-lg text-sm">
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setSingleUpdate(s);
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    selectedStudentId === s.id ? "bg-indigo-50" : ""
                  }`}
                >
                  {s.roll} – {s.name} ({s.year} {s.section})
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <p className="text-center text-gray-400 py-3">
                  No students found
                </p>
              )}
            </div>

            {/* FIELD SELECT */}
            {selectedStudent && (
              <>
                <p className="font-medium text-sm">
                  Select fields to update
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.keys(editFields).map((key) => (
                    <label key={key} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={editFields[key]}
                        onChange={() =>
                          setEditFields({
                            ...editFields,
                            [key]: !editFields[key],
                          })
                        }
                      />
                      {key.toUpperCase()}
                    </label>
                  ))}
                </div>

                {editFields.name && (
                  <input
                    defaultValue={selectedStudent.name}
                    onChange={(e) =>
                      setSingleUpdate({ ...singleUpdate, name: e.target.value })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}
                {editFields.roll && (
                  <input
                    defaultValue={selectedStudent.roll}
                    onChange={(e) =>
                      setSingleUpdate({ ...singleUpdate, roll: e.target.value })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}
                {editFields.year && (
                  <input
                    defaultValue={selectedStudent.year}
                    onChange={(e) =>
                      setSingleUpdate({ ...singleUpdate, year: e.target.value })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}
                {editFields.section && (
                  <input
                    defaultValue={selectedStudent.section}
                    onChange={(e) =>
                      setSingleUpdate({
                        ...singleUpdate,
                        section: e.target.value,
                      })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep("review")}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Review Update
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= BULK UPDATE ================= */}
        {flow === "bulk" && step === "form" && (
          <div className="space-y-4">
            <select
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, year: e.target.value })
              }
            >
              <option value="">Select Current Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
            </select>

            <select
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, section: e.target.value })
              }
            >
              <option value="">Select Section (optional)</option>
              <option>A</option>
              <option>B</option>
            </select>

            <input
              placeholder="Promote to Year"
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, newYear: e.target.value })
              }
            />

            <input
              placeholder="Change Section (optional)"
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, newSection: e.target.value })
              }
            />

            {bulkStudents.length > 0 && (
              <button
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Preview {bulkStudents.length} Students
              </button>
            )}
          </div>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="font-medium">Review Changes</p>

            <div className="max-h-40 overflow-y-auto border rounded-lg text-sm">
              {(flow === "single" ? [selectedStudent] : bulkStudents).map(
                (s) => (
                  <div key={s.id} className="px-3 py-2 border-b">
                    {s.roll} – {s.name}
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>
              <button
                onClick={confirmUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
               >
                Confirm Update
              </button>

            </div>
          </div>
        )}
        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">
            
            {/* CHECK ICON */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>

            {/* TEXT */}
            <h3 className="text-lg font-semibold text-green-700">
              Successfully Updated
            </h3>

            <p className="text-sm text-gray-500">
              Student records have been updated in the system
            </p>

            {/* LOADING BAR */}
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
            </div>

            <style>
              {`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}
            </style>

          </div>
        )}

      </div>
    </div>
  );
}

function AlertModal({ students, onClose }) {
  const [step, setStep] = useState("list"); // list | review | success
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");

  /* ===== ONLY AT-RISK STUDENTS ===== */
  const atRiskStudents = students.filter(
    (s) => s.attendance < 75 || s.cgpa < 7
  );

  /* ===== FILTERED VIEW ===== */
  const filtered = atRiskStudents.filter((s) => {
    return (
      (year === "All" || s.year === year) &&
      (section === "All" || s.section === section) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getReason = (s) => {
    if (s.attendance < 75 && s.cgpa < 7) return "Low Attendance & CGPA";
    if (s.attendance < 75) return "Low Attendance";
    return "Low CGPA";
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-red-600">
            Alert At-Risk Students
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= LIST ================= */}
        {step === "list" && (
          <>
            {/* FILTERS */}
            <div className="flex gap-3 flex-wrap">
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
                placeholder="Search by name or roll"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-lg flex-1"
              />
            </div>

            {/* TABLE */}
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                🎉 No at-risk students found
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Roll</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-center">Attendance</th>
                      <th className="p-2 text-center">CGPA</th>
                      <th className="p-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.roll}</td>
                        <td className="p-2">{s.name}</td>
                        <td className="p-2 text-center">{s.attendance}%</td>
                        <td className="p-2 text-center">{s.cgpa}</td>
                        <td className="p-2 text-red-600">
                          {getReason(s)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FOOTER */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={filtered.length === 0}
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Send Warning Notification
              </button>
            </div>
          </>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="font-medium">
              You are about to send warnings to{" "}
              <b>{filtered.length}</b> students.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("list")}
                className="px-4 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => setStep("success")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Confirm Send
              </button>
            </div>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>

            <h3 className="text-lg font-semibold text-green-700">
              Warning Notifications Sent
            </h3>

            <p className="text-sm text-gray-500">
              All selected at-risk students have been notified
            </p>

            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
            </div>

            <style>
              {`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}
            </style>
          </div>
        )}

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

function StudentProfile({ student, onClose }) {
  const atRisk = student.attendance < 75 || student.cgpa < 7;

  // Auto-generate domain mail
  const domainMail = `${student.roll.toLowerCase()}@gvp.edu.in`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Student Details</h2>
          <button onClick={onClose} className="text-xl">✕</button>
        </div>

        {/* DETAILS */}
        <div className="space-y-4 text-sm">

          <Detail label="Name" value={student.name} />
          <Detail label="Roll No" value={student.roll} />
          <Detail label="Year" value={student.year} />
          <Detail label="Section" value={student.section} />
          <Detail label="Domain Mail ID" value={domainMail} />

          {/* ATTENDANCE PROGRESS */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Attendance</span>
              <span className="font-medium">{student.attendance}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  student.attendance < 75 ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${student.attendance}%` }}
              />
            </div>
          </div>

          {/* CGPA PROGRESS */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">CGPA</span>
              <span className="font-medium">{student.cgpa} / 10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  student.cgpa < 7 ? "bg-red-500" : "bg-indigo-500"
                }`}
                style={{ width: `${(student.cgpa / 10) * 100}%` }}
              />
            </div>
          </div>

        </div>


        {/* RISK STATUS */}
        <div className="flex justify-center">
          {atRisk ? (
            <span className="px-4 py-1 text-sm rounded-full bg-red-100 text-red-700">
              🚨 At Risk Student
            </span>
          ) : (
            <span className="px-4 py-1 text-sm rounded-full bg-green-100 text-green-700">
              ✅ Safe Student
            </span>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

