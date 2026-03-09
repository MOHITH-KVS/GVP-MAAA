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
  const [selectedEvent, setSelectedEvent] = useState(null); // Added selectedEvent state
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // External Submission Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [externalForm, setExternalForm] = useState({
    event_name: "",
    organizer: "",
    event_date: "",
    position: "",
    achievement_type: "Participation",
    certificate_file: null,
    proof_file: null
  });
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchEvents();
  }, []);

  // Custom Event Listener for Modal
  useEffect(() => {
    const handleOpenModal = (e) => setSelectedEvent(e.detail);
    document.addEventListener("openEventModal", handleOpenModal);
    return () => document.removeEventListener("openEventModal", handleOpenModal);
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

  const handleSubmitExternal = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("event_name", externalForm.event_name);
      formData.append("organizer", externalForm.organizer || "");
      formData.append("event_date", externalForm.event_date);
      formData.append("position", externalForm.position || "");
      formData.append("achievement_type", externalForm.achievement_type);
      if (externalForm.certificate_file) {
        formData.append("certificate_file", externalForm.certificate_file);
      }
      if (externalForm.proof_file) {
        formData.append("proof_file", externalForm.proof_file);
      }

      await axios.post(`${API_URL}/student/events/external-submit`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setSuccessMsg("Achievement submitted for verification!");
      setShowSubmitModal(false);
      setExternalForm({
        event_name: "",
        organizer: "",
        event_date: "",
        position: "",
        achievement_type: "Participation",
        certificate_file: null,
        proof_file: null
      });
    } catch (err) {
      setErrorMsg("Failed to submit achievement");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === "All") return events;
    if (filter === "Internal") return events.filter(e => e.is_internal);
    if (filter === "External") return events.filter(e => !e.is_internal);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">🎉 Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your participation, achievements, and event insights
          </p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          🏆 Submit External Achievement
        </button>
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
        {["All", "Internal", "External", "Workshop", "Seminar", "Guest Lecture", "Hackathon", "Other"].map((f) => (
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

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fade-in relative p-6">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 pr-8">
              {selectedEvent.title}
            </h2>
            <p className="text-sm font-semibold text-gray-500 mb-6">Type: {selectedEvent.event_type}</p>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Date</span>
                <span className="font-semibold text-gray-800">{new Date(selectedEvent.event_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Venue</span>
                <span className="font-semibold text-gray-800">{selectedEvent.venue || selectedEvent.location}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Organizer</span>
                <span className="font-semibold text-gray-800">{selectedEvent.organizer || 'N/A'}</span>
              </div>
              {selectedEvent.is_internal && selectedEvent.registration_deadline && (
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Reg. Deadline</span>
                  <span className="font-semibold text-red-600">{new Date(selectedEvent.registration_deadline).toLocaleDateString()}</span>
                </div>
              )}
              {selectedEvent.is_internal && selectedEvent.max_participants && (
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Capacity</span>
                  <span className="font-semibold text-gray-800">{selectedEvent.max_participants} students</span>
                </div>
              )}
              {!selectedEvent.is_internal && selectedEvent.external_registration_link && (
                <div className="pb-3 border-b border-gray-100">
                  <span className="text-gray-500 font-medium block mb-1">Registration Link</span>
                  <a href={selectedEvent.external_registration_link} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold break-all hover:underline">
                    {selectedEvent.external_registration_link}
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedEvent.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' : selectedEvent.status === 'Ongoing' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {selectedEvent.status}
                </span>
              </div>
              {selectedEvent.description && (
                <div className="pt-2">
                  <span className="block text-gray-500 font-medium mb-1">Description</span>
                  <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTERNAL SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh] animate-fade-in relative p-6 custom-scrollbar">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
              External Achievement Submission
            </h2>
            <form onSubmit={handleSubmitExternal} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Event Name</label>
                <input
                  required
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  value={externalForm.event_name}
                  onChange={e => setExternalForm({ ...externalForm, event_name: e.target.value })}
                  placeholder="e.g. Inter-College Hackathon"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Organizer / Host</label>
                <input
                  required
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  value={externalForm.organizer}
                  onChange={e => setExternalForm({ ...externalForm, organizer: e.target.value })}
                  placeholder="e.g. IIT Madras / TechFest"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Event Date</label>
                  <input
                    required
                    type="date"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    value={externalForm.event_date}
                    onChange={e => setExternalForm({ ...externalForm, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Achievement Type</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    value={externalForm.achievement_type}
                    onChange={e => setExternalForm({ ...externalForm, achievement_type: e.target.value })}
                  >
                    <option value="Participation">Participation</option>
                    <option value="Winner">Winner</option>
                    <option value="Runner Up">Runner Up</option>
                    <option value="Special Mention">Special Mention</option>
                    <option value="Hackathon finalist">Hackathon Finalist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Position / Rank (Optional)</label>
                <input
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  value={externalForm.position}
                  onChange={e => setExternalForm({ ...externalForm, position: e.target.value })}
                  placeholder="e.g. 1st Place, Top 10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Certificate (PDF/Img)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => setExternalForm({ ...externalForm, certificate_file: e.target.files[0] })}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-dashed border-indigo-200 p-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Proof / Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setExternalForm({ ...externalForm, proof_file: e.target.files[0] })}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-all border border-dashed border-purple-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 active:scale-95"
                >
                  {loading ? "Submitting..." : "Submit Achievement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
          {!event.is_registered && event.status === "Upcoming" && event.event_type !== 'External' && (
            <button
              disabled={loading}
              onClick={() => onRegister(event.id)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              Register for Event
            </button>
          )}

          {event.is_registered && event.status === "Upcoming" && (
            <div className="w-full py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-center font-bold text-sm">
              Registered ✓
            </div>
          )}

          {event.event_type === 'External' && event.external_registration_link && (
            <a
              href={event.external_registration_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white shadow-md text-center font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              Visit Registration Site ↗
            </a>
          )}

          <button
            onClick={() => document.dispatchEvent(new CustomEvent('openEventModal', { detail: event }))}
            className="w-full py-2.5 rounded-xl border-2 border-indigo-600 text-indigo-700 font-bold hover:bg-indigo-50 transition-colors"
          >
            View Details
          </button>
        </div>

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
  );
}
