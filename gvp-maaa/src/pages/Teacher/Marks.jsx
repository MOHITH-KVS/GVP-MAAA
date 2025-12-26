import { useState } from "react";

/* ================= SAMPLE DATA ================= */
const STUDENTS = [
  { name: "Ravi", roll: "21CS001", marks: 42 },
  { name: "Anusha", roll: "21CS014", marks: 68 },
  { name: "Suresh", roll: "21CS021", marks: 81 },
  { name: "Priya", roll: "21CS032", marks: 55 },
  { name: "Kiran", roll: "21CS045", marks: 90 },
];

export default function Marks() {
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("DBMS");
  const [exam, setExam] = useState("Mid-1");
  const [showUpload, setShowUpload] = useState(false);

  /* ===== BASIC METRICS ===== */
  const total = STUDENTS.length;
  const avg =
    Math.round(
      STUDENTS.reduce((s, x) => s + x.marks, 0) / total
    ) || 0;
  const highest = Math.max(...STUDENTS.map((s) => s.marks));
  const failCount = STUDENTS.filter((s) => s.marks < 40).length;

  return (
    <div className="space-y-10">

      {/* ================= PAGE HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Marks & Performance</h1>
        <p className="text-sm text-gray-500">
          Upload marks, evaluate performance, and identify students at risk
        </p>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">

          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={["3rd Year", "4th Year"]}
          />

          <FilterSelect
            label="Section"
            value={section}
            onChange={setSection}
            options={["A", "B"]}
          />

          <FilterSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={["DBMS", "OS", "CN"]}
          />

          <FilterSelect
            label="Exam"
            value={exam}
            onChange={setExam}
            options={["Mid-1", "Mid-2", "Semester"]}
          />

          {/* UPLOAD BUTTON */}
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

      {/* ================= UPLOAD MARKS (UI ONLY) ================= */}
      {showUpload && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Upload Marks</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Subject" />
            <Input label="Exam Type" />
            <Input label="Year & Section" />
            <Input label="Max Marks" />

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Upload File (CSV / Excel)
              </label>
              <input
                type="file"
                className="w-full mt-1 p-2 rounded-xl border"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white">
              Save & Publish
            </button>
          </div>
        </div>
      )}

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Class Average" value={`${avg}%`} />
        <Kpi title="Highest Score" value={`${highest}`} />
        <Kpi title="Total Students" value={total} />
        <Kpi title="Fail Count" value={failCount} danger />
      </div>

      {/* ================= STUDENT MARKS LIST ================= */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          Student Marks ({exam})
        </h3>

        <div className="space-y-2">
          {STUDENTS.map((s) => (
            <div
              key={s.roll}
              className="flex justify-between items-center p-3 rounded-xl bg-white/70"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">{s.roll}</p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    s.marks < 40
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {s.marks}
                </span>

                <span className="text-sm text-gray-500">
                  {s.marks < 40 ? "Fail" : "Pass"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= ANALYTICS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">
          Performance Analytics ({year} – Sec {section})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Marks Distribution (Bar Chart)" />
          <ChartBox title="Pass vs Fail (Donut Chart)" />
        </div>

        <ChartBox title="Performance Trend Across Exams (Line Chart)" />
      </div>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Input({ label }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input className="w-full mt-1 p-2 rounded-xl border border-gray-300" />
    </div>
  );
}

function Kpi({ title, value, danger }) {
  return (
    <div
      className={`glass rounded-2xl p-4 ${
        danger ? "text-red-600" : ""
      }`}
    >
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title}
      <br />
      (Analytics Agent will render here)
    </div>
  );
}
