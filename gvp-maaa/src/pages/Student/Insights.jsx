import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";

export default function Insights() {
  const [activeTab, setActiveTab] = useState("future");

  const studentData = useMemo(
    () => ({
      attendance: 68,
      attendanceLastWeek: 80,
      attendanceTrend: [82, 79, 76, 72, 68],
      missedClasses: 6,
      mid1: 17,
      mid2: 14,
      cgpa: 7.4,
      cgpaPrevious: 7.6,
      placementReadiness: 72,
      targetReadiness: 80,
      skills: {
        communication: 58,
        aptitude: 66,
        technical: 74,
      },
    }),
    []
  );

  const attendanceDelta = Number((studentData.attendance - studentData.attendanceLastWeek).toFixed(1));
  const cgpaDelta = Number((studentData.cgpa - studentData.cgpaPrevious).toFixed(2));
  const midDelta = Number((studentData.mid2 - studentData.mid1).toFixed(1));

  const riskLevel = useMemo(() => {
    const attendanceRisk = studentData.attendance < 75;
    const marksRisk = studentData.mid2 < 15;
    if (attendanceRisk && marksRisk) return "CRITICAL";
    if (attendanceRisk || marksRisk || studentData.placementReadiness < studentData.targetReadiness) return "WARNING";
    return "SAFE";
  }, [studentData]);

  const riskTone =
    riskLevel === "CRITICAL"
      ? "from-red-600 via-red-500 to-rose-500"
      : riskLevel === "WARNING"
      ? "from-amber-500 via-yellow-500 to-orange-400"
      : "from-emerald-600 via-green-500 to-teal-500";

  const attendanceStatus = studentData.attendance < 75 ? "Below safe level" : "Within safe level";
  const marksStatus = studentData.mid2 < 15 ? "Below safe level" : "Within safe level";

  const prediction =
    studentData.attendance < 75
      ? "At current trend, your attendance may stay below 75% eligibility threshold."
      : studentData.mid2 < 15
      ? "At current trend, your marks may remain below safe performance level."
      : "At current trend, your academic path remains stable.";

  const biggestWeakArea = useMemo(() => {
    if (studentData.attendance < 75) return "Attendance";
    if (studentData.mid2 < 15) return "Marks";
    const skillPairs = Object.entries(studentData.skills);
    const weakestSkill = skillPairs.sort((a, b) => a[1] - b[1])[0]?.[0] || "Skills";
    return weakestSkill[0].toUpperCase() + weakestSkill.slice(1);
  }, [studentData]);

  const priorityInsight = useMemo(() => {
    if (studentData.attendance < 75) {
      const drop = Math.abs(attendanceDelta);
      return {
        message: `Your attendance dropped ${drop}% this week. If this continues, you may fall below eligibility.`,
        impact: "May affect CGPA and placement eligibility.",
        action: "Attend the next 5 classes without absence.",
      };
    }
    if (studentData.mid2 < 15) {
      return {
        message: "Your mid marks are below safe level. Improvement is required to avoid risk.",
        impact: "May affect internal marks and semester CGPA.",
        action: "Revise weak subjects and complete one daily practice test.",
      };
    }
    return {
      message: "Your current trend is stable.",
      impact: "Consistent effort protects CGPA and placement readiness.",
      action: "Maintain attendance above 80% and continue structured revision.",
    };
  }, [studentData, attendanceDelta]);

  const attendancePattern = attendanceDelta < -3 ? "Attendance drops mid-week." : "Attendance pattern is mostly stable.";
  const marksPattern = midDelta < 0 ? "Marks are declining across exams." : "Marks trend is stable across exams.";

  const cgpaTrendLabel = cgpaDelta < -0.05 ? "Declining" : cgpaDelta > 0.05 ? "Improving" : "Stable";

  const placementMissingAreas = Object.entries(studentData.skills)
    .filter(([, score]) => score < 75)
    .map(([label]) => label[0].toUpperCase() + label.slice(1));

  const actionPlan = {
    next7Days: studentData.attendance < 75
      ? [
          "Attend every scheduled class this week.",
          "Call class mentor once and confirm attendance recovery plan.",
          "Revise weakest mid topic for 30 minutes daily.",
        ]
      : [
          "Continue full attendance this week.",
          "Solve one mid-level aptitude set daily.",
        ],
    next30Days: [
      "Attend 2 mock interviews each week.",
      "Complete one communication practice session every day (15 min).",
      "Improve Mid 2 weak topics with weekly revision targets.",
    ],
    semesterGoal: [
      "CGPA \\u2265 8.0",
      "Attendance \\u2265 80%",
      "Placement readiness \\u2265 80%",
    ],
  };

  const attendanceChartData = studentData.attendanceTrend.map((value, index) => ({
    day: `D${index + 1}`,
    attendance: value,
  }));

  const hasAttendanceChart = attendanceChartData.length > 1;
  const hasMidChart = Number.isFinite(studentData.mid1) && Number.isFinite(studentData.mid2);

  return (
    <div className="space-y-10">

      {/* ================= HERO ================= */}
      <div className={`rounded-3xl p-8 bg-gradient-to-br ${riskTone} text-white`}>
        <h1 className="text-3xl font-semibold">🧠 Personal Insights</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Risk Level</p>
            <p className="text-lg font-semibold">{riskLevel}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Attendance</p>
            <p className="text-lg font-semibold">{studentData.attendance}% ({attendanceStatus})</p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Mid Marks</p>
            <p className="text-lg font-semibold">{studentData.mid2} ({marksStatus})</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/90">Prediction: {prediction}</p>
      </div>

      {/* ================= NAV ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {[
          { id: "future", label: "Future Snapshot" },
          { id: "trends", label: "Why This Is Happening" },
          { id: "placements", label: "Placement Intelligence" },
          { id: "actions", label: "Action Plan" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition
              ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/70 hover:bg-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= FUTURE SNAPSHOT ================= */}
      {activeTab === "future" && (
        <FutureSnapshot
          cgpaTrendLabel={cgpaTrendLabel}
          attendance={studentData.attendance}
          attendanceDelta={attendanceDelta}
          placementReadiness={studentData.placementReadiness}
          targetReadiness={studentData.targetReadiness}
          biggestWeakArea={biggestWeakArea}
          priorityInsight={priorityInsight}
        />
      )}

      {/* ================= WHY THIS IS HAPPENING ================= */}
      {activeTab === "trends" && (
        <InsightBlock title="🧠 Why This Is Happening">
          <CauseEffect
            cause={`Missed ${studentData.missedClasses} classes and irregular attendance pattern.`}
            effect={[
              "CGPA growth is slowing.",
              "Internal marks are entering a risk zone.",
            ]}
            pattern={[attendancePattern, marksPattern]}
          />

          {hasAttendanceChart && (
            <AttendanceTrendChart data={attendanceChartData} />
          )}

          {hasMidChart && (
            <MidComparisonChart mid1={studentData.mid1} mid2={studentData.mid2} />
          )}
        </InsightBlock>
      )}

      {/* ================= PLACEMENT INTELLIGENCE ================= */}
      {activeTab === "placements" && (
        <InsightBlock title="🎯 Placement Intelligence">
          <IntelligenceCard
            title={`Placement Readiness: ${studentData.placementReadiness}%`}
            points={[
              studentData.placementReadiness < studentData.targetReadiness
                ? `Below target (${studentData.targetReadiness}%).`
                : "At or above target.",
              `Missing Areas: ${placementMissingAreas.length ? placementMissingAreas.join(", ") : "None"}`,
            ]}
          />

          <ActionCard
            title="Priority Placement Actions"
            actions={[
              "Practice HR questions for 15 minutes daily.",
              "Attend 2 mock interviews this week.",
              "Solve one aptitude section every day.",
            ]}
          />
        </InsightBlock>
      )}

      {/* ================= ACTION PLAN ================= */}
      {activeTab === "actions" && (
        <div className="space-y-6">

          <ActionCard
            title="🔴 Next 7 Days"
            actions={actionPlan.next7Days}
          />

          <ActionCard
            title="🟡 Next 30 Days"
            actions={actionPlan.next30Days}
          />

          <ActionCard
            title="🟢 Semester Focus"
            actions={actionPlan.semesterGoal}
          />

          <div className="rounded-3xl p-6 bg-white/85 border border-white/60">
            <h3 className="font-semibold text-slate-900">Focus Now</h3>
            <p className="mt-2 text-sm text-slate-700">Focus on {biggestWeakArea}</p>
            <p className="mt-1 text-sm text-slate-600">
              {biggestWeakArea === "Attendance"
                ? "Low attendance has the highest impact on CGPA and placement eligibility."
                : biggestWeakArea === "Marks"
                ? "Low marks are the fastest indicator of academic risk."
                : "Skill gaps are limiting placement readiness despite academic progress."}
            </p>
          </div>

        </div>
      )}

    </div>
  );
}

/* ================= COMPONENTS ================= */

function FutureSnapshot({
  cgpaTrendLabel,
  attendance,
  attendanceDelta,
  placementReadiness,
  targetReadiness,
  biggestWeakArea,
  priorityInsight,
}) {
  return (
    <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
      <h2 className="text-xl font-semibold">🔮 Your Future Snapshot</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SnapshotItem label="CGPA Trend" value={cgpaTrendLabel === "Improving" ? "↑ Improving" : cgpaTrendLabel === "Declining" ? "↓ Declining" : "→ Stable"} />
        <SnapshotItem label="Attendance Trend" value={`${attendance}% (${attendanceDelta >= 0 ? "↑" : "↓"} ${Math.abs(attendanceDelta)}% this week)`} />
        <SnapshotItem
          label="Placement Readiness"
          value={`${placementReadiness}% ${placementReadiness < targetReadiness ? "(Below target)" : "(On target)"}`}
        />
      </div>

      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-700">Biggest Weak Area</p>
        <p className="text-sm text-slate-600 mt-1">{biggestWeakArea}</p>
      </div>

      <div className="rounded-2xl bg-indigo-50 p-5">
        <p className="text-sm font-medium text-indigo-700">Priority Insight</p>
        <p className="text-sm text-indigo-600 mt-1">{priorityInsight.message}</p>
        <p className="text-sm text-indigo-700 mt-2">Impact: {priorityInsight.impact}</p>
        <p className="text-sm font-medium text-indigo-800 mt-2">Action: {priorityInsight.action}</p>
      </div>
    </div>
  );
}

function InsightBlock({ title, children }) {
  return (
    <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function SnapshotItem({ label, value }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function CauseEffect({ cause, effect, pattern = [] }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700">Cause</p>
      <p className="text-sm text-gray-600">{cause}</p>
      <p className="text-sm font-medium text-gray-700 mt-3">Effect</p>
      <ul className="list-disc ml-5 text-sm text-gray-600">
        {effect.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      {Array.isArray(pattern) && pattern.length > 0 && (
        <>
          <p className="text-sm font-medium text-gray-700 mt-3">Pattern</p>
          <ul className="list-disc ml-5 text-sm text-gray-600">
            {pattern.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AttendanceTrendChart({ data }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">Attendance Trend</p>
      <div className="h-64 bg-white rounded-xl p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
            <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "75%", position: "insideTopRight", fill: "#ef4444" }} />
            <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MidComparisonChart({ mid1, mid2 }) {
  const data = [
    { name: "Mid 1", marks: mid1 },
    { name: "Mid 2", marks: mid2 },
  ];
  const trendLabel = mid2 > mid1 ? "Improved" : mid2 < mid1 ? "Declined" : "Stable";

  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">Mid 1 vs Mid 2 Comparison</p>
      <div className="h-64 bg-white rounded-xl p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 30]} />
            <Tooltip formatter={(value) => [value, "Marks"]} />
            <Bar dataKey="marks" fill="#7c3aed" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-gray-700 mt-2">Result: {trendLabel}</p>
    </div>
  );
}

function IntelligenceCard({ title, points }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <ul className="mt-2 list-disc ml-5 text-sm text-gray-600">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ title, actions }) {
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-white/50">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {actions.map((a, i) => (
          <li key={i}>✔ {a}</li>
        ))}
      </ul>
    </div>
  );
}
