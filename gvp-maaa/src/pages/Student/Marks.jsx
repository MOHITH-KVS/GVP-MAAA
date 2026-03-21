import { useState, useEffect } from "react";
import api from "../../utils/axios";

export default function Marks() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      const res = await api.get("/student/my-marks");
      setMarks(res.data);
    } catch (err) {
      console.error("Failed to load marks", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-4">
           <div className="loader"></div>
           Loading your performance profile...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          My Performance
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Track your academic scaling progress across assignments, mid-terms, and internals.
        </p>
      </div>

      {marks.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">📚</div>
          <h3 className="text-xl font-semibold text-gray-700">No Scaled Marks Available</h3>
          <p className="text-gray-500 mt-2">Your faculty has not processed scaled calculations for any of your courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {marks.map((mark, i) => (
             <SubjectCard key={i} mark={mark} />
          ))}
        </div>
      )}
      
    </div>
  );
}

function SubjectCard({ mark }) {
  const [expanded, setExpanded] = useState(false);
  
  // Base scales (rounded to 1 decimal place or integer display)
  const aNorm = mark.assignment_scaled || 0; // Max 10
  const m1Norm = mark.mid1_scaled || 0; // Max 20
  const m2Norm = mark.mid2_scaled || 0; // Max 20
  const intTotal = mark.internal_total || 0; // Max 30
  const finalTotal = mark.final_total || 0; // Max 100
  
  // Compute percentages purely for UI width animation mappings
  const aPct = (aNorm / 10) * 100;
  const iPct = (intTotal / 30) * 100;
  const fPct = (finalTotal / 100) * 100;
  
  // Decide color based on final performance thresholds
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
    <div className="glass rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{mark.subject}</h2>
          <div className={`px-4 py-1.5 rounded-full font-bold ${lightTheme} ${textTheme} text-sm flex items-center gap-1`}>
             <span className="text-lg">{finalTotal}</span>
             <span className="text-[10px] opacity-70">/ 100</span>
          </div>
        </div>
        
        {/* PROGRESS BAR (Final Total) */}
        <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
           <div 
             className={`h-3 rounded-full transition-all duration-1000 ${colorTheme}`} 
             style={{ width: `${fPct}%` }}
           ></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
               <span className="text-xs text-gray-500 block uppercase tracking-wider mb-1">Internal Total</span>
               <div className="flex items-end gap-1 font-semibold text-gray-800">
                   <span className="text-xl">{intTotal}</span>
                   <span className="text-xs text-gray-400 mb-1">/ 30</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                 <div className="h-1 rounded-full bg-indigo-500" style={{ width: `${iPct}%` }}></div>
               </div>
           </div>
           
           <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
               <span className="text-xs text-gray-500 block uppercase tracking-wider mb-1">Assignments</span>
               <div className="flex items-end gap-1 font-semibold text-gray-800">
                   <span className="text-xl">{aNorm}</span>
                   <span className="text-xs text-gray-400 mb-1">/ 10</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                 <div className="h-1 rounded-full bg-blue-500" style={{ width: `${aPct}%` }}></div>
               </div>
           </div>
        </div>
        
        <button 
           onClick={() => setExpanded(!expanded)}
           className="w-full py-2 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition border-t border-gray-100 mt-2 pt-4"
        >
           {expanded ? "Hide Breakdowns" : "View Detailed Breakdown"}
        </button>
      </div>

      {/* DROPDOWN EXPANSION */}
      {expanded && (
          <div className="bg-white/60 p-6 border-t border-gray-100">
             <div className="space-y-4">
                <BreakdownRow label="Mid-term 1 Scaled" value={m1Norm} max={20} color="bg-cyan-500" />
                <BreakdownRow label="Mid-term 2 Scaled" value={m2Norm} max={20} color="bg-cyan-500" />
                <BreakdownRow label="Combined Mid-term Avg" value={mark.mid_combined} max={20} color="bg-blue-600" />
                <BreakdownRow label="Semester Exam" value={mark.semester_marks || 0} max={70} color="bg-indigo-600" />
             </div>
          </div>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, max, color }) {
    const val = value || 0;
    const pct = Math.min((val / max) * 100, 100);
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">{label}</span>
                <span className="text-sm text-gray-800 font-semibold">{val} <span className="text-gray-400 font-normal text-xs">/ {max}</span></span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                 <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
}

