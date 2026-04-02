import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "../../utils/api";

const COLORS = { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#EF4444" };

/* ================= MAIN ================= */
export default function Insights() {
  /* CONTEXT FILTERS */
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("All");
  const [subject, setSubject] = useState("All");
  const [range, setRange] = useState("Semester");

  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/faculty/insights-data");
        setInsightsData(res.data);
      } catch (err) {
        setError("Failed to load insights.");
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const predictions = insightsData?.predictions || null;
  const weakestSubject = insightsData?.weakest_subject || null;
  const students = insightsData?.students || [];
  const attendanceSummary = insightsData?.attendance_summary || null;

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

  // Attendance Trend (Using Subject wise breakdown for percentages over time surrogate)
  const attendanceTrend = useMemo(() => {
    if (!attendanceSummary?.by_subject) return [];
    return attendanceSummary.by_subject.map((subj) => ({
      name: subj.subject_name.substring(0,6),
      percentage: subj.percentage || 0
    }));
  }, [attendanceSummary]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Filter label="Year" value={year} onChange={setYear}
            options={["3rd Year", "4th Year"]} />
          <Filter label="Section" value={section} onChange={setSection}
            options={["All", "A", "B"]} />
          <Filter label="Subject" value={subject} onChange={setSubject}
            options={["All", "DBMS", "OS", "CN"]} />
          <Filter label="Time Range" value={range} onChange={setRange}
            options={["Last 30 Days", "Semester", "Academic Year"]} />
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
             {predictions.expected_attendance < 75 && (
                <InsightCard tone="warning" title="Attendance Decline" text="Attendance is expected to decline globally below safe thresholds." />
             )}
             {predictions.future_risk_students > 0 && (
                <InsightCard tone="danger" title="Risk Alert" text="Students nearing risk passing thresholds increasing." />
             )}
             {weakestSubject?.trend === "declining" && (
                <InsightCard tone="danger" title="Subject Flagged" text={`Performance declining steeply in ${weakestSubject.name}`} />
             )}
              {predictions.expected_attendance >= 75 && predictions.future_risk_students === 0 && weakestSubject?.trend !== "declining" && (
                <InsightCard tone="neutral" title="Stable Operation" text="No immediate warnings or severe alerts detected." />
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

      {/* ================= CHARTS: RISK & TRENDS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Distribution & Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
          
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
            <h4 className="text-sm font-semibold text-gray-500 mb-2 text-center">Attendance Trend by Subject</h4>
            {attendanceTrend.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={attendanceTrend} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} />
                   <YAxis hide domain={[0, 100]} />
                   <Tooltip />
                   <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                 </LineChart>
               </ResponsiveContainer>
            ) : ( <div className="m-auto text-sm text-gray-400">No timeline data</div> )}
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

function InsightCard({ title, text, tone, badge }) {
  const color =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl p-5 border flex flex-col justify-between items-start gap-4 ${color}`}>
      <div>
        <h4 className="font-bold text-sm text-slate-900">{title}</h4>
        <p className="text-xl font-extrabold mt-1">{text}</p>
      </div>
      {badge && (
        <span className="bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-lg">
          {badge} Confidence
        </span>
      )}
    </div>
  );
}
