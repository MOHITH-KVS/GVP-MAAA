import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from "recharts";
import api from "../../utils/api";

/* ================= MAIN ================= */
export default function Insights() {
  /* CONTEXT FILTERS */
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [timeRange, setTimeRange] = useState("semester");
  const [trendView, setTrendView] = useState("days");
  const [midChartMode, setMidChartMode] = useState("top5");

  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const fetchSubjects = async () => {
      try {
        const res = await fetch("http://localhost:8000/faculty/subjects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubject(String(data[0].subject_id));
          }
        }
      } catch (err) {
        console.error("Error loading faculty subjects:", err);
        setSubjects([]);
      }
    };
    if (token) {
      fetchSubjects();
    }
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!selectedSubject) return;
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/faculty/insights-data", {
          params: {
            subject_id: selectedSubject,
            timeRange: timeRange,
            subject: selectedSubject,
            time_range: timeRange,
            trend_view: trendView,
          },
        });
        setInsightsData(res.data);
      } catch (err) {
        setError("Failed to load insights.");
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [selectedSubject, timeRange, trendView]);

  const predictions = insightsData?.predictions ?? {};
  const weakestSubject = insightsData?.weakest_subject || null;
  const insights = insightsData?.insights || [];
  const trendInsight = insightsData?.trendInsight || "";
  const recommendedActions = insightsData?.recommended_actions || [];
  const midComparison = insightsData?.mid_comparison || [];
  const midComparisonSummary = insightsData?.mid_comparison_summary || "";
  const students = insightsData?.students || [];
  const attendanceSummary = insightsData?.attendance_summary || {};
  const trendSummary = insightsData?.trend_summary || {};
  const attendanceAnnotation = insightsData?.attendance_chart_annotation || "";
  const midAnalysis = insightsData?.mid_analysis || {};
  const topRisks = insightsData?.top_risks || [];
  const marksSummary = insightsData?.marks_summary || {};

  const attendanceTrend = useMemo(() => {
    if (!insightsData?.attendance_trend) return [];
    return insightsData.attendance_trend.map((row) => ({
      label: row.label,
      value: row.value ?? row.actual,
    }));
  }, [insightsData]);

  const hasMidMarksData = useMemo(() => {
    const a1 = marksSummary.avg_mid1;
    const a2 = marksSummary.avg_mid2;
    const hasAvg =
      (typeof a1 === "number" && a1 > 0) ||
      (typeof a2 === "number" && a2 > 0);
    const anyStudent = midComparison.some(
      (r) => r.mid1 != null || r.mid2 != null
    );
    return hasAvg || anyStudent;
  }, [marksSummary, midComparison]);

  const highRiskCount = useMemo(
    () => students.filter((s) => s.risk?.level === "HIGH").length,
    [students]
  );

  const midBarData = useMemo(() => {
    if (!midComparison.length) return [];
    const scored = midComparison
      .map((r) => {
        const nums = [r.mid1, r.mid2].filter((x) => typeof x === "number");
        const worst = nums.length ? Math.min(...nums) : 999;
        return { ...r, _worst: worst };
      })
      .filter((r) => r.mid1 != null || r.mid2 != null);
    scored.sort((a, b) => a._worst - b._worst);
    if (midChartMode === "top5") {
      return scored.slice(0, 5).map(({ _worst, ...rest }) => rest);
    }
    return scored.map(({ _worst, ...rest }) => rest);
  }, [midComparison, midChartMode]);

  const avgAttendanceDisplay =
    attendanceSummary.average ?? attendanceSummary.overall_percentage ?? 0;
  const threshold = attendanceSummary.threshold ?? 75;

  if (loading) return <div className="p-10 text-center">Loading insights...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!insightsData || !predictions) return <div className="p-10 text-center">No insights available</div>;

  return (
    <div className="space-y-12 pb-16">

      <div>
        <h1 className="text-2xl font-semibold">Faculty decision support</h1>
        <p className="text-sm text-gray-500 mt-1">
          Clear signals, risks, and next actions — not just charts
        </p>
      </div>

      <div className="glass rounded-2xl px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-[44px] px-3 rounded-xl border bg-white"
              >
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name} ({s.year}-{s.section})
                  </option>
                ))}
              </select>
            </div>
          )}
          {subjects.length === 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Subject</label>
              <div className="h-[44px] px-3 rounded-xl border bg-gray-50 flex items-center text-sm text-gray-700">
                {subjects[0].subject_name} ({subjects[0].year}-{subjects[0].section})
              </div>
            </div>
          )}
          {subjects.length === 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Subject</label>
              <div className="h-[44px] px-3 rounded-xl border bg-gray-50 flex items-center text-sm text-gray-400">
                No subjects assigned
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-[44px] px-3 rounded-xl border bg-white"
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="semester">Semester</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryTile
          title="Attendance (cohort)"
          value={`${Number(avgAttendanceDisplay).toFixed(1)}%`}
          sub={
            avgAttendanceDisplay < threshold
              ? `Below ${threshold}% target`
              : `At or above ${threshold}% target`
          }
          danger={avgAttendanceDisplay < threshold}
        />
        <SummaryTile
          title="Avg Mid 2"
          value={
            hasMidMarksData
              ? `${(marksSummary.avg_mid2 ?? 0).toFixed(1)}`
              : "No data available"
          }
          sub={
            hasMidMarksData
              ? `Mid 1 avg ${(marksSummary.avg_mid1 ?? 0).toFixed(1)} · trend: ${midAnalysis.trend || "—"}`
              : "Upload or map Mid marks to unlock this KPI"
          }
          muted={!hasMidMarksData}
        />
        <SummaryTile
          title="High risk (model)"
          value={`${highRiskCount} high / ${students.length} student${students.length === 1 ? "" : "s"}`}
          sub={`Improved Mid 1→2: ${midAnalysis.improved ?? 0} · Declined: ${midAnalysis.declined ?? 0}`}
          danger={highRiskCount > 0}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Issues &amp; actions</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {insights.map((ins, index) => {
              const priority = (ins?.priority || ins?.severity || "low").toLowerCase();
              const tone =
                priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
              return (
                <DecisionInsightCard
                  key={`${index}-${ins?.title || "insight"}`}
                  tone={tone}
                  priority={priority}
                  title={ins?.title || "Insight"}
                  message={ins?.message || ""}
                  action={ins?.action || ""}
                />
              );
            })}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weakest subject</p>
              <p className="text-xl font-bold mt-1">{weakestSubject?.name || "—"}</p>
            </div>
            <div className="text-sm text-slate-300 space-y-2">
              <p className="font-medium text-slate-200">Reason</p>
              <ul className="list-disc pl-4 space-y-1">
                {(weakestSubject?.reason_lines?.length
                  ? weakestSubject.reason_lines
                  : [weakestSubject?.reason || "Not enough comparative data"]
                ).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
            {weakestSubject?.trend === "declining" && (
              <span className="text-xs font-bold text-red-400">Trend: declining in Mid 2</span>
            )}
          </aside>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recommended next steps</h3>
        <div className="glass rounded-2xl p-5 space-y-3">
          {recommendedActions.length > 0 ? (
            recommendedActions.map((a, idx) => (
              <div key={`${idx}-${a}`} className="text-sm text-slate-700 flex gap-2 items-start">
                <span className="text-emerald-600 font-bold leading-none">✔</span>
                <span className="leading-relaxed">{a}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">No actions suggested.</div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Attendance &amp; risks</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">⚠ {trendInsight || attendanceSummary.message}</p>
              <p className="mt-1 text-amber-800/90">
                Current: {Number(avgAttendanceDisplay).toFixed(1)}%
                {avgAttendanceDisplay < threshold ? " · Below safe level" : " · At or above safe level"}
                {trendSummary?.change_percent > 0 && trendSummary?.direction === "declining" && (
                  <span className="block mt-1">
                    Trend: down ~{trendSummary.change_percent}% vs start of window
                  </span>
                )}
              </p>
            </div>
            {attendanceAnnotation && (
              <p className="text-sm text-slate-600 flex gap-2">
                <span aria-hidden>👉</span>
                <span>{attendanceAnnotation}</span>
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-gray-500">Trend granularity</label>
              <select
                value={trendView}
                onChange={(e) => setTrendView(e.target.value)}
                className="h-[36px] px-3 rounded-xl border bg-white text-sm"
              >
                <option value="days">Last 7 bucketed days</option>
                <option value="weeks">Weekly</option>
                <option value="months">Monthly</option>
              </select>
            </div>
            {attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendanceTrend} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Attendance"]}
                  />
                  <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${threshold}%`, fill: "#64748b", fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Attendance"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-sm text-gray-400">No sufficient data for this chart</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Top risks (counts)</h4>
              {topRisks.length ? (
                <ul className="space-y-3">
                  {topRisks.map((r, i) => (
                    <li
                      key={`${r.type}-${i}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <p className="font-bold text-slate-900">{r.type}</p>
                      <p className="text-2xl font-extrabold text-red-600 mt-1">{r.count}</p>
                      <p className="text-xs text-slate-500 mt-1">{r.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No major risk buckets detected from current data.</p>
              )}
            </div>
            <div className="glass rounded-2xl p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-800 mb-2">Mid overview</p>
              <p>
                Improved: <strong>{midAnalysis.improved ?? 0}</strong> · Declined:{" "}
                <strong>{midAnalysis.declined ?? 0}</strong> · Stable:{" "}
                <strong>{midAnalysis.stable ?? 0}</strong>
              </p>
              <p className="mt-2">{midComparisonSummary}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold">Mid 1 vs Mid 2</h3>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
            <button
              type="button"
              className={`px-4 py-2 font-medium ${midChartMode === "top5" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              onClick={() => setMidChartMode("top5")}
            >
              Top 5 weakest
            </button>
            <button
              type="button"
              className={`px-4 py-2 font-medium ${midChartMode === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              onClick={() => setMidChartMode("all")}
            >
              All students
            </button>
          </div>
        </div>
        {midComparisonSummary && midChartMode === "all" && (
          <p className="text-sm text-gray-500">{midComparisonSummary}</p>
        )}
        <div className="glass rounded-2xl p-5 h-[340px]">
          {midBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={midBarData} margin={{ top: 10, right: 20, left: 0, bottom: midChartMode === "all" ? 48 : 24 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: midChartMode === "all" ? 9 : 11 }} interval={0} angle={midChartMode === "all" ? -35 : -12} textAnchor="end" height={midChartMode === "all" ? 70 : 56} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="mid1" fill="#10B981" name="Mid 1" />
                <Bar dataKey="mid2" fill="#6366f1" name="Mid 2" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              No Mid marks for this cohort yet
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Student roster (highest risk first)</h3>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-800">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Mid 1</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Mid 2</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Attendance</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Avg marks</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Risk</th>
                <th className="px-6 py-4 font-semibold text-slate-800 w-full">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-600">
              {students.map((student, i) => {
                const m1 = student.mid1;
                const m2 = student.mid2;
                const lowMid = (typeof m1 === "number" && m1 < 15) || (typeof m2 === "number" && m2 < 15);
                return (
                  <tr key={i} className={`hover:bg-slate-50 ${lowMid ? "bg-red-50/80" : ""}`}>
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className={`px-6 py-4 ${typeof m1 === "number" && m1 < 15 ? "text-red-700 font-bold" : ""}`}>
                      {m1 ?? "—"}
                    </td>
                    <td className={`px-6 py-4 ${typeof m2 === "number" && m2 < 15 ? "text-red-700 font-bold" : ""}`}>
                      {m2 ?? "—"}
                    </td>
                    <td className="px-6 py-4">{student.attendance}%</td>
                    <td className="px-6 py-4">{student.marks}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        student.risk?.level === "HIGH" ? "bg-red-100 text-red-700" :
                        student.risk?.level === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {student.risk?.level || "LOW"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {student.risk?.reasons?.join(", ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No students in this cohort</div>
          )}
        </div>
      </div>

    </div>
  );
}

function SummaryTile({ title, value, sub, danger, muted }) {
  return (
    <div className={`rounded-2xl border p-5 ${danger ? "border-red-200 bg-red-50/60" : muted ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`text-2xl font-extrabold mt-2 ${danger ? "text-red-700" : "text-slate-900"}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{sub}</p>
    </div>
  );
}

function DecisionInsightCard({ title, message, action, tone, priority }) {
  const border =
    tone === "danger"
      ? "border-red-300 bg-red-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-white";

  const badge =
    priority === "high"
      ? "🚨 Critical issue"
      : priority === "medium"
      ? "⚠ Important"
      : "ℹ Monitor";

  return (
    <div className={`rounded-2xl p-5 border-2 ${border} flex flex-col gap-3`}>
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">{badge}</span>
      <h4 className="font-bold text-base text-slate-900 leading-snug">{title}</h4>
      <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
      {action && (
        <div className="pt-2 border-t border-black/5">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Action</p>
          <p className="text-sm font-semibold text-slate-900">{action}</p>
        </div>
      )}
    </div>
  );
}
