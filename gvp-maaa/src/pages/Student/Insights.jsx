import { useEffect, useState } from "react";
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
import api from "../../utils/axios";

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getTrendDirection(values) {
  if (!Array.isArray(values) || values.length < 2) return "Insufficient data to analyze";

  const firstWindow = values.slice(0, Math.min(2, values.length));
  const lastWindow = values.slice(-Math.min(2, values.length));
  const firstAvg = firstWindow.reduce((a, b) => a + b, 0) / firstWindow.length;
  const lastAvg = lastWindow.reduce((a, b) => a + b, 0) / lastWindow.length;

  if (lastAvg > firstAvg) return "Rising";
  if (lastAvg < firstAvg) return "Falling";
  return "Stable";
}

function getRiskColors(level) {
  if (level === "HIGH") return "from-red-600 via-red-500 to-rose-500";
  if (level === "MEDIUM") return "from-amber-500 via-yellow-500 to-orange-400";
  return "from-emerald-600 via-green-500 to-teal-500";
}

function getAttendanceStatus(attendance) {
  if (!isNumber(attendance)) return "Insufficient data to analyze";
  if (attendance < 65) return "Critical";
  if (attendance < 75) return "Below safe level";
  return "Safe";
}

function getConsistencyColor(score) {
  if (!isNumber(score)) return "text-gray-600";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getTasksStorageKey(studentId) {
  if (!studentId) return "dailyTasksState";
  return `dailyTasksState:${studentId}`;
}

export default function Insights() {
  const [activeTab, setActiveTab] = useState("future");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyTasksState, setDailyTasksState] = useState({});

  useEffect(() => {
    let mounted = true;

    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/student/insights");
        if (mounted) {
          const data = response.data || null;
          setInsights(data);

          // Scope task state per student account to avoid cross-user leakage.
          const key = getTasksStorageKey(data?.student_id);
          const saved = localStorage.getItem(key);
          if (saved) {
            setDailyTasksState(JSON.parse(saved));
          }
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load insights data");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInsights();

    return () => {
      mounted = false;
    };
  }, []);

  const handleTaskToggle = (index) => {
    const updated = {
      ...dailyTasksState,
      [index]: !dailyTasksState[index],
    };
    setDailyTasksState(updated);
    localStorage.setItem(getTasksStorageKey(insights?.student_id), JSON.stringify(updated));
  };

  const attendance = insights?.attendance;
  const mid1 = insights?.mid1;
  const mid2 = insights?.mid2;
  const riskLevel = insights?.risk_level || "INSUFFICIENT DATA";
  const primaryIssue = insights?.primary_issue || "Insufficient data to analyze";
  const prediction = insights?.prediction || "Insufficient data to analyze";
  const actions = Array.isArray(insights?.actions) ? insights.actions : [];
  const weeklyGoal = Array.isArray(insights?.weekly_goal) ? insights.weekly_goal : [];
  const consequences = Array.isArray(insights?.consequences) ? insights.consequences : [];
  const progress = insights?.progress_this_week || null;
  const focusNow = insights?.focus_now || null;

  const attendanceTrend = Array.isArray(insights?.attendance_trend) ? insights.attendance_trend : [];
  const marksTrend = Array.isArray(insights?.marks_trend) ? insights.marks_trend : [];
  const placementAnalysis = insights?.placement_analysis || null;
  
  // NEW: Extract new AI coaching features
  const whatIf = insights?.what_if || {};
  const warnings = Array.isArray(insights?.warnings) ? insights.warnings : [];
  const dailyTasks = Array.isArray(insights?.daily_tasks) ? insights.daily_tasks : [];
  const patterns = Array.isArray(insights?.patterns) ? insights.patterns : [];
  const earlyWarningSignals = Array.isArray(insights?.early_warning_signals) ? insights.early_warning_signals : [];
  const placement = insights?.placement || {};
  const consistencyScore = placement?.consistency;
  const consistencyText = placement?.consistency_interpretation || "Insufficient data";
  const cgpa = insights?.cgpa;
  const internal = insights?.internal;
  const scaledMid = insights?.scaled_mid;
  const scaledAssignment = insights?.scaled_assignment;
  const externalEstimate = insights?.external_estimate;
  const assignmentTotal = insights?.assignment_total;
  const assignmentMaxTotal = insights?.assignment_max_total;
  const requiredMid2Targets = Array.isArray(insights?.required_mid2_targets) ? insights.required_mid2_targets : [];
  const cgpaSimulation = Array.isArray(insights?.simulation) ? insights.simulation : [];
  const placementReadinessByCgpa = insights?.placement_readiness || "INSUFFICIENT DATA";
  const cgpaPredictionNote = insights?.cgpa_prediction_note || null;
  const subjectIntelligence = insights?.subject_intelligence || {};
  const subjectInsights = Array.isArray(subjectIntelligence?.subjects) ? subjectIntelligence.subjects : [];
  const weakestSubjects = Array.isArray(subjectIntelligence?.weakest_subjects) ? subjectIntelligence.weakest_subjects : [];
  const strongestSubject = subjectIntelligence?.strongest_subject || null;
  const prioritySubject = subjectIntelligence?.priority_subject || null;

  const attendanceTrendLabel = getTrendDirection(attendanceTrend);
  const marksTrendLabel = getTrendDirection(marksTrend);

  const placementStatus = placementAnalysis?.status || "INSUFFICIENT DATA";

  const riskTone = getRiskColors(riskLevel);

  const attendanceChartData = attendanceTrend.map((value, index) => ({
    day: `D${index + 1}`,
    attendance: value,
  }));

  const marksChartData = [
    { exam: "Mid1", marks: isNumber(mid1) ? mid1 : null },
    { exam: "Mid2", marks: isNumber(mid2) ? mid2 : null },
  ].filter((row) => row.marks !== null);

  if (loading) {
    return (
      <div className="space-y-10 flex flex-col items-center justify-center min-h-[40vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading AI insights from backend data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (insights && insights.has_valid_data === false) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-slate-700 text-sm">
          {insights.no_data_message || "No performance data available yet. Insights will appear once data is updated."}
        </div>
      </div>
    );
  }

  // CRITICAL: Show warning banner if warnings exist
  const hasWarnings = warnings && warnings.length > 0;

  return (
    <div className="space-y-10">

      {/* EARLY WARNING BANNER */}
      {hasWarnings && (
        <div className="rounded-2xl bg-red-50 border border-red-300 p-5">
          <div className="flex items-start gap-3">
            <div className="text-red-600 text-xl">⚠️</div>
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm mb-2">Urgent Alerts</p>
              <ul className="space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-red-700">{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* EARLY WARNING SIGNALS */}
      {earlyWarningSignals && earlyWarningSignals.length > 0 && (
        <div className="space-y-3">
          {earlyWarningSignals.map((signal, idx) => (
            <div key={idx} className={`rounded-2xl p-4 border ${
              signal.level === "CRITICAL" 
                ? "bg-red-50 border-red-300" 
                : "bg-amber-50 border-amber-300"
            }`}>
              <p className={`text-sm font-semibold ${
                signal.level === "CRITICAL" ? "text-red-800" : "text-amber-800"
              }`}>
                {signal.level}: {signal.signal}
              </p>
              <p className={`text-xs mt-1 ${
                signal.level === "CRITICAL" ? "text-red-700" : "text-amber-700"
              }`}>
                Action: {signal.action}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-3xl p-8 bg-gradient-to-br ${riskTone} text-white`}>
        <h1 className="text-3xl font-semibold">Your Academic Status</h1>
        <p className="mt-2 text-sm text-white/90">Live AI-driven summary powered by real attendance and marks data.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Attendance</p>
            <p className="text-lg font-semibold">
              {isNumber(attendance) ? `${attendance}%` : "Insufficient data to analyze"}
            </p>
            <p className="text-xs text-white/80 mt-1">Status: {getAttendanceStatus(attendance)}</p>
          </div>

          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Marks</p>
            <p className="text-lg font-semibold">
              Mid1: {isNumber(mid1) ? mid1 : "N/A"} | Mid2: {isNumber(mid2) ? mid2 : "N/A"}
            </p>
            <p className="text-xs text-white/80 mt-1">Trend: {marksTrendLabel}</p>
          </div>

          <div className="rounded-xl bg-white/15 px-4 py-3">
            <p className="text-white/80">Risk Level</p>
            <p className="text-lg font-semibold">{riskLevel}</p>
            <p className="text-xs text-white/80 mt-1">Primary issue: {primaryIssue}</p>
          </div>
        </div>

        {/* Add consistency score display */}
        {isNumber(consistencyScore) && (
          <div className="mt-3 rounded-xl bg-white/15 px-4 py-3 text-sm">
            <p className="text-white/80">Attendance Consistency</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-lg font-semibold ${getConsistencyColor(consistencyScore)}`}>
                {consistencyScore}%
              </p>
              <p className="text-xs text-white/80">{consistencyText}</p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
          <CoachBlock
            title="This Week Goal"
            items={weeklyGoal.length ? weeklyGoal.slice(0, 3) : ["Insufficient data to analyze"]}
          />
          <CoachBlock
            title="Progress This Week"
            items={[formatProgressLine(progress), formatMarksProgress(progress?.marks_status)]}
          />
          <CoachBlock
            title="Focus Now"
            items={focusNow ? [`${focusNow.metric}`, focusNow.reason] : ["Insufficient data to analyze"]}
          />
          <CoachBlock
            title="If You Ignore This"
            items={consequences.length ? consequences.slice(0, 3) : ["Insufficient data to analyze"]}
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
            className={`px-5 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-white/70 hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "future" && (
        <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
          <h2 className="text-xl font-semibold">Future Snapshot & Intelligence</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SnapshotItem
              label="Attendance Direction"
              value={attendanceTrendLabel}
              whyThisMatters={
                attendanceTrend.length >= 2
                  ? `Based on ${attendanceTrend.length} attendance history points from backend.`
                  : "Insufficient data to analyze"
              }
            />
            <SnapshotItem
              label="Placement Outlook"
              value={placementReadinessByCgpa}
              whyThisMatters={
                isNumber(attendance) && isNumber(cgpa)
                  ? `Authoritative model: Attendance ${attendance}% and predicted CGPA ${cgpa}.`
                  : "Insufficient data to analyze"
              }
            />
            <SnapshotItem
              label="Risk"
              value={riskLevel}
              whyThisMatters={`Computed by backend risk rules from attendance and marks.`}
            />
          </div>

          <div className="rounded-2xl p-6 bg-gray-50 border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Dynamic CGPA Prediction</h3>

            {cgpaPredictionNote ? (
              <p className="text-sm text-gray-600">{cgpaPredictionNote}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-1">
                  <p className="text-gray-500">Predicted CGPA</p>
                  <p className="text-xl font-semibold text-gray-900">{isNumber(cgpa) ? cgpa : "Insufficient data"}</p>
                  <p className="text-xs text-gray-600">Internal: {isNumber(internal) ? internal : "-"} / 30, External estimate: {isNumber(externalEstimate) ? externalEstimate : "-"} / 100 scale</p>
                </div>

                <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-1">
                  <p className="text-gray-500">Scaling Breakdown</p>
                  <p className="text-sm text-gray-700">Assignment scaled: {isNumber(scaledAssignment) ? scaledAssignment : "-"} / 10</p>
                  <p className="text-sm text-gray-700">Mid scaled: {isNumber(scaledMid) ? scaledMid : "-"} / 20</p>
                  <p className="text-sm text-gray-700">Assignments total: {isNumber(assignmentTotal) ? assignmentTotal : "-"} / {isNumber(assignmentMaxTotal) ? assignmentMaxTotal : "-"}</p>
                </div>
              </div>
            )}

            {!!requiredMid2Targets.length && (
              <div className="rounded-xl bg-white border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Target Mid2 Requirements</p>
                <div className="space-y-1 text-sm text-gray-700">
                  {requiredMid2Targets.map((item, index) => (
                    <p key={`${item.target}-${index}`}>
                      CGPA {item.target}: Mid2 needed {item.status === "IMPOSSIBLE" ? item.required_mid2_raw : item.required_mid2} ({item.status})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WHAT-IF SIMULATION */}
          {whatIf && Object.keys(whatIf).length > 0 && (
            <div className="rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <h3 className="font-semibold text-sm text-gray-800 mb-4">What-If Simulation (AI Projection)</h3>
              <div className="space-y-3">
                {whatIf.attendance_improvement && (
                  <div className="rounded-xl bg-white p-3 border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">If you attend next 5 classes:</p>
                    <p className="text-sm text-blue-700 font-semibold mt-1">{whatIf.attendance_improvement}</p>
                  </div>
                )}
                {whatIf.marks_improvement && (
                  <div className="rounded-xl bg-white p-3 border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium">If marks improve by +5 points:</p>
                    <p className="text-sm text-blue-700 font-semibold mt-1">{whatIf.marks_improvement}</p>
                  </div>
                )}
                {whatIf.combined_impact && (
                  <div className="rounded-xl bg-white p-3 border border-emerald-100 bg-emerald-50">
                    <p className="text-sm text-emerald-700 font-semibold">💡 {whatIf.combined_impact}</p>
                  </div>
                )}

                {!!cgpaSimulation.length && (
                  <div className="rounded-xl bg-white p-3 border border-blue-100">
                    <p className="text-xs text-gray-600 font-medium mb-1">CGPA vs Mid2 Simulation</p>
                    <div className="space-y-1 text-sm text-blue-700">
                      {cgpaSimulation.map((row, index) => (
                        <p key={`${row.mid2}-${index}`}>Mid2 {row.mid2}: CGPA {row.cgpa}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "trends" && (
        <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
          <h2 className="text-xl font-semibold">Why This Is Happening & Patterns</h2>

          <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Cause</p>
              <p className="text-sm text-gray-600">
                {isNumber(attendance)
                  ? `Attendance is ${attendance}% and primary issue is ${primaryIssue.toLowerCase()}.`
                  : "Insufficient data to analyze"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Effect</p>
              <p className="text-sm text-gray-600">{prediction}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Impact</p>
              <p className="text-sm text-gray-600">
                {riskLevel === "HIGH"
                  ? "Attendance and marks are already in a high-risk state."
                  : riskLevel === "MEDIUM"
                  ? "One weak metric is pushing you toward risk."
                  : "Current metrics are within the safe zone, but they need to stay there."}
              </p>
            </div>
          </div>

          {/* BEHAVIOR PATTERNS */}
          {patterns && patterns.length > 0 && (
            <div className="rounded-2xl p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <p className="text-sm font-medium text-purple-800 mb-3">Patterns Detected (AI Analysis)</p>
              <ul className="space-y-2">
                {patterns.map((pattern, idx) => (
                  <li key={idx} className="text-sm text-purple-700 flex items-start gap-2">
                    <span className="text-lg">{pattern.charAt(0)}</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ChartCard title="Attendance Trend (last records)">
            {attendanceChartData.length < 2 ? (
              <p className="text-sm text-gray-600">Not enough data to display</p>
            ) : (
              <div className="h-64 bg-white rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                    <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "75%", position: "insideTopRight", fill: "#ef4444" }} />
                    <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Marks Trend (Mid1 vs Mid2)">
            {marksChartData.length < 2 ? (
              <p className="text-sm text-gray-600">Not enough data to display</p>
            ) : (
              <div className="h-64 bg-white rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marksChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="exam" />
                    <YAxis domain={[0, 30]} />
                    <Tooltip formatter={(value) => [value, "Marks"]} />
                    <Bar dataKey="marks" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {activeTab === "placements" && (
        <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
          <h2 className="text-xl font-semibold">Placement Intelligence</h2>

          {placementAnalysis ? (
            <div className="space-y-5">
              <div className={`rounded-2xl p-5 border ${getPlacementBorder(placementAnalysis.status)} bg-white`}>
                <p className="text-sm font-medium text-gray-700">Placement Status</p>
                <p className={`text-2xl font-semibold mt-1 ${getPlacementText(placementAnalysis.status)}`}>
                  {placementAnalysis.status}
                </p>
              </div>

              <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Why</p>
                {placementAnalysis.reasons?.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {placementAnalysis.reasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>- {reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">Insufficient data to analyze</p>
                )}
              </div>

              <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Gap Analysis</p>
                {placementAnalysis.gaps?.length ? (
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    {placementAnalysis.gaps.map((gap, index) => (
                      <p key={`${gap.metric}-${index}`}>
                        {gap.metric} → {formatPlacementValue(gap.current, gap.metric)} (Target: {formatPlacementValue(gap.target, gap.metric)})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">Insufficient data to analyze</p>
                )}
              </div>

              <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Roadmap</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-700">Weekly</p>
                    {placementAnalysis.roadmap?.weekly?.length ? (
                      <ul className="mt-2 space-y-1">
                        {placementAnalysis.roadmap.weekly.map((item, index) => (
                          <li key={`${item}-${index}`}>- {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2">Insufficient data to analyze</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Monthly</p>
                    {placementAnalysis.roadmap?.monthly?.length ? (
                      <ul className="mt-2 space-y-1">
                        {placementAnalysis.roadmap.monthly.map((item, index) => (
                          <li key={`${item}-${index}`}>- {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2">Insufficient data to analyze</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Timeline</p>
                <p className="text-sm text-gray-600 mt-2">Estimated time to readiness: {placementAnalysis.timeline}</p>
              </div>

              <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">If Ignored</p>
                {placementAnalysis.risk_if_ignored?.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {placementAnalysis.risk_if_ignored.map((item, index) => (
                      <li key={`${item}-${index}`}>- {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">Insufficient data to analyze</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Insufficient data to analyze</p>
          )}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="space-y-6">
          {!!subjectInsights.length && (
            <div className="rounded-3xl p-6 bg-white/80 border border-white/50 space-y-5">
              <h3 className="font-semibold">Subject-Level Intelligence</h3>
              <p className="text-xs text-gray-600">Topline metrics are always visible; detailed rationale is collapsed per subject for faster scanning.</p>

              {prioritySubject && (
                <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800">Subject Priority Score</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {prioritySubject.name} gives the biggest CGPA boost opportunity.
                  </p>
                  <p className="text-sm text-blue-700">Priority Score: {prioritySubject.priority_score}</p>
                  <p className="text-sm text-blue-700">Time Allocation: {prioritySubject.time_allocation}</p>
                  {prioritySubject.priority_breakdown && (
                    <p className="text-xs text-blue-700 mt-1">
                      Score model: {prioritySubject.priority_breakdown.formula}
                    </p>
                  )}
                </div>
              )}

              {!!weakestSubjects.length && (
                <div className="rounded-2xl p-4 bg-red-50 border border-red-200">
                  <p className="text-sm font-semibold text-red-800">Focus Subjects</p>
                  <div className="mt-2 space-y-1 text-sm text-red-700">
                    {weakestSubjects.map((subject, index) => (
                      <p key={`${subject.name}-${index}`}>
                        {subject.name}: CGPA {subject.cgpa} | {subject.reason} | Need Mid2 {isNumber(subject.required_mid2) ? subject.required_mid2 : "N/A"} ({subject.status})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {strongestSubject && (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-emerald-800 font-semibold">Strongest Subject</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    {strongestSubject.name} (CGPA {strongestSubject.cgpa}) - maintain this momentum.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {subjectInsights.map((subject, index) => (
                  <div key={`${subject.name}-${index}`} className="rounded-2xl p-4 bg-gray-50 border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="font-semibold text-gray-800">{subject.name}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <p className="text-gray-700">CGPA: {isNumber(subject.cgpa) ? subject.cgpa : "Insufficient data"}</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getSubjectRiskBadge(subject.risk)}`}>
                          {subject.risk}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p>Reason: {subject.reason}</p>
                      {isNumber(subject.priority_score) && <p>Priority Score: {subject.priority_score}</p>}
                      {subject.time_allocation && <p>Time Allocation: {subject.time_allocation}</p>}
                      <p>
                        Required improvement: {isNumber(subject.required_mid2)
                          ? `Need ${subject.status === "IMPOSSIBLE" ? subject.required_mid2_raw : subject.required_mid2} in Mid2 to reach safe level (${subject.status})`
                          : "Not enough mid data to estimate Mid2 requirement"}
                      </p>
                    </div>

                    <details className="mt-3 rounded-lg bg-white border border-gray-200 p-3">
                      <summary className="text-xs font-semibold text-gray-700 cursor-pointer">View detailed explanation</summary>
                      <div className="mt-2 text-sm text-gray-700 space-y-1">
                        {isNumber(subject.required_mid2_for_8) && (
                          <p>
                            Stretch target: Need {subject.status === "IMPOSSIBLE" && isNumber(subject.required_mid2_for_8_raw) ? subject.required_mid2_for_8_raw : subject.required_mid2_for_8} in Mid2 to reach CGPA 8.0 in this subject.
                          </p>
                        )}
                        {subject.priority_breakdown && (
                          <p>
                            Priority breakdown: CGPA gap {subject.priority_breakdown.cgpa_gap_component}, attendance gap {subject.priority_breakdown.attendance_gap_component}, marks gap {subject.priority_breakdown.marks_gap_component}.
                          </p>
                        )}
                        {subject.faculty_feedback && (
                          <p>
                            System Feedback ({subject.faculty_feedback.source || "SYSTEM_GENERATED"}): {subject.faculty_feedback.summary} - {subject.faculty_feedback.action}
                          </p>
                        )}
                        {subject.impact && <p>Impact: {subject.impact}</p>}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl p-6 bg-white/80 border border-white/50">
            <h3 className="font-semibold mb-3">Placement Status (Authoritative Model)</h3>
            <p className="text-sm text-gray-700">
              Current status: <span className="font-semibold">{placementReadinessByCgpa}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">This is the same status used in Placement Intelligence.</p>
          </div>

          {/* DAILY TASKS TRACKER */}
          {dailyTasks && dailyTasks.length > 0 && (
            <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200">
              <h3 className="font-semibold mb-4 text-emerald-900 flex items-center gap-2">
                <span className="text-xl">✓</span>
                Daily Tasks (AI-Generated)
              </h3>
              <div className="space-y-3">
                {dailyTasks.map((task, index) => (
                  <div key={index} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={dailyTasksState[index] || false}
                      onChange={() => handleTaskToggle(index)}
                      className="w-5 h-5 mt-0.5 cursor-pointer text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        dailyTasksState[index] ? "line-through text-gray-400" : "text-gray-800"
                      }`}>
                        {task.task}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{task.reason}</p>
                      <span className={`text-xs font-semibold mt-1 inline-block px-2 py-1 rounded ${
                        task.priority === "HIGH" ? "bg-red-100 text-red-700" :
                        task.priority === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-4">Progress is saved locally for this student profile on this device.</p>
            </div>
          )}

          {/* STATIC ACTION PLAN */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-white/50">
            <h3 className="font-semibold mb-3">Action Plan (General)</h3>
            {!actions.length ? (
              <p className="text-sm text-gray-600">Insufficient data to analyze</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {actions.map((action, index) => (
                  <li key={`${action}-${index}`}>- {action}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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

function CoachBlock({ title, items }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-3 border border-white/20">
      <p className="text-white/80 text-xs uppercase tracking-wide">{title}</p>
      <ul className="mt-2 space-y-1 text-white text-sm">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatProgressLine(progress) {
  if (!progress || !isNumber(progress.attendance_current) || !isNumber(progress.attendance_previous) || !isNumber(progress.attendance_change)) {
    return "Attendance: Insufficient data to analyze";
  }

  const direction = progress.attendance_change > 0 ? "↑" : progress.attendance_change < 0 ? "↓" : "→";
  const deltaValue = progress.attendance_change > 0 ? `+${progress.attendance_change}%` : `${progress.attendance_change}%`;
  return `Attendance: ${progress.attendance_previous}% → ${progress.attendance_current}% ${direction} (${deltaValue})`;
}

function formatMarksProgress(status) {
  if (!status) return "Marks: Insufficient data to analyze";
  return `Marks: ${status}`;
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      {children}
    </div>
  );
}

function getPlacementBorder(status) {
  if (status === "READY") return "border-emerald-200";
  if (status === "BORDERLINE") return "border-amber-200";
  if (status === "NOT READY") return "border-red-200";
  return "border-gray-200";
}

function getPlacementText(status) {
  if (status === "READY") return "text-emerald-700";
  if (status === "BORDERLINE") return "text-amber-700";
  if (status === "NOT READY") return "text-red-700";
  return "text-gray-700";
}

function formatPlacementValue(value, metric) {
  if (!isNumber(value)) return "Insufficient data to analyze";
  if (metric === "Marks" || metric === "CGPA") {
    return `${value}`;
  }
  return `${value}%`;
}

function getSubjectRiskBadge(risk) {
  if (risk === "HIGH") return "bg-red-100 text-red-700";
  if (risk === "MEDIUM") return "bg-amber-100 text-amber-700";
  if (risk === "LOW") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

