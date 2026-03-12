import { useState, useMemo, useEffect } from "react";
import axios from "axios";

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

      const token = localStorage.getItem("token");

      const res = await axios.get(`${API}/faculty/my-subjects`,{
        headers:{
          Authorization:`Bearer ${token}`
        }
      });

      setSubjects(res.data);

      if(res.data.length > 0){
        setSubject(res.data[0].subject.subject_name);
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

      const subjectObj = subjects.find(
        s => s.subject.subject_name === subject
      );

      const res = await axios.get(`${API}/faculty/marks`, {
        params: {
          year,
          section,
          subject_id: subjectObj?.subject_id,
          exam
        }
      });

      setStudents(res.data);

    } catch (err) {
      console.error("Failed to load students/marks");
    }
  };

  /* ================= DOWNLOAD TEMPLATE ================= */

  const downloadTemplate = () => {
    window.open(`${API}/faculty/marks/template`);
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
        s => s.subject.subject_name === subject
      );

      await axios.post(`${API}/faculty/upload-marks`, {

        year,
        section,
        subject_id: subjectObj?.subject_id,
        exam,

        marks: students.map((s) => ({
          student_id: s.student_id,
          marks: s.marks || 0
        }))

      });

      alert("Marks uploaded successfully");

      setShowConfirm(false);
      setShowUpload(false);

      fetchStudents();

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
      s => s.subject.subject_name === subject
    );

    const formData = new FormData();

    formData.append("file", excelFile);
    formData.append("year", year);
    formData.append("section", section);
    formData.append("subject_id", subjectObj?.subject_id);
    formData.append("subject", subject);

    try {

      await axios.post(
        `${API}/faculty/marks/upload-excel`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
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
            options={subjects.map(s => s.subject_name)}
          />

          <FilterSelect
            label="Exam"
            value={exam}
            onChange={setExam}
            options={["Mid-1","Mid-2","Assignment","Semester"]}
          />

          <div className="ml-auto flex items-end gap-3">

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

      {/* EXCEL UPLOAD */}

      {showExcelUpload && (

        <div className="glass rounded-2xl p-6 space-y-4">

          <h3 className="text-lg font-semibold">
            Upload Excel Marks
          </h3>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e)=>setExcelFile(e.target.files[0])}
            className="w-full border p-2 rounded"
          />

          <div className="flex justify-end gap-3">

            <button
              onClick={()=>setShowExcelUpload(false)}
              className="px-4 py-2 border rounded-xl"
            >
              Cancel
            </button>

            <button
              onClick={uploadExcel}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl"
            >
              Upload
            </button>

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

          {sortedStudents.map((s)=>(
            <div
              key={s.roll_no}
              className="flex justify-between items-center p-3 bg-white rounded-xl"
            >

              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{s.roll_no}</p>
              </div>

              <span className="font-medium">
                {s.marks || "-"}
              </span>

            </div>
          ))}

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