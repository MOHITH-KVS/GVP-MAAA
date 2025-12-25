import { useState, useMemo } from "react";

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
  const [openId, setOpenId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-8">

      {/* ================= CREATE ASSIGNMENT ================= */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex justify-center">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-10 py-3 rounded-2xl bg-indigo-600 text-white text-lg"
          >
            + Create Assignment
          </button>
        </div>

        {showCreate && (
          <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            <Input label="Assignment Title" />
            <Input label="Subject" />
            <Input label="Year & Section" />
            <Input label="Due Date" type="date" />

            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">
                Assignment Description / Question
              </label>
              <textarea
                rows={4}
                placeholder="Enter question, instructions, or links here..."
                className="w-full mt-1 p-3 rounded-xl border border-gray-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">
                Attach File (PDF / Doc)
              </label>
              <input
                type="file"
                className="w-full mt-1 p-2 rounded-xl border border-gray-200"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
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
      </div>

      {/* ================= ASSIGNMENT LIST ================= */}
      {ASSIGNMENTS.map((a) => {
        const isOpen = openId === a.id;
        const totalStudents =
          a.submitted.length + a.notSubmitted.length;

        const filteredSubmitted = useMemo(
          () =>
            a.submitted.filter(
              (s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.roll.toLowerCase().includes(search.toLowerCase())
            ),
          [search, a.submitted]
        );

        const filteredPending = useMemo(
          () =>
            a.notSubmitted.filter(
              (s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.roll.toLowerCase().includes(search.toLowerCase())
            ),
          [search, a.notSubmitted]
        );

        return (
          <div key={a.id} className="glass rounded-2xl p-6 space-y-5">

            {/* SUMMARY */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="text-sm text-gray-500">
                  {a.subject} · {a.year} · Sec {a.section}
                </p>
                <p className="text-sm text-gray-500">
                  Due Date: {a.dueDate}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm">
                  Pending:
                  <span className="ml-1 font-semibold text-red-600">
                    {a.notSubmitted.length}
                  </span>
                </span>

                <button
                  onClick={() => {
                    setOpenId(isOpen ? null : a.id);
                    setSearch("");
                  }}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white"
                >
                  {isOpen ? "Hide Submissions" : "View Submissions"}
                </button>
              </div>
            </div>

            {/* ================= VIEW SUBMISSIONS ================= */}
            {isOpen && (
              <div className="border-t pt-6 space-y-6">

                {/* CONTROL BAR */}
                <div className="glass rounded-2xl p-5 space-y-4">

                  {/* SEARCH + CLOSE */}
                  <div className="flex items-center justify-between gap-4">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or roll number…"
                      className="w-full max-w-3xl px-5 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <button
                      onClick={() => setOpenId(null)}
                      className="w-10 h-10 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* STATS */}
                  <div className="flex gap-4 flex-wrap">
                    <StatCard label="Total Students" value={totalStudents} />
                    <StatCard
                      label="Submitted"
                      value={`${a.submitted.length}/${totalStudents}`}
                    />
                    <StatCard
                      label="Pending"
                      value={a.notSubmitted.length}
                      danger
                    />
                  </div>
                </div>

                {/* NOT SUBMITTED */}
                <div>
                  <h4 className="font-semibold text-red-600 mb-3">
                    Not Submitted ({filteredPending.length})
                  </h4>

                  <div className="space-y-2">
                    {filteredPending.map((s) => (
                      <StudentRow
                        key={s.roll}
                        name={s.name}
                        roll={s.roll}
                      >
                        <button className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-sm">
                          Send Reminder
                        </button>
                      </StudentRow>
                    ))}
                  </div>
                </div>

                {/* SUBMITTED */}
                <div>
                  <h4 className="font-semibold text-green-600 mb-3">
                    Submitted ({filteredSubmitted.length})
                  </h4>

                  <div className="space-y-2">
                    {filteredSubmitted.map((s) => (
                      <StudentRow
                        key={s.roll}
                        name={s.name}
                        roll={s.roll}
                      >
                        <button className="px-4 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-sm">
                          View Submission
                        </button>
                      </StudentRow>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function Input({ label, type = "text" }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        className="w-full mt-1 p-2 rounded-xl border border-gray-200"
      />
    </div>
  );
}

function StatCard({ label, value, danger }) {
  return (
    <div
      className={`px-6 py-3 rounded-xl ${
        danger ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-800"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function StudentRow({ name, roll, children }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-xl bg-white/70">
      <span>
        {name} ({roll})
      </span>
      {children}
    </div>
  );
}
