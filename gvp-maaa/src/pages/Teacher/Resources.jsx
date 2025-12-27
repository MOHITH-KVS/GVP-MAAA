import { useState } from "react";

/* ================= SAMPLE DATA ================= */
const RESOURCES = [
  {
    id: 1,
    title: "DBMS Unit-1 Notes",
    subject: "DBMS",
    year: "3rd Year",
    section: "A",
    type: "Notes",
    uploadedOn: "10 Sep 2025",
    status: "Published",
    accessed: 42,
    totalStudents: 64,
  },
  {
    id: 2,
    title: "OS Scheduling PPT",
    subject: "OS",
    year: "3rd Year",
    section: "A",
    type: "PPT",
    uploadedOn: "05 Sep 2025",
    status: "Published",
    accessed: 28,
    totalStudents: 64,
  },
];

export default function Resources() {
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("DBMS");
  const [type, setType] = useState("All");

  const [showUpload, setShowUpload] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const filteredResources = RESOURCES.filter(
    (r) =>
      r.year === year &&
      r.section === section &&
      r.subject === subject &&
      (type === "All" || r.type === type)
  );

  return (
    <div className="space-y-12">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-sm text-gray-500">
          Upload, manage, and analyze student engagement with learning materials
        </p>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">
          <FilterSelect label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
          <FilterSelect label="Section" value={section} onChange={setSection} options={["A", "B"]} />
          <FilterSelect label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />
          <FilterSelect label="Type" value={type} onChange={setType} options={["All", "Notes", "PPT", "Assignment", "Reference", "Link"]} />

          <div className="ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              className="h-[44px] px-7 rounded-xl bg-indigo-600 text-white font-medium"
            >
              Upload Resource
            </button>
          </div>
        </div>
      </div>

      {/* ================= UPLOAD RESOURCE ================= */}
      {showUpload && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold">Upload New Resource</h3>

          <div className="bg-indigo-50 rounded-xl p-3 text-sm">
            Uploading for <b>{year}</b>, Section <b>{section}</b>, Subject <b>{subject}</b>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Resource Title" />
            <Select label="Resource Type" options={["Notes", "PPT", "Assignment", "Reference", "Link"]} />

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Resource Description / Instructions
              </label>
              <textarea
                rows={4}
                placeholder="Explain how students should use this resource and why it is important..."
                className="w-full mt-1 p-3 rounded-xl border"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Upload File (PDF / PPT / DOC) or Paste Link
              </label>
              <input type="file" className="w-full mt-1 p-2 rounded-xl border" />
              <p className="mt-2 text-xs text-gray-500">
                ⚠️ Please ensure you upload the correct resource.
                Once published, students will access this directly.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
              Publish Resource
            </button>
          </div>
        </div>
      )}

      {/* ================= CONFIRM POPUP ================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Confirm Resource Publishing</h3>

            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p><b>Year:</b> {year}</p>
              <p><b>Section:</b> {section}</p>
              <p><b>Subject:</b> {subject}</p>
            </div>

            <p className="text-xs text-red-600">
              Once published, students will be able to access this resource.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowUpload(false);
                  alert("Resource published successfully!");
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
              >
                Final Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESOURCE LIST ================= */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h3 className="text-lg font-semibold">Uploaded Resources</h3>

        {filteredResources.map((r) => {
          const percent = Math.round((r.accessed / r.totalStudents) * 100);

          return (
            <div key={r.id} className="rounded-2xl bg-white/70 p-5 space-y-3">

              <div className="flex flex-col md:flex-row md:justify-between gap-4">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-gray-500">
                    {r.subject} · {r.type} · Uploaded on {r.uploadedOn}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    {r.status}
                  </span>
                  <ActionButton label="View" />
                  <ActionButton label="Edit" />
                  <ActionButton label="Delete" danger />
                </div>
              </div>

              <div>
                <p className="text-sm text-indigo-600">
                  👥 Accessed by {r.accessed} / {r.totalStudents} students
                </p>
                <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                  <div
                    className="h-2 bg-indigo-500 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {percent}% students accessed
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= RESOURCE ANALYTICS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">
          Resource Analytics ({year} – Sec {section})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Resource Access Trend (Line Chart)" />
          <ChartBox title="Top Accessed Resources (Bar Chart)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Student Engagement by Section / Year" />
          <ChartBox title="Resource Type Usage (Donut Chart)" />
        </div>
      </div>
    </div>
  );
}

/* ================= REUSABLE ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
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

function Input({ label }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input className="w-full mt-1 p-2 rounded-xl border" />
    </div>
  );
}

function Select({ label, options }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select className="w-full mt-1 p-2 rounded-xl border">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({ label, danger }) {
  return (
    <button
      className={`px-3 py-1.5 rounded-xl text-sm ${
        danger
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      }`}
    >
      {label}
    </button>
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
