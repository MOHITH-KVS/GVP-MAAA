import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import api from "../../utils/api";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";

/**
 * Format percentage display - shows meaningful values only
 */
const formatPercent = (value) => {
  if (typeof value !== "number" || isNaN(value)) return "—";
  if (value === 0 && value !== 0.0) return "—"; // Exclude true 0
  return `${value.toFixed(1)}%`;
};

/**
 * Format marks display
 */
const formatMarks = (value) => {
  if (typeof value !== "number" || isNaN(value)) return "—";
  if (value === 0) return "—";
  return `${value.toFixed(1)}`;
};

/* ================= MAIN ================= */
export default function Insights() {
  /* CONTEXT FILTERS */
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [timeRange, setTimeRange] = useState("semester");
  const [trendView, setTrendView] = useState("days");

  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewedStudents, setReviewedStudents] = useState({});

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
  const alerts = insightsData?.alerts || [];
  const attendanceSummary = insightsData?.attendance_summary || {};
  const threshold = attendanceSummary.threshold ?? 75;
  const trendSummary = insightsData?.trend_summary || {};
  const attendanceAnnotation = insightsData?.attendance_chart_annotation || "";
  const midAnalysis = insightsData?.mid_analysis || {};
  const topRisks = insightsData?.top_risks || [];
  const marksSummary = insightsData?.marks_summary || {};
  const riskDistribution = insightsData?.risk_distribution || {};

  const attendanceTrend = useMemo(() => {
    if (!insightsData?.attendance_trend) return [];
    return insightsData.attendance_trend.map((row) => ({
      label: row.label,
      value: row.value ?? row.actual,
    }));
  }, [insightsData]);

  const attendanceForecastData = useMemo(() => {
    if (!attendanceTrend.length) return [];

    const base = attendanceTrend.map((point, idx) => ({
      key: `actual-${idx}`,
      label: point.label,
      actual: typeof point.value === "number" ? Number(point.value.toFixed(2)) : null,
      predicted: null,
      isFuture: false,
    }));

    // Keep chart focused on real values; future direction is shown as text for clarity.
    return base;
  }, [attendanceTrend]);

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

  const criticalScoreCount = useMemo(
    () =>
      students.filter((s) => {
        const score = Number(s?.risk_score ?? s?.risk?.risk_score ?? s?.risk?.score ?? 0);
        return Number.isFinite(score) && score >= 70;
      }).length,
    [students]
  );

  const mediumRiskCount = useMemo(
    () => students.filter((s) => s.risk?.level === "MEDIUM").length,
    [students]
  );

  const belowAttendanceThresholdCount = useMemo(
    () => students.filter((s) => typeof s?.attendance === "number" && s.attendance < threshold).length,
    [students, threshold]
  );

  const belowMarksThresholdCount = useMemo(
    () => students.filter((s) => {
      const m1 = s?.mid1;
      const m2 = s?.mid2;
      return (typeof m1 === "number" && m1 < 15) || (typeof m2 === "number" && m2 < 15);
    }).length,
    [students]
  );

  const normalizedAlerts = useMemo(() => {
    return alerts
      .map((alert, idx) => {
        const priority = String(alert?.priority || alert?.severity || "low").toLowerCase();
        return {
          id: `${idx}-${alert?.title || alert?.message || "alert"}`,
          priority,
          message: alert?.message || alert?.title || "Alert",
          action: String(alert?.action || "Review").replace(/_/g, " "),
          student_id: alert?.student_id ?? alert?.studentId ?? null,
        };
      })
      .filter((a) => a.priority === "high" || a.priority === "medium");
  }, [alerts]);

  const alertedStudentIds = useMemo(() => {
    const ids = new Set();
    normalizedAlerts.forEach((a) => {
      const id = Number(a?.student_id);
      if (Number.isFinite(id)) ids.add(id);
    });
    return ids;
  }, [normalizedAlerts]);

  const topRiskStudents = useMemo(() => {
    return (students || [])
      .filter((s) => {
        const lowAttendance = typeof s?.attendance === "number" && s.attendance < 75;
        const lowMid1 = typeof s?.mid1 === "number" && s.mid1 < 15;
        const lowMid2 = typeof s?.mid2 === "number" && s.mid2 < 15;
        const attendanceTrend = String(s?.attendance_trend_label || "").toLowerCase();
        const riskMovement = String(s?.risk_movement || "").toLowerCase();
        return lowAttendance || lowMid1 || lowMid2 || attendanceTrend.includes("declin") || riskMovement === "increasing";
      })
      .sort((a, b) => {
        const aAttendance = typeof a?.attendance === "number" ? a.attendance : 9999;
        const bAttendance = typeof b?.attendance === "number" ? b.attendance : 9999;
        return aAttendance - bAttendance;
      })
      .slice(0, 5);
  }, [students]);

  const noImmediateAttention = useMemo(() => {
    return (students || []).every((s) =>
      (typeof s?.attendance === "number" && s.attendance >= 75) &&
      (s?.mid1 == null || (typeof s.mid1 === "number" && s.mid1 >= 15)) &&
      (s?.mid2 == null || (typeof s.mid2 === "number" && s.mid2 >= 15))
    );
  }, [students]);

  const lowAttendanceCount = useMemo(() => {
    return students.filter((s) => typeof s?.attendance === "number" && s.attendance < threshold).length;
  }, [students, threshold]);

  const lowMidCount = useMemo(() => {
    return students.filter((s) => {
      const m1 = s?.mid1;
      const m2 = s?.mid2;
      return (typeof m1 === "number" && m1 < 15) || (typeof m2 === "number" && m2 < 15);
    }).length;
  }, [students]);

  const alertSummaryCards = useMemo(() => {
    const cards = [];
    if (lowAttendanceCount > 0) {
      cards.push({
        id: "att-low",
        priority: "high",
        message: `${lowAttendanceCount} students below ${threshold}% attendance`,
        action: "Take attendance intervention",
      });
    }
    if (lowMidCount > 0) {
      cards.push({
        id: "mid-low",
        priority: "medium",
        message: `${lowMidCount} students scored below 15`,
        action: "Arrange remedial support",
      });
    }
    return cards;
  }, [lowAttendanceCount, lowMidCount, threshold]);

  const mergedAlerts = useMemo(() => {
    const seenMessages = new Set();
    const merged = [];
    [...alertSummaryCards, ...normalizedAlerts].forEach((a) => {
      const key = (a.message || "").toLowerCase();
      if (!key || seenMessages.has(key)) return;
      seenMessages.add(key);
      merged.push(a);
    });
    return merged;
  }, [alertSummaryCards, normalizedAlerts]);

  const studentWiseMidData = useMemo(() => {
    return midComparison
      .filter((row) => row.mid1 != null || row.mid2 != null)
      .map((row) => ({
        name: row.name,
        mid1: row.mid1,
        mid2: row.mid2,
      }));
  }, [midComparison]);

  const showAverageMidChart = studentWiseMidData.length > 10;
  const avgMidChartData = useMemo(() => ([{
    name: "Class Average",
    mid1: Number(marksSummary.avg_mid1 ?? 0),
    mid2: Number(marksSummary.avg_mid2 ?? 0),
  }]), [marksSummary]);

  const riskDonutData = useMemo(() => ([
    { name: "High", value: Number(riskDistribution.high ?? 0), color: "#ef4444" },
    { name: "Medium", value: Number(riskDistribution.medium ?? 0), color: "#f59e0b" },
    { name: "Low", value: Number(riskDistribution.low ?? 0), color: "#10b981" },
  ]), [riskDistribution]);

  const avgAttendanceDisplay =
    attendanceSummary.average ?? attendanceSummary.overall_percentage ?? 0;

  const trendDirection = String(predictions?.trend_direction || trendSummary?.direction || "stable").toLowerCase();
  const trendDirectionMessage =
    trendDirection === "declining"
      ? "📉 Attendance is declining based on recent trend"
      : trendDirection === "improving"
      ? "📈 Attendance is improving based on recent trend"
      : "➡️ Attendance is stable based on recent trend";

  const confidenceText = `${String(predictions?.confidence || "LOW").toUpperCase()}${predictions?.confidence_reason ? ` (${predictions.confidence_reason})` : ""}`;

  const studentsByPriority = useMemo(() => {
    return [...students].sort((a, b) => {
      const as = Number(a?.risk_score ?? a?.risk?.risk_score ?? a?.risk?.score ?? 0);
      const bs = Number(b?.risk_score ?? b?.risk?.risk_score ?? b?.risk?.score ?? 0);
      const safeA = Number.isFinite(as) ? as : 0;
      const safeB = Number.isFinite(bs) ? bs : 0;
      if (safeB !== safeA) return safeB - safeA;
      return (a?.marks ?? 9999) - (b?.marks ?? 9999);
    });
  }, [students]);

  const primaryFocus = useMemo(() => {
    if (!Array.isArray(students) || students.length === 0) {
      return {
        icon: "ℹ️",
        title: "Primary Focus Unavailable",
        message: "Insufficient data to generate focus insights",
        action: "Upload attendance and marks data, then review this panel.",
        priority: "INFO",
        badgeClass: "bg-slate-100 text-slate-700",
        cardClass: "border-slate-200 bg-slate-50",
      };
    }

    const details = [];
    if (belowAttendanceThresholdCount > 0) {
      details.push(`${belowAttendanceThresholdCount} students below 75% attendance`);
    }
    if (belowMarksThresholdCount > 0) {
      details.push(`${belowMarksThresholdCount} students below marks threshold`);
    }

    if (highRiskCount > 0) {
      return {
        icon: "🚨",
        title: "Immediate Attention Required",
        message: `${criticalScoreCount} students at critical risk score (>=70).`,
        action: "Take immediate action: contact students, arrange support sessions.",
        priority: "HIGH",
        badgeClass: "bg-red-100 text-red-700",
        cardClass: "border-red-200 bg-red-50/60",
        details,
      };
    }

    if (highRiskCount === 0 && mediumRiskCount > 0) {
      return {
        icon: "⚠️",
        title: "Monitor At-Risk Students",
        message: `${mediumRiskCount} students are showing early warning signs.`,
        action: "Monitor trends and intervene early to prevent decline.",
        priority: "MEDIUM",
        badgeClass: "bg-amber-100 text-amber-700",
        cardClass: "border-amber-200 bg-amber-50/60",
        details,
      };
    }

    return {
      icon: "✅",
      title: "Stable Class Performance",
      message: "All students are currently within safe thresholds.",
      action: "Continue regular monitoring.",
      priority: "LOW",
      badgeClass: "bg-emerald-100 text-emerald-700",
      cardClass: "border-emerald-200 bg-emerald-50/60",
      details,
    };
  }, [students, highRiskCount, mediumRiskCount, belowAttendanceThresholdCount, belowMarksThresholdCount, criticalScoreCount]);

  /**
   * Generate crisis/intervention banner based on data
   * Returns { show: boolean, icon: string, message: string, severity: string }
   */
  const getCrisisBanner = useMemo(() => {
    const criticalCount = students.filter((s) => s.risk?.level === "HIGH").length;
    const attendanceDropped = trendSummary?.direction === "declining" && trendSummary?.change_percent > 0;
    const dropPercent = Math.abs(trendSummary?.change_percent ?? 0);
    
    // Determine severity and message
    let severity = "neutral";
    let message = "";
    
    if (criticalCount > 3 && avgAttendanceDisplay < threshold) {
      severity = "critical";
      message = `⚠️ ${criticalCount} students at risk. Average attendance is ${avgAttendanceDisplay.toFixed(0)}% (${threshold}% target). Immediate intervention required.`;
    } else if (criticalCount > 0 && attendanceDropped) {
      severity = "high";
      message = `⚠️ ${criticalCount} students at risk. Attendance dropped ${dropPercent.toFixed(0)}% in this window. Take action now.`;
    } else if (criticalCount > 0) {
      severity = "high";
      message = `⚠️ ${criticalScoreCount} students at critical risk score (>=70). Review reasons and plan interventions immediately.`;
    } else if (avgAttendanceDisplay < threshold || attendanceDropped) {
      severity = "medium";
      message = `📊 Class attendance is below target (${avgAttendanceDisplay.toFixed(0)}%). Monitor trends this week.`;
    }
    
    return {
      show: message.length > 0,
      severity,
      message
    };
  }, [students, avgAttendanceDisplay, threshold, trendSummary, criticalScoreCount]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <SkeletonBox className="h-6 w-56" />
          <SkeletonBox className="h-4 w-72 mt-2" />
          <SkeletonBox className="h-[260px] w-full mt-5 rounded-2xl" />
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <SkeletonBox className="h-6 w-48" />
          <div className="mt-5">
            <SkeletonTable rows={6} />
          </div>
        </div>
      </div>
    );
  }
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

      {/* CRISIS/INTERVENTION BANNER */}
      {getCrisisBanner.show && (
        <div
          className={`rounded-2xl border-l-4 px-6 py-4 ${
            getCrisisBanner.severity === "critical"
              ? "border-red-500 bg-red-50/80 text-red-900"
              : getCrisisBanner.severity === "high"
              ? "border-orange-500 bg-orange-50/80 text-orange-900"
              : "border-amber-500 bg-amber-50/80 text-amber-900"
          }`}
        >
          <p className="text-sm font-semibold leading-relaxed">{getCrisisBanner.message}</p>
        </div>
      )}

      <div className={`rounded-2xl border px-6 py-4 ${primaryFocus.cardClass}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">🎯 Primary Focus</p>
          <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase ${primaryFocus.badgeClass}`}>
            {primaryFocus.priority}
          </span>
        </div>
        <div className="mt-3">
          <p className="font-semibold text-slate-900">{primaryFocus.icon} {primaryFocus.title}</p>
          <p className="text-sm text-slate-700 mt-1">{primaryFocus.message}</p>
          {Array.isArray(primaryFocus.details) && primaryFocus.details.length > 0 && (
            <p className="text-xs text-slate-600 mt-2">{primaryFocus.details.join(", ")}.</p>
          )}
          <p className="text-sm font-medium text-slate-800 mt-3">Action: {primaryFocus.action}</p>
        </div>
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
          sub={`Confidence: ${confidenceText}`}
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
                  reason={ins?.reason || ""}
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
        <h3 className="text-lg font-semibold">Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mergedAlerts.length > 0 ? (
            mergedAlerts.map((alert) => {
              const level = String(alert?.priority || "low").toLowerCase();
              const high = level === "high";
              const medium = level === "medium";
              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 ${
                    high
                      ? "border-red-200 bg-red-50/70"
                      : medium
                      ? "border-amber-200 bg-amber-50/70"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">{alert.message}</p>
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap ${
                        high
                          ? "bg-red-100 text-red-700"
                          : medium
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {high ? "High" : medium ? "Medium" : "Low"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Action: {alert.action}</p>
                </div>
              );
            })
          ) : (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              No active alerts at the moment.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Top Risk Students</h3>
        <div className="glass rounded-2xl p-5">
          {topRiskStudents.length > 0 ? (
            <div className="space-y-3">
              {topRiskStudents.map((student, idx) => {
                const mid1 = student?.mid1;
                const mid2 = student?.mid2;
                const lowAttendance = typeof student?.attendance === "number" && student.attendance < 75;
                const lowMarks =
                  (typeof mid1 === "number" && mid1 < 15) ||
                  (typeof mid2 === "number" && mid2 < 15);
                const attendanceTrend = String(student?.attendance_trend_label || "").toLowerCase();
                const riskMovement = String(student?.risk_movement || "").toLowerCase();
                const isReviewed = Boolean(reviewedStudents[student.student_id]);

                const reasons = [];
                if (lowAttendance) reasons.push("Attendance below 75%");
                if (lowMarks) reasons.push("Mid marks below 15");
                if (attendanceTrend.includes("declin") || riskMovement === "increasing") reasons.push("Attendance declining");

                const actionLines = [];
                if (lowAttendance) actionLines.push("Monitor attendance daily");
                if (lowMarks) actionLines.push("Arrange extra class support");
                if (attendanceTrend.includes("declin") || riskMovement === "increasing") actionLines.push("Call student and discuss issues");
                if (actionLines.length === 0) actionLines.push("Check in with the student this week");

                const movementLabel =
                  riskMovement === "increasing"
                    ? "Declining"
                    : riskMovement === "decreasing"
                    ? "Improving"
                    : "Stable";

                const severityTone = lowAttendance ? "bg-red-50/80" : "bg-amber-50/80";
                const severityBadge = lowAttendance ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                const badgeLabel = lowAttendance ? "HIGH" : "MEDIUM";

                return (
                  <div
                    key={student.student_id}
                    className={`rounded-xl px-4 py-3 ${severityTone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">#{idx + 1}</p>
                        <p className="font-semibold text-slate-900 mt-1">{student.name}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap ${severityBadge}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                        <p className="mt-1 text-slate-800">{reasons.length > 0 ? reasons.join(" · ") : "Review needed"}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trend</p>
                        <p className="mt-1 text-slate-800">{movementLabel}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</p>
                        <ul className="mt-1 space-y-1 text-slate-800">
                          {actionLines.slice(0, 2).map((item, itemIndex) => (
                            <li key={itemIndex}>• {item}</li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReviewedStudents((current) => ({ ...current, [student.student_id]: !current[student.student_id] }))}
                        className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          isReviewed
                            ? "bg-slate-200 text-slate-700"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isReviewed ? "Reviewed" : "Mark as Reviewed"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-emerald-900">
              <p className="font-semibold">✅ No students require immediate attention</p>
            </div>
          )}
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
                {trendDirectionMessage}
              </p>
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
            {attendanceForecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendanceForecastData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const label = name === "predicted" ? "Predicted" : "Actual";
                      return [`${value}%`, `${label} attendance`];
                    }}
                  />
                  <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${threshold}%`, fill: "#64748b", fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="actual"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={{ r: 3 }}
                    name="predicted"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-sm text-gray-400">No sufficient data for this chart</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Risk distribution</h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDonutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {riskDonutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, `${name} risk`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                {riskDonutData.map((entry) => (
                  <div key={entry.name} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center">
                    <p className="font-semibold" style={{ color: entry.color }}>{entry.name}</p>
                    <p className="text-slate-700 font-bold">{entry.value}</p>
                  </div>
                ))}
              </div>
            </div>
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
          {showAverageMidChart && (
            <span className="text-xs text-slate-500">Student count is high, showing average comparison to reduce clutter.</span>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">📊 Performance Summary</p>
          <p className="text-sm text-slate-700 mt-1">
            Mid2 improved for {midAnalysis.improved ?? 0} out of {Math.max((midAnalysis.improved ?? 0) + (midAnalysis.declined ?? 0) + (midAnalysis.stable ?? 0), 1)} students
            {typeof midAnalysis.avg_mid1 === "number" && typeof midAnalysis.avg_mid2 === "number" && midAnalysis.avg_mid1 > 0
              ? ` (${(((midAnalysis.avg_mid2 - midAnalysis.avg_mid1) / midAnalysis.avg_mid1) * 100).toFixed(1)}% average change)`
              : ""}
          </p>
        </div>
        {midComparisonSummary && !showAverageMidChart && (
          <p className="text-sm text-gray-500">{midComparisonSummary}</p>
        )}
        <div className="glass rounded-2xl p-5 h-[340px]">
          {(showAverageMidChart ? avgMidChartData.length > 0 : studentWiseMidData.length > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={showAverageMidChart ? avgMidChartData : studentWiseMidData}
                margin={{ top: 10, right: 20, left: 0, bottom: showAverageMidChart ? 24 : 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: showAverageMidChart ? 12 : 9 }}
                  interval={0}
                  angle={showAverageMidChart ? 0 : -35}
                  textAnchor={showAverageMidChart ? "middle" : "end"}
                  height={showAverageMidChart ? 40 : 70}
                />
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
                <th className="px-6 py-4 font-semibold text-slate-800">Risk</th>
                <th className="px-6 py-4 font-semibold text-slate-800 w-full">Reasons</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-600">
              {studentsByPriority.map((student, i) => {
                const m1 = student.mid1;
                const m2 = student.mid2;
                const lowMid = (typeof m1 === "number" && m1 < 15) || (typeof m2 === "number" && m2 < 15);
                const attendanceDisplay = typeof student.attendance === "number" ? `${student.attendance.toFixed(1)}%` : "-";
                const reasonList = Array.isArray(student.risk?.reasons) ? student.risk.reasons : [];
                const actionText =
                  student.risk?.level === "HIGH"
                    ? "Immediate intervention"
                    : student.risk?.level === "MEDIUM"
                    ? "Mentor support"
                    : "Monitor";
                return (
                  <tr key={i} className={`hover:bg-slate-50 ${student.risk?.level === "HIGH" ? "bg-red-50/80" : lowMid ? "bg-amber-50/70" : ""}`}>
                    <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                    <td className={`px-6 py-4 ${typeof m1 === "number" && m1 < 15 ? "text-red-700 font-bold" : ""}`}>
                      {m1 ?? "-"}
                    </td>
                    <td className={`px-6 py-4 ${typeof m2 === "number" && m2 < 15 ? "text-red-700 font-bold" : ""}`}>
                      {m2 ?? "-"}
                    </td>
                    <td className="px-6 py-4">{attendanceDisplay}</td>
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
                      {reasonList.length ? reasonList.join(", ") : "-"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`px-2 py-1 rounded-lg font-semibold ${
                        student.risk?.level === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : student.risk?.level === "MEDIUM"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {actionText}
                      </span>
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

function DecisionInsightCard({ title, message, action, reason, tone, priority }) {
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
      {reason && (
        <div className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-3 py-1">
          <strong className="text-slate-700">Why:</strong> {reason}
        </div>
      )}
      {action && (
        <div className="pt-2 border-t border-black/5">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Action</p>
          <p className="text-sm font-semibold text-slate-900">{action}</p>
        </div>
      )}
    </div>
  );
}
