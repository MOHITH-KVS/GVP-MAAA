import { useState } from "react";

/* ================= ADMIN ACADEMICS ================= */

export default function Academics() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(null); // "student" | "faculty"

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50 to-cyan-50 border">
        <h1 className="text-2xl font-semibold text-slate-800">
          Academic Analytics
        </h1>
        <p className="text-sm text-slate-600">
          Students, faculty performance & syllabus progress
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex flex-wrap gap-4">
        <select className="border px-3 py-2 rounded-lg">
          <option>All Departments</option>
          <option>CSE</option>
          <option>CSM</option>
          <option>ECE</option>
          <option>MECH</option>
          <option>CIVIL</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>All Years</option>
          <option>1st Year</option>
          <option>2nd Year</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>All Semesters</option>
          <option>Sem 1</option>
          <option>Sem 2</option>
        </select>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Avg Attendance" value="82%" />
        <Kpi title="Avg CGPA" value="7.6" />
        <Kpi title="At-Risk Students" value="154" danger />
        <Kpi title="Syllabus Delays" value="8 Subjects" warning />
      </div>

      {/* ================= QUICK ACTIONS ================= */}
      <div className="flex flex-wrap gap-4">
        <ActionBtn
          label="🚨 Alert At-Risk Students"
          danger
          onClick={() => {
            setMode("student");
            setShowModal(true);
          }}
        />
        <ActionBtn
          label="📢 Notify Faculty"
          onClick={() => {
            setMode("faculty");
            setShowModal(true);
          }}
        />
      </div>

      {/* ================= STUDENT ANALYTICS ================= */}
      <AnalyticsSection title="Student Academic Health">
        <ChartCard title="Attendance Trend">
          Analytics agent will render attendance trends
        </ChartCard>
        <ChartCard title="CGPA Distribution">
          Analytics agent will render CGPA distribution
        </ChartCard>
        <ChartCard title="At-Risk Students by Year">
          Analytics agent will render risk segmentation
        </ChartCard>
      </AnalyticsSection>

      {/* ================= FACULTY IMPACT ================= */}
      <AnalyticsSection title="Teaching Impact Analysis">
        <ChartCard title="Avg Student Attendance per Faculty">
          Analytics agent will render faculty impact
        </ChartCard>
        <ChartCard title="Avg Subject CGPA per Faculty">
          Analytics agent will render subject performance
        </ChartCard>
        <ChartCard title="Subjects with Weak Outcomes">
          Analytics agent will highlight problem subjects
        </ChartCard>
      </AnalyticsSection>

      {/* ================= SYLLABUS TRACKING ================= */}
      <AnalyticsSection title="Syllabus Completion Tracking">
        <ChartCard title="Planned vs Completed Syllabus">
          Analytics agent will render syllabus progress
        </ChartCard>
        <ChartCard title="Delayed Subjects by Department">
          Analytics agent will render delay analysis
        </ChartCard>
        <ChartCard title="Faculty-wise Syllabus Status">
          Analytics agent will render faculty progress
        </ChartCard>
      </AnalyticsSection>

      {/* ================= POPUP ================= */}
      {showModal && (
        <AlertModal
          mode={mode}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ================= MODAL ================= */

function AlertModal({ mode, onClose }) {
  const [dept, setDept] = useState("");
  const [year, setYear] = useState("");
  const [target, setTarget] = useState("");
  const [desc, setDesc] = useState("");
  const [review, setReview] = useState(false);
  const [success, setSuccess] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">

        <h2 className="text-lg font-semibold">
          {mode === "student"
            ? "Alert At-Risk Students"
            : "Notify Faculty"}
        </h2>

        {success ? (
          <SuccessAnimation mode={mode} />
        ) : review ? (
          <>
            <ReviewItem label="Department" value={dept} />
            {mode === "student" && <ReviewItem label="Year" value={year} />}
            <ReviewItem
              label={mode === "student" ? "Section" : "Faculty"}
              value={target}
            />
            <ReviewItem label="Message" value={desc} />

            <ModalActions
              onCancel={() => setReview(false)}
              onNext={() => {
                setSuccess(true);
                setTimeout(onClose, 2000);
              }}
              nextLabel="Final Publish"
              danger
            />
          </>
        ) : (
          <>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">Select Department</option>
              <option>CSE</option>
              <option>CSM</option>
              <option>ECE</option>
              <option>MECH</option>
              <option>CIVIL</option>
            </select>

            {mode === "student" && (
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border px-3 py-2 rounded-lg"
              >
                <option value="">Select Year</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            )}

            <input
              placeholder={mode === "student" ? "Section" : "Faculty Name"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />

            <textarea
              rows={4}
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />

            <ModalActions
              onCancel={onClose}
              onNext={() => setReview(true)}
              nextLabel="Recheck"
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ================= SUCCESS ================= */

function SuccessAnimation({ mode }) {
  const isStudent = mode === "student";

  return (
    <div className="flex flex-col items-center justify-center py-10 animate-scaleFade">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-4
        ${isStudent ? "bg-red-100" : "bg-indigo-100"}`}
      >
        <span
          className={`text-4xl
          ${isStudent ? "text-red-600" : "text-indigo-600"}`}
        >
          ✓
        </span>
      </div>

      <h3 className="text-lg font-semibold">
        {isStudent
          ? "Alert Successfully Sent"
          : "Faculty Notified Successfully"}
      </h3>

      <p className="text-sm text-gray-500 mt-1">
        {isStudent
          ? "All selected students have been alerted."
          : "Faculty has been informed successfully."}
      </p>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Kpi({ title, value, danger, warning }) {
  return (
    <div
      className={`p-6 rounded-2xl border bg-white
      ${danger && "border-red-300 bg-red-50"}
      ${warning && "border-amber-300 bg-amber-50"}`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function ActionBtn({ label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border
      ${danger
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-white hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}

function AnalyticsSection({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="p-6 rounded-2xl border bg-white h-64 flex flex-col">
      <p className="font-medium mb-2">{title}</p>
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 border rounded-lg">
        {children}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="text-sm">
      <p className="text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ModalActions({ onCancel, onNext, nextLabel, danger }) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border"
      >
        Cancel
      </button>
      <button
        onClick={onNext}
        className={`px-4 py-2 rounded-lg text-white
        ${danger ? "bg-red-600" : "bg-indigo-600"}`}
      >
        {nextLabel}
      </button>
    </div>
  );
}
