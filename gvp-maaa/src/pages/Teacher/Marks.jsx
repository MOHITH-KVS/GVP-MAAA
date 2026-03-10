import { useState, useMemo, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Marks() {
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("DBMS");
  const [exam, setExam] = useState("Mid-1");

  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [students, setStudents] = useState([]);

  /* ================= FETCH STUDENTS ================= */

  useEffect(() => {
    fetchStudents();
  }, [year, section]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API}/faculty/students`, {
        params: { year, section }
      });

      setStudents(res.data);

    } catch (err) {
      console.error("Failed to load students");
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
    total > 0
      ? Math.round(
          students.reduce((s, x) => s + (x.marks || 0), 0) / total
        )
      : 0;

  const highest =
    students.length > 0
      ? Math.max(...students.map((s) => s.marks || 0))
      : 0;

  const failCount = students.filter((s) => (s.marks || 0) < 40).length;

  /* ================= UPDATE MARKS ================= */

  const updateMark = (roll, value) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.roll_no === roll ? { ...s, marks: Number(value) } : s
      )
    );
  };

  /* ================= SUBMIT MARKS ================= */

  const submitMarks = async () => {
    try {
      await axios.post(`${API}/faculty/upload-marks`, {
        year,
        section,
        subject,
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

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}

      <div>
        <h1 className="text-2xl font-semibold">Marks & Performance</h1>
        <p className="text-sm text-gray-500">
          Evaluate performance, identify toppers and students at risk
        </p>
      </div>

      {/* ================= FILTER BAR ================= */}

      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">

          <FilterSelect label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
          <FilterSelect label="Section" value={section} onChange={setSection} options={["A", "B"]} />
          <FilterSelect label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />
          <FilterSelect label="Exam" value={exam} onChange={setExam} options={["Mid-1", "Mid-2", "Semester"]} />

          <div className="ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              className="h-[44px] px-7 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              Upload Marks
            </button>
          </div>
        </div>
      </div>

      {/* ================= UPLOAD CONTEXT ================= */}

      {showUpload && (
        <div className="glass rounded-2xl p-6 space-y-4">

          <h3 className="text-lg font-semibold">Enter Marks</h3>

          <div className="bg-indigo-50 rounded-xl p-3 text-sm">
            Uploading for <b>{year}</b>, Section <b>{section}</b>, <b>{subject}</b>, <b>{exam}</b>
          </div>

          <div className="space-y-2">

            {students.map((s) => (

              <div
                key={s.roll_no}
                className="flex justify-between items-center bg-white p-3 rounded-xl"
              >

                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.roll_no}</p>
                </div>

                <input
                  type="number"
                  value={s.marks || ""}
                  onChange={(e) => updateMark(s.roll_no, e.target.value)}
                  className="w-20 px-2 py-1 border rounded"
                />

              </div>

            ))}

          </div>

          <div className="flex justify-end gap-3 pt-3">

            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
            >
              Save & Publish
            </button>

          </div>

        </div>
      )}

      {/* ================= CONFIRM ================= */}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">

            <h3 className="text-lg font-semibold">
              Confirm Marks Publication
            </h3>

            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p><b>Year:</b> {year}</p>
              <p><b>Section:</b> {section}</p>
              <p><b>Subject:</b> {subject}</p>
              <p><b>Exam:</b> {exam}</p>
            </div>

            <p className="text-xs text-red-600">
              Students will immediately see their marks.
            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border"
              >
                Edit
              </button>

              <button
                onClick={submitMarks}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
              >
                Final Submit
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ================= KPI CARDS ================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Class Average" value={`${avg}%`} />
        <Kpi title="Highest Score" value={highest} />
        <Kpi title="Total Students" value={total} />
        <Kpi title="Fail Count" value={failCount} danger />
      </div>

      {/* ================= STUDENT LIST ================= */}

      <div className="glass rounded-2xl p-6 space-y-4">

        <div className="flex items-center gap-4">

          <h3 className="text-lg font-semibold">
            Student Marks ({exam})
          </h3>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student"
            className="ml-auto w-72 px-4 py-2 border rounded-xl"
          />

        </div>

        <div className="space-y-2">

          {sortedStudents.map((s) => (

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

/* ================= COMPONENTS ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ title, value, danger }) {
  return (
    <div className={`glass rounded-2xl p-4 ${danger ? "text-red-600" : ""}`}>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}