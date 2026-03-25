import { useEffect, useState } from "react";

const TYPE_COLORS = {
  class: "border-blue-200 bg-blue-50",
  mid: "border-orange-200 bg-orange-50",
  semester: "border-purple-200 bg-purple-50",
  event: "border-green-200 bg-green-50",
};

const TYPE_LABELS = {
  class: "Class Timetables",
  mid: "Mid Exams",
  semester: "Semester Exams",
  event: "Event Timetables",
};

export default function Timetable() {
  const [timetables, setTimetables] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());


  const token = localStorage.getItem("token");

  const fetchTimetables = async () => {
  try {
    setLoading(true);

    const params = new URLSearchParams();

    if (activeType !== "all") {
      params.append("timetable_type", activeType);
    }

    params.append("audience", "student");

    const res = await fetch(
      `http://127.0.0.1:8000/timetables?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        window.location.href = "/";
        return;
      }

      console.error("Failed to fetch timetables");
      setTimetables([]);
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Invalid response:", data);
      setTimetables([]);
      return;
    }

    setTimetables(data);

  } catch (err) {
    console.error(err);
    setTimetables([]);
  } finally {
    setLoading(false);
  }
 };

  useEffect(() => {
    fetchTimetables();
  }, [activeType]);

  useEffect(() => {
  const interval = setInterval(() => {
    setNow(Date.now());
  }, 60000); // updates every 1 minute

  return () => clearInterval(interval);
 }, []);


  // 🔥 GROUP DATA BY TYPE
  const grouped = Array.isArray(timetables)
  ? timetables.reduce((acc, t) => {
      if (!acc[t.timetable_type]) {
        acc[t.timetable_type] = [];
      }
      acc[t.timetable_type].push(t);
      return acc;
    }, {})
  : {};

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">📅 Timetables</h1>
        <p className="text-gray-500">View your published timetables</p>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex gap-3 flex-wrap">
        {["all", "class", "mid", "semester", "event"].map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition
              ${
                activeType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-white border hover:bg-gray-50"
              }`}
          >
            {type === "all" ? "All" : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading && (
        <div className="text-gray-500">Loading...</div>
      )}

      {!loading && timetables.length === 0 && (
        <div className="bg-white p-6 rounded-xl border text-gray-500">
          No timetables available
        </div>
      )}

      {!loading && activeType === "all" && (
        <div className="space-y-8">
          {Object.keys(grouped).map((type) => (
            <div key={type} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {TYPE_LABELS[type]}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {grouped[type].map((t) => (
                  <TimetableCard key={t.id} t={t} type={type} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeType !== "all" && (
        <div className="grid md:grid-cols-2 gap-4">
          {timetables.map((t) => (
            <TimetableCard
              key={t.id}
              t={t}
              type={activeType}
              now={now}
            />
          ))}
        </div>
      )}

    </div>
  );
}

/* ================= CARD ================= */

function TimetableCard({ t, type, now }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition hover:shadow-md
      ${TYPE_COLORS[type]}`}
    >
      <h3 className="font-semibold text-lg">{t.title}</h3>

      <p className="text-sm text-gray-600 mt-1">
        {formatDateTime(t.uploaded_at)}
        <span className="block text-xs text-gray-400">
          {getRelativeTime(t.uploaded_at, now)}
        </span>
      </p>



      <div className="mt-4">
        <button
          onClick={() =>
            window.open(
              `http://127.0.0.1:8000${t.file_url}`,
              "_blank"
            )
          }
          className="px-4 py-2 text-sm rounded-lg bg-white border hover:bg-gray-100"
        >
          View Timetable
        </button>
      </div>
    </div>
  );
}

/*time formatting functions */
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return `Uploaded on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
}

function getRelativeTime(dateString, now) {
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

  return `${Math.floor(diff / 604800)} weeks ago`;
}


