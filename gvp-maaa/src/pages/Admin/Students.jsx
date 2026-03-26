import { useState, useEffect, useRef } from "react";
import api from "../../utils/api";


export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");


  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteStudent, setShowDeleteStudent] = useState(false);
  const [showUpdateStudent, setShowUpdateStudent] = useState(false);
  const [showNotifyStudent, setShowNotifyStudent] = useState(false);
  const [semester, setSemester] = useState("All");


  const fetchStudents = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/students');

      setStudents(Array.isArray(response.data) ? response.data : []);

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
  /* ===== FILTER ===== */
  const filtered = students.filter((s) => {
    const name = (s.name || "").toLowerCase();
    const roll = (s.roll || "").toLowerCase();
    const query = search.toLowerCase();

    return (
      (year === "All" || String(s.year) === year) &&
      (semester === "All" || String(s.semester) === semester) &&
      (section === "All" || s.section === section) &&
      (name.includes(query) || roll.includes(query))
    );
  });


  /* ===== SORT AT RISK FIRST ===== */
  const sortedStudents = [...filtered].sort((a, b) => {
    const aRisk = a.attendance < 75;
    const bRisk = b.attendance < 75;
    return bRisk - aRisk;
  });

  const atRiskCount = students.filter(
    (s) => s.attendance < 75
  ).length;

  const downloadRiskReport = async () => {
    try {
      const response = await api.post('/admin/students/risk-report', {
        year,
        section,
        search,
      }, {
        responseType: 'blob'
      });

      const blob = response.data;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Risk_Students_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // ✅ cleanup memory

    } catch (error) {
      console.error("Download error:", error);
      alert("Error generating report");
    }
  };

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
      <div className="bg-white px-4 py-3 rounded-xl border flex justify-between items-center">

        <div className="flex gap-3">

          <button
            onClick={() => setShowUpdateStudent(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition"
          >
            Update Students
          </button>

          <button
            onClick={() => setShowDeleteStudent(true)}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
          >
            Delete Students
          </button>

          <button
            onClick={() => setShowNotifyStudent(true)}
            className="px-4 py-2 rounded-lg border border-amber-300 text-amber-600 text-sm hover:bg-amber-50 transition"
          >
            Notify Students
          </button>

        </div>

        <button
          onClick={downloadRiskReport}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
        >
          Download Risk Students Report
        </button>

      </div>



      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex gap-4 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="All">All</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="All">All</option>
          <option value="1">Sem 1</option>
          <option value="2">Sem 2</option>
          <option value="3">Sem 3</option>
          <option value="4">Sem 4</option>
          <option value="5">Sem 5</option>
          <option value="6">Sem 6</option>
          <option value="7">Sem 7</option>
          <option value="8">Sem 8</option>
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
            </tr>
          </thead>

          <tbody>
            {sortedStudents.map((s) => {
              const atRisk = s.attendance < 75;
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
      {showDeleteStudent && (<DeleteStudentModal students={students} onDelete={setStudents} onClose={() => setShowDeleteStudent(false)} />)}
      {showUpdateStudent && (<UpdateStudentModal students={students} setStudents={setStudents} onClose={() => setShowUpdateStudent(false)} />)}
      {showNotifyStudent && (<NotifyStudentModal students={students} onClose={() => setShowNotifyStudent(false)} />)}


    </div>
  );
}

function DeleteStudentModal({ students, onDelete, onClose }) {
  const [step, setStep] = useState("form"); // form | review | success
  const [flow, setFlow] = useState(""); // single | bulk


  // filters (same as update)
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterSection, setFilterSection] = useState("");

  const [search, setSearch] = useState("");

  // selection
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);

  // confirm + undo
  const [confirmText, setConfirmText] = useState("");
  const [undoTimer, setUndoTimer] = useState(5);
  const [undoIds, setUndoIds] = useState([]);
  const undoRef = useRef(null);
  const UNDO_DURATION = 5; // seconds


  /* ===== FILTERED STUDENTS ===== */
  const filteredStudents = students.filter((s) => {
    const name = (s.name || "").toLowerCase();
    const roll = (s.roll || "").toLowerCase();
    const query = search.toLowerCase();

    return (
      (!filterDepartment || s.department === filterDepartment) &&
      (!filterYear || String(s.year) === filterYear) &&
      (!filterSemester || String(s.semester) === filterSemester) &&
      (!filterSection || s.section === filterSection) &&
      (name.includes(query) || roll.includes(query))
    );
  });


  useEffect(() => {
    if (flow === "single") {
      // if selected student is no longer visible after filtering, clear it
      const exists = filteredStudents.some(
        (s) => s.id === selectedStudentId
      );
      if (!exists) {
        setSelectedStudentId(null);
      }
    }
  }, [filteredStudents, flow, selectedStudentId]);


  const selectedStudent = filteredStudents.find(
    (s) => s.id === selectedStudentId
  );

  /* ===== UNDO DELETE ===== */
  const handleUndo = () => {
    if (undoRef.current) {
      clearInterval(undoRef.current);
    }

    // restore deleted students locally
    onDelete((prev) => [
      ...prev,
      ...students.filter((s) => undoIds.includes(s.id)),
    ]);

    setUndoIds([]);
    setStep("form");
  };


  /* ===== FINAL DELETE ===== */
  const handleFinalDelete = async () => {
    let ids = [];


    if (flow === "single" && selectedStudentId) {
      ids = [selectedStudentId];
    }

    if (flow === "bulk") {
      ids = selectedBulkIds;
    }


    if (ids.length === 0) {
      alert("No students selected");
      return;
    }

    setUndoIds(ids);     // store deleted ids for undo
    setUndoTimer(UNDO_DURATION); // reset timer

    try {
      await api.delete('/admin/students', {
        data: {
          student_ids: ids,
        },
      });

      // 🔄 Update UI after DB delete
      onDelete((prev) => prev.filter((s) => !ids.includes(s.id)));

      setStep("success");



    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  /* ===== KEEP SELECTED IDS IN SYNC WITH FILTERED LIST ===== */
  useEffect(() => {
    if (flow === "bulk") {
      // remove ids that no longer exist after filtering
      setSelectedBulkIds((prev) =>
        prev.filter((id) => filteredStudents.some((s) => s.id === id))
      );
    }
  }, [filteredStudents, flow]);


  /* ===== UNDO TIMER ===== */
  useEffect(() => {
    if (step !== "success") return;

    undoRef.current = setInterval(() => {
      setUndoTimer((t) => {
        if (t <= 1) {
          clearInterval(undoRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(undoRef.current);
  }, [step]);

  /* ===== AUTO-CLOSE MODAL AFTER UNDO PERIOD ===== */
  useEffect(() => {
    if (step === "success" && undoTimer === 0) {
      onClose();
    }
  }, [undoTimer, step, onClose]);



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
        {!flow && (
          <div className="space-y-4">
            <p className="font-medium">Choose delete type</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFlow("single")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Single Student
              </button>
              <button
                onClick={() => setFlow("bulk")}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg"
              >
                Bulk Delete
              </button>
            </div>
          </div>
        )}


        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* FILTERS */}
            <div className="grid grid-cols-2 gap-3">
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>

              <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>

              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="">Select Department</option>
                <option value="CSE">CSE</option>
                <option value="CSM">CSM</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>

              <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="">Select Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>

            {/* SEARCH (same as Update modal) */}
            <input
              placeholder="Search by name or roll"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full"
            />


            {/* SINGLE LIST */}
            {flow === "single" && (
              <div className="max-h-40 overflow-y-auto border rounded-lg text-sm">
                {filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`px-3 py-2 cursor-pointer ${selectedStudentId === s.id ? "bg-red-100" : ""
                      }`}
                  >
                    {s.roll} – {s.name}
                  </div>
                ))}
              </div>
            )}


            {flow === "bulk" && (
              <div className="border rounded-lg max-h-48 overflow-y-auto text-sm">

                <label className="flex gap-2 px-3 py-2 border-b font-medium">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      filteredStudents.every(s => selectedBulkIds.includes(s.id))
                    }
                    onChange={(e) =>
                      setSelectedBulkIds(
                        e.target.checked ? filteredStudents.map(s => s.id) : []
                      )
                    }
                  />
                  Select All ({filteredStudents.length})
                </label>

                {filteredStudents.map((s) => (
                  <label key={s.id} className="flex gap-2 px-3 py-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedBulkIds.includes(s.id)}
                      onChange={() =>
                        setSelectedBulkIds(prev =>
                          prev.includes(s.id)
                            ? prev.filter(id => id !== s.id)
                            : [...prev, s.id]
                        )
                      }
                    />
                    {s.roll} – {s.name}
                  </label>
                ))}
              </div>
            )}


            {/* ACTIONS */}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 border rounded-lg">
                Cancel
              </button>
              <button
                disabled={
                  (flow === "single" && !selectedStudentId) ||
                  (flow === "bulk" && selectedBulkIds.length === 0)
                }
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
              {(
                flow === "single"
                  ? filteredStudents.filter(s => s.id === selectedStudentId)
                  : filteredStudents.filter(s => selectedBulkIds.includes(s.id))
              ).map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-2 border-b text-sm flex justify-between"
                >
                  <span>{s.roll}</span>
                  <span>{s.name}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                Type <b>DELETE</b> to confirm
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="border px-3 py-2 rounded-lg w-full"
              />
            </div>


            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>
              <button
                disabled={confirmText !== "DELETE"}
                onClick={handleFinalDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Confirm Remove
              </button>
            </div>
          </>
        )}

        {/* ================= SUCCESS ================= */}
        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">

            {/* CHECK ICON */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-red-600">✓</span>
            </div>

            {/* TEXT */}
            <h3 className="text-lg font-semibold text-red-700">
              Students Deleted Successfully
            </h3>

            <p className="text-sm text-gray-500">
              Students deleted. You can undo this action for {undoTimer} seconds.
            </p>

            {undoTimer > 0 && (
              <button
                onClick={handleUndo}
                className="mt-4 px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50"
              >
                Undo ({undoTimer})
              </button>
            )}

            {/* LOADING BAR */}
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{
                  animation: `progress ${UNDO_DURATION}s linear`
                }}
              />
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
      (!filterSemester || Number(s.semester) === Number(filterSemester)) &&
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
      (!bulkFilter.year || Number(s.year) === Number(bulkFilter.year)) &&
      (!bulkFilter.department || s.department === bulkFilter.department) &&
      /*(!bulkFilter.semester || Number(s.semester) === Number(bulkFilter.semester)) && */
      (!bulkFilter.section || s.section === bulkFilter.section)
  );

  /* ===== CONFIRM UPDATE ===== */
  const confirmUpdate = async () => {
    setSubmitting(true);

    try {
      // 🔹 SINGLE STUDENT UPDATE
      if (flow === "single" && selectedStudentId) {
        await api.put(`/admin/students/${selectedStudentId}`, singleUpdate);

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

        // 🚨 prevent empty update
        if (!bulkFilter.newYear && !bulkFilter.newSemester && !bulkFilter.newSection) {
          alert("Please select at least one field to update");
          setSubmitting(false);
          return;
        }

        const payload = {
          student_ids: selectedBulkIds.map(Number),
        };

        // Only add fields if admin selected them
        if (bulkFilter.newYear) {
          payload.new_year = Number(bulkFilter.newYear);
        }

        if (bulkFilter.newSemester) {
          payload.new_semester = Number(bulkFilter.newSemester);
        }

        if (bulkFilter.newSection) {
          payload.new_section = bulkFilter.newSection;
        }

        console.log("BULK PAYLOAD", payload);

        await api.put('/admin/students/bulk-promote', payload);

        // 🔄 Update UI locally (only update selected fields)
        setStudents((prev) =>
          prev.map((s) =>
            selectedBulkIds.includes(s.id)
              ? {
                ...s,
                year: bulkFilter.newYear ? Number(bulkFilter.newYear) : s.year,
                semester: bulkFilter.newSemester ? Number(bulkFilter.newSemester) : s.semester,
                section: bulkFilter.newSection ? bulkFilter.newSection : s.section,
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
          newSection: "",
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


                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${selectedStudentId === s.id ? "bg-indigo-50" : ""
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
              {(flow === "single" ? [selectedStudent] : bulkStudents.filter((s) => selectedBulkIds.includes(s.id))).map(
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


function NotifyStudentModal({ students, onClose }) {
  const [step, setStep] = useState("form"); // form | review | success | deleteSuccess
  const [target, setTarget] = useState("all"); // all | department | individual
  const [department, setDepartment] = useState("CSE");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [type, setType] = useState("notice"); // notice | reminder | urgent
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /* ===== FETCH HISTORY ===== */
  const fetchHistory = async () => {
    try {
      const response = await api.get('/admin/alerts?role=student');
      setHistory(response.data);
    } catch (err) {
      console.error("History fetch error", err);
    }
  };

  /* ===== DELETE ALERT ===== */
  const deleteAlert = async (id) => {
    try {
      await api.delete(`/admin/alerts/${id}`);

      setHistory(prev => prev.filter(a => a.id !== id));
      setStep("deleteSuccess");

      setTimeout(() => {
        onClose();
      }, 2200);

      return true;

    } catch (err) {
      console.error("Delete failed", err);
      return false;
    }
  };

  /* ===== SEND NOTIFICATION ===== */
  const sendNotification = async () => {
    try {
      if (target === "individual" && !selectedStudentId) {
        alert("Please select a student");
        return;
      }

      if (!title || !message) {
        alert("Title and message are required");
        return;
      }

      const formData = new FormData();

      formData.append("title", title);
      formData.append("message", message);
      formData.append("type", type);
      formData.append("target_role", "student"); // 🔥 IMPORTANT
      formData.append("target_type", target);

      if (target === "department") {
        formData.append("department", department);
      }

      if (target === "individual") {
        formData.append("student_id", selectedStudentId);
      }

      if (file) {
        formData.append("file", file);
      }

      await api.post('/admin/alerts', formData);

      setStep("success");

      setTimeout(() => {
        onClose();
      }, 2200);

    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  /* ===== FETCH HISTORY ===== */

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Notify Students</h2>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="px-3 py-1 bg-gray-200 rounded-lg text-sm"
            >
              📜 History
            </button>
            <button onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ================= HISTORY ================= */}
        {showHistory && step === "form" && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">

            <h3 className="text-lg font-semibold">Notification History</h3>

            {history.length === 0 && (
              <p className="text-gray-500 text-sm">No notifications yet</p>
            )}

            {history.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-gray-50 flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    Target: {item.target_type}
                  </p>
                </div>

                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                onClick={() => setShowHistory(false)}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ================= FORM ================= */}
        {step === "form" && !showHistory && (
          <div className="space-y-5">

            {/* TARGET */}
            <div>
              <p className="text-sm font-medium mb-2">Send To</p>
              <div className="flex gap-4 text-sm">
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "all"}
                    onChange={() => setTarget("all")}
                  />
                  All Students
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "department"}
                    onChange={() => setTarget("department")}
                  />
                  Department
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "individual"}
                    onChange={() => setTarget("individual")}
                  />
                  Individual Student
                </label>
              </div>
            </div>

            {/* DEPARTMENT */}
            {target === "department" && (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option>CSE</option>
                <option>CSM</option>
                <option>ECE</option>
                <option>MECH</option>
                <option>CIVIL</option>
              </select>
            )}

            {/* INDIVIDUAL */}
            {target === "individual" && (
              <select
                onChange={(e) =>
                  setSelectedStudentId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.roll}
                  </option>
                ))}
              </select>
            )}

            {/* TYPE */}
            <div>
              <p className="text-sm font-medium mb-2">Notification Type</p>
              <div className="flex gap-4 text-sm">
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "notice"}
                    onChange={() => setType("notice")}
                  />
                  📢 Notice
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "reminder"}
                    onChange={() => setType("reminder")}
                  />
                  ⏰ Reminder
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "urgent"}
                    onChange={() => setType("urgent")}
                  />
                  🚨 Urgent Alert
                </label>
              </div>
            </div>

            {/* TITLE */}
            <input
              placeholder="Notification Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full"
            />

            {/* MESSAGE */}
            <textarea
              placeholder="Write message for students..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full h-28"
            />

            {/* FILE */}
            <div>
              <label className="text-sm font-medium">
                Attach Document (optional)
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mt-1 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!title || !message) {
                    alert("Title and message are required");
                    return;
                  }
                  setStep("review");
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Review Notification
              </button>
            </div>
          </div>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4 text-sm">
            <p className="font-medium">Please review notification details</p>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <p><b>Target:</b> {target}</p>

              {target === "department" && (
                <p><b>Department:</b> {department}</p>
              )}

              {target === "individual" && (
                <p>
                  <b>Student:</b>{" "}
                  {students.find(s => s.id === selectedStudentId)?.name}
                </p>
              )}

              <p><b>Type:</b> {type.toUpperCase()}</p>
              <p><b>Title:</b> {title}</p>
              <p><b>Message:</b> {message}</p>
              {file && <p><b>Attachment:</b> {file.name}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>

              <button
                onClick={sendNotification}
                className={`px-4 py-2 text-white rounded-lg ${type === "urgent"
                    ? "bg-red-600"
                    : "bg-green-600"
                  }`}
              >
                Send Notification
              </button>
            </div>
          </div>
        )}


        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>

            <h3 className="text-lg font-semibold text-green-700">
              Notification Sent Successfully
            </h3>

            <p className="text-sm text-gray-500">
              Students have been notified
            </p>
          </div>
        )}

        {/* DELETE SUCCESS */}
        {step === "deleteSuccess" && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-red-600">🗑</span>
            </div>

            <h3 className="text-lg font-semibold text-red-700">
              Notification Deleted Successfully
            </h3>
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
  const atRisk = student.attendance < 75;

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
                className={`h-2 rounded-full ${student.attendance < 75 ? "bg-red-500" : "bg-green-500"
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
                className={`h-2 rounded-full ${student.cgpa < 7 ? "bg-red-500" : "bg-indigo-500"
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

