import { useState, useMemo, useEffect } from "react";
import api from "../../utils/axios";

const API = "http://localhost:8000";

export default function Marks() {

  const [year, setYear] = useState("3");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("Mid-1");

  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [excelFile, setExcelFile] = useState(null);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

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

      // Map to expected structure with marks as total
      const studentsData = res.data.map(s => ({
        ...s,
        marks: s.total || 0
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

  /* ================= UPDATE MARK ================= */

  const updateMark = (roll, value) => {

    setStudents((prev) =>
      prev.map((s) =>
        s.roll_no === roll
          ? { ...s, marks: Number(value) }
          : s
      )
    );

  };

  /* ================= MANUAL SUBMIT ================= */

  const submitMarks = async () => {

    try {

      const subjectObj = subjects.find(
        s => s.subject_name === subject
      );

      // Prepare marks array for bulk submission
      const marksArray = students
        .filter(student => student.marks !== null && student.marks !== undefined)
        .map(student => ({
          student_id: student.student_id,
          assignment_total: 0,  // These can be extended later for detailed entry
          mid1: 0,
          mid2: 0,
          semester: 0,
          total: student.marks,
          sgpa: 0,
          cgpa: 0
        }));

      if (marksArray.length > 0) {
        await api.post("/faculty/marks/manual-entry", {
          marks: marksArray,
          subject_id: subjectObj?.subject_id,
          exam,
          year: parseInt(year),
          section
        });
      }

      alert("Marks uploaded successfully");

      setShowConfirm(false);
      setShowUpload(false);

      fetchStudents();  // Refresh the UI

    } catch (err) {

      alert("Failed to upload marks");

    }

  };

  /* ================= EXCEL UPLOAD ================= */

  const uploadExcel = async () => {

    if (!excelFile) {
      alert("Please select Excel file");
      return;
    }

    const subjectObj = subjects.find(
      (s) => s.subject_name === subject
    );

    if (!subjectObj?.subject_id) {
      console.warn("No matching subject selected; skipping student fetch.");
      setStudents([]);
      return;
    }

    const formData = new FormData();

    formData.append("file", excelFile);

    try {

      const response = await api.post(
        "/faculty/marks/upload",
        formData,
        {
          params: {
            year,
            section,
            subject_id: subjectObj.subject_id,
            exam
          },
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      alert("Excel marks uploaded successfully");

      setShowExcelUpload(false);

      fetchStudents();

    } catch (err) {

      alert("Excel upload failed");

    }

  };

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
            options={["Mid-1","Mid-2","Assignment","Semester"]}
          />

          <div className="flex justify-center gap-4 w-full mt-3">

            <button
              onClick={downloadTemplate}
              className="h-[44px] px-6 rounded-xl border bg-gray-100 hover:bg-gray-200"
            >
              Download Template
            </button>

            <button
              onClick={() => setShowExcelUpload(true)}
              className="h-[44px] px-6 rounded-xl bg-indigo-600 text-white"
            >
              Upload Excel
            </button>

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

          <h3 className="text-lg font-semibold">
            Manual Entry - {exam}
          </h3>

          <div className="max-h-96 overflow-y-auto space-y-2">

            {students.map((s) => (

              <div
                key={s.roll_no}
                className="flex justify-between items-center p-3 bg-white rounded-xl"
              >

                <div>

                  <p className="font-medium">{s.name}</p>

                  <p className="text-xs text-gray-500">{s.roll_no}</p>

                </div>

                <input

                  type="number"

                  value={s.marks || ""}

                  onChange={(e) => updateMark(s.roll_no, e.target.value)}

                  placeholder="Enter marks"

                  className="w-24 px-2 py-1 border rounded"

                  min="0"

                  max="100"

                />

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

      {showConfirm && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">

            <h3 className="text-lg font-semibold mb-4">Confirm Submission</h3>

            <p className="text-gray-600 mb-6">

              Are you sure you want to submit marks for {students.length} students?

            </p>

            <div className="flex justify-end gap-3">

              <button

                onClick={() => setShowConfirm(false)}

                className="px-4 py-2 border rounded-xl"

              >

                Cancel

              </button>

              <button

                onClick={submitMarks}

                className="px-4 py-2 bg-green-600 text-white rounded-xl"

              >

                Confirm

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