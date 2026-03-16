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
        <div className="text-center py-10">Loading marks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">My Marks</h1>
        <p className="text-sm text-gray-500">
          View your academic performance across subjects and exams
        </p>
      </div>

      {/* MARKS TABLE */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Marks Overview</h3>

        {marks.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            No marks available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Subject</th>
                  <th className="text-left py-2">Exam</th>
                  <th className="text-left py-2">Marks</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((mark, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{mark.subject}</td>
                    <td className="py-2">{mark.exam}</td>
                    <td className="py-2 font-medium">{mark.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
        highlight && "ring-2 ring-indigo-200"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">
        {value} <span className="text-sm text-gray-400">/ {max}</span>
      </p>
      <div className="mt-4 h-2 bg-gray-200 rounded-full">
        <div
          className={`h-2 rounded-full ${getColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{percent}%</p>
    </div>
  );
}

function InfoCard({ title, value, accent }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-lg font-semibold mt-2 ${accent || ""}`}>
        {value}
      </p>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="glass rounded-xl px-5 py-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title} (Chart renders here)
    </div>
  );
}
