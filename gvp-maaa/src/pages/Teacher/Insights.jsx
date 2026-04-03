import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from "recharts";
import api from "../../utils/api";

const COLORS = { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#EF4444" };

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

  // Load subjects assigned to the logged-in faculty
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

  // Load insights whenever subject or time range changes
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

  const predictions = insightsData?.predictions || null;
  const weakestSubject = insightsData?.weakest_subject || null;
  const insights = insightsData?.insights || [];
  const trendInsight = insightsData?.trendInsight || "";
  const recommendedActions = insightsData?.recommended_actions || [];
  const students = insightsData?.students || [];

  // Memoized Risk Distribution
  const riskDistribution = useMemo(() => {
    if (!students.length) return [];
    let low = 0, med = 0, high = 0;
    students.forEach(s => {
      const lvl = s.risk?.level || "LOW";
      if (lvl === "HIGH") high++;
      else if (lvl === "MEDIUM") med++;
      else low++;
    });
    return [
      { name: "LOW", value: low },
      { name: "MEDIUM", value: med },
      { name: "HIGH", value: high }
    ];
  }, [students]);

  // Attendance Trend (label/value pairs from backend)
  const attendanceTrend = useMemo(() => {
    if (!insightsData?.attendance_trend) return [];
    return insightsData.attendance_trend;
  }, [insightsData]);

  if (loading) return <div className="p-10 text-center">Loading insights...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!insightsData || !predictions) return <div className="p-10 text-center">No insights available</div>;

  return (
    <div className="space-y-12">

      {/* ================= PAGE HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Academic Insights</h1>
        <p className="text-sm text-gray-500">
          Patterns, risks, and trends derived from attendance, assignments, marks, and events
        </p>
      </div>

      {/* ================= CONTEXT FILTERS ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SUBJECT: only faculty-assigned subjects */}
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

          {/* TIME RANGE */}
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

      {/* ================= PREDICTION CARDS (NEW) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          tone="neutral"
          title="Expected Attendance" 
          text={`${predictions.expected_attendance.toFixed(1)}%`} 
          badge={predictions.confidence}
        />
        <InsightCard 
          tone="neutral"
          title="Expected Average Marks" 
          text={predictions.expected_avg_marks.toFixed(1)} 
          badge={predictions.confidence}
        />
        <InsightCard 
          tone="danger"
          title="Future At-Risk Students" 
          text={`${predictions.future_risk_students} Students`}
          badge={predictions.confidence} 
        />
      </div>

      {/* ================= KEY OBSERVATIONS & WEAKEST SUBJECT ================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Observations & Alerts</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {insights.length > 0 ? (
              insights.map((ins, index) => {
                const severity = ins?.severity || "low";
                const tone = severity === "high" ? "danger" : severity === "medium" ? "warning" : "neutral";
                const priority = severity === "high" ? "HIGH PRIORITY" : severity === "medium" ? "MEDIUM PRIORITY" : "LOW PRIORITY";
                return (
                  <InsightCard
                    key={`${index}-${ins?.title || "insight"}`}
                    tone={tone}
                    title={ins?.title || "Insight"}
                    text={ins?.message || ""}
                    action={ins?.action || ""}
                    priority={priority}
                  />
                );
              })
            ) : (
              <div className="text-sm text-gray-400 sm:col-span-2">
                No sufficient data available for selected filters
              </div>
            )}
          </div>
          
          <div className="col-span-1 rounded-2xl bg-slate-900 text-white p-5 flex flex-col justify-center items-center text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Weakest Subject</span>
            <span className="text-xl font-bold mt-2">{weakestSubject?.name || "None"}</span>
            <span className={`text-xs mt-1 font-bold ${weakestSubject?.trend === 'declining' ? 'text-red-400' : 'text-emerald-400'}`}>
               ({weakestSubject?.trend || "stable"})
            </span>
          </div>
        </div>
      </div>

      {/* ================= RECOMMENDED ACTIONS ================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recommended Actions</h3>
        <div className="glass rounded-2xl p-5 space-y-3">
          {recommendedActions.length > 0 ? (
            recommendedActions.map((a, idx) => (
              <div key={`${idx}-${a}`} className="text-sm text-slate-700 flex gap-2 items-start">
                <span className="text-emerald-600 font-bold leading-none">✔</span>
                <span className="leading-relaxed">{a}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">No recommended actions available for the selected filters.</div>
          )}
        </div>
      </div>

      {/* ================= CHARTS: RISK & TRENDS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Distribution & Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[360px]">
          
          <div className="glass rounded-2xl p-4 flex flex-col">
             <h4 className="text-sm font-semibold text-gray-500 mb-2 text-center">Student Risk Distribution</h4>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                   {riskDistribution.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="flex justify-center gap-4 text-xs font-semibold text-gray-500">
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div>LOW ({riskDistribution.find(d=>d.name==="LOW")?.value})</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-full"></div>MEDIUM ({riskDistribution.find(d=>d.name==="MEDIUM")?.value})</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div>HIGH ({riskDistribution.find(d=>d.name==="HIGH")?.value})</span>
             </div>
          </div>

          <div className="glass rounded-2xl p-4 flex flex-col">
            <h4 className="text-sm font-semibold text-gray-500 mb-2 text-center">Attendance Trend</h4>
            {trendInsight && (
              <p className="text-sm text-gray-500 mb-2 px-1">
                {trendInsight}
              </p>
            )}
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs text-gray-500 whitespace-nowrap">Trend View</label>
              <select
                value={trendView}
                onChange={(e) => setTrendView(e.target.value)}
                className="h-[36px] px-3 rounded-xl border bg-white text-sm"
              >
                <option value="days">Last 7 Days</option>
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
                    formatter={(value, name) =>
                      name === "actual"
                        ? [`Actual: ${value == null ? "—" : `${value}%`}`, "Actual"]
                        : [`Predicted: ${value == null ? "—" : `${value}%`}`, "Prediction"]
                    }
                  />
                  <ReferenceLine y={75} stroke="red" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    name="actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    dot={{ r: 3 }}
                    name="predicted"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="m-auto text-sm text-gray-400">No attendance data available for selected time range</div>
            )}
          </div>

        </div>
      </div>

      {/* ================= STUDENT RISK TABLE ================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Student Risk Table</h3>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-800">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Attendance</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Marks</th>
                <th className="px-6 py-4 font-semibold text-slate-800">Risk Level</th>
                <th className="px-6 py-4 font-semibold text-slate-800 w-full">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-600">
              {students.map((student, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
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
                     {student.risk?.reasons?.join(", ") || "No risks"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No student data mapped</div>}
        </div>
      </div>

    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function Filter({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] px-3 rounded-xl border bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function InsightCard({ title, text, tone, badge, action, priority }) {
  const color =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-700";

  const priorityColor =
    priority?.includes("HIGH")
      ? "bg-red-100 text-red-800"
      : priority?.includes("MEDIUM")
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";

  return (
    <div className={`rounded-2xl p-5 border flex flex-col justify-between items-start gap-4 ${color}`}>
      <div>
        <h4 className="font-bold text-sm text-slate-900">{title}</h4>
        <p className="text-xl font-extrabold mt-1">{text}</p>
        {action && (
          <p className="text-xs font-semibold text-slate-700 mt-2 leading-relaxed">
            Action: {action}
          </p>
        )}
      </div>
      {priority && (
        <span className={`text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-lg ${priorityColor}`}>
          {priority}
        </span>
      )}
      {badge && (
        <span className="bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-lg">
          {badge} Confidence
        </span>
      )}
    </div>
  );
}
