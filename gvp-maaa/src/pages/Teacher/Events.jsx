import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";

const API_URL = "http://localhost:8000";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  // Filters for Events List
  const [filterYear, setFilterYear] = useState("All");
  const [filterSection, setFilterSection] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Filters for Attendance Table
  const [searchStudent, setSearchStudent] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("All");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTarget, setAlertTarget] = useState("all");
  const [alertType, setAlertType] = useState("announcement");
  const [alertMessage, setAlertMessage] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendance(selectedEventId);
    } else {
      setAttendanceData(null);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/faculty/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      setErrorMsg("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (eventId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/faculty/events/${eventId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData(res.data);
    } catch (err) {
      setErrorMsg("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      event_type: formData.get("event_type"),
      event_date: formData.get("event_date"),
      location: formData.get("location"),
      year: formData.get("year"),
      section: formData.get("section")
    };

    try {
      setLoading(true);
      await axios.post(`${API_URL}/faculty/events`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg("Event created successfully");
      setShowCreateModal(false);
      fetchEvents();
    } catch (err) {
      setErrorMsg("Failed to create event");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      await axios.patch(`${API_URL}/faculty/events/${selectedEventId}/attendance`, {
        student_id: studentId,
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg("Attendance updated");
      fetchAttendance(selectedEventId);
      fetchEvents(); // Update stats on cards
    } catch (err) {
      setErrorMsg("Failed to mark attendance");
    } finally {
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleMarkResult = async (studentId, resultValue) => {
    try {
      await axios.patch(`${API_URL}/faculty/events/result?event_id=${selectedEventId}`, {
        student_id: studentId,
        result: resultValue === "none" ? null : resultValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance(selectedEventId);
      setSuccessMsg("Result updated");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setErrorMsg("Cannot assign result to an absent student");
      } else {
        setErrorMsg("Failed to update result");
      }
    } finally {
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleSendReminder = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/faculty/events/${selectedEventId}/reminder`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg("Reminders sent successfully");
    } catch (err) {
      setErrorMsg("Failed to send reminders");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleSendAlert = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/faculty/events/${selectedEventId}/alert`, {
        type: alertType,
        message: alertMessage,
        target: alertTarget
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg("Alert sent successfully");
      setShowAlertModal(false);
      setAlertMessage("");
    } catch (err) {
      setErrorMsg("Failed to send alert");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterYear !== "All" && e.year.toString() !== filterYear) return false;
      if (filterSection !== "All" && e.section !== filterSection) return false;
      if (filterType !== "All" && e.event_type !== filterType) return false;
      if (filterStatus !== "All" && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterYear, filterSection, filterType, filterStatus]);

  // Filtered Students in Attendance Table
  const filteredStudents = useMemo(() => {
    if (!attendanceData) return [];
    return attendanceData.students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(searchStudent.toLowerCase()));
      const matchStatus = attendanceFilter === "All" ||
        (attendanceFilter === "Present" && s.attendance_status === "present") ||
        (attendanceFilter === "Absent" && s.attendance_status === "absent");
      return matchSearch && matchStatus;
    });
  }, [attendanceData, searchStudent, attendanceFilter]);

  const selectedEventDetails = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-8 relative">
      {/* HEADER & NOTIFICATIONS */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Events Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage class activities, attendance, and alerts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          + Create Event
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

      {/* SECTION 1: FILTERS */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex flex-wrap gap-4">
        <FilterSelect label="Year" value={filterYear} onChange={setFilterYear} options={["All", "1", "2", "3", "4"]} />
        <FilterSelect label="Section" value={filterSection} onChange={setFilterSection} options={["All", "A", "B", "C", "D"]} />
        <FilterSelect label="Event Type" value={filterType} onChange={setFilterType} options={["All", "Workshop", "Seminar", "Guest Lecture", "Hackathon", "Internal Event", "Other"]} />
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", "Upcoming", "Ongoing", "Completed"]} />
      </div>

      {/* SECTION 2 & 3: MAIN LAYOUT */}
      <div className="flex gap-6 flex-col lg:flex-row items-start">

        {/* LEFT COLUMN: EVENTS GRID */}
        <div className={`transition-all duration-300 w-full ${selectedEventId ? 'lg:w-[40%] xl:w-[45%]' : 'lg:w-full'}`}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Events ({filteredEvents.length})</h2>
          {loading && !events.length ? (
            <p className="text-gray-500">Loading events...</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-2xl">No events found matching your filters.</p>
          ) : (
            <div className={`grid gap-4 ${selectedEventId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredEvents.map(e => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEventId(e.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedEventId === e.id ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500" : "bg-white border-gray-100 hover:border-indigo-100 hover:shadow-md"}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-800 break-words">{e.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' : e.status === 'Ongoing' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{e.event_type} • {e.location}</p>
                  <p className="text-xs font-medium text-gray-400 mb-4">{new Date(e.event_date).toLocaleDateString()} • {e.year === 'All' ? 'All Yrs' : `Yr ${e.year}`} {e.section === 'All' ? 'All Sec' : `Sec ${e.section}`}</p>

                  <div className="flex justify-between items-center text-sm border-t border-gray-100/50 pt-3">
                    <span className="text-gray-600 font-medium">Reg: {e.total_students}</span>
                    <span className="text-green-600 font-medium">Prs: {e.present_count}</span>
                    <span className="text-red-600 font-medium">Abs: {e.absent_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SELECTED EVENT & ATTENDANCE */}
        {selectedEventId && selectedEventDetails && (
          <div className="w-full lg:w-[60%] xl:w-[55%] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:sticky lg:top-6 transition-all duration-300">

            {/* OVERVIEW CONTENT */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 relative">
              <button
                onClick={() => setSelectedEventId(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-white rounded-full p-1"
              >
                <CloseIcon />
              </button>

              <div className="flex justify-between items-start mb-4 pr-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedEventDetails.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{new Date(selectedEventDetails.event_date).toLocaleDateString()} • {selectedEventDetails.location}</p>
                  <p className="text-sm font-medium text-indigo-600 mt-1">Class: {selectedEventDetails.year === 'All' ? 'All Years' : `Year ${selectedEventDetails.year}`} - {selectedEventDetails.section === 'All' ? 'All Sections' : `Section ${selectedEventDetails.section}`}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAlertTarget("all");
                      setShowAlertModal(true);
                    }}
                    className="p-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition tooltip-wrap" title="Send Alert"
                  >
                    <CampaignIcon fontSize="small" className="text-indigo-600" />
                  </button>
                  <button
                    onClick={handleSendReminder}
                    className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium text-sm rounded-lg hover:bg-indigo-100 transition"
                  >
                    Remind Absent
                  </button>
                </div>
              </div>

              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                  <span className="block text-xs text-gray-500 mb-1">Total Reg</span>
                  <span className="font-bold text-gray-800">{selectedEventDetails.total_students}</span>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-center">
                  <span className="block text-xs text-green-700 mb-1">Present</span>
                  <span className="font-bold text-green-800">{selectedEventDetails.present_count}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                  <span className="block text-xs text-red-700 mb-1">Absent</span>
                  <span className="font-bold text-red-800">{selectedEventDetails.absent_count}</span>
                </div>
              </div>
            </div>

            {/* EVENT ANALYTICS (PLACEHOLDERS) */}
            <div className="p-6 border-b border-gray-100">
              <h4 className="font-semibold text-gray-700 text-sm mb-3">Event Analytics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border border-gray-100 rounded-xl flex items-center justify-center bg-gray-50 h-20 text-xs text-gray-400 text-center">Attendance Ratio (Donut Chart)</div>
                <div className="p-3 border border-gray-100 rounded-xl flex items-center justify-center bg-gray-50 h-20 text-xs text-gray-400 text-center">Participation Trend (Line Chart)</div>
                <div className="p-3 border border-gray-100 rounded-xl flex items-center justify-center bg-gray-50 h-20 text-xs text-gray-400 text-center">Alert Engagement (Bar Chart)</div>
              </div>
            </div>

            {/* ATTENDANCE TABLE */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Attendance Roster</h3>
                <select
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-100"
                  value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)}
                >
                  <option value="All">All Students</option>
                  <option value="Present">Present Only</option>
                  <option value="Absent">Absent Only</option>
                </select>
              </div>

              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search name or roll number..."
                  value={searchStudent} onChange={e => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {attendanceData ? (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)] z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-gray-500 font-medium">Name & Roll</th>
                        <th className="py-2.5 px-3 text-gray-500 font-medium w-24">Status</th>
                        <th className="py-2.5 px-3 text-gray-500 font-medium w-36">Result</th>
                        <th className="py-2.5 px-3 text-gray-500 font-medium text-right w-28">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <tr key={student.student_id} className="hover:bg-gray-50/50 group">
                          <td className="py-3 px-3">
                            <div className="font-medium text-gray-800">{student.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{student.roll_no}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${student.attendance_status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {student.attendance_status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              className="text-xs p-1.5 border border-gray-200 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              value={student.result || "none"}
                              onChange={(e) => handleMarkResult(student.student_id, e.target.value)}
                              disabled={student.attendance_status === 'absent'}
                            >
                              <option value="none">None</option>
                              <option value="participant">Participant</option>
                              <option value="runner_up">Runner-up</option>
                              <option value="winner">Winner</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleMarkAttendance(student.student_id, student.attendance_status === 'present' ? 'absent' : 'present')}
                              className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 transition-colors"
                            >
                              Mark {student.attendance_status === 'present' ? 'Absent' : 'Present'}
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="3" className="text-center py-6 text-gray-400">No students match your filter</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-400 py-6">Loading attendance...</p>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3 justify-center">
              <button
                onClick={() => { setAlertTarget("all"); setShowAlertModal(true); }}
                className="text-xs font-semibold text-gray-700 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition"
              >
                Alert All
              </button>
              <button
                onClick={() => { setAlertTarget("absent"); setShowAlertModal(true); }}
                className="text-xs font-semibold text-gray-700 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition"
              >
                Alert Absent
              </button>
              <button
                onClick={() => { setAlertTarget("present"); setShowAlertModal(true); }}
                className="text-xs font-semibold text-gray-700 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition"
              >
                Alert Present
              </button>
            </div>

          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-xl text-gray-800">Create Event</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Event Title</label>
                <input required type="text" name="title" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none" placeholder="e.g. AI & ML Workshop" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Event Type</label>
                  <select required name="event_type" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Select Type</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Guest Lecture">Guest Lecture</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Internal Event">Internal Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
                  <input required type="date" name="event_date" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Target Year</label>
                  <select name="year" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="All">All</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Target Section</label>
                  <select name="section" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="All">All</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Location / Venue</label>
                <input required type="text" name="location" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="e.g. Seminar Hall" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description (Optional)</label>
                <textarea name="description" rows={3} className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Details about the event..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md hover:shadow-lg transition flex items-center gap-2">
                  {loading ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl text-gray-800">Send Event Alert</h3>
              <button onClick={() => setShowAlertModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2">
              <CampaignIcon className="text-indigo-600" />
              <div className="text-sm text-indigo-800 font-medium">Sending to: <b>{alertTarget.toUpperCase()}</b> students</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Alert Type</label>
              <select value={alertType} onChange={e => setAlertType(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none">
                <option value="announcement">Announcement</option>
                <option value="emergency">Emergency / Important</option>
                <option value="info">Information</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
              <textarea
                value={alertMessage} onChange={e => setAlertMessage(e.target.value)}
                rows={4}
                placeholder="Type your message here..."
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAlertModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSendAlert} disabled={!alertMessage || loading} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md transition disabled:opacity-50">
                {loading ? "Sending..." : "Send Alert"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponent for simple filters
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer transition-all"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
