import { useState } from "react";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

/* ================== SEMESTER-WISE DATA ================== */
const attendanceDB = {
  Sem1: {
    subjects: {
      Maths: { conducted: 42, attended: 30, lastMonth: 68 },
      Physics: { conducted: 40, attended: 32, lastMonth: 72 },
    },
  },
  Sem3: {
    subjects: {
      DBMS: { conducted: 40, attended: 30, lastMonth: 72 },
      OS: { conducted: 38, attended: 24, lastMonth: 66 },
      CN: { conducted: 36, attended: 28, lastMonth: 72 },
    },
  },
  Sem6: {
    subjects: {
      AI: { conducted: 44, attended: 36, lastMonth: 78 },
      ML: { conducted: 42, attended: 35, lastMonth: 75 },
      SE: { conducted: 40, attended: 32, lastMonth: 74 },
    },
  },
};

/* ================== HELPERS ================== */
const calcPercent = (a, c) => Math.round((a / c) * 100);

export default function Attendance() {
  /* ===== STATE ===== */
  const [activeSem, setActiveSem] = useState("Sem3");
  const [activeSub, setActiveSub] = useState("ALL");

  const semesterData = attendanceDB[activeSem].subjects;
  const subjects = Object.keys(semesterData);

  /* ===== AGGREGATE (ALL) ===== */
  const totalConducted = subjects.reduce(
    (s, sub) => s + semesterData[sub].conducted,
    0
  );
  const totalAttended = subjects.reduce(
    (s, sub) => s + semesterData[sub].attended,
    0
  );
  const avgLastMonth = Math.round(
    subjects.reduce((s, sub) => s + semesterData[sub].lastMonth, 0) /
      subjects.length
  );

  const fullData =
    activeSub === "ALL"
      ? {
          conducted: totalConducted,
          attended: totalAttended,
          lastMonth: avgLastMonth,
        }
      : semesterData[activeSub];

  const percent = calcPercent(
    fullData.attended,
    fullData.conducted
  );
  const diff = percent - fullData.lastMonth;

  /* ===== STATUS COLOR ===== */
  let shade = "bg-green-50";
  let status = "Safe Zone";
  if (percent < 60) {
    shade = "bg-red-50";
    status = "Critical Attendance";
  } else if (percent <= 75) {
    shade = "bg-yellow-50";
    status = "Attendance at Risk";
  }

  /* ===== RECORDS ===== */
  const strongestSubject = subjects.reduce((a, b) =>
    calcPercent(
      semesterData[a].attended,
      semesterData[a].conducted
    ) >
    calcPercent(
      semesterData[b].attended,
      semesterData[b].conducted
    )
      ? a
      : b
  );

  const mostImprovedSubject = subjects.reduce((a, b) => {
    const da =
      calcPercent(
        semesterData[a].attended,
        semesterData[a].conducted
      ) - semesterData[a].lastMonth;
    const db =
      calcPercent(
        semesterData[b].attended,
        semesterData[b].conducted
      ) - semesterData[b].lastMonth;
    return da > db ? a : b;
  });

  return (
    <div className="space-y-6">

      {/* ================= SEMESTER SELECTOR ================= */}
      <div className="flex gap-3">
        {Object.keys(attendanceDB).map((sem) => (
          <button
            key={sem}
            onClick={() => {
              setActiveSem(sem);
              setActiveSub("ALL");
            }}
            className={`px-4 py-2 rounded-xl transition
              ${
                activeSem === sem
                  ? "bg-indigo-600 text-white"
                  : "bg-white/70 hover:bg-white"
              }`}
          >
            {sem}
          </button>
        ))}
      </div>

      <div className="flex gap-6">

        {/* ================= SUBJECT SELECTOR ================= */}
        <div className="w-48 glass rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-500">
            Subjects
          </p>

          <button
            onClick={() => setActiveSub("ALL")}
            className={`w-full px-4 py-2 rounded-xl text-left transition
              ${
                activeSub === "ALL"
                  ? "bg-indigo-500/10 text-indigo-700 font-medium"
                  : "hover:bg-white/60"
              }`}
          >
            ALL
          </button>

          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={`w-full px-4 py-2 rounded-xl text-left transition
                ${
                  activeSub === sub
                    ? "bg-indigo-500/10 text-indigo-700 font-medium"
                    : "hover:bg-white/60"
                }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className={`flex-1 rounded-2xl p-8 space-y-8 ${shade}`}>

          {/* ===== SUMMARY ===== */}
          <div className="glass rounded-2xl p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                {activeSub === "ALL"
                  ? `Overall Attendance (${activeSem})`
                  : `${activeSub} Attendance`}
              </h2>
              <p className="text-gray-500">{status}</p>
              <p className="text-sm text-gray-500 mt-1">
                Conducted: {fullData.conducted} | Attended:{" "}
                {fullData.attended}
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-4xl font-bold text-indigo-600">
                  {percent}%
                </span>
                {diff >= 0 ? (
                  <TrendingUpIcon className="text-green-600" />
                ) : (
                  <TrendingDownIcon className="text-red-600" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                {diff >= 0 ? `+${diff}%` : `${diff}%`} from last month
              </p>
            </div>
          </div>

          {/* ===== ANALYTICS (AS PER BLUEPRINT) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 text-center text-gray-400">
              Attendance Trend (AnalyticsAgent – Line Chart)
            </div>
            <div className="glass rounded-2xl p-6 text-center text-gray-400">
              Subject Comparison (AnalyticsAgent – Bar Chart)
            </div>
          </div>

          {/* ===== SEMESTER TRACKING CHART ===== */}
          <div className="glass rounded-2xl p-6 text-center text-gray-400">
            Semester-wise Attendance Tracking (Sem 1 → Sem 6)
          </div>

          {/* ===== RECORDS ===== */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">
              Records & Insights
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>🏆 Strongest Subject: {strongestSubject}</li>
              <li>📈 Most Improved Subject: {mostImprovedSubject}</li>
            </ul>
          </div>

          {/* ===== FEEDBACK ===== */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">
              Feedback & Suggestions
            </h3>
            <p className="text-sm text-gray-600">
              {percent < 75
                ? "Maintain consistent attendance to avoid academic risk."
                : "Good attendance consistency. Keep it up."}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
