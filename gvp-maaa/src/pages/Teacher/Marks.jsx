import { useState, useMemo, useEffect, useRef } from "react";
import api from "../../utils/axios";
// import * as XLSX from 'xlsx';

const API = "http://localhost:8000";

export default function Marks() {

  const [year, setYear] = useState("3");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("Mid-1");

  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [file, setFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Dynamic assignment options
  const assignmentOptions = Array.from({ length: 5 }, (_, i) => `Assignment-${i+1}`);
  const examOptions = ["Mid-1", "Mid-2", "Semester", ...assignmentOptions];

  /* ================= FETCH SUBJECTS ================= */

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {

  try {

    const res = await api.get("/faculty/my-subjects");

    console.log("Subjects from backend:", res.data);

    const data = Array.isArray(res.data) ? res.data : [];
    setSubjects(data);

    if (data.length > 0) {
      setSubject(data[0].subject_name);
    }

  } catch(err){
    console.error("Failed to load subjects",err);
  }

 };
  /* ================= FETCH STUDENTS ================= */

  useEffect(() => {
    if (subject) {
      fetchStudents();
    }
  }, [year, section, subject, exam]);

  const fetchStudents = async () => {
    try {
      // For flat subject structure
      const subjectObj = subjects.find(
        s => s.subject_name === subject
      );

      const res = await api.get("/faculty/marks", {
        params: {
          year,
          section,
          subject_id: subjectObj?.subject_id,
          exam
        }
      });

      // Map to expected structure with all mark fields and store originals
      const studentsData = res.data.map(s => ({
        ...s,
        marks: s.total || 0,
        assignment_total: s.assignment_total || 0,
        mid1: s.mid1 || 0,
        mid2: s.mid2 || 0,
        semester: s.semester || 0,
        sgpa: s.sgpa || 0,
        cgpa: s.cgpa || 0,
        // Store original values for change detection
        original_mid1: s.mid1 || 0,
        original_mid2: s.mid2 || 0,
        original_assignment_total: s.assignment_total || 0,
        original_semester: s.semester || 0
      }));

      setStudents(studentsData);
    } catch (err) {
      console.error("Failed to load students/marks");
      setStudents([]);
    }
  };

  /* ================= DOWNLOAD TEMPLATE ================= */

  const downloadTemplate = async () => {
    if (!year || !section || !subject) {
      alert("Please select year, section and subject");
      return;
    }

    const subjectObj = subjects.find(
      s => s.subject_name === subject
    );

    if (!subjectObj?.subject_id) {
      alert("Invalid subject selected");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/faculty/marks/template?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        const err = await response.json();
        alert(err.detail || err.error || "Download failed");
        return;
      }

      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "marks_template.xlsx";
      link.click();

    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed: " + err.message);
    }
  };

  /* ================= SORTING ================= */

  const sortedStudents = useMemo(() => {

    return [...students]
      .filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (b.marks || 0) - (a.marks || 0));

  }, [students, search]);

  /* ================= METRICS ================= */

  const total = students.length;

  const avg =
    students.filter(s => s.marks !== null).length > 0
      ? Math.round(
          students
            .filter(s => s.marks !== null)
            .reduce((s, x) => s + x.marks, 0)
            /
          students.filter(s => s.marks !== null).length
        )
      : 0;

  const highest =
    students.length > 0
      ? Math.max(...students.map((s) => s.marks || 0))
      : 0;

  const failCount =
    students.filter((s) => (s.marks || 0) < 40).length;

  /* ================= UPDATE VALUE ================= */

  const updateValue = (id, field, value) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === id ? { ...s, [field]: value } : s
      )
    );
  };

  /* ================= FILE HANDLING ================= */

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      // Show basic file info for preview
      setUploadPreview({
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB',
        lastModified: new Date(selectedFile.lastModified).toLocaleDateString(),
        studentCount: 'To be determined after upload'
      });
    }
  };

  const handleUploadConfirm = async () => {
    if (!file) return;

    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) {
      alert("Invalid subject selected");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `http://localhost:8000/faculty/marks/upload?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}&exam=${exam}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: formData
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }

      setSuccessMessage(`✅ Upload successful: ${data.updated_count} records updated`);
      setShowSuccess(true);
      setUploadPreview(null);
      setFile(null);

      fetchStudents(); // refresh UI

    } catch (err) {
      console.error(err);
      alert("Upload error");
    }
  };

  /* ================= MANUAL SUBMIT ================= */

  const getChangedStudents = () => {
    return students.filter(s => {
      if (exam === "Mid-1") return s.mid1 !== s.original_mid1;
      if (exam === "Mid-2") return s.mid2 !== s.original_mid2;
      if (exam.startsWith("Assignment")) return s.assignment_total !== s.original_assignment_total;
      if (exam === "Semester") return s.semester !== s.original_semester;
      return false;
    });
  };

  const handleSubmit = async () => {
    const changedStudents = getChangedStudents();

    const subjectObj = subjects.find(s => s.subject_name === subject);

    const payload = {
      marks: changedStudents.map(s => ({
        student_id: s.student_id,
        value:
          exam === "Mid-1" ? s.mid1 :
          exam === "Mid-2" ? s.mid2 :
          exam.startsWith("Assignment") ? s.assignment_total :
          s.semester
      })),
      subject_id: subjectObj?.subject_id,
      exam,
      year: parseInt(year),
      section
    };

    try {
      const res = await fetch("http://localhost:8000/faculty/marks/manual-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Update failed");
        return;
      }

      setSuccessMessage(`✅ Successfully updated ${data.updated_count} students`);
      setShowSuccess(true);
      setShowConfirm(false);
      setShowUpload(false);
      setEditMode(false);

      fetchStudents(); // refresh UI

    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  /* ================= EXCEL UPLOAD ================= */

  // Handled by handleUpload function above

  return (

    <div className="space-y-10">

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">Marks & Performance</h1>
        <p className="text-sm text-gray-500">
          Evaluate performance, identify toppers and students at risk
        </p>
      </div>

      {/* FILTER BAR */}

      <div className="glass rounded-2xl px-6 py-4">

        <div className="flex flex-wrap items-center gap-6">

          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={["1","2","3","4"]}
          />

          <FilterSelect
            label="Section"
            value={section}
            onChange={setSection}
            options={["A","B","C","D"]}
          />

          <FilterSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={subjects.map((s) => s.subject_name).filter(Boolean)}
          />

          <FilterSelect
            label="Exam"
            value={exam}
            onChange={setExam}
            options={examOptions}
          />

          <div className="flex justify-center gap-4 w-full mt-3">

            <button
              onClick={downloadTemplate}
              className="h-[44px] px-6 rounded-xl border bg-gray-100 hover:bg-gray-200"
            >
              Download Template
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="h-[44px] px-6 rounded-xl bg-indigo-600 text-white"
            >
              Upload Excel
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
            />

            <button
              onClick={() => setShowUpload(true)}
              className="h-[44px] px-6 rounded-xl bg-green-600 text-white"
            >
              Manual Entry
            </button>

          </div>

        </div>

      </div>

      {/* MANUAL ENTRY MODAL */}

      {showUpload && (

        <div className="glass rounded-2xl p-6 space-y-4">

          <div className="flex justify-between items-center">

            <h3 className="text-lg font-semibold">
              Manual Entry - {exam}
            </h3>

            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-xl text-sm ${
                editMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {editMode ? "Simple Mode" : "Edit Mode"}
            </button>

          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">

            {students.map((s) => (

              <div
                key={s.roll_no}
                className="p-3 bg-white rounded-xl space-y-2"
              >

                <div className="flex justify-between items-center">

                  <div>

                    <p className="font-medium">{s.name}</p>

                    <p className="text-xs text-gray-500">{s.roll_no}</p>

                  </div>

                </div>

                {editMode ? (
                  // EDIT MODE: Only selected exam field
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      {exam === "Mid-1" ? "Mid 1 Marks:" :
                       exam === "Mid-2" ? "Mid 2 Marks:" :
                       exam.startsWith("Assignment") ? "Assignment Marks:" :
                       "Semester Marks:"}
                    </label>
                    {exam === "Mid-1" && (
                      <input
                        type="number"
                        value={s.mid1 || ""}
                        onChange={(e) => updateValue(s.student_id, "mid1", e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 border rounded"
                        min="0"
                        max="100"
                      />
                    )}
                    {exam === "Mid-2" && (
                      <input
                        type="number"
                        value={s.mid2 || ""}
                        onChange={(e) => updateValue(s.student_id, "mid2", e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 border rounded"
                        min="0"
                        max="100"
                      />
                    )}
                    {exam.startsWith("Assignment") && (
                      <input
                        type="number"
                        value={s.assignment_total || ""}
                        onChange={(e) => updateValue(s.student_id, "assignment_total", e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 border rounded"
                        min="0"
                        max="100"
                      />
                    )}
                    {exam === "Semester" && (
                      <input
                        type="number"
                        value={s.semester || ""}
                        onChange={(e) => updateValue(s.student_id, "semester", e.target.value)}
                        placeholder="0"
                        className="w-24 px-2 py-1 border rounded"
                        min="0"
                        max="100"
                      />
                    )}
                  </div>
                ) : (
                  // SIMPLE MODE: Display current value
                  <div className="text-sm text-gray-600">
                    Current: {
                      exam === "Mid-1" ? (s.mid1 || 0) :
                      exam === "Mid-2" ? (s.mid2 || 0) :
                      exam.startsWith("Assignment") ? (s.assignment_total || 0) :
                      (s.semester || 0)
                    }
                  </div>
                )}

              </div>

            ))}

          </div>

          <div className="flex justify-end gap-3">

            <button

              onClick={() => setShowUpload(false)}

              className="px-4 py-2 border rounded-xl"

            >

              Cancel

            </button>

            <button

              onClick={() => setShowConfirm(true)}

              className="px-4 py-2 bg-green-600 text-white rounded-xl"

            >

              Submit

            </button>

          </div>

        </div>

      )}

      {/* CONFIRMATION MODAL */}

      {showConfirm && (() => {
        const changedCount = getChangedStudents().length;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">

              <h3 className="text-lg font-semibold mb-4">Confirm Submission</h3>

              <p className="text-gray-600 mb-6">
                Are you sure you want to update {changedCount} out of {students.length} students?
              </p>

              <div className="flex justify-end gap-3">

                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl"
                  disabled={changedCount === 0}
                >
                  Confirm
                </button>

              </div>

            </div>

          </div>
        );
      })()}

      {/* SUCCESS MODAL */}

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccess(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-xl"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD PREVIEW MODAL */}

      {uploadPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Preview</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>File:</strong> {uploadPreview.fileName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Size:</strong> {uploadPreview.fileSize}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Last Modified:</strong> {uploadPreview.lastModified}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Students:</strong> {uploadPreview.studentCount}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Click "Upload" to process the Excel file and update student marks.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setUploadPreview(null);
                  setFile(null);
                }}
                className="px-4 py-2 border rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Kpi title="Class Average" value={`${avg}%`} />

        <Kpi title="Highest Score" value={highest} />

        <Kpi title="Total Students" value={total} />

        <Kpi title="Fail Count" value={failCount} danger />

      </div>

      {/* STUDENT LIST */}

      <div className="glass rounded-2xl p-6 space-y-4">

        <div className="flex items-center gap-4">

          <h3 className="text-lg font-semibold">
            Student Marks ({exam})
          </h3>

          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search student"
            className="ml-auto w-72 px-4 py-2 border rounded-xl"
          />

        </div>

        <div className="space-y-2">

          {sortedStudents.length === 0 ? (
            <div className="text-center text-gray-400 py-6">No students found for this class.</div>
          ) : (
            sortedStudents.map((s) => (
              <div
                key={s.roll_no}
                className="flex justify-between items-center p-3 bg-white rounded-xl"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.roll_no}</p>
                </div>
                <span className="font-medium">
                  {s.marks === null || s.marks === undefined ? "-" : s.marks}
                </span>
              </div>
            ))
          )}

        </div>

      </div>

    </div>

  );

}

/* COMPONENTS */

function FilterSelect({label,value,onChange,options}){

  return(

    <div className="flex flex-col gap-1">

      <label className="text-xs font-medium text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border"
      >

        {options.map(o=>(
          <option key={o}>{o}</option>
        ))}

      </select>

    </div>

  );

}

function Kpi({title,value,danger}){

  return(

    <div className={`glass rounded-2xl p-4 ${danger?"text-red-600":""}`}>

      <p className="text-xs text-gray-500">{title}</p>

      <p className="text-2xl font-semibold mt-1">
        {value}
      </p>

    </div>

  );

}