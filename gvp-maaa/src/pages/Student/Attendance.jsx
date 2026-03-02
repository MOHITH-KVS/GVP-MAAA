import { useEffect, useState } from "react";
import AttendanceInsightsPanel from "../../components/AttendanceInsightsPanel";

export default function Attendance() {

  const token = localStorage.getItem("access_token");

  const [activeSem, setActiveSem] = useState(null);
  const [activeSub, setActiveSub] = useState("ALL");

  const [monthlyData, setMonthlyData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [animateKey, setAnimateKey] = useState(0);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    fetch("http://localhost:8000/student/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setActiveSem(data.semester));
  }, [token]);

  /* ================= LOAD SUMMARY ================= */
  useEffect(() => {

    if (!activeSem) return;

    fetch(
      `http://localhost:8000/student/attendance?semester=${activeSem}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(res => {
        if (Array.isArray(res)) setSummaryData(res);
      });

  }, [activeSem, token]);

  /* ================= LOAD MONTHLY ================= */
  useEffect(() => {

    if (!activeSem) return;

    setLoading(true);

    const year = selectedMonth.split("-")[0];
    const month = selectedMonth.split("-")[1];

    fetch(
      `http://localhost:8000/student/attendance/monthly?semester=${activeSem}&month=${Number(month)}&year=${Number(year)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(res => {
        if (Array.isArray(res)) setMonthlyData(res);
        else setMonthlyData([]);
        setLoading(false);
      })
      .catch(() => {
        setMonthlyData([]);
        setLoading(false);
      });

  }, [activeSem, selectedMonth, token]);

  if (!activeSem || loading) {
    return <div className="p-10">Loading...</div>;
  }

  /* ================= CALCULATIONS ================= */

  const subjects = summaryData.map(s => s.subject_name);

  const filteredSummary =
    activeSub === "ALL"
      ? summaryData
      : summaryData.filter(s => s.subject_name === activeSub);

  const totalConducted = filteredSummary.reduce((s, v) => s + v.conducted, 0);
  const totalAttended = filteredSummary.reduce((s, v) => s + v.attended, 0);

  const overallPercent =
    totalConducted > 0
      ? Math.round((totalAttended / totalConducted) * 100)
      : 0;

  const isAtRisk = overallPercent < 75;

  const year = Number(selectedMonth.split("-")[0]);
  const month = Number(selectedMonth.split("-")[1]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  /* ===== Monthly % ===== */

  let monthlyPresent = 0;
  let monthlyTotal = 0;

  monthlyData.forEach(day => {
    day.subjects.forEach(sub => {
      if (sub.working_day) {
        monthlyTotal++;
        if (sub.status === true) monthlyPresent++;
      }
    });
  });

  const monthlyPercent =
    monthlyTotal > 0
      ? Math.round((monthlyPresent / monthlyTotal) * 100)
      : 0;

  /* ===== Streak Logic ===== */

  let streak = 0;

  const sortedDays = [...monthlyData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const hasPresent = sortedDays[i].subjects.some(
      s => s.working_day && s.status === true
    );

    if (hasPresent) streak++;
    else break;
  }

  /* ================= RENDER ================= */

  return (
    <div className="space-y-8">

      {/* Semester */}
      <div className="flex gap-3">
        {[1,2,3,4,5,6].map((sem) => (
          <button
            key={sem}
            onClick={() => setActiveSem(sem)}
            className={`px-4 py-2 rounded-xl ${
              activeSem === sem
                ? "bg-indigo-600 text-white"
                : "bg-white"
            }`}
          >
            Sem{sem}
          </button>
        ))}
      </div>

      <div className="flex gap-6">

        {/* Sidebar */}
        <div className="w-60 bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-3">
            Subjects
          </p>

          <button
            onClick={() => setActiveSub("ALL")}
            className={`w-full text-left px-3 py-2 rounded-lg ${
              activeSub === "ALL"
                ? "bg-indigo-100 text-indigo-700 font-semibold"
                : ""
            }`}
          >
            ALL
          </button>

          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={`w-full text-left px-3 py-2 rounded-lg ${
                activeSub === sub
                  ? "bg-indigo-100 text-indigo-700 font-semibold"
                  : ""
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1">

          {/* Header */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 flex justify-between items-center">

            <div>
              <h2 className="text-xl font-semibold">
                Monthly Attendance
              </h2>

              <p className="text-gray-500 mt-1">
                Semester Overall: 
                <span className={`ml-2 font-semibold ${
                  isAtRisk ? "text-red-600" : "text-green-600"
                }`}>
                  {overallPercent}%
                </span>
                {" | "}
                This Month: {monthlyPercent}%
              </p>

              {isAtRisk && (
                <div className="mt-2 text-sm text-red-600 font-medium">
                  ⚠ Attendance below 75%. Risk of shortage.
                </div>
              )}

              <div className="mt-2 text-sm text-orange-600 font-medium">
                🔥 Current Streak: {streak} days
              </div>
            </div>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setAnimateKey(prev => prev + 1);
              }}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {/* Legend */}
          <div className="flex gap-6 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              Present
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              Absent
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
              Not Updated
            </div>
          </div>

          {/* Week Header */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar */}
          <div
            key={animateKey}
            className="grid grid-cols-7 gap-4 bg-white p-6 rounded-2xl shadow-sm transition-all duration-500 ease-in-out"
          >

            {[...Array(firstDayIndex)].map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {[...Array(daysInMonth)].map((_, i) => {

              const day = String(i + 1).padStart(2, "0");
              const fullDate = `${selectedMonth}-${day}`;
              const dayEntry = monthlyData.find(d => d.date === fullDate);

              return (
                <div
                  key={i}
                  className="border rounded-xl min-h-[100px] p-2 text-xs"
                >
                  <div className="font-semibold mb-2">
                    {i + 1}
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {dayEntry?.subjects
                      ?.filter(sub =>
                        activeSub === "ALL"
                          ? true
                          : sub.subject === activeSub
                      )
                      .map((sub, index) => {

                        let color = "bg-gray-300";
                        let label = "Not Updated";

                        if (sub.working_day) {
                          if (sub.status === true) {
                            color = "bg-green-500";
                            label = "Present";
                          }
                          if (sub.status === false) {
                            color = "bg-red-500";
                            label = "Absent";
                          }
                        }

                        return (
                          <div key={index} className="relative group">

                            <div
                              className={`w-3 h-3 rounded-full ${color} cursor-pointer hover:scale-110 transition`}
                            />

                            {/* Per Dot Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                              bg-black text-white text-[10px] px-2 py-1 rounded 
                              opacity-0 group-hover:opacity-100 transition 
                              pointer-events-none whitespace-nowrap z-20">
                              {sub.subject} — {label}
                            </div>

                          </div>
                        );
                      })}

                  </div>
                </div>
              );
            })}

          </div>

          {/* Insights */}
          <div className="mt-6">
            <button
              onClick={() => setInsightsOpen(true)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl"
            >
              View My Attendance Insights
            </button>
          </div>

        </div>
      </div>

      <AttendanceInsightsPanel
        isOpen={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        semester={activeSem}
        token={token}
      />
    </div>
  );
}