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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";

export default function Overview({ profile }) {
  const [data, setData] = useState({
    profile: { name: "", department: "", semester: 0 },
    attendance: 0,
    cgpa: 0,
    pendingAssignments: 0,
    upcomingEvents: [],
    subjects: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch student overview data
  useEffect(() => {
    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        // ============ FETCH PROFILE ============
        const profileRes = await fetch("http://localhost:8000/student/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.status === 401) {
          console.error("Unauthorized: Session expired");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        const profileData = profileRes.ok ? await profileRes.json() : {};
        console.log("PROFILE:", profileData);

        // ============ FETCH ATTENDANCE ============
        const attendanceRes = await fetch("http://localhost:8000/student/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const attendanceDataRaw = attendanceRes.ok ? await attendanceRes.json() : {};
        console.log("ATTENDANCE:", attendanceDataRaw);

        // ============ FETCH MARKS ============
        const marksRes = await fetch("http://localhost:8000/student/my-marks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const marksData = marksRes.ok ? await marksRes.json() : {};
        console.log("MARKS:", marksData);

        // ============ FETCH ASSIGNMENTS ============
        const assignmentsRes = await fetch("http://localhost:8000/student/assignments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const assignmentsRaw = assignmentsRes.ok ? await assignmentsRes.json() : {};
        console.log("ASSIGNMENTS:", assignmentsRaw);

        // ============ FETCH EVENTS ============
        const eventsRes = await fetch("http://localhost:8000/student/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventsRaw = eventsRes.ok ? await eventsRes.json() : {};
        console.log("EVENTS:", eventsRaw);

        // ============ SAFE DATA MAPPING ============
        
        // Profile mapping
        const studentName =
          profileData?.name ||
          profileData?.student_name ||
          user?.name ||
          "Student";
        const department = profileData?.department || "N/A";
        const semester = profileData?.semester || 0;

        // Attendance mapping - handle various response structures
        let attendance = 0;
        if (typeof attendanceDataRaw === "number") {
          attendance = attendanceDataRaw;
        } else if (attendanceDataRaw?.overall !== undefined) {
          attendance = attendanceDataRaw.overall;
        } else if (attendanceDataRaw?.percentage !== undefined) {
          attendance = attendanceDataRaw.percentage;
        } else if (attendanceDataRaw?.attendance_percentage !== undefined) {
          attendance = attendanceDataRaw.attendance_percentage;
        } else if (Array.isArray(attendanceDataRaw) && attendanceDataRaw.length > 0) {
          // If it's array, calculate average
          const total = attendanceDataRaw.reduce((sum, item) => {
            const att = (item.attended || 0) / (item.conducted || 1);
            return sum + att;
          }, 0);
          attendance = Math.round((total / attendanceDataRaw.length) * 100);
        }
        attendance = Math.max(0, Math.min(100, attendance || 0));

        // CGPA mapping
        const cgpa =
          marksData?.cgpa ||
          marksData?.gpa ||
          marksData?.avg ||
          marksData?.average ||
          0;

        // Subjects mapping
        const subjects =
          marksData?.subjects ||
          marksData?.data ||
          [];

        // Assignments mapping
        let assignments = [];
        if (Array.isArray(assignmentsRaw)) {
          assignments = assignmentsRaw;
        } else if (assignmentsRaw?.assignments && Array.isArray(assignmentsRaw.assignments)) {
          assignments = assignmentsRaw.assignments;
        } else if (assignmentsRaw?.data && Array.isArray(assignmentsRaw.data)) {
          assignments = assignmentsRaw.data;
        }
        const pendingCount = assignments.filter(a => a?.status !== "submitted" && !a?.submitted).length || 0;

        // Events mapping
        let events = [];
        if (Array.isArray(eventsRaw)) {
          events = eventsRaw;
        } else if (eventsRaw?.events && Array.isArray(eventsRaw.events)) {
          events = eventsRaw.events;
        } else if (eventsRaw?.data && Array.isArray(eventsRaw.data)) {
          events = eventsRaw.data;
        }
        const upcomingEvents = events.slice(0, 1);

        // Set all data
        setData({
          profile: {
            name: studentName,
            department,
            semester
          },
          attendance,
          cgpa: parseFloat(cgpa) || 0,
          pendingAssignments: pendingCount,
          upcomingEvents,
          subjects: Array.isArray(subjects) ? subjects : []
        });
      } catch (err) {
        console.error("FETCH ERROR:", err);
        setError("Failed to load dashboard data");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    if (!token) {
      console.warn("No authentication token found");
      setLoading(false);
      return;
    }

    fetchOverview();
  }, [token]);

  // Calculate status badge with safe logic
  const statusBadge = useMemo(() => {
    const { attendance, cgpa } = data;
    
    // If no data is loaded yet, show "No Data"
    if (attendance === 0 && cgpa === 0) {
      return { text: "No Data", color: "bg-gray-400" };
    }
    
    if (attendance < 65 || cgpa < 6) {
      return { text: "Critical", color: "bg-red-500" };
    }
    if (attendance < 75 || cgpa < 7) {
      return { text: "Warning", color: "bg-yellow-500" };
    }
    return { text: "Safe", color: "bg-green-500" };
  }, [data.attendance, data.cgpa]);

  // Risk subjects with safe defaults
  const riskSubjects = useMemo(() => {
    const risks = [];
    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    
    subjects.forEach(sub => {
      if (!sub) return; // Skip null/undefined items
      
      const att = sub.attendance || 0;
      const marks = sub.marks || 0;
      
      if (att > 0 && att < 75) {
        risks.push(`${sub.name || "Subject"}: Low attendance (${att}%)`);
      }
      if (marks > 0 && marks < 15) {
        risks.push(`${sub.name || "Subject"}: Low marks (${marks})`);
      }
    });
    return risks;
  }, [data.subjects]);

  // Subject status with safe defaults
  const getSubjectStatus = (attendance = 0, marks = 0) => {
    // If no data, show as "Good" (safe)
    if (attendance === 0 && marks === 0) {
      return { text: "Good", color: "text-green-600" };
    }
    
    if (attendance < 65 || marks < 12) {
      return { text: "Critical", color: "text-red-600" };
    }
    if (attendance < 75 || marks < 15) {
      return { text: "Improve", color: "text-yellow-600" };
    }
    return { text: "Good", color: "text-green-600" };
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-fadeIn text-gray-800 pb-10">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-extrabold mb-1 tracking-tight text-gray-900">
          Welcome back, {data.profile.name || user?.name || "Student"} 👋
        </h2>
        <p className="text-gray-500 text-sm font-medium">
          Here's your academic overview and key insights
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center font-semibold text-sm">
          {error}
        </div>
      )}

      {/* HERO SECTION */}
      <div className="w-full glass rounded-2xl p-6 border-white/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden hover:shadow-2xl transition-all duration-500">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none opacity-60"></div>
        <div className="absolute -bottom-10 right-40 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl pointer-events-none opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-blue-50/40 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{data.profile.name || "Student"}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            {data.profile.department}{data.profile.semester ? ` • Semester ${data.profile.semester}` : ""}
          </p>
        </div>
      </div>

      {/* KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          icon={<TrendsIcon />} 
          iconColor="text-blue-600" 
          bgGradient="from-blue-50/50 to-blue-50"
          title="Attendance %" 
          value={`${data.attendance}%`} 
          subtext="Overall attendance" 
        />
        <KpiCard 
          icon={<CheckCircleIcon />} 
          iconColor="text-emerald-600" 
          bgGradient="from-emerald-50/50 to-emerald-50"
          title="CGPA" 
          value={data.cgpa.toFixed(2)} 
          subtext="Current GPA" 
        />
        <KpiCard 
          icon={<AssignmentIcon />} 
          iconColor="text-amber-500" 
          bgGradient="from-amber-50/50 to-amber-50"
          title="Pending Assignments" 
          value={data.pendingAssignments} 
          subtext="To be submitted" 
        />
        <KpiCard 
          icon={<EventIcon />} 
          iconColor="text-purple-500" 
          bgGradient="from-purple-50/50 to-purple-50"
          title="Upcoming Events" 
          value={data.upcomingEvents.length} 
          subtext="Next events" 
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* LEFT 70% */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* PERFORMANCE SNAPSHOT */}
          <div className="glass rounded-2xl p-6 flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/5 via-transparent to-indigo-100/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-gray-800 text-lg mb-4">Performance Overview</h3>
              {Array.isArray(data.subjects) && data.subjects.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.subjects}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    />
                    <Bar dataKey="marks" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-400 text-sm">Performance data not available</p>
                </div>
              )}
            </div>
          </div>

          {/* SUBJECT PERFORMANCE TABLE */}
          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100/5 via-transparent to-green-100/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-gray-800 text-lg mb-4">Subject Performance</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-semibold text-gray-600">Subject</th>
                      <th className="text-center py-2 font-semibold text-gray-600">Attendance</th>
                      <th className="text-center py-2 font-semibold text-gray-600">Marks</th>
                      <th className="text-center py-2 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(data.subjects) && data.subjects.length > 0 ? (
                      data.subjects.map((sub, i) => {
                        const status = getSubjectStatus(sub?.attendance || 0, sub?.marks || 0);
                        return (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-3 font-medium text-gray-800">{sub?.name || "Subject"}</td>
                            <td className="py-3 text-center">{sub?.attendance ?? "N/A"}%</td>
                            <td className="py-3 text-center">{sub?.marks ?? "N/A"}</td>
                            <td className="py-3 text-center">
                              <span className={`font-semibold ${status.color}`}>{status.text}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-gray-500">
                          No subject data available yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 30% */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* RISK PANEL */}
          <div className="glass rounded-2xl p-6 h-[300px] flex flex-col hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-100/5 via-transparent to-orange-100/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-red-600 text-lg mb-4 flex items-center gap-2">
                <WarningIcon className="text-red-500" />
                At Risk
              </h3>
              {riskSubjects.length === 0 ? (
                <p className="text-gray-400 text-sm">No risks detected</p>
              ) : (
                <div className="space-y-2">
                  {riskSubjects.map((risk, i) => (
                    <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700">{risk}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/5 via-transparent to-purple-100/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-gray-800 text-lg mb-4">Quick Links</h3>
              <div className="space-y-2">
                <button className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                  View Attendance Details
                </button>
                <button className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                  View Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Premium KPI Card with Glassmorphism
function KpiCard({ icon, iconColor, bgGradient, title, value, subtext }) {
  return (
    <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${bgGradient} ${iconColor} shadow-inner backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{value}</p>
          <p className="text-xs font-medium text-gray-500">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
