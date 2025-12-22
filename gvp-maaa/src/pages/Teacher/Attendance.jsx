import { useState, useMemo } from "react";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";

/* ------------------ SAMPLE DATA ------------------ */
const STUDENTS = [
  { id: 1, name: "Ravi Kumar", roll: "21CS001", section: "A", attendance: 68 },
  { id: 2, name: "Anusha", roll: "21CS014", section: "A", attendance: 72 },
  { id: 3, name: "Suresh", roll: "21CS021", section: "B", attendance: 88 },
  { id: 4, name: "Priya", roll: "21CS032", section: "B", attendance: 61 },
  { id: 5, name: "Kiran", roll: "21CS045", section: "A", attendance: 79 },
];

/* ------------------ MAIN COMPONENT ------------------ */
export default function Attendance() {
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("All");
  const [subject, setSubject] = useState("DBMS");

  /* ------------------ AT-RISK LOGIC ------------------ */
  const atRiskStudents = useMemo(() => {
    return STUDENTS.filter(
      (s) =>
        s.attendance < 85 &&
        (section === "All" || s.section === section)
    );
  }, [section]);

  const criticalCount = atRiskStudents.filter(
    (s) => s.attendance < 75
  ).length;

  /* ------------------ ALERT HANDLERS ------------------ */
  const sendAlert = (student) => {
    alert(
      `Alert sent to ${student.name}\nAttendance in ${subject}: ${student.attendance}%`
    );
  };

  const sendAlertAll = () => {
    alert(`Alerts sent to all at-risk students in ${subject}`);
  };

  return (
    <div className="space-y-8">

      {/* ================= FILTERS ================= */}
      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
        <Select label="Section" value={section} onChange={setSection} options={["All", "A", "B"]} />
        <Select label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />
        <div className="flex items-end">
          <button className="w-full py-2 rounded-xl bg-indigo-600 text-white">
            Apply Filters
          </button>
        </div>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Total Students" value={STUDENTS.length} />
        <Kpi title="At-Risk Students" value={atRiskStudents.length} />
        <Kpi title="Critical (<75%)" value={criticalCount} />
        <Kpi title="Subject" value={subject} />
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ===== AT-RISK STUDENTS (PRIMARY FOCUS) ===== */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <WarningIcon className="text-red-500" />
              At-Risk Students
              <span className="text-sm text-gray-400">
                ({atRiskStudents.length})
              </span>
            </h3>

            {atRiskStudents.length > 0 && (
              <button
                onClick={sendAlertAll}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm"
              >
                Alert All
              </button>
            )}
          </div>

          {/* ===== SCROLLABLE STUDENT LIST ===== */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {atRiskStudents.length === 0 ? (
              <p className="text-sm text-gray-500">
                No students at risk 🎉
              </p>
            ) : (
              atRiskStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/70 hover:bg-white transition"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.roll} · Sec {s.section}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        s.attendance < 75
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.attendance}%
                    </span>

                    <button
                      onClick={() => sendAlert(s)}
                      className="p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    >
                      <CampaignIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== ANALYTICS (SECONDARY) ===== */}
        <div className="space-y-6">
          <ChartPlaceholder title="Attendance Trend (Line Chart)" />
          <ChartPlaceholder title="Present vs Absent (Donut Chart)" />
          <ChartPlaceholder title="Attendance Distribution (Bar Chart)" />
        </div>

      </div>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 rounded-xl border border-gray-200"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ChartPlaceholder({ title }) {
  return (
    <div className="glass rounded-2xl p-5 text-gray-400 text-sm text-center">
      {title}
    </div>
  );
}
