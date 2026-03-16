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
