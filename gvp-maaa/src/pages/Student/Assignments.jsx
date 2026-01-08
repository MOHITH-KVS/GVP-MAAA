import { useState } from "react";

/* ===== SUBJECT CONFIG (UPDATED DEADLINES) ===== */
const SUBJECT_CONFIG = {
  DBMS: {
    deadline: "2026-02-20", // ✅ FUTURE (UPLOAD ENABLED)
    faculty: ["Dr. Rao", "Dr. Suresh"],
  },
  OS: {
    deadline: "2025-09-18", // ❌ PAST (LOCKED)
    faculty: ["Prof. Anil"],
  },
  CN: {
    deadline: "2026-01-15", // ✅ FUTURE (UPLOAD ENABLED)
    faculty: ["Dr. Kiran", "Prof. Meena"],
  },
};

/* ===== ASSIGNMENT DATA ===== */
const ASSIGNMENTS = {
  DBMS: [
    { title: "Assignment 1", due: "2025-09-10", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-15", status: "pending" },
    { title: "Assignment 3", due: "2025-09-20", status: "pending" },
  ],
  OS: [
    { title: "Assignment 1", due: "2025-09-12", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-18", status: "pending" },
  ],
  CN: [
    { title: "Assignment 1", due: "2025-09-11", status: "submitted" },
    { title: "Assignment 2", due: "2025-09-19", status: "submitted" },
  ],
};

const STATUS_BADGE = {
  submitted: "bg-green-100 text-green-700",
  pending: "bg-red-100 text-red-700",
};

export default function Assignments() {
  const subjects = ["All", "DBMS", "OS", "CN"];

  const [activeSubject, setActiveSubject] = useState("All");
  const [openSubject, setOpenSubject] = useState(null);

  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    faculty: "",
    file: null,
  });

  const deadline =
    form.subject && SUBJECT_CONFIG[form.subject]
      ? SUBJECT_CONFIG[form.subject].deadline
      : "";

  const today = new Date().toISOString().split("T")[0];
  const isDeadlinePassed = deadline && today > deadline;

  const isFormValid =
    form.title &&
    form.subject &&
    form.faculty &&
    form.file &&
    !isDeadlinePassed;

  const filtered =
    activeSubject === "All"
      ? ASSIGNMENTS
      : { [activeSubject]: ASSIGNMENTS[activeSubject] };

  const handleSubmit = () => {
    setShowUpload(false);
    setConfirm(false);
    setSuccess(true);

    setTimeout(() => setSuccess(false), 2200);
  };

  return (
    <div className="space-y-10 relative">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">📝 Assignments</h1>
          <p className="text-gray-500">
            Subject-wise assignment tracking & progress
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
        >
          + Upload Assignment
        </button>
      </div>

      {/* SUBJECT FILTERS */}
      <div className="flex gap-3">
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubject(sub)}
            className={`px-4 py-2 rounded-xl text-sm font-medium
              ${
                activeSubject === sub
                  ? "bg-indigo-600 text-white"
                  : "bg-white hover:bg-slate-100"
              }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* SUBJECT LIST */}
      <div className="space-y-4">
        {Object.entries(filtered).map(([subject, items]) => (
          <div key={subject} className="bg-white rounded-2xl border">

            {/* HEADER */}
            <button
              onClick={() =>
                setOpenSubject(openSubject === subject ? null : subject)
              }
              className="w-full flex justify-between items-center px-6 py-5"
            >
              <div>
                <h2 className="text-lg font-semibold">{subject}</h2>

                {/* STATUS DOTS */}
                <div className="flex gap-2 mt-2">
                  {items.map((a, i) => (
                    <span
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        a.status === "submitted"
                          ? "bg-green-500"
                          : "bg-red-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <span className="text-xl font-bold">
                {openSubject === subject ? "−" : "+"}
              </span>
            </button>

            {/* CONTENT */}
            {openSubject === subject && (
              <div className="px-6 pb-6 space-y-3">
                {items.map((a, i) => (
                  <AssignmentItem key={i} data={a} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>


{/* ================= ASSIGNMENT ANALYTICS ================= */}
<div className="mt-14 space-y-6">

  <div>
    <h2 className="text-xl font-semibold">📊 Assignment Analytics</h2>
    <p className="text-gray-500 text-sm">
      Visual insights into assignment progress & deadlines
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

    {/* STATUS OVERVIEW */}
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="font-medium mb-2">Submission Status</h3>
      <p className="text-xs text-gray-500 mb-4">
        Doughnut Chart (Submitted vs Pending vs Overdue)
      </p>

      <div className="h-32 flex items-center justify-center text-gray-400 text-sm border rounded-xl">
        Analytics Agent will render Doughnut Chart here
      </div>
    </div>

    {/* SUBMISSION TREND */}
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="font-medium mb-2">Submission Trend</h3>
      <p className="text-xs text-gray-500 mb-4">
        Line Chart (Submissions over time)
      </p>

      <div className="h-32 flex items-center justify-center text-gray-400 text-sm border rounded-xl">
        Analytics Agent will render Line Chart here
      </div>
    </div>

    {/* SUBJECT WISE */}
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="font-medium mb-2">Subject-wise Completion</h3>
      <p className="text-xs text-gray-500 mb-4">
        Bar Chart (DBMS, OS, CN)
      </p>

      <div className="h-32 flex items-center justify-center text-gray-400 text-sm border rounded-xl">
        Analytics Agent will render Bar Chart here
      </div>
    </div>

    {/* DEADLINE RISK */}
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="font-medium mb-2">Deadline Risk</h3>
      <p className="text-xs text-gray-500 mb-4">
        Stacked / Horizontal Bar Chart
      </p>

      <div className="h-32 flex items-center justify-center text-gray-400 text-sm border rounded-xl">
        Analytics Agent will render Risk Chart here
      </div>
    </div>

  </div>
</div>

      {/* UPLOAD MODAL WITH GLASS BACKGROUND */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)}>
          {!confirm ? (
            <>
              <h2 className="text-lg font-semibold mb-4">
                Upload Assignment
              </h2>

              <Input
                label="Assignment Title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />

              <Select
                label="Subject"
                options={Object.keys(SUBJECT_CONFIG)}
                value={form.subject}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subject: e.target.value,
                    faculty: "",
                  })
                }
              />

              <Select
                label="Faculty Name"
                options={
                  form.subject
                    ? SUBJECT_CONFIG[form.subject].faculty
                    : []
                }
                value={form.faculty}
                onChange={(e) =>
                  setForm({ ...form, faculty: e.target.value })
                }
              />

              <Input label="Deadline" value={deadline} disabled />

              {isDeadlinePassed && (
                <p className="text-sm text-red-600">
                  Deadline passed. Upload disabled.
                </p>
              )}

              <input
                type="file"
                disabled={isDeadlinePassed}
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files[0] })
                }
                className="w-full mt-3"
              />

              <div className="flex gap-3 mt-6">
                <button
                  disabled={!isFormValid}
                  onClick={() => setConfirm(true)}
                  className={`flex-1 py-2 rounded-xl text-white ${
                    isFormValid
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-indigo-300 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>

                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-2 rounded-xl border"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">
                Confirm Submission
              </h2>

              <div className="text-sm text-gray-600 space-y-2">
                <p><b>Title:</b> {form.title}</p>
                <p><b>Subject:</b> {form.subject}</p>
                <p><b>Faculty:</b> {form.faculty}</p>
                <p><b>Deadline:</b> {deadline}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white"
                >
                  Confirm & Submit
                </button>

                <button
                  onClick={() => setConfirm(false)}
                  className="flex-1 py-2 rounded-xl border"
                >
                  Recheck
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* SUCCESS TOAST */}
      {success && <SuccessToast />}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function AssignmentItem({ data }) {
  return (
    <div className="flex justify-between items-center bg-white rounded-xl p-4 border">
      <div>
        <p className="font-medium">{data.title}</p>
        <p className="text-sm text-gray-500">Due: {data.due}</p>
      </div>
      <span
        className={`px-3 py-1 text-xs rounded-full ${
          STATUS_BADGE[data.status]
        }`}
      >
        {data.status.toUpperCase()}
      </span>
    </div>
  );
}

/* ===== MODAL WITH BACKGROUND BLUR ===== */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">

      {/* FULL PAGE GLASS BACKDROP */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      />

      {/* MODAL CARD */}
      <div className="relative z-[100000] bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg text-gray-500 hover:text-black"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}


function SuccessToast() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center">
          ✓
        </div>
        <h2 className="text-xl font-semibold">
          Assignment Submitted Successfully
        </h2>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, disabled }) {
  return (
    <div className="mb-3">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full mt-1 px-4 py-2 rounded-xl border bg-gray-50"
      />
    </div>
  );
}

function Select({ label, options, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="text-sm text-gray-600">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full mt-1 px-4 py-2 rounded-xl border"
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
