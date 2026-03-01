import { useEffect, useState } from "react";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

export default function Attendance() {

  const token = localStorage.getItem("access_token");

  const [activeSem, setActiveSem] = useState(3);
  const [activeSub, setActiveSub] = useState("ALL");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH DATA =================
  useEffect(() => {
    fetch(`http://localhost:8000/student/attendance?semester=${activeSem}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      });
  }, [activeSem]);

  if (loading) return <div>Loading...</div>;

  const subjects = data.map(d => d.subject_name);

  const filtered =
    activeSub === "ALL"
      ? data
      : data.filter(d => d.subject_name === activeSub);

  const totalConducted = filtered.reduce(
    (sum, s) => sum + s.conducted,
    0
  );

  const totalAttended = filtered.reduce(
    (sum, s) => sum + s.attended,
    0
  );

  const percent =
    totalConducted > 0
      ? Math.round((totalAttended / totalConducted) * 100)
      : 0;

  return (
    <div className="space-y-6">

      {/* ===== SEMESTER SELECTOR ===== */}
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5, 6].map((sem) => (
          <button
            key={sem}
            onClick={() => {
              setActiveSem(sem);
              setActiveSub("ALL");
            }}
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

        {/* ===== SUBJECT SELECTOR ===== */}
        <div className="w-48 bg-white rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-500">
            Subjects
          </p>

          <button
            onClick={() => setActiveSub("ALL")}
            className="block w-full text-left"
          >
            ALL
          </button>

          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className="block w-full text-left"
            >
              {sub}
            </button>
          ))}
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 bg-white rounded-2xl p-8 space-y-6">

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Overall Attendance
              </h2>
              <p className="text-gray-500">
                Conducted: {totalConducted} | Attended: {totalAttended}
              </p>
            </div>

            <div className="text-4xl font-bold text-indigo-600">
              {percent}%
            </div>
          </div>

          {/* ===== SUBJECT DETAILS ===== */}
          {filtered.map((subject) => (
            <div key={subject.subject_id} className="border p-4 rounded-xl">

              <div className="flex justify-between">
                <h3 className="font-semibold">
                  {subject.subject_name}
                </h3>
                <span className="font-bold">
                  {subject.percentage}%
                </span>
              </div>

              <p className="text-sm text-gray-500">
                Conducted: {subject.conducted} | Attended: {subject.attended}
              </p>

              {/* LAST 5 CLASSES */}
              <div className="flex gap-2 mt-3">
                {subject.last_5.map((rec, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full ${
                      rec.status === true
                        ? "bg-green-500"
                        : rec.status === false
                        ? "bg-red-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

            </div>
          ))}

        </div>
      </div>
    </div>
  );
}