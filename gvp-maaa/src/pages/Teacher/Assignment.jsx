import { useState } from "react";

/* ================= SAMPLE DATA ================= */
const ASSIGNMENTS = [
  {
    id: 1,
    title: "DBMS – Assignment 1",
    subject: "DBMS",
    year: "3rd Year",
    section: "A",
    dueDate: "15 Sep 2025",
    submitted: [
      { name: "Kiran", roll: "21CS045" },
      { name: "Suresh", roll: "21CS021" },
    ],
    notSubmitted: [
      { name: "Ravi", roll: "21CS001" },
      { name: "Anusha", roll: "21CS014" },
      { name: "Priya", roll: "21CS032" },
    ],
    status: "Active",
  },
];

export default function Assignments() {
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [openId, setOpenId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAssignments = ASSIGNMENTS.filter(
    (a) => a.year === year && a.section === section
  );

  return (
    <div className="space-y-10">

      {/* ================= PAGE HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <p className="text-sm text-gray-500">
          Create assignments, track submissions, and analyze trends
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

          {/* CREATE BUTTON */}
          <div className="ml-auto">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="
                h-[44px]
                px-7
                rounded-xl
                bg-indigo-600
                text-white
                font-medium
                hover:bg-indigo-700
                transition
              "
            >
              + Create Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ================= CREATE ASSIGNMENT ================= */}
      {showCreate && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create New Assignment</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Assignment Title" />
            <Input label="Subject" />
            <Input label="Year & Section" />
            <Input label="Due Date" type="date" />

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Assignment Description / Question
              </label>
              <textarea
                rows={4}
                className="w-full mt-1 p-3 rounded-xl border border-gray-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Attach File
              </label>
              <input
                type="file"
                className="w-full mt-1 p-2 rounded-xl border border-gray-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white">
              Publish Assignment
            </button>
          </div>
        </div>
      )}

      {/* ================= ASSIGNMENT LIST ================= */}
      <div className="space-y-6">
        {filteredAssignments.map((a) => {
          const isOpen = openId === a.id;
          const totalStudents =
            a.submitted.length + a.notSubmitted.length;

          const filteredSubmitted = a.submitted.filter(
            (s) =>
              s.name.toLowerCase().includes(search.toLowerCase()) ||
              s.roll.toLowerCase().includes(search.toLowerCase())
          );

          const filteredPending = a.notSubmitted.filter(
            (s) =>
              s.name.toLowerCase().includes(search.toLowerCase()) ||
              s.roll.toLowerCase().includes(search.toLowerCase())
          );

          return (
            <div key={a.id} className="glass rounded-2xl p-6 space-y-5">

              {/* SUMMARY */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-500">
                    {a.subject} · {a.year} · Sec {a.section} · Due {a.dueDate}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOpenId(isOpen ? null : a.id);
                    setSearch("");
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white"
                >
                  {isOpen ? "Hide" : "View Submissions"}
                </button>
              </div>

              {/* SUBMISSIONS */}
              {isOpen && (
                <div className="border-t pt-6 space-y-6">

                  {/* SEARCH + STATS */}
                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or roll number"
                      className="flex-1 min-w-[260px] px-4 py-2.5 rounded-xl border"
                    />

                    <Stat label="Total" value={totalStudents} />
                    <Stat
                      label="Submitted"
                      value={`${a.submitted.length}/${totalStudents}`}
                    />
                    <Stat
                      label="Pending"
                      value={a.notSubmitted.length}
                      danger
                    />
                  </div>

                  {/* NOT SUBMITTED */}
                  <StudentBlock
                    title="Not Submitted"
                    students={filteredPending}
                    danger
                  />

                  {/* SUBMITTED */}
                  <StudentBlock
                    title="Submitted"
                    students={filteredSubmitted}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= ANALYTICS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">
          Assignment Analytics ({year} – Section {section})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Submission Status (Donut Chart)" />
          <ChartBox title="Assignment-wise Completion (Bar Chart)" />
        </div>

        <ChartBox title="Submission Trend Over Time (Line Chart)" />
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[44px]
          w-44
          px-3
          rounded-xl
          border border-gray-300
          bg-white
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-indigo-500
        "
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Input({ label, type = "text" }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        className="w-full mt-1 p-2 rounded-xl border border-gray-300"
      />
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div
      className={`px-4 py-2 rounded-xl ${
        danger ? "bg-red-50 text-red-600" : "bg-gray-50"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function StudentBlock({ title, students, danger }) {
  return (
    <div>
      <h4
        className={`font-semibold mb-2 ${
          danger ? "text-red-600" : "text-green-600"
        }`}
      >
        {title} ({students.length})
      </h4>

      <div className="space-y-2">
        {students.map((s) => (
          <div
            key={s.roll}
            className="flex justify-between items-center p-3 rounded-xl bg-white/70"
          >
            <span>
              {s.name} ({s.roll})
            </span>
            {danger ? (
              <button className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-sm">
                Send Reminder
              </button>
            ) : (
              <button className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-sm">
                View Submission
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title} <br />
      (Analytics Agent will render here)
    </div>
  );
}
