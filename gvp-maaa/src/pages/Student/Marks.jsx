import { useState, useEffect } from "react";
import api from "../../utils/axios";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";

export default function Marks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/student/my-marks");
      setData(res.data);
      if (res.data.subjects && res.data.subjects.length > 0) {
        setSelectedSubject(res.data.subjects[0].subject);
      }
    } catch (err) {
      console.error("Failed to load marks", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <SkeletonBox className="h-10 w-64" />
            <SkeletonBox className="h-4 w-80 mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <SkeletonTable rows={6} />
        </div>
      </div>
    );
  }

  if (!data || !data.subjects || data.subjects.length === 0) {
    return (
      <div className="space-y-10 pb-10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            My Performance
          </h1>
        </div>
        <div className="bg-white rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm border border-gray-100">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">📚</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Marks Available</h3>
          <p className="text-gray-500 max-w-md">Your faculty has not uploaded metrics or processed scaling for any of your enrolled courses yet. Check back later!</p>
          <button onClick={fetchMarks} className="mt-6 px-6 py-2.5 bg-indigo-50 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 transition-colors">
             Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const currentSubject = data.subjects.find(s => s.subject === selectedSubject) || data.subjects[0];

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER & CGPA/SGPA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            My Performance
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Track your academic scaling progress and detailed metric breakdowns.
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-indigo-50 flex flex-col items-center min-w-[120px] transition-transform hover:-translate-y-1">
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">SGPA</span>
              <span className="text-3xl font-black text-indigo-700">{data.sgpa || "0.0"}</span>
           </div>
           <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-indigo-50 flex flex-col items-center min-w-[120px] transition-transform hover:-translate-y-1">
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">CGPA</span>
              <span className="text-3xl font-black text-indigo-700">{data.cgpa || "0.0"}</span>
           </div>
        </div>
      </div>

      {/* FILTER / SUBJECT SELECTOR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
         <div className="flex items-center gap-4 flex-1">
             <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Subject</label>
             <select 
               value={selectedSubject} 
               onChange={(e) => setSelectedSubject(e.target.value)}
               className="px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[250px] cursor-pointer hover:bg-gray-100 transition-colors"
             >
               {data.subjects.map(s => (
                 <option key={s.subject} value={s.subject}>{s.subject}</option>
               ))}
             </select>
         </div>
         <button onClick={fetchMarks} className="flex items-center gap-2 px-6 py-2.5 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors font-bold shadow-sm">
            <span className="text-lg">🔄</span> Live Data Refetch
         </button>
      </div>

      {/* SUBJECT CARD */}
      <div className="max-w-6xl mx-auto">
         <SubjectCard mark={currentSubject} />
      </div>
      
    </div>
  );
}

function SubjectCard({ mark }) {
  const [expanded, setExpanded] = useState(false);
  
  // Reset expansion when subject changes
  useEffect(() => {
     setExpanded(false);
  }, [mark.subject]);

  const finalTotal = mark.final_total !== "-" ? parseFloat(mark.final_total) : 0;
  const fPct = Math.min((finalTotal / 100) * 100, 100);
  
  let colorTheme = "bg-green-500";
  let lightTheme = "bg-green-100";
  let textTheme = "text-green-700";
  
  if (finalTotal < 40) {
      colorTheme = "bg-red-500";
      lightTheme = "bg-red-100";
      textTheme = "text-red-700";
  } else if (finalTotal < 70) {
      colorTheme = "bg-yellow-500";
      lightTheme = "bg-yellow-100";
      textTheme = "text-yellow-700";
  }

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-gray-100 transition-all duration-300">
      <div className="p-8 md:p-10">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4 border-b border-gray-100 pb-8">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight">{mark.subject}</h2>
          <div className={`px-6 py-3 rounded-2xl font-bold ${lightTheme} ${textTheme} flex items-end gap-1 shadow-sm shrink-0 justify-center`}>
             <span className="text-5xl leading-none tracking-tighter">{mark.final_total}</span>
             <span className="text-base opacity-70 mb-1 font-semibold">/ 100</span>
          </div>
        </div>
        
        {/* PROGRESS BAR (Final Total) */}
        <div className="mb-8">
           <div className="flex justify-between text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
              <span>Overall Progress</span>
              <span className={textTheme}>{Math.round(fPct)}%</span>
           </div>
           <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden shadow-inner">
              <div 
                className={`h-5 rounded-full transition-all duration-1000 ease-out ${colorTheme}`} 
                style={{ width: `${fPct}%` }}
              ></div>
           </div>
        </div>
        
        <button 
           onClick={() => setExpanded(!expanded)}
           className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider rounded-2xl transition-all mt-4 border-2 ${expanded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-800'}`}
        >
           {expanded ? "Close Metrics Breakdown ▲" : "View Complete Breakdown ▼"}
        </button>
      </div>

      {/* DROPDOWN EXPANSION */}
      <div className={`transition-all duration-700 ease-in-out overflow-hidden bg-gray-50/50 ${expanded ? 'max-h-[3000px] opacity-100 border-t border-gray-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-8 md:p-10 space-y-12">
             
             {/* Assignments Section */}
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <span className="text-xl">📝</span>
                   <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Assignments (Raw)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                   {['A1','A2','A3','A4','A5'].map((a) => (
                       <MetricCard key={a} label={a} value={mark.assignments[a]} max={10} color="bg-blue-400" />
                   ))}
                </div>
             </section>

             {/* Mid Exams Section */}
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <span className="text-xl">✍️</span>
                   <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Mid Exams (Raw)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <MetricCard label="Mid 1" value={mark.mid1} max={30} color="bg-cyan-500" />
                   <MetricCard label="Mid 2" value={mark.mid2} max={30} color="bg-cyan-500" />
                </div>
             </section>

             {/* Scaled Metrics Section */}
             <section className="p-6 md:p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <span className="text-xl">⚖️</span>
                   <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-widest">Scaled Internals</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <MetricCard label="Assignment Scaled" value={mark.scaled.assignment_scaled} max={10} color="bg-indigo-500" light />
                   <MetricCard label="Mid Combined" value={mark.scaled.mid_combined} max={20} color="bg-indigo-500" light />
                   <MetricCard label="Internal Total" value={mark.scaled.internal_total} max={30} color="bg-indigo-600" light />
                </div>
             </section>

             {/* External Section */}
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <span className="text-xl">🏛️</span>
                   <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">External Exam</h4>
                </div>
                <MetricCard label="Semester Marks" value={mark.semester} max={70} color="bg-purple-500" large />
             </section>

          </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, max, color, light, large }) {
    const val = value !== "-" ? Number(value) : "-";
    const pct = val !== "-" ? Math.min((val / max) * 100, 100) : 0;
    
    return (
        <div className={`p-5 rounded-2xl border transition-all hover:shadow-md ${light ? 'bg-white border-indigo-100 shadow-sm' : 'bg-white border-gray-100 shadow-sm'} ${large ? 'p-8 md:p-10' : ''}`}>
            <div className="flex justify-between items-start mb-3">
                <span className={`font-semibold uppercase ${large ? 'text-sm text-gray-500 tracking-widest' : 'text-xs text-gray-400 tracking-wider'}`}>{label}</span>
                <div className="flex items-baseline gap-1">
                    <span className={`font-black ${large ? 'text-4xl text-gray-800' : 'text-2xl text-gray-700'}`}>{val}</span>
                    <span className={`font-medium ${large ? 'text-lg text-gray-400' : 'text-xs text-gray-400'}`}>/ {max}</span>
                </div>
            </div>
            <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${large ? 'h-3' : 'h-2'}`}>
                 <div className={`rounded-full ${color} transition-all duration-1000 delay-150 ${large ? 'h-3' : 'h-2'}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
}
