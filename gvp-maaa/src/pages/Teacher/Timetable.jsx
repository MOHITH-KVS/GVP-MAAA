import { useEffect, useState } from "react";

export default function Timetable() {
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());


  useEffect(() => {
    fetchTimetable();
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    setNow(Date.now());
  }, 60000);

  return () => clearInterval(interval);
 }, []);


  const fetchTimetable = async () => {
  try {
    const token = localStorage.getItem("access_token");

    const res = await fetch(
      "http://localhost:8000/timetables?audience=faculty",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch timetables");
      return;
    }

    const data = await res.json();
    setTimetables(data);
  } catch (err) {
    console.error("Error fetching timetables", err);
  } finally {
    setLoading(false);
  }
 };

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border">
        <h1 className="text-2xl font-semibold">🕒 My Timetables</h1>
        <p className="text-gray-600 mt-1">
          View all timetable documents assigned to you
        </p>
      </div>

      {/* ================= CONTENT ================= */}
      {loading ? (
        <div className="bg-white rounded-2xl border p-6 text-center text-gray-500">
          Loading timetables...
        </div>
      ) : timetables.length === 0 ? (
        <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">
          No timetable assigned yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Uploaded On</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {timetables.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {t.title}
                  </td>

                  <td className="px-4 py-3 capitalize">
                    {t.timetable_type}
                  </td>

                  <td className="px-4 py-3">
                    {t.department}
                  </td>

                  <td className="px-4 py-3">
                    <div>
                      {formatDateTime(t.uploaded_at)}
                      <div className="text-xs text-gray-400">
                        {getRelativeTime(t.uploaded_at, now)}
                      </div>
                    </div>
                  </td>


                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        window.open(
                          `http://localhost:8000${t.file_url}`,
                          "_blank"
                        )
                      }
                      className="px-3 py-1 text-xs rounded-lg border hover:bg-gray-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/*time formatting functions */
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
}

function getRelativeTime(dateString, nowValue) {
  const past = new Date(dateString);
  const diff = Math.floor((nowValue - past) / 1000);


  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

  return `${Math.floor(diff / 604800)} weeks ago`;
}


