import { useState, useEffect } from "react";


export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteStudent, setShowDeleteStudent] = useState(false);
  const [showUpdateStudent, setShowUpdateStudent] = useState(false);

  const fetchStudents = async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem("access_token");

    const response = await fetch("http://127.0.0.1:8000/admin/students", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to fetch students:", data);
      setStudents([]);
      return;
    }

    setStudents(Array.isArray(data) ? data : []);

  } catch (err) {
    console.error("Fetch students failed:", err);
    setStudents([]);
  } finally {
    setLoading(false);
  }
 };


  useEffect(() => {
  fetchStudents();
 }, []);



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

  if (loading) {
  return <p className="text-center">Loading students...</p>;
 }


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
                  <td className="px-4 py-3 text-center">{s.section ? s.section : "—"}</td>
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
      {selectedStudent && <StudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
      {showDeleteStudent && (<DeleteStudentModal students={students} onDelete={setStudents} onClose={() => setShowDeleteStudent(false)} /> )}
      {showUpdateStudent && (<UpdateStudentModal students={students} setStudents={setStudents} onClose={() => setShowUpdateStudent(false)}/>)}


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
  const [filterSemester, setFilterSemester] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [editMode, setEditMode] = useState(false);


  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [singleUpdate, setSingleUpdate] = useState({});
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);


  const filteredStudents = students.filter(
  (s) =>
    (!filterDepartment || s.department === filterDepartment) &&
    (!filterYear || Number(s.year) === Number(filterYear)) &&
    (!filterSemester || Number(s.semester) === Number(filterSemester))&&
    (!filterSection || s.section === filterSection) &&
    (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll.toLowerCase().includes(search.toLowerCase())
    )
 );


  const selectedStudent = students.find(
    (s) => s.id === selectedStudentId
  );

  /* ===== BULK UPDATE ===== */
  const [bulkFilter, setBulkFilter] = useState({
  year: "",
  /*semester: "",        // ✅ ADD*/
  department: "",
  section: "",
  newYear: "",
  newSemester: "",
  newSection: ""
 });



  const bulkStudents = students.filter(
  (s) =>
    (!bulkFilter.year ||Number(s.year) === Number(bulkFilter.year)) &&
    (!bulkFilter.department || s.department === bulkFilter.department) &&
    /*(!bulkFilter.semester || Number(s.semester) === Number(bulkFilter.semester)) && */
    (!bulkFilter.section || s.section === bulkFilter.section)
);

  /* ===== CONFIRM UPDATE ===== */
  const confirmUpdate = async () => {
  setSubmitting(true);
  const token = localStorage.getItem("access_token");

  try {
    // 🔹 SINGLE STUDENT UPDATE
    if (flow === "single" && selectedStudentId) {
      const response = await fetch(
        `http://127.0.0.1:8000/admin/students/${selectedStudentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(singleUpdate),
        }
      );

      if (!response.ok) throw new Error("Single update failed");

      const result = await response.json();

      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudentId
            ? { ...s, ...singleUpdate }
            : s
        )
      );
      setEditMode(false);
      setSelectedStudentId(null);
      setSingleUpdate({});

    }

    // 🔹 BULK PROMOTION
    // 🔹 BULK PROMOTION (FIXED)
    if (flow === "bulk" && selectedBulkIds.length > 0) {

      if (selectedBulkIds.length === 0) {
        alert("Please select at least one student");
        return;
      }

      if (!bulkFilter.newYear || !bulkFilter.newSemester) {
        alert("Please select both Year and Semester");
        return;
      }
      

      console.log("BULK PAYLOAD", {
        student_ids: selectedBulkIds.map(Number),
        new_year: Number(bulkFilter.newYear),
        new_semester: Number(bulkFilter.newSemester),
        new_section: bulkFilter.newSection || null,
      });


      const response = await fetch(
        "http://127.0.0.1:8000/admin/students/bulk-promote",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_ids: selectedBulkIds.map(Number), 
            new_year: Number(bulkFilter.newYear),
            new_semester: Number(bulkFilter.newSemester), // ✅ ADD
            new_section: bulkFilter.newSection || null,
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        console.error(err);
        throw new Error("Bulk promotion failed");
      }

      // 🔄 Update UI locally
      setStudents((prev) =>
        prev.map((s) =>
          selectedBulkIds.includes(s.id)
            ? {
                ...s,
                year: Number(bulkFilter.newYear),
                section: bulkFilter.newSection || s.section,
              }
            : s
        )
      );

      setSelectedBulkIds([]);
      setBulkFilter({
        year: "",
        department: "",
        section: "",
        newYear: "",
        newSemester: "",
        newSection: ""
      });


    }


    setStep("success");
    setTimeout(() => onClose(), 2000);

  } catch (err) {
    alert(err.message);
  } finally {
    setSubmitting(false);
  }
};

 const isChanged =
  selectedStudent &&
  Object.keys(singleUpdate).length > 0 &&
  (
    singleUpdate.name !== selectedStudent.name ||
    singleUpdate.roll !== selectedStudent.roll ||
    singleUpdate.year !== selectedStudent.year ||
    singleUpdate.semester !== selectedStudent.semester ||
    singleUpdate.section !== selectedStudent.section
  );


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
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>

              </select>

              <select
                className="border px-3 py-2 rounded-lg w-full"
                value={filterSemester}
                onChange={(e) =>
                  setFilterSemester(e.target.value)
                }
              >
                <option value="">Select Semester</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
                <option value={5}>Semester 5</option>
                <option value={6}>Semester 6</option>
                <option value={7}>Semester 7</option>
                <option value={8}>Semester 8</option>
              </select>


               
              <select
                className="border px-3 py-2 rounded-lg"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">Select Department</option>
                <option value="CSE">CSE</option>
                <option value="CSM">CSM</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
 
              <select
                className="border px-3 py-2 rounded-lg"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="">Select Section (optional)</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
                <option>E</option>
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
                    setSingleUpdate({
                      name: s.name,
                      roll: s.roll,
                      year: s.year,
                      section: s.section,
                    });
                    setEditMode(false);
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
            {selectedStudent && (
              <div className="space-y-4">

                {/* VIEW MODE */}
                {!editMode && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><b>Name:</b> {selectedStudent.name}</div>
                      <div><b>Roll:</b> {selectedStudent.roll}</div>
                      <div><b>Year:</b> {selectedStudent.year}</div>
                      <div><b>Section:</b> {selectedStudent.section}</div>
                      <div><b>Department:</b> {selectedStudent.department}</div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                      >
                        Edit Student
                      </button>
                    </div>
                  </>
                )}

                {/* EDIT MODE */}
                {editMode && (
                  <>
                    <input
                      value={singleUpdate.name || ""}
                      onChange={(e) =>
                        setSingleUpdate({ ...singleUpdate, name: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full"
                      placeholder="Name"
                    />

                    <input
                      value={singleUpdate.roll || ""}
                      onChange={(e) =>
                        setSingleUpdate({ ...singleUpdate, roll: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full"
                      placeholder="Roll"
                    />

                    <select
                      value={singleUpdate.year || ""}
                      onChange={(e) =>
                        setSingleUpdate({ ...singleUpdate, year: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full"
                    >
                      <option value="">Select Year</option>
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>

                    </select>

                    <select
                      value={singleUpdate.semester || ""}
                      onChange={(e) =>
                        setSingleUpdate({ ...singleUpdate, semester: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full"
                    >
                      <option value="">Promote to Semester</option>
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                      <option value={3}>Semester 3</option>
                      <option value={4}>Semester 4</option>
                      <option value={5}>Semester 5</option>
                      <option value={6}>Semester 6</option>
                      <option value={7}>Semester 7</option>
                      <option value={8}>Semester 8</option>
                    </select>


                    <select
                      value={singleUpdate.section || ""}
                      onChange={(e) =>
                        setSingleUpdate({ ...singleUpdate, section: e.target.value })
                      }
                      className="border px-3 py-2 rounded-lg w-full"
                    >
                      <option value="">Select Section</option>
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>D</option>
                      <option>E</option>
                    </select>


                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 border rounded-lg"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={confirmUpdate}
                        disabled={submitting || !isChanged}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        {submitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </>
                )}
          </div>
        )}
          </div>
        )}

        {/* ================= BULK UPDATE ================= */}
        {flow === "bulk" && step === "form" && (
          <div className="space-y-4">

            {/* SELECT CURRENT YEAR */}
            <select
              className="border px-3 py-2 rounded-lg w-full"
              value={bulkFilter.year}
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, year: e.target.value })
              }
            >
              <option value="">Select Current Year</option>
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>

            </select>

            {/*<select
              className="border px-3 py-2 rounded-lg w-full"
              value={bulkFilter.semester}
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, semester: e.target.value })
              }
            >
              <option value="">Select Current Semester</option>
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
              <option value={3}>Semester 3</option>
              <option value={4}>Semester 4</option>
              <option value={5}>Semester 5</option>
              <option value={6}>Semester 6</option>
              <option value={7}>Semester 7</option>
              <option value={8}>Semester 8</option>

            </select>*/}

           
            {/* SELECT CURRENT DEPARTMENT */}
            <select
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, department: e.target.value })
              }
            >
              <option value="">Select Department</option>
              <option>CSE</option>
              <option>CSM</option>
              <option>ECE</option>
              <option>MECH</option>
              <option>CIVIL</option>
            </select>

            {/* SELECT CURRENT SECTION */}
            <select
              className="border px-3 py-2 rounded-lg w-full"
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, section: e.target.value })
              }
            >
              <option value="">Select Section (optional)</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
              <option>E</option>
            </select>

            <select
              className="border px-3 py-2 rounded-lg w-full"
              value={bulkFilter.newYear}
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, newYear: e.target.value })
              }
            >
              <option value="">Promote to Year</option>
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>

            </select>

            <select
              className="border px-3 py-2 rounded-lg w-full"
              value={bulkFilter.newSemester}
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, newSemester: e.target.value })
              }
            >
              <option value="">Select New Semester</option>
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
              <option value={3}>Semester 3</option>
              <option value={4}>Semester 4</option>
              <option value={5}>Semester 5</option>
              <option value={6}>Semester 6</option>
              <option value={7}>Semester 7</option>
              <option value={8}>Semester 8</option>

            </select>


            <select
              className="border px-3 py-2 rounded-lg w-full"
              value={bulkFilter.newSection}
              onChange={(e) =>
                setBulkFilter({ ...bulkFilter, newSection: e.target.value })
              }
            >
              <option value="">Change Section (optional)</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>



            {bulkStudents.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto text-sm">

                {/* ✅ SELECT ALL */}
                <label className="flex items-center gap-3 px-3 py-2 border-b font-medium bg-gray-50 sticky top-0">
                  <input
                    type="checkbox"
                    checked={selectedBulkIds.length === bulkStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBulkIds(bulkStudents.map((s) => Number(s.id)));
                      } else {
                        setSelectedBulkIds([]);
                      }
                    }}
                  />
                  Select All ({bulkStudents.length})
                </label>

                {/* 🔽 INDIVIDUAL STUDENTS */}
                {bulkStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2 border-b cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBulkIds.includes(s.id)}
                      onChange={() => {
                        setSelectedBulkIds((prev) =>
                          prev.includes(Number(s.id))
                            ? prev.filter((id) => id !== Number(s.id))
                            : [...prev, Number(s.id)]
                        );

                      }}
                    />
                    <span>
                      {s.roll} – {s.name} ({s.section})
                    </span>
                  </label>
                ))}
              </div>
            )}


            {selectedBulkIds.length > 0 && (
              <button
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Preview {selectedBulkIds.length} Students
              </button>
            )}

            {bulkStudents.length === 0 && (
              <p className="text-sm text-gray-400 text-center">
                No students match selected filters
              </p>
            )}

          </div>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="font-medium">Review Changes</p>

            <div className="max-h-40 overflow-y-auto border rounded-lg text-sm">
              {(flow === "single" ? [selectedStudent]: bulkStudents.filter((s) => selectedBulkIds.includes(s.id))).map(
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
                <option value="All">All</option>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
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

