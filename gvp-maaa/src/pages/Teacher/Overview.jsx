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
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";
import SkeletonProfile from "../../components/skeletons/SkeletonProfile";

export default function Overview({ profile, alerts = [] }) {
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [year, setYear] = useState(1);
  const [section, setSection] = useState("A");
  const [subjectId, setSubjectId] = useState("");

  const [data, setData] = useState({
    class_stats: { current_class_students: 0, subject_name: "" },
    faculty_scope: { total_students: 0, total_subjects: 0 },
    kpis: { class_avg: 0, pass_rate: 0, topper: null, at_risk_count: 0 },
    metrics: { mid1: [], mid2: [], total: [], assignment: [] },
    attendance: [],
    marks_risk_students: [],
    attendance_risk_students: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("total");
  const [riskType, setRiskType] = useState("marks"); // 'marks' | 'attendance'

  const token = localStorage.getItem("access_token");
  const user = JSON.parse(localStorage.getItem("user"));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

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
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [overviewRes, assignmentsRes] = await Promise.all([
          fetch(
            `http://localhost:8000/faculty/overview?year=${year}&section=${section}&subject_id=${subjectId}`,
            {
              method: "GET",
              headers,
            }
          ),
          fetch(
            `http://localhost:8000/teacher/assignments/${year}/${section}`,
            {
              method: "GET",
              headers,
            }
          ),
        ]);

        if (overviewRes.status === 401 || assignmentsRes.status === 401) {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
        }

        if (!overviewRes.ok) throw new Error("Failed to fetch data");

        const json = await overviewRes.json();
        setData(json);

        const assignmentsJson = assignmentsRes.ok ? await assignmentsRes.json() : {};
        setTeacherAssignments(Array.isArray(assignmentsJson?.assignments) ? assignmentsJson.assignments : []);

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
      return data.marks_risk_students || [];
    } else {
      return data.attendance_risk_students || [];
    }
  }, [data, riskType]);

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

  const alertCount = Array.isArray(alerts) ? alerts.filter((alert) => alert && !alert.is_read).length : 0;
  const pendingAssignments = Array.isArray(teacherAssignments)
    ? teacherAssignments.reduce((total, assignment) => total + Number(assignment?.pending || 0), 0)
    : 0;
  const welcomeName = profile?.name || user?.name || "Faculty";
  const welcomeSummaryParts = [];
  if (alertCount > 0) {
    welcomeSummaryParts.push(`${alertCount} alert${alertCount === 1 ? "" : "s"}`);
  }
  welcomeSummaryParts.push(`${pendingAssignments} pending task${pendingAssignments === 1 ? "" : "s"}`);
  const welcomeSummaryText =
    alertCount === 0 && pendingAssignments === 0
      ? "You're all caught up"
      : `You have ${welcomeSummaryParts.join(" and ")}`;

  if (loading && subjects.length === 0) {
    return <TeacherOverviewSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fadeIn text-gray-800 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-gray-900">
          {getGreeting()}, {welcomeName} 👋
        </h1>
        <p className="text-gray-500 text-sm font-medium">
          {welcomeSummaryText}
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center font-semibold text-sm">
          {error}
        </div>
      )}

      {/* HERO CARD - CLASS TARGET & FACULTY SCOPE (FULL WIDTH) */}
      <div className="w-full glass rounded-2xl p-6 border-white/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden hover:shadow-2xl transition-all duration-500">
        {/* Background decorative blob with enhanced glassmorphism */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none opacity-60"></div>
        <div className="absolute -bottom-10 right-40 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl pointer-events-none opacity-60"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-blue-50/40 pointer-events-none"></div>

        <div className="relative z-10 w-full lg:w-auto">
          <label className="text-xs uppercase font-bold text-indigo-400 mb-2 block tracking-wider">
            Class Target
          </label>
          <select
            value={subjectId}
            onChange={handleSubjectChange}
            className="w-full lg:w-auto px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 text-gray-800 font-semibold shadow-md cursor-pointer min-w-[280px] appearance-none hover:bg-white/80 transition-all"
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

        <div className="relative z-10 flex flex-wrap justify-end gap-5 px-6 py-3 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 w-full lg:w-auto hover:bg-white/70 transition-all">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Subjects Teaching</p>
            <p className="text-xl font-extrabold text-indigo-900">{data.faculty_scope?.total_subjects || 0}</p>
          </div>
          <div className="w-px bg-gray-200/50"></div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Total Students</p>
            <p className="text-xl font-extrabold text-indigo-900">{data.faculty_scope?.total_students || 0}</p>
          </div>
          <div className="w-px bg-gray-200/50 hidden sm:block"></div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">Active Class</p>
            <p className="text-sm font-extrabold text-indigo-900 line-clamp-1 truncate max-w-[150px]">{data.class_stats?.subject_name || "N/A"}</p>
            <p className="text-xs font-bold text-indigo-500">Year {year} • Section {section}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <TeacherOverviewSkeletonContent />
      ) : !error && (
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
              <div className="glass rounded-xl p-2 flex flex-wrap gap-2 items-center hover:shadow-lg transition-all duration-300">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3">Metric Filter</span>
                <div className="flex gap-1 h-10 bg-white/40 p-1 rounded-lg border border-white/50 backdrop-blur-sm">
                  {["assignment", "mid1", "mid2", "total"].map((metric) => (
                    <button
                      key={metric}
                      onClick={() => setSelectedMetric(metric)}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 capitalize ${
                        selectedMetric === metric
                          ? "bg-white text-indigo-600 shadow-md border border-white/70 backdrop-blur-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
                      }`}
                    >
                      {metric === "mid1" ? "Mid-1" : metric === "mid2" ? "Mid-2" : metric}
                    </button>
                  ))}
                </div>
              </div>

              {/* DISTRIBUTION CHART */}
              <div className="glass rounded-2xl p-6 flex flex-col h-[420px] hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                {/* Gradient overlay background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/5 via-transparent to-indigo-100/5 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h3 className="font-bold text-gray-800 text-lg mb-1">Marks Distribution</h3>
                  <p className="text-sm font-medium text-gray-400 mb-6">Analyzing {selectedMetric} metric ranges</p>
                </div>
                {data.metrics[selectedMetric]?.length === 0 ? (
                  <div className="m-auto text-gray-400 text-sm italic py-10 relative z-10">No data available for {selectedMetric}</div>
                ) : (
                  <div className="flex-1 min-h-0 w-full mt-2 relative z-10">
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
              <div className="glass rounded-2xl p-6 h-[215px] flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/5 via-transparent to-amber-100/5 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <EmojiEventsIcon className="text-amber-400" fontSize="small" />
                    Top Performers
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100/60 text-gray-500 capitalize backdrop-blur-sm">{selectedMetric}</span>
                </div>
                
                {topPerformers.length === 0 ? (
                  <p className="text-gray-400 text-sm m-auto pb-4 relative z-10">No ranking data.</p>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 relative z-10">
                    {topPerformers.map((st, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/50 hover:bg-white/60 hover:border-amber-200/50 transition-all backdrop-blur-sm">
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
              <div className="glass rounded-2xl p-6 h-[260px] flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-100/5 via-transparent to-orange-100/5 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <h3 className="font-bold text-red-600 text-lg">At-Risk</h3>
                  <div className="flex bg-white/50 p-1 rounded-lg border border-white/50 backdrop-blur-sm">
                    <button onClick={()=>setRiskType('marks')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${riskType==='marks'?'bg-white/80 text-red-600 shadow-sm border border-white/50':'text-gray-400'}`}>Marks</button>
                    <button onClick={()=>setRiskType('attendance')} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${riskType==='attendance'?'bg-white/80 text-orange-600 shadow-sm border border-white/50':'text-gray-400'}`}>Attnd</button>
                  </div>
                </div>

                {atRiskList.length === 0 ? (
                  <p className="text-gray-400 text-sm m-auto pb-4 text-center relative z-10">No students flagged at risk for this metric.</p>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {atRiskList.map((st, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-xl border backdrop-blur-sm transition-all ${riskType === 'marks' ? 'bg-red-100/30 border-red-200/50 hover:bg-red-100/50 hover:border-red-300/50' : 'bg-orange-100/30 border-orange-200/50 hover:bg-orange-100/50 hover:border-orange-300/50'}`}>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-semibold text-gray-700 text-sm truncate max-w-[130px]">{st.name}</span>
                          {riskType === 'marks' && st.exam && (
                            <span className="text-xs text-gray-500 truncate">{st.exam}</span>
                          )}
                        </div>
                        <span className={`font-bold text-sm ml-2 whitespace-nowrap ${riskType === 'marks' ? 'text-red-600' : 'text-orange-600'}`}>
                          {riskType === 'marks' ? `${st.value} pts` : `${st.value}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {atRiskList.length > 0 && <p className="text-xs text-gray-400 mt-3 text-center italic relative z-10">{riskType==='marks'?`< 15 marks` :'< 75% attendance'}</p>}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TeacherOverviewSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <SkeletonBox className="h-10 w-72" />
        <SkeletonBox className="h-4 w-80 mt-2" />
      </div>
      <TeacherOverviewSkeletonContent />
    </div>
  );
}

function TeacherOverviewSkeletonContent() {
  return (
    <>
      <div className="w-full glass rounded-2xl p-6 border-white/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div>
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-12 w-full mt-3 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SkeletonBox className="h-16 w-full rounded-xl" />
            <SkeletonBox className="h-16 w-full rounded-xl" />
            <SkeletonBox className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-8 space-y-4">
          <div className="glass rounded-xl p-2">
            <SkeletonBox className="h-10 w-full rounded-lg" />
          </div>
          <div className="glass rounded-2xl p-6 h-[420px]">
            <SkeletonBox className="h-6 w-48" />
            <SkeletonBox className="h-4 w-72 mt-2" />
            <SkeletonBox className="h-[300px] w-full mt-6 rounded-2xl" />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-2xl p-6 h-[215px]">
            <SkeletonProfile />
          </div>
          <div className="glass rounded-2xl p-6 h-[260px]">
            <SkeletonTable rows={5} />
          </div>
        </div>
      </div>
    </>
  );
}

// Subcomponent: Premium KPI Card with Glassmorphism
function KpiCard({ icon, iconColor, bgGradient, title, value, subtext }) {
  return (
    <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${bgGradient} ${iconColor} shadow-inner backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
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
    </div>
  );
}
