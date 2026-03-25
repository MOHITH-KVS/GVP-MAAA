import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import TrendsIcon from "@mui/icons-material/TrendingUp";
import GroupIcon from "@mui/icons-material/Group";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function Overview({ profile }) {
  const [subjects, setSubjects] = useState([]);
  const [year, setYear] = useState(1);
  const [section, setSection] = useState("A");
  const [subjectId, setSubjectId] = useState("");

  const [data, setData] = useState({
    class_stats: { current_class_students: 0, subject_name: "" },
    faculty_scope: { total_students: 0, total_subjects: 0 },
    kpis: { class_avg: 0, pass_rate: 0, topper: null, at_risk_count: 0 },
    metrics: { mid1: [], mid2: [], total: [], assignment: [] },
    attendance: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("total");
  const [riskType, setRiskType] = useState("marks"); // 'marks' | 'attendance'

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  // 1. Fetch subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("http://localhost:8000/faculty/my-subjects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
        }
        if (res.ok) {
          const json = await res.json();
          setSubjects(json);
          if (json.length > 0) {
            setYear(json[0].year);
            setSection(json[0].section);
            setSubjectId(json[0].subject_id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (token) fetchSubjects();
  }, [token]);

  const handleSubjectChange = (e) => {
    const selectedId = e.target.value;
    const subj = subjects.find(s => String(s.subject_id) === String(selectedId));
    if (subj) {
      setSubjectId(subj.subject_id);
      setYear(subj.year);
      setSection(subj.section);
    }
  };

  // 2. Fetch Dashboard Overview
  useEffect(() => {
    if (!subjectId) return;

    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:8000/faculty/overview?year=${year}&section=${section}&subject_id=${subjectId}`,
          { 
            method: "GET",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
        }
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);

        // Auto-select valid metric
        if (json.metrics?.total?.length > 0) setSelectedMetric("total");
        else if (json.metrics?.mid2?.length > 0) setSelectedMetric("mid2");
        else if (json.metrics?.mid1?.length > 0) setSelectedMetric("mid1");
        else if (json.metrics?.assignment?.length > 0) setSelectedMetric("assignment");

      } catch (err) {
        console.error("FETCH ERROR:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, [year, section, subjectId, token]);

  // Derived Top Performers
  const topPerformers = useMemo(() => {
    const arr = data.metrics[selectedMetric] || [];
    return [...arr].sort((a, b) => b.marks - a.marks).slice(0, 3);
  }, [data.metrics, selectedMetric]);

  const dynamicTopper = topPerformers.length > 0 ? topPerformers[0] : null;

  // Derived At Risk
  const atRiskList = useMemo(() => {
    if (riskType === "marks") {
      const arr = data.metrics[selectedMetric] || [];
      return arr.filter(s => s.marks < 15).sort((a,b) => a.marks - b.marks);
    } else {
      return data.attendance.filter(s => s.percentage < 75).sort((a,b) => a.percentage - b.percentage);
    }
  }, [data, riskType, selectedMetric]);

  // Derived Chart Distribution
  const distributionData = useMemo(() => {
    const arr = data.metrics[selectedMetric] || [];
    const dist = { "0-10": 0, "10-20": 0, "20-30": 0, "30-40": 0, "40+": 0 };
    arr.forEach(s => {
      const m = s.marks;
      if (m <= 10) dist["0-10"]++;
      else if (m <= 20) dist["10-20"]++;
      else if (m <= 30) dist["20-30"]++;
      else if (m <= 40) dist["30-40"]++;
      else dist["40+"]++;
    });
    return Object.keys(dist).map(key => ({ range: key, count: dist[key] }));
  }, [data.metrics, selectedMetric]);

  if (loading && subjects.length === 0) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-fadeIn text-gray-800 pb-10">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-extrabold mb-1 tracking-tight text-gray-900">
          Welcome, {user?.name || "Faculty"} 👋
        </h2>
        <p className="text-gray-500 text-sm font-medium">
          Here’s a quick overview of your class performance
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center font-semibold text-sm">
          {error}
        </div>
      )}

      {/* HERO CARD - CLASS TARGET & FACULTY SCOPE (FULL WIDTH) */}
      <div className="w-full bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 shadow-sm border border-indigo-100/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background decorative blob */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 right-40 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 w-full lg:w-auto">
          <label className="text-xs uppercase font-bold text-indigo-400 mb-2 block tracking-wider">
            Class Target
          </label>
          <select
            value={subjectId}
            onChange={handleSubjectChange}
            className="w-full lg:w-auto px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-50 text-gray-800 font-semibold shadow-sm cursor-pointer min-w-[280px] appearance-none"
            style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234F46E5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem top 50%", backgroundSize: "0.65rem auto" }}
          >
            {subjects.length === 0 && <option>Loading...</option>}
            {subjects.map((s) => (
              <option key={`${s.subject_id}-${s.section}`} value={s.subject_id}>
                {s.subject_name} ({s.year}-{s.section})
              </option>
            ))}
          </select>
        </div>

        <div className="relative z-10 flex flex-wrap justify-end gap-5 px-6 py-3 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 w-full lg:w-auto">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Subjects Teaching</p>
            <p className="text-xl font-extrabold text-indigo-900">{data.faculty_scope?.total_subjects || 0}</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Total Students</p>
            <p className="text-xl font-extrabold text-indigo-900">{data.faculty_scope?.total_students || 0}</p>
          </div>
          <div className="w-px bg-gray-200 hidden sm:block"></div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Active Class</p>
            <p className="text-sm font-extrabold text-indigo-900 line-clamp-1 truncate max-w-[150px]">{data.class_stats?.subject_name || "N/A"}</p>
            <p className="text-xs font-bold text-indigo-500">Year {year} • Section {section}</p>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <>
          {/* KPI CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              icon={<TrendsIcon />} 
              iconColor="text-blue-600" 
              bgGradient="from-blue-50/50 to-blue-50"
              title="Class Average" 
              value={`${data.kpis?.class_avg || 0}`} 
              subtext="Overall Marks" 
            />
            <KpiCard 
              icon={<CheckCircleIcon />} 
              iconColor="text-emerald-600" 
              bgGradient="from-emerald-50/50 to-emerald-50"
              title="Pass Rate" 
              value={`${data.kpis?.pass_rate || 0}%`} 
              subtext="Marks ≥ 12" 
            />
            <KpiCard 
              icon={<EmojiEventsIcon />} 
              iconColor="text-amber-500" 
              bgGradient="from-amber-50/50 to-amber-50"
              title="Top Performer" 
              value={dynamicTopper?.name || "N/A"} 
              subtext={dynamicTopper ? `${dynamicTopper.marks} marks` : "No data"} 
            />
            <KpiCard 
              icon={<ErrorOutlineIcon />} 
              iconColor="text-red-500" 
              bgGradient="from-red-50/50 to-red-50"
              title="At Risk Count" 
              value={data.kpis?.at_risk_count || 0} 
              subtext="Marks < 15" 
            />
          </div>

          {/* MAIN GRID: 70/30 SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            
            {/* LEFT 70% : ANALYTICS & CHARTS */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* FILTER TOGGLE ROW */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3">Metric Filter</span>
                <div className="flex gap-1 h-10 bg-gray-50/50 p-1 rounded-lg border border-gray-100">
                  {["assignment", "mid1", "mid2", "total"].map((metric) => (
                    <button
                      key={metric}
                      onClick={() => setSelectedMetric(metric)}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 capitalize ${
                        selectedMetric === metric
                          ? "bg-white text-indigo-600 shadow-sm border border-gray-200/60"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                      }`}
                    >
                      {metric === "mid1" ? "Mid-1" : metric === "mid2" ? "Mid-2" : metric}
                    </button>
                  ))}
                </div>
              </div>

              {/* DISTRIBUTION CHART */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[420px]">
                <h3 className="font-bold text-gray-800 text-lg mb-1">Marks Distribution</h3>
                <p className="text-sm font-medium text-gray-400 mb-6">Analyzing {selectedMetric} metric ranges</p>
                {data.metrics[selectedMetric]?.length === 0 ? (
                  <div className="m-auto text-gray-400 text-sm italic py-10">No data available for {selectedMetric}</div>
                ) : (
                  <div className="flex-1 min-h-0 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }} />
                        <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontWeight: 600 }} />
                        <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={1000} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 30% : RANKINGS & RISK */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* TOP PERFORMERS */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[215px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <EmojiEventsIcon className="text-amber-400" fontSize="small" />
                    Top Performers
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{selectedMetric}</span>
                </div>
                
                {topPerformers.length === 0 ? (
                  <p className="text-gray-400 text-sm m-auto pb-4">No ranking data.</p>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                    {topPerformers.map((st, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50/80 p-3 rounded-xl border border-gray-100 hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i===0?'bg-amber-100 text-amber-600':i===1?'bg-gray-200 text-gray-600':'bg-orange-100 text-orange-600'}`}>
                            #{i + 1}
                          </span>
                          <span className="font-semibold text-gray-700 text-sm truncate max-w-[100px]">{st.name}</span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">{st.marks}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AT RISK TOGGLER */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[260px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-red-600 text-lg">At-Risk</h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={()=>setRiskType('marks')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${riskType==='marks'?'bg-white text-red-600 shadow-sm':'text-gray-400'}`}>Marks</button>
                    <button onClick={()=>setRiskType('attendance')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${riskType==='attendance'?'bg-white text-orange-600 shadow-sm':'text-gray-400'}`}>Attnd</button>
                  </div>
                </div>

                {atRiskList.length === 0 ? (
                  <p className="text-gray-400 text-sm m-auto pb-4 text-center">No students flagged at risk for this metric.</p>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {atRiskList.map((st, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${riskType === 'marks' ? 'bg-red-50/40 border-red-100' : 'bg-orange-50/40 border-orange-100'}`}>
                        <span className="font-semibold text-gray-700 text-sm truncate max-w-[130px]">{st.name}</span>
                        <span className={`font-bold text-sm ${riskType === 'marks' ? 'text-red-600' : 'text-orange-600'}`}>
                          {riskType === 'marks' ? `${st.marks} marks` : `${st.percentage}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {atRiskList.length > 0 && <p className="text-xs text-gray-400 mt-3 text-center italic">{riskType==='marks'?`< 15 marks mapped from ${selectedMetric}`:'< 75% attendance overall'}</p>}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Subcomponent: Premium KPI Card
function KpiCard({ icon, iconColor, bgGradient, title, value, subtext }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col justify-between group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${bgGradient} ${iconColor} shadow-inner`}>
          {icon}
        </div>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Insight</span>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800 mb-1 tracking-tight truncate group-hover:text-indigo-600 transition-colors">{value}</p>
        <p className="text-xs font-semibold text-gray-400">{subtext}</p>
      </div>
    </div>
  );
}
