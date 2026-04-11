import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

/* ================= ADMIN INSIGHTS ================= */

export default function Insights() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState({});
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskSummary, setRiskSummary] = useState({});
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionToast, setActionToast] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [drilldownState, setDrilldownState] = useState({ open: false, title: "", students: [] });

  useEffect(() => {
    let isMounted = true;

    const fetchDepartments = async () => {
      try {
        const response = await api.get("/api/admin/departments");
        if (!isMounted) return;

        const values = Array.isArray(response.data)
          ? response.data
              .map((item) => String(item?.name || "").trim().toUpperCase())
              .filter(Boolean)
          : [];

        const unique = Array.from(new Set(values)).sort();
        setDepartments(unique);
        setDepartmentFilter((current) => (current === "ALL" || unique.includes(current) ? current : "ALL"));
      } catch (err) {
        console.error("Failed to load departments", err);
        if (isMounted) {
          setDepartments([]);
        }
      }
    };

    fetchDepartments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInsightsData = async ({ silent = false } = {}) => {
      if (!silent && isMounted) {
        setLoading(true);
      }

      try {
        const params = {};
        if (departmentFilter !== "ALL") {
          params.department = departmentFilter;
        }
        if (sectionFilter !== "ALL") {
          params.section = sectionFilter;
        }

        const [overviewRes, insightsRes, alertsRes, riskRes, studentsRes] = await Promise.all([
          api.get("/api/admin/overview", { params }),
          api.get("/api/admin/insights", { params }),
          api.get("/api/admin/alerts", { params }),
          api.get("/api/admin/risk-summary", { params }),
          api.get("/admin/students", { params }),
        ]);

        if (!isMounted) return;

        setOverview(overviewRes.data || {});
        setInsights(Array.isArray(insightsRes.data) ? insightsRes.data : []);
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
        setRiskSummary(riskRes.data || {});
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setLastUpdated(new Date());
        setError("");
      } catch (error) {
        console.error("Failed to load insights data", error);
        if (!isMounted) return;
        setError("Unable to load insights data right now. Please refresh.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInsightsData();
    const intervalId = setInterval(() => fetchInsightsData({ silent: true }), 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [departmentFilter, sectionFilter]);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => setActionToast(""), 2800);
    return () => clearTimeout(timer);
  }, [actionToast]);

  const handleAction = async (actionType) => {
    try {
      const endpoint =
        actionType === "assign_mentoring"
          ? "/api/admin/actions/assign-mentoring"
          : "/api/admin/actions/send-alerts";

      const response = await api.post(endpoint);
      setActionToast(response?.data?.message || "Action executed successfully.");
    } catch (err) {
      console.error("Admin action failed", err);
      setActionToast("Action failed. Please try again.");
    }
  };

  const openDrilldown = (title, list) => {
    setDrilldownState({
      open: true,
      title,
      students: Array.isArray(list) ? list : [],
    });
  };

  const closeDrilldown = () => {
    setDrilldownState({ open: false, title: "", students: [] });
  };

  const goToStudentList = (extra = {}) => {
    const params = new URLSearchParams();
    if (departmentFilter !== "ALL") params.set("department", departmentFilter);
    if (sectionFilter !== "ALL") params.set("section", sectionFilter);
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
    navigate(`/admin/students${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const highRiskStudents = Number(overview?.high_risk_students || 0);
  const departmentsAtRisk = Number(overview?.departments_at_risk || 0);
  const criticalAttendance = Number(overview?.critical_attendance || 0);
  const activeAlerts = Number(overview?.active_alerts || 0);
  const totalAtRisk = Number(riskSummary?.total_at_risk_students || highRiskStudents);

  const trendRiskUp = overview?.trend?.risk === "up";
  const trendAttendanceUp = overview?.trend?.attendance === "up";
  const trendLabel = trendRiskUp ? "Increasing" : "Decreasing";

  const topDepartment = (riskSummary?.top_departments || [])[0] || null;
  const topSubject = (riskSummary?.subject_wise_failure || [])[0] || null;

  const predictionInsights = insights.filter((item) => String(item?.type || "").toLowerCase() === "prediction");
  const causeInsights = insights.filter((item) => ["cause", "cluster"].includes(String(item?.type || "").toLowerCase()));
  const alertInsights = insights.filter((item) => ["alerts", "trend"].includes(String(item?.type || "").toLowerCase()));

  const heroInsight = causeInsights[0] || predictionInsights[0] || null;

  const impactLevel = totalAtRisk >= 50 ? "High" : totalAtRisk >= 20 ? "Medium" : "Low";
  const criticalCases = Math.max(criticalAttendance, activeAlerts);

  const atRiskStudentsList = useMemo(
    () => students.filter((s) => String(s?.risk || "").toLowerCase() !== "safe"),
    [students]
  );

  const criticalAttendanceStudentsList = useMemo(
    () => students.filter((s) => Number(s?.attendance || 0) < 75),
    [students]
  );

  const sectionOptions = useMemo(() => {
    const allSections = new Set();
    students.forEach((s) => {
      if (s?.section) allSections.add(String(s.section).toUpperCase());
    });
    return ["ALL", ...Array.from(allSections).sort()];
  }, [students]);

  const departmentOptions = useMemo(() => ["ALL", ...departments], [departments]);

  const heatmapModel = useMemo(() => {
    const rows = departmentOptions.filter((d) => d !== "ALL");
    const cols = sectionOptions.filter((s) => s !== "ALL");
    const matrix = rows.map((dept) => {
      const values = cols.map((sec) => {
        const bucket = students.filter((s) => s.department === dept && String(s.section || "").toUpperCase() === sec);
        const risky = bucket.filter((s) => String(s.risk || "").toLowerCase() !== "safe").length;
        const ratio = bucket.length > 0 ? risky / bucket.length : 0;
        return {
          section: sec,
          riskRatio: ratio,
          riskyCount: risky,
          total: bucket.length,
          students: bucket,
        };
      });
      return { department: dept, values };
    });
    return { rows: matrix, sections: cols };
  }, [departmentOptions, sectionOptions, students]);

  const seenAlerts = new Set();
  const cleanedAlerts = [];
  for (const alert of alerts) {
    const key = `${String(alert?.message || "").trim().toLowerCase()}-${String(alert?.severity || "").toLowerCase()}`;
    if (!key || seenAlerts.has(key)) continue;
    seenAlerts.add(key);
    cleanedAlerts.push(alert);
    if (cleanedAlerts.length >= 5) break;
  }

  const criticalBannerTone = highRiskStudents > 0 ? "danger" : "warning";

  return (
    <div className="space-y-12">
      {actionToast ? (
        <div className="toast success">{actionToast}</div>
      ) : null}

      {/* ================= PREMIUM HEADER ================= */}
      <div className="flex flex-col gap-4 p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Institutional Intelligence
          </h1>
          <p className="text-sm opacity-90 mt-2 max-w-3xl">
            Campus-wide academic insights that monitor performance, detect risks,
            and support strategic administrative decisions.
          </p>
          <p className="text-xs mt-3 opacity-80">
            Intelligence mode active • Risk trend {trendLabel}
          </p>
        </div>

        <div className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm text-white/95">
          <p className="font-medium">Live Monitoring Active</p>
          <p className="text-xs mt-1 opacity-90">Last Updated: {formatDate(lastUpdated)}</p>
        </div>
      </div>

      <CriticalBanner
        tone={criticalBannerTone}
        message={
          highRiskStudents > 0
            ? `${highRiskStudents} students are at high risk - immediate action required`
            : "No students are in high-risk status now, but continuous monitoring is active"
        }
        subtext={
          highRiskStudents > 0
            ? `Primary concern is concentrated in ${departmentsAtRisk || 0} departments with ${criticalAttendance || 0} attendance-critical cases.`
            : `Stay alert: ${activeAlerts} active alerts still need review.`
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading insights data...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <FilterBar
        departments={departmentOptions}
        sections={sectionOptions}
        department={departmentFilter}
        section={sectionFilter}
        onDepartmentChange={setDepartmentFilter}
        onSectionChange={setSectionFilter}
      />

      {/* ================= KPI SNAPSHOT ================= */}
      <Section title="Campus Health Snapshot">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPI
            label="High-Risk Students"
            value={highRiskStudents}
            trend={trendRiskUp ? "up" : "down"}
            context="Main institutional risk load"
            danger
            critical
            onClick={() => openDrilldown("High-Risk Students", atRiskStudentsList)}
          />
          <KPI
            label="Departments At Risk"
            value={departmentsAtRisk}
            trend={trendRiskUp ? "up" : "down"}
            context="Risk concentration spread"
            onClick={() => goToStudentList()}
          />
          <KPI
            label="Critical Attendance"
            value={criticalAttendance}
            trend={trendAttendanceUp ? "up" : "down"}
            context="Students below safe attendance"
            warning
            onClick={() => openDrilldown("Critical Attendance Students", criticalAttendanceStudentsList)}
          />
          <KPI
            label="Active Alerts"
            value={activeAlerts}
            trend={activeAlerts > 0 ? "up" : "down"}
            context="Immediate cases in alert queue"
            warning
            onClick={() => goToStudentList()}
          />
        </div>
      </Section>

      {/* ================= HERO INSIGHT ================= */}
      <Section title="Primary Decision Insight">
        <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Biggest Problem</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {heroInsight?.message || "No dominant risk signal available for the selected filter."}
          </p>
          <p className="mt-3 text-sm text-slate-700">
            This is currently the strongest risk driver. If unresolved, next-cycle at-risk load is likely to increase.
          </p>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricPill label="Impact Level" value={impactLevel} />
            <MetricPill label="Affected Students" value={totalAtRisk} />
            <MetricPill label="Confidence" value={heroInsight?.confidence || "low"} />
          </div>
        </div>
      </Section>

      {/* ================= INSIGHTS PANEL ================= */}
      <Section title="What Happens Next and Why">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <InsightGroup
            title="Predictions"
            items={predictionInsights}
            tone="blue"
            emptyText="No predictive signals yet."
            onItemClick={() => openDrilldown("Predicted At-Risk Cohort", atRiskStudentsList)}
          />
          <InsightGroup
            title="Causes"
            items={causeInsights}
            tone="amber"
            emptyText="No dominant cause identified."
            onItemClick={() => openDrilldown("Cause-Linked Students", atRiskStudentsList)}
          />
          <InsightGroup
            title="Alerts"
            items={alertInsights}
            tone="red"
            emptyText="No urgent alert patterns detected."
            onItemClick={() => openDrilldown("Students Requiring Alert Follow-up", criticalAttendanceStudentsList)}
          />
        </div>
      </Section>

      <Section title="Risk Heatmap by Department and Section">
        <Heatmap
          model={heatmapModel}
          onCellClick={(department, section, cell) => {
            if (!cell.total) return;
            openDrilldown(`${department} - Section ${section}`, cell.students);
          }}
        />
      </Section>

      {/* ================= RISK SUMMARY ================= */}
      <Section title="Risk Concentration Summary">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border bg-white p-5 lg:col-span-1">
            <p className="text-sm text-slate-500">Total At-Risk Students</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">{totalAtRisk}</p>
            <p className="mt-2 text-xs text-slate-500">Current institutional exposure level</p>
          </div>

          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Top Department Risk</p>
            {topDepartment ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-red-900">{topDepartment.department}</p>
                <p className="mt-1 text-sm text-red-800">{topDepartment.at_risk_students} students at risk</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-red-700">No dominant department detected.</p>
            )}
          </div>

          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Top Subject Failure</p>
            {topSubject ? (
              <>
                <p className="mt-2 text-2xl font-semibold text-amber-900">{topSubject.subject_name}</p>
                <p className="mt-1 text-sm text-amber-800">{topSubject.failure_count} failures reported</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-amber-700">No subject failure hotspot found.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ================= ADMIN ACTIONS ================= */}
      <Section title="Action Center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <button
            onClick={() => handleAction("assign_mentoring")}
            className="rounded-2xl bg-slate-900 px-5 py-4 text-left text-white transition hover:bg-slate-800"
            type="button"
          >
            <p className="text-sm font-semibold">Assign mentoring to {Math.max(totalAtRisk, highRiskStudents)} students</p>
            <p className="mt-1 text-xs text-slate-300">Intervene on highest-risk students first</p>
          </button>
          <button
            onClick={() => handleAction("send_alerts")}
            className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-left text-amber-900 transition hover:bg-amber-100"
            type="button"
          >
            <p className="text-sm font-semibold">Send alerts to {criticalCases} critical cases</p>
            <p className="mt-1 text-xs text-amber-700">Prioritize attendance-critical and active-alert students</p>
          </button>
        </div>
      </Section>

      {/* ================= ALERT ANALYTICS ================= */}
      <Section title="Latest Alerts (Top 5, Grouped by Severity)">
        <div className="space-y-4">
          {cleanedAlerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No alerts to show.
            </div>
          ) : (
            ["high", "medium", "low"].map((severity) => {
              const bucket = cleanedAlerts.filter(
                (a) => String(a?.severity || "low").toLowerCase() === severity
              );
              if (bucket.length === 0) return null;
              return (
                <div key={severity} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{severity} Severity</p>
                  {bucket.map((alert, idx) => (
                    <div key={`${alert.id || idx}-${alert.message}`} className="flex items-start justify-between gap-4 rounded-2xl border bg-white p-4">
                      <div>
                        <p className="text-slate-800 font-medium">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(alert.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass(alert.severity)}`}>
                          {alert.severity || "low"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAction("send_alerts")}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </Section>

      <DrilldownModal
        open={drilldownState.open}
        title={drilldownState.title}
        students={drilldownState.students}
        onClose={closeDrilldown}
        onViewAll={() => goToStudentList()}
      />

    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function KPI({ label, value, trend, context, danger, warning, critical, onClick }) {
  const trendArrow = trend === "up" ? "↑" : "↓";
  const trendColor = trend === "up" ? "text-red-600" : "text-emerald-600";

  return (
    <button
      className={`p-5 rounded-2xl border bg-white
      ${danger ? "border-red-300 bg-red-50" : ""}
      ${warning ? "border-amber-300 bg-amber-50" : ""}
      ${critical ? "ring-2 ring-red-300" : ""}
      ${onClick ? "cursor-pointer text-left transition hover:shadow-sm" : "text-left"}`}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`text-sm font-semibold ${trendColor}`}>{trendArrow}</span>
      </div>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{context}</p>
    </button>
  );
}

function CriticalBanner({ message, subtext, tone = "warning" }) {
  const styles = tone === "danger"
    ? "border-red-300 bg-red-50 text-red-800"
    : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-sm font-semibold uppercase tracking-wide">Critical Alert</p>
      <p className="mt-1 text-lg font-semibold">{message}</p>
      <p className="mt-1 text-sm opacity-90">{subtext}</p>
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InsightGroup({ title, items, tone, emptyText, onItemClick }) {
  const toneStyles = {
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneStyles[tone] || "border-slate-200 bg-slate-50"}`}>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">{emptyText}</p>
        ) : (
          items.map((item, index) => (
            <button
              key={`${title}-${index}`}
              className="w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-left transition hover:shadow-sm"
              type="button"
              onClick={onItemClick}
            >
              <p className="text-sm font-medium text-slate-800">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500">Confidence: {item.confidence || "medium"}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FilterBar({
  departments,
  sections,
  department,
  section,
  onDepartmentChange,
  onSectionChange,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Department</label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          >
            {departments.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Section</label>
          <select
            value={section}
            onChange={(e) => onSectionChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          >
            {sections.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Heatmap({ model, onCellClick }) {
  const hasData = model.rows.length > 0 && model.sections.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-sm text-slate-600">
        No heatmap data available for current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
            {model.sections.map((sec) => (
              <th key={sec} className="px-3 py-3 text-center font-semibold text-slate-700">{sec}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => (
            <tr key={row.department} className="border-t">
              <td className="px-4 py-3 font-medium text-slate-800">{row.department}</td>
              {row.values.map((cell) => (
                <td key={`${row.department}-${cell.section}`} className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onCellClick(row.department, cell.section, cell)}
                    className={`w-full rounded-lg px-2 py-2 text-xs font-semibold ${heatCellClass(cell.riskRatio)} ${cell.total ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                    disabled={!cell.total}
                    title={cell.total ? `${cell.riskyCount}/${cell.total} at risk` : "No students"}
                  >
                    {cell.total ? `${cell.riskyCount}/${cell.total}` : "-"}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrilldownModal({ open, title, students, onClose, onViewAll }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1 text-sm text-slate-700">Close</button>
        </div>
        <div className="max-h-[50vh] overflow-auto p-5">
          {students.length === 0 ? (
            <p className="text-sm text-slate-600">No students found for this view.</p>
          ) : (
            <div className="space-y-2">
              {students.slice(0, 40).map((student) => (
                <div key={student.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.department} • Section {student.section} • Roll {student.roll || "-"}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-slate-700">Attendance: {student.attendance}%</p>
                    <p className="text-slate-700">CGPA: {student.cgpa}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button type="button" onClick={onViewAll} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            Open Student List
          </button>
        </div>
      </div>
    </div>
  );
}

function severityClass(severity) {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "high") {
    return "bg-red-100 text-red-700";
  }
  if (normalized === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function heatCellClass(ratio) {
  if (ratio >= 0.7) return "bg-red-200 text-red-800";
  if (ratio >= 0.4) return "bg-amber-200 text-amber-800";
  if (ratio > 0) return "bg-emerald-200 text-emerald-800";
  return "bg-slate-100 text-slate-500";
}
