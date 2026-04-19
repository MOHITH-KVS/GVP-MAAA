import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../utils/api";

const RANGE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
];

const ROLE_FILTERS = [
  { value: "all", label: "All" },
  { value: "student", label: "Students" },
  { value: "teacher", label: "Teachers" },
];

function formatDuration(msValue) {
  const ms = Number(msValue || 0);
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0s";
  }

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${numeric.toFixed(1)}%`;
}

function formatTrendNumber(value, mode = "count") {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return "0";
  }

  if (mode === "duration") {
    return formatDuration(numeric);
  }

  return `${Math.round(numeric)}`;
}

function usageLevelFromPercent(percent) {
  const value = Number(percent || 0);
  if (value >= 25) {
    return "High usage";
  }
  if (value >= 12) {
    return "Moderate usage";
  }
  return "Low usage";
}

function engagementLabelFromMs(msValue) {
  const value = Number(msValue || 0);
  if (value <= 0) {
    return "No engagement";
  }
  if (value < 15000) {
    return "Low engagement";
  }
  return "Good engagement";
}

function trendBadge(trend, valueMode = "count") {
  if (!trend) {
    return null;
  }

  const tooltip = `Current: ${formatTrendNumber(trend.current, valueMode)} | Previous: ${formatTrendNumber(trend.previous, valueMode)}`;

  if (trend.direction === "up") {
    return <span title={tooltip} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">â†‘ {Math.abs(trend.delta_percent)}%</span>;
  }

  if (trend.direction === "down") {
    return <span title={tooltip} className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">â†“ {Math.abs(trend.delta_percent)}%</span>;
  }

  return <span title={tooltip} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">â€” 0%</span>;
}

function MetricCard({ title, value, subtitle, trend, trendValueMode = "count" }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {trendBadge(trend, trendValueMode)}
      </div>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
    </article>
  );
}

function RankedUsageList({ title, rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">#{index + 1}</p>
                <p className="truncate text-sm font-semibold text-slate-800">{row.label}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{formatPercent(row.percent)}</p>
                <p className="text-xs text-slate-500">Usage Share</p>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-700"
                style={{ width: `${Math.max(0, Math.min(100, Number(row.percent || 0)))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureUsageList({ rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Feature Usage</h3>
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Feature Usage</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{row.label}</p>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{formatPercent(row.percent)}</p>
                <p className="text-xs text-slate-500">Usage Share</p>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-indigo-600"
                style={{ width: `${Math.max(0, Math.min(100, Number(row.percent || 0)))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimeList({ rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Avg Time per Page</h3>
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Avg Time per Page</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">#{index + 1}</p>
              <p className="text-sm font-semibold text-slate-800">{row.label}</p>
              <p className="text-xs text-slate-500">{engagementLabelFromMs(row.avg_time_ms)}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatDuration(row.avg_time_ms)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DepartmentComparisonCard({ rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Department Activity Comparison</h3>
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  const highestUsage = Math.max(...rows.map((row) => Number(row.usage || 0)), 0);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Department Activity Comparison</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const usage = Number(row.usage || 0);
          const percent = Number(row.percent || 0);
          const width = highestUsage > 0 ? Math.max(0, Math.round((usage / highestUsage) * 100)) : 0;
          const label = usage <= 0 ? "No contribution" : usage === highestUsage ? "Top contribution" : "Some contribution";
          const barColor = usage <= 0 ? "bg-rose-500" : usage === highestUsage ? "bg-emerald-500" : "bg-amber-400";
          return (
            <div key={row.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold text-slate-800">{row.name}</p>
                <p className="text-xs font-medium text-slate-500">{label} ({percent.toFixed(1)}%)</p>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Analytics() {
  const [range, setRange] = useState("week");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const requestInFlightRef = useRef(false);

  const fetchData = useCallback(
    async (mode = "auto") => {
      // Avoid request pile-ups from rapid clicks or overlapping poll ticks.
      if (requestInFlightRef.current) {
        return;
      }
      requestInFlightRef.current = true;

      const isManualRefresh = mode === "manual";
      const isInitialLoad = mode === "initial";

      if (isManualRefresh) {
        setRefreshing(true);
      }
      if (isInitialLoad) {
        setLoading(true);
      }
      setError("");

      try {
        const response = await api.get("/api/analytics/dashboard", {
          params: { role, range },
        });
        setData(response.data || null);
      } catch (err) {
        console.error("Failed to fetch analytics dashboard", err);
        setError("Unable to load analytics right now. Please refresh.");
      } finally {
        setLoading(false);
        if (isManualRefresh) {
          setRefreshing(false);
        }
        requestInFlightRef.current = false;
      }
    },
    [role, range]
  );

  useEffect(() => {
    fetchData("initial");
  }, [fetchData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData("auto");
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchData]);

  const hasData = Boolean(data?.has_data);
  const emptyMessage = data?.empty_message || "No data yet. Start using the platform to generate insights.";

  const topPages = useMemo(() => {
    const rows = data?.page_usage?.top_pages || [];
    const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;
    return rows
      .slice(0, 5)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .map((item) => ({
        label: item.label,
        count: Number(item.count || 0),
        percent: (Number(item.count || 0) / total) * 100,
      }));
  }, [data]);

  const leastUsedPages = useMemo(() => {
    const rows = data?.page_usage?.least_used_pages || [];
    const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;
    return rows
      .slice(0, 5)
      .sort((a, b) => Number(a.count || 0) - Number(b.count || 0))
      .map((item) => ({
        label: item.label,
        count: Number(item.count || 0),
        percent: (Number(item.count || 0) / total) * 100,
      }));
  }, [data]);

  const avgTimePerPage = useMemo(() => {
    return (data?.engagement?.avg_time_per_page || [])
      .filter((item) => Number(item.avg_time_ms || 0) > 0)
      .sort((a, b) => Number(b.avg_time_ms || 0) - Number(a.avg_time_ms || 0))
      .slice(0, 3)
      .map((item) => ({
        label: item.label,
        avg_time_ms: Number(item.avg_time_ms || 0),
      }));
  }, [data]);

  const featureUsage = useMemo(() => {
    return (data?.engagement?.feature_usage || [])
      .slice(0, 5)
      .map((item) => ({
        label: item.feature,
        count: Number(item.count || 0),
        percent: Number(item.percent || 0),
      }));
  }, [data]);

  const needsAttention = useMemo(() => {
    const group = data?.insights?.least_active_group;
    if (!group?.label) {
      return null;
    }
    // Extract department info if it's a class label
    let displayLabel = group.label;
    let department = "";
    if (group.label.startsWith("Class:")) {
      const classInfo = group.label.substring(7); // Remove "Class: "
      department = group.department || "";
      displayLabel = department ? `${classInfo} (${department})` : classInfo;
    } else if (group.label.startsWith("Department:")) {
      displayLabel = group.label;
    }
    return {
      label: displayLabel,
      explanation: "Low engagement compared to other groups.",
    };
  }, [data]);

  const actionableInsight = useMemo(() => {
    if (!hasData) {
      return "Not enough insights yet";
    }
    return data?.insights?.actionable?.suggestion || "Not enough insights yet";
  }, [hasData, data]);

  const dropOffInsight = useMemo(() => {
    const drop = data?.insights?.drop_off;
    if (!drop?.message) {
      return "Not enough user journey data yet";
    }
    return drop.message;
  }, [data]);

  const topDepartmentName = useMemo(() => {
    const raw = String(data?.insights?.most_active_department?.name || "").trim();
    if (!raw || /^\d+$/.test(raw)) {
      return "No department data yet";
    }
    return raw;
  }, [data]);

  const mostActiveClassDepartmentName = useMemo(() => {
    const raw = String(data?.insights?.most_active_class?.department || "").trim();
    if (!raw) {
      return "N/A";
    }
    if (!/^\d+$/.test(raw)) {
      return raw;
    }
    const fallback = String(data?.insights?.most_active_department?.name || "").trim();
    if (fallback && !/^\d+$/.test(fallback)) {
      return fallback;
    }
    return raw;
  }, [data]);

  const departmentComparison = useMemo(() => {
    return data?.insights?.department_comparison || [];
  }, [data]);

  const hasValidationIssue = useMemo(() => {
    const validation = data?.validation;
    if (!validation) {
      return false;
    }
    return !(
      validation.page_visits_logged &&
      validation.session_ids_consistent &&
      validation.login_event_exists &&
      validation.role_department_stored
    );
  }, [data]);

  const validationWarning = useMemo(() => {
    const missingDepartmentCount = Number(data?.validation?.department_field_missing_count || 0);
    if (missingDepartmentCount > 0) {
      return "Department field is missing in activity logs. Fix data pipeline first.";
    }
    return "Tracking health warning: some required events or metadata are missing, so analytics may be incomplete.";
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Usage Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Real event-based platform activity and engagement.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {RANGE_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRange(item.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    range === item.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {ROLE_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRole(item.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    role === item.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchData("manual")}
              disabled={refreshing || loading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {hasData
            ? data.ai_summary
            : "Not enough data yet. Insights will appear as users interact."}
        </p>

        {hasData && hasValidationIssue ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {validationWarning}
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading analytics...</p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </section>
      ) : null}

      {!loading && !error && !hasData ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">{emptyMessage}</p>
        </section>
      ) : null}

      {!loading && !error && hasData ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={data.overview.total_users}
              trend={data.overview?.trends?.total_users || null}
            />
            <MetricCard
              title="Total Sessions"
              value={data.overview.total_sessions}
              trend={data.overview?.trends?.total_sessions || null}
            />
            <MetricCard
              title="Active Users (24h)"
              value={data.overview.active_users_24h}
              trend={data.overview?.trends?.active_users_24h || null}
            />
            <MetricCard
              title="Avg Session Time"
              value={formatDuration(data.overview.avg_session_time_ms)}
              trend={data.overview?.trends?.avg_session_time_ms || null}
              trendValueMode="duration"
            />
          </section>

          <DepartmentComparisonCard rows={departmentComparison} emptyMessage={emptyMessage} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedUsageList
              title="Top Pages"
              rows={topPages}
              emptyMessage={emptyMessage}
            />
            <RankedUsageList
              title="Least Used Pages"
              rows={leastUsedPages}
              emptyMessage={emptyMessage}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TimeList rows={avgTimePerPage} emptyMessage={emptyMessage} />
            <FeatureUsageList
              rows={featureUsage}
              emptyMessage={emptyMessage}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MetricCard
              title="Most Active Department"
              value={topDepartmentName}
              subtitle={
                data.insights.most_active_department
                  ? usageLevelFromPercent(data.insights.most_active_department.percent)
                  : "No department data yet"
              }
            />
            <MetricCard
              title="Most Active Class"
              value={
                data.insights.most_active_class
                  ? `${data.insights.most_active_class.label} (${mostActiveClassDepartmentName})`
                  : "-"
              }
              subtitle={
                data.insights.most_active_class
                  ? "High engagement"
                  : "No class data"
              }
            />
            <MetricCard
              title="Needs Attention"
              value={needsAttention?.label || "-"}
              subtitle={
                needsAttention
                  ? needsAttention.explanation
                  : "No group data"
              }
            />
          </section>

        </>
      ) : null}
    </div>
  );
}




