import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";

export default function Attendance() {

  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  const [activeSem, setActiveSem] = useState(null);
  const [activeSub, setActiveSub] = useState("ALL");

  const [monthlyData, setMonthlyData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [animateKey, setAnimateKey] = useState(0);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    fetch("http://localhost:8000/student/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json"
      }
    })
      .then(res => res.json())
      .then(data => setActiveSem(data.semester));
  }, [token]);

  /* ================= LOAD SUMMARY ================= */
  useEffect(() => {

    if (!activeSem) return;

    fetch(
      `http://localhost:8000/student/attendance?semester=${activeSem}`,
      { 
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
       } 
     })
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
      { headers: 
        {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        } 
     }) 
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
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className="rounded-2xl border bg-white p-5">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonTable rows={5} />
          </div>
          <div className="rounded-2xl border bg-white p-6">
            <SkeletonBox className="h-6 w-56" />
            <SkeletonBox className="h-4 w-72 mt-2" />
            <div className="mt-5">
              <SkeletonTable rows={7} />
            </div>
          </div>
        </div>
      </div>
    );
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

  /* ===== Risk Level ===== */

  let riskBg = "bg-green-50";
  let riskText = "text-green-600";
  let riskMessage = "You're safe. Keep it up!";

  if (overallPercent < 60) {
    riskBg = "bg-red-50";
    riskText = "text-red-600";
    riskMessage = "Critical attendance shortage. Immediate action required.";
  } else if (overallPercent < 75) {
    riskBg = "bg-yellow-50";
    riskText = "text-yellow-600";
    riskMessage = "Attendance below required 75%. Improve consistency.";
  }

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

      {/* Semester Selector */}
      <div className="flex gap-3">
        {[1,2,3,4,5,6].map((sem) => (
          <button
            key={sem}
            onClick={() => setActiveSem(sem)}
            className={`px-4 py-2 rounded-xl transition ${
              activeSem === sem
                ? "bg-indigo-600 text-white"
                : "bg-white hover:bg-gray-100"
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

          {/* Header Card */}
          <div className={`p-6 rounded-2xl shadow-sm mb-6 ${riskBg}`}>

            <div className="flex justify-between items-center">

              <div>
                <h2 className="text-xl font-semibold">
                  Attendance Overview
                </h2>

                <p className={`mt-2 font-semibold ${riskText}`}>
                  Semester Overall: {overallPercent}% | This Month: {monthlyPercent}%
                </p>

                <p className={`mt-1 text-sm ${riskText}`}>
                  {riskMessage}
                </p>

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
          </div>

          {/* Calendar */}
          <div
            key={animateKey}
            className="grid grid-cols-7 gap-4 bg-white p-6 rounded-2xl shadow-sm transition-all duration-500"
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
                  className="border rounded-xl min-h-[90px] p-2 text-xs"
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

                        if (sub.working_day) {
                          if (sub.status === true)
                            color = "bg-green-500";
                          if (sub.status === false)
                            color = "bg-red-500";
                        }

                        return (
                          <div
                            key={index}
                            className={`w-3 h-3 rounded-full ${color}`}
                          />
                        );
                      })}

                  </div>
                </div>
              );
            })}

          </div>

          {/* Go to Insights */}
          <div className="mt-6">
            <button
              onClick={() => navigate("/student/insights")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition"
            >
              Go to Detailed Insights →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}