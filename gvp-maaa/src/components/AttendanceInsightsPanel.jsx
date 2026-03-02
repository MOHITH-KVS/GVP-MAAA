import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function AttendanceInsightsPanel({
  isOpen,
  onClose,
  semester,
  token
}) {

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    fetch(`http://localhost:8000/student/attendance/analytics?semester=${semester}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      });

  }, [isOpen, semester]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[70%] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-xl font-semibold">
          Attendance Insights
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-black"
        >
          Close
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-10 overflow-y-auto h-[calc(100%-80px)]">

        {loading && <p>Loading analytics...</p>}

        {!loading && analytics && (
          <>
            {/* SEMESTER TREND */}
            <div>
              <h3 className="font-semibold mb-4">
                Semester Attendance Trend
              </h3>

              <div className="w-full h-72">
                <ResponsiveContainer>
                  <LineChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#4F46E5"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SUBJECT COMPARISON */}
            <div>
              <h3 className="font-semibold mb-4">
                Subject Comparison
              </h3>

              <div className="w-full h-72">
                <ResponsiveContainer>
                  <BarChart data={analytics.subject_comparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar
                      dataKey="percentage"
                      fill="#6366F1"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FULL INSIGHTS BUTTON */}
            <div className="pt-6 border-t">
              <button
                onClick={() => window.location.href = "/student/insights"}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl"
              >
                View Full Insights →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}