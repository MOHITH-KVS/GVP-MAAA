import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

/* ===== STATUS STYLES ===== */
const STATUS_STYLE = {
  Upcoming: "bg-blue-100 text-blue-700",
  Ongoing: "bg-orange-100 text-orange-700",
  Completed: "bg-green-100 text-green-700",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/student/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      setErrorMsg("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/student/events/register`, { event_id: eventId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg("Successfully registered for event!");
      fetchEvents(); // refresh list
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === "All") return events;
    return events.filter((e) => e.event_type === filter);
  }, [events, filter]);

  /* ===== PERSONAL STATS ===== */
  const stats = useMemo(() => {
    const registered = events.filter((e) => e.is_registered).length;
    const attended = events.filter((e) => e.attendance_status === "present").length;
    const wins = events.filter((e) => e.result === "winner" || e.result === "runner_up").length;
    const certificates = events.filter((e) => ["winner", "runner_up", "participant"].includes(e.result)).length;
    return { registered, attended, wins, certificates };
  }, [events]);

  return (
    <div className="space-y-10 relative">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">🎉 Events</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your participation, achievements, and event insights
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium flex items-center gap-2">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 font-medium flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">❌ {errorMsg}</div>
          <button onClick={() => setErrorMsg("")} className="text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* ================= PERSONAL SUMMARY ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InsightCard title="Registered" value={stats.registered} />
        <InsightCard title="Attended" value={stats.attended} />
        <InsightCard title="Wins & Honors" value={stats.wins} />
        <InsightCard title="Certificates" value={stats.certificates} />
      </div>

      {/* ================= FILTERS ================= */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {["All", "Workshop", "Seminar", "Guest Lecture", "Hackathon", "Internal Event", "Other"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium shrink-0 shadow-sm border transition-colors
              ${filter === f
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ================= EVENTS LIST ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && !events.length ? (
          <p className="text-gray-500 text-center col-span-full">Loading events...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm text-gray-500">
            No events found matching the criteria.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onRegister={handleRegister} loading={loading} />
          ))
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function InsightCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center items-center">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{title}</p>
      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{value}</p>
    </div>
  );
}

function EventCard({ event, onRegister, loading }) {

  const showCertificate = ["winner", "runner_up", "participant"].includes(event.result);

  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col justify-between border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800 break-words pr-4 leading-tight">{event.title}</h3>
          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-lg font-bold shrink-0 ${STATUS_STYLE[event.status] || "bg-gray-100 text-gray-500"}`}>
            {event.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-medium mb-4">
          <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
            {event.event_type}
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
            {new Date(event.event_date).toLocaleDateString()}
          </span>
        </div>

        {event.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        {/* RESULT BADGE (if relevant) */}
        {event.result && (
          <div className={`p-2 rounded-lg text-xs font-bold text-center border uppercase tracking-wider
                ${event.result === 'winner' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              event.result === 'runner_up' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            Result: {event.result.replace("_", "-")}
          </div>
        )}

        {/* STATUS / ACTION AREA */}
        <div className="flex flex-col gap-2">
          {!event.is_registered && event.status === "Upcoming" && (
            <button
              disabled={loading}
              onClick={() => onRegister(event.id)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              Register for Event
            </button>
          )}

          {event.is_registered && event.status === "Upcoming" && (
            <div className="text-center py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-semibold text-sm">
              ✅ Registered
            </div>
          )}

          {event.status !== "Upcoming" && event.is_registered && (
            <div className="text-center py-2 text-sm font-medium">
              Attendance:
              <span className={`ml-2 font-bold ${event.attendance_status === 'present' ? 'text-green-600' : event.attendance_status === 'absent' ? 'text-red-600' : 'text-gray-400'}`}>
                {event.attendance_status === 'present' ? 'Present' : event.attendance_status === 'absent' ? 'Absent' : 'Pending'}
              </span>
            </div>
          )}

          {event.status !== "Upcoming" && !event.is_registered && (
            <div className="text-center py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 font-medium text-sm">
              Did not register
            </div>
          )}

          {/* CERTIFICATE BUTTON */}
          {showCertificate && (
            <button className="w-full mt-2 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm transition-colors flex justify-center items-center gap-2">
              📄 Download Certificate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
