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

export default function Insights() {
  const [activeTab, setActiveTab] = useState("future");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/student/insights");
        if (mounted) {
          setInsights(response.data || null);
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

  const attendance = insights?.attendance;
  const mid1 = insights?.mid1;
  const mid2 = insights?.mid2;
  const riskLevel = insights?.risk_level || "LOW";
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
        <p className="text-gray-500 text-sm">Loading insights from backend data...</p>
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

  return (
    <div className="space-y-10">

      <div className={`rounded-3xl p-8 bg-gradient-to-br ${riskTone} text-white`}>
        <h1 className="text-3xl font-semibold">Your Academic Status</h1>
        <p className="mt-2 text-sm text-white/90">Live summary from attendance and marks records.</p>

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
            className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-white/70 hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "future" && (
        <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
          <h2 className="text-xl font-semibold">Your Future Snapshot</h2>

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
              value={placementStatus}
              whyThisMatters={
                isNumber(attendance) && isNumber(mid1) && isNumber(mid2)
                  ? `Attendance ${attendance}%, Mid1 ${mid1}, Mid2 ${mid2}.`
                  : "Insufficient data to analyze"
              }
            />
            <SnapshotItem
              label="Risk"
              value={riskLevel}
              whyThisMatters={`Computed by backend risk rules from attendance and marks.`}
            />
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
          <h2 className="text-xl font-semibold">Why This Is Happening</h2>

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
          <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-white/50">
            <h3 className="font-semibold mb-3">Action Plan</h3>
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
  if (metric === "Marks") {
    return `${value}`;
  }
  return `${value}%`;
}
