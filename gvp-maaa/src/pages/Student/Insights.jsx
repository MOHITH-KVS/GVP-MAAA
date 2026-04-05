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

const SAFE_ATTENDANCE = 75;
const SAFE_MARK = 15;

function isValidNumber(value) {
  return Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function avg(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const nums = values.filter((v) => isValidNumber(v));
  if (!nums.length) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function calculateSlopePrediction(series, min = 0, max = 100) {
  const values = (series || []).filter((v) => isValidNumber(v));
  if (values.length < 2) return null;

  const firstWindow = values.slice(0, Math.min(2, values.length));
  const lastWindow = values.slice(-Math.min(2, values.length));
  const firstAvg = avg(firstWindow);
  const lastAvg = avg(lastWindow);

  if (!isValidNumber(firstAvg) || !isValidNumber(lastAvg)) return null;

  const slopeDelta = lastAvg - firstAvg;
  const predicted = clamp(values[values.length - 1] + slopeDelta, min, max);

  return {
    slopeDelta: Number(slopeDelta.toFixed(1)),
    predicted: Number(predicted.toFixed(1)),
  };
}

function getMetricStatus(score) {
  if (!isValidNumber(score)) return "INSUFFICIENT DATA";
  return score >= 75 ? "GOOD" : "NEEDS IMPROVEMENT";
}

export default function Insights() {
  const [activeTab, setActiveTab] = useState("future");

  const studentData = useMemo(
    () => ({
      attendance: 68,
      attendanceLastWeek: 82,
      attendanceTrend: [84, 82, 79, 76, 73, 70, 68],
      mid1: 17,
      mid2: 14,
      cgpa: 7.4,
      missedClasses: 6,
      semesterClassDays: 42,
    }),
    []
  );

  const hasAttendance = isValidNumber(studentData.attendance);
  const hasMid1 = isValidNumber(studentData.mid1);
  const hasMid2 = isValidNumber(studentData.mid2);

  const attendanceDrop =
    hasAttendance &&
    isValidNumber(studentData.attendanceLastWeek) &&
    studentData.attendance < studentData.attendanceLastWeek;

  const lowAttendance = hasAttendance && studentData.attendance < SAFE_ATTENDANCE;
  const lowMid1 = hasMid1 && studentData.mid1 < SAFE_MARK;
  const lowMid2 = hasMid2 && studentData.mid2 < SAFE_MARK;
  const lowMarks = lowMid1 || lowMid2;
  const missingMid2 = !hasMid2;

  const riskConditionCount = [lowAttendance, lowMid1, lowMid2].filter(Boolean).length;
  const riskLevel = riskConditionCount >= 2 ? "HIGH" : riskConditionCount === 1 ? "MEDIUM" : "LOW";

  const riskTone =
    riskLevel === "HIGH"
      ? "from-red-600 via-red-500 to-rose-500"
      : riskLevel === "MEDIUM"
      ? "from-amber-500 via-yellow-500 to-orange-400"
      : "from-emerald-600 via-green-500 to-teal-500";

  const marksTrendLabel = (() => {
    if (!hasMid1 || !hasMid2) return "Insufficient data to analyze";
    if (studentData.mid2 > studentData.mid1) return "Improving";
    if (studentData.mid2 < studentData.mid1) return "Declining";
    return "No significant change";
  })();

  const placementStatus =
    hasAttendance && hasMid1 && hasMid2
      ? studentData.attendance >= SAFE_ATTENDANCE && studentData.mid1 >= SAFE_MARK && studentData.mid2 >= SAFE_MARK
        ? "Placement Ready"
        : "Needs Improvement"
      : "Insufficient data to analyze";

  const topSummary = useMemo(() => {
    const primaryProblem = (() => {
      if (lowAttendance && attendanceDrop) {
        return {
          title: "Attendance drop",
          detail: `Your attendance dropped from ${studentData.attendanceLastWeek}% to ${studentData.attendance}% and is below ${SAFE_ATTENDANCE}%.`,
        };
      }
      if (lowMarks) {
        const weakestMark = Math.min(
          hasMid1 ? studentData.mid1 : Number.POSITIVE_INFINITY,
          hasMid2 ? studentData.mid2 : Number.POSITIVE_INFINITY
        );
        return {
          title: "Low marks",
          detail: `Your weakest mid score is ${weakestMark}/30, below the safe level of ${SAFE_MARK}/30.`,
        };
      }
      if (lowAttendance) {
        return {
          title: "Attendance drop",
          detail: `Your attendance is ${studentData.attendance}%, below the safe level of ${SAFE_ATTENDANCE}%.`,
        };
      }
      if (missingMid2) {
        return {
          title: "Missing Mid2",
          detail: "Mid2 mark is missing, so performance risk cannot be measured correctly.",
        };
      }
      return {
        title: "No critical issue",
        detail: `Attendance is ${studentData.attendance}% and mid scores are ${studentData.mid1}/30, ${studentData.mid2}/30.`,
      };
    })();

    const prediction = (() => {
      if (lowAttendance) return "Risk of low CGPA and placement eligibility issues due to attendance below 75%.";
      if (lowMarks) return "You may struggle in final exams because current mid scores are below safe level.";
      if (missingMid2) return "Without Mid2 data, final performance risk cannot be estimated accurately.";
      return "Current numbers indicate stable progress if attendance and marks stay at this level.";
    })();

    const immediateAction = (() => {
      if (lowAttendance) return "Attend next 5 classes without fail.";
      if (lowMarks) return "Revise 2 weak subjects this week and solve 1 past-paper section daily.";
      if (missingMid2) return "Submit Mid2 immediately or complete the retest to unlock accurate analysis.";
      return "Maintain attendance above 80% and revise one core subject each day this week.";
    })();

    return {
      primaryProblem,
      prediction,
      immediateAction,
    };
  }, [
    attendanceDrop,
    hasMid1,
    hasMid2,
    lowAttendance,
    lowMarks,
    missingMid2,
    studentData.attendance,
    studentData.attendanceLastWeek,
    studentData.mid1,
    studentData.mid2,
  ]);

  const attendanceChartData = (studentData.attendanceTrend || []).slice(-14).map((value, index, arr) => ({
    day: `D${arr.length - index}`,
    attendance: value,
  }));

  const attendancePrediction = calculateSlopePrediction(
    attendanceChartData.map((item) => item.attendance),
    0,
    100
  );

  const marksTrendData = hasMid1 && hasMid2
    ? [
        { exam: "Mid1", marks: studentData.mid1 },
        { exam: "Mid2", marks: studentData.mid2 },
      ]
    : [];

  const marksPredictionRaw = calculateSlopePrediction(
    marksTrendData.map((item) => (item.marks / 30) * 100),
    0,
    100
  );

  const marksPrediction = marksPredictionRaw
    ? {
        percent: marksPredictionRaw.predicted,
        marksOutOf30: Number(((marksPredictionRaw.predicted / 100) * 30).toFixed(1)),
        deltaPercent: marksPredictionRaw.slopeDelta,
      }
    : null;

  const diagnosis = useMemo(() => {
    if (lowAttendance && attendanceDrop) {
      return {
        cause: `Attendance dropped from ${studentData.attendanceLastWeek}% to ${studentData.attendance}% in the recent window.`,
        effect: "Less class exposure leads to weaker topic retention and slower revision speed.",
        impact: "May reduce CGPA and placement chances if attendance remains below 75%.",
      };
    }

    if (lowMarks) {
      return {
        cause: `Mid performance is low (Mid1: ${hasMid1 ? studentData.mid1 : "N/A"}/30, Mid2: ${hasMid2 ? studentData.mid2 : "N/A"}/30).`,
        effect: "Core concepts are not translating into test performance under exam conditions.",
        impact: "May reduce semester-end marks and increase final exam pressure.",
      };
    }

    if (missingMid2) {
      return {
        cause: "Mid2 score is missing in the records.",
        effect: "Academic trend cannot be validated against the second assessment.",
        impact: "Risk predictions can be inaccurate until Mid2 is available.",
      };
    }

    return {
      cause: `Attendance is ${studentData.attendance}% and mid scores are ${studentData.mid1}/30, ${studentData.mid2}/30.`,
      effect: "Current consistency is acceptable but still below strong placement benchmark in attendance.",
      impact: "Without improvement, final outcomes may remain average instead of competitive.",
    };
  }, [attendanceDrop, hasMid1, hasMid2, lowAttendance, lowMarks, missingMid2, studentData]);

  const aptitudeReadiness = hasMid1 && hasMid2 ? Number((((studentData.mid1 + studentData.mid2) / 60) * 100).toFixed(1)) : null;
  const attendanceDiscipline = hasAttendance ? Number(studentData.attendance.toFixed(1)) : null;

  const attendanceVariation = (() => {
    if (!attendanceChartData.length) return null;
    const values = attendanceChartData.map((item) => item.attendance);
    const mean = avg(values);
    if (!isValidNumber(mean)) return null;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  })();

  const markGap = hasMid1 && hasMid2 ? Math.abs(studentData.mid2 - studentData.mid1) : null;

  const consistencyScore =
    isValidNumber(attendanceVariation) && isValidNumber(markGap)
      ? Number(clamp(100 - attendanceVariation * 2 - markGap * 3, 0, 100).toFixed(1))
      : null;

  const actionPlan = {
    next7Days: [
      lowAttendance
        ? `Attend all classes for the next 7 days to recover from ${studentData.attendance}% toward ${SAFE_ATTENDANCE}%+.`
        : `Protect attendance above ${SAFE_ATTENDANCE}% by attending every scheduled class this week.`,
      lowMarks
        ? `Revise 2 weak units this week and solve 1 timed question set daily to recover from Mid2 ${hasMid2 ? studentData.mid2 : "N/A"}/30.`
        : "Solve 1 revision test every two days to sustain current marks.",
      `Meet your mentor once this week and review ${studentData.missedClasses} missed classes out of ${studentData.semesterClassDays}.`,
    ],
    next30Days: [
      lowMarks
        ? "Improve upcoming test score by +5 marks through weekly mock papers and error tracking."
        : "Maintain current marks and target +2 marks in the next internal test.",
      lowAttendance
        ? "Raise attendance above 80% within 30 days by avoiding non-critical absences."
        : "Maintain attendance above 80% for the full month.",
      "Complete 4 aptitude practice sets per week to support placement preparation.",
    ],
    semesterGoal: [
      "Achieve CGPA >= 8.0 by maintaining weekly revision targets.",
      "Maintain attendance >= 85% by semester end.",
      "Keep every major assessment at or above 20/30 for stronger placement readiness.",
    ],
  };

  return (
    <div className="space-y-10">

      <div className={`rounded-3xl p-8 bg-gradient-to-br ${riskTone} text-white`}>
        <h1 className="text-3xl font-semibold">Your Academic Status</h1>
        <p className="mt-2 text-sm text-white/90">
          AI Coach summary based on attendance, Mid1, Mid2, and recent trend data.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
          <SummaryCard
            title="Current Risk"
            value={riskLevel}
            detail={`Triggered conditions: ${riskConditionCount}/3 (Attendance < ${SAFE_ATTENDANCE}%, Mid1 < ${SAFE_MARK}, Mid2 < ${SAFE_MARK}).`}
          />

          <SummaryCard
            title="Primary Problem"
            value={topSummary.primaryProblem.title}
            detail={topSummary.primaryProblem.detail}
          />

          <SummaryCard
            title="What Will Happen"
            value="Prediction"
            detail={topSummary.prediction}
          />

          <SummaryCard
            title="What To Do Now"
            value="Immediate Action"
            detail={topSummary.immediateAction}
          />
        </div>
      </div>

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

      {activeTab === "future" && (
        <FutureSnapshot
          marksTrendLabel={marksTrendLabel}
          placementStatus={placementStatus}
          riskLevel={riskLevel}
          attendance={studentData.attendance}
          mid1={studentData.mid1}
          mid2={studentData.mid2}
          riskConditionCount={riskConditionCount}
        />
      )}

      {activeTab === "trends" && (
        <InsightBlock title="Why This Is Happening">
          <CauseEffectImpact
            cause={diagnosis.cause}
            effect={diagnosis.effect}
            impact={diagnosis.impact}
          />

          <AttendanceTrendChart
            data={attendanceChartData}
            prediction={attendancePrediction}
          />

          <MarksTrendChart
            data={marksTrendData}
            prediction={marksPrediction}
          />
        </InsightBlock>
      )}

      {activeTab === "placements" && (
        <InsightBlock title="Placement Intelligence">
          <MetricCard
            title="Aptitude Readiness"
            score={aptitudeReadiness}
            status={getMetricStatus(aptitudeReadiness)}
            reason={
              hasMid1 && hasMid2
                ? `Derived from Mid1 ${studentData.mid1}/30 and Mid2 ${studentData.mid2}/30.`
                : "Insufficient data to analyze"
            }
            action={
              hasMid1 && hasMid2
                ? aptitudeReadiness >= 75
                  ? "Maintain weekly aptitude practice with timed sets."
                  : "Increase aptitude practice to 4 timed sets per week."
                : "Upload missing marks to unlock this metric."
            }
          />

          <MetricCard
            title="Attendance Discipline"
            score={attendanceDiscipline}
            status={getMetricStatus(attendanceDiscipline)}
            reason={
              hasAttendance
                ? `Current attendance is ${studentData.attendance}% against ${SAFE_ATTENDANCE}% safe threshold.`
                : "Insufficient data to analyze"
            }
            action={
              hasAttendance
                ? attendanceDiscipline >= 75
                  ? "Keep attendance above 80% for placement eligibility safety."
                  : "Attend all upcoming classes until attendance crosses 75%."
                : "Sync attendance records to calculate discipline score."
            }
          />

          <MetricCard
            title="Consistency Score"
            score={consistencyScore}
            status={getMetricStatus(consistencyScore)}
            reason={
              isValidNumber(consistencyScore)
                ? `Based on attendance variability and Mid1-Mid2 gap (${isValidNumber(markGap) ? markGap : "N/A"} marks).`
                : "Insufficient data to analyze"
            }
            action={
              isValidNumber(consistencyScore)
                ? consistencyScore >= 75
                  ? "Maintain current study rhythm and attendance discipline."
                  : "Use weekly review to reduce score fluctuations across tests and attendance."
                : "Provide complete trend data for consistency analysis."
            }
          />
        </InsightBlock>
      )}

      {activeTab === "actions" && (
        <div className="space-y-6">
          <ActionCard title="Next 7 Days" actions={actionPlan.next7Days} />
          <ActionCard title="Next 30 Days" actions={actionPlan.next30Days} />
          <ActionCard title="Semester Goal" actions={actionPlan.semesterGoal} />
        </div>
      )}

    </div>
  );
}

function SummaryCard({ title, value, detail }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-4 border border-white/20">
      <p className="text-white/80 text-xs uppercase tracking-wide">{title}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
      <p className="text-sm text-white/90 mt-2">{detail}</p>
    </div>
  );
}

function FutureSnapshot({
  marksTrendLabel,
  placementStatus,
  riskLevel,
  attendance,
  mid1,
  mid2,
  riskConditionCount,
}) {
  const hasMarks = isValidNumber(mid1) && isValidNumber(mid2);

  return (
    <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
      <h2 className="text-xl font-semibold">Your Future Snapshot</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SnapshotItem
          label="Academics"
          value={marksTrendLabel}
          whyThisMatters={
            hasMarks
              ? `Mid1 ${mid1}/30 to Mid2 ${mid2}/30 indicates your exam direction.`
              : "Insufficient data to analyze"
          }
        />

        <SnapshotItem
          label="Placement"
          value={placementStatus}
          whyThisMatters={
            isValidNumber(attendance) && hasMarks
              ? `Attendance ${attendance}% and marks decide shortlist readiness.`
              : "Insufficient data to analyze"
          }
        />

        <SnapshotItem
          label="Risk Level"
          value={riskLevel}
          whyThisMatters={`Risk is computed from ${riskConditionCount}/3 trigger conditions.`}
        />
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

function SnapshotItem({ label, value, whyThisMatters }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-600 mt-2">Why this matters: {whyThisMatters}</p>
    </div>
  );
}

function CauseEffectImpact({ cause, effect, impact }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Cause</p>
        <p className="text-sm text-gray-600">{cause}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Effect</p>
        <p className="text-sm text-gray-600">{effect}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Impact</p>
        <p className="text-sm text-gray-600">{impact}</p>
      </div>
    </div>
  );
}

function AttendanceTrendChart({ data, prediction }) {
  const hasData = Array.isArray(data) && data.length >= 2;

  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">Attendance Trend (last {Math.min(data.length || 0, 14)} days)</p>

      {!hasData ? (
        <p className="text-sm text-gray-600">Not enough data to analyze trend</p>
      ) : (
        <>
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

          <p className="text-sm text-gray-700 mt-2">
            Trend prediction: {prediction ? `${prediction.predicted}% (slope delta ${prediction.slopeDelta})` : "Insufficient data to analyze"}
          </p>
        </>
      )}
    </div>
  );
}

function MarksTrendChart({ data, prediction }) {
  const hasData = Array.isArray(data) && data.length >= 2;

  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">Marks Trend (Mid1 vs Mid2)</p>

      {!hasData ? (
        <p className="text-sm text-gray-600">Not enough data to analyze trend</p>
      ) : (
        <>
          <div className="h-64 bg-white rounded-xl p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="exam" />
                <YAxis domain={[0, 30]} />
                <Tooltip formatter={(value) => [value, "Marks"]} />
                <Bar dataKey="marks" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-sm text-gray-700 mt-2">
            Trend prediction: {prediction ? `${prediction.marksOutOf30}/30 (~${prediction.percent}%)` : "Insufficient data to analyze"}
          </p>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, score, status, reason, action }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-sm font-semibold text-gray-800">
          {isValidNumber(score) ? `${score}/100` : "Insufficient data to analyze"}
        </p>
      </div>
      <p className="text-xs font-semibold mt-2 text-gray-700">Status: {status}</p>
      <p className="text-sm text-gray-600 mt-2">Reason: {reason}</p>
      <p className="text-sm text-gray-700 mt-2">Action: {action}</p>
    </div>
  );
}

function ActionCard({ title, actions }) {
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-white/50">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {actions.map((action, index) => (
          <li key={index}>- {action}</li>
        ))}
      </ul>
    </div>
  );
}
