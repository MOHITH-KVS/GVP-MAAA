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

  // External Submissions
  const [activeTab, setActiveTab] = useState("events"); // "events" | "submissions"
  const [submissions, setSubmissions] = useState([]);
  const [submissionsError, setSubmissionsError] = useState(false);

  // Filters for Events List
  const [filterYear, setFilterYear] = useState("All");
  const [filterSection, setFilterSection] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Create Event Form Type State
  const [createEventType, setCreateEventType] = useState("Internal"); // Internal or External

  // Filters for Attendance Table
  const [searchStudent, setSearchStudent] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("All");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [alertTarget, setAlertTarget] = useState("all");
  const [alertType, setAlertType] = useState("announcement");
  const [alertMessage, setAlertMessage] = useState("");
  const [tempFormData, setTempFormData] = useState(null);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchEvents();
    fetchSubmissions();
  }, []);

  useEffect(() => {
    const selectedEventDetails = events.find(e => e.id === selectedEventId);
    if (selectedEventId && selectedEventDetails && selectedEventDetails.event_type === 'Internal' && (selectedEventDetails.status === 'Ongoing' || selectedEventDetails.status === 'Completed')) {
      fetchAttendance(selectedEventId);
    } else {
      setAttendanceData(null);
    }
  }, [selectedEventId, events]);

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

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setSubmissionsError(false);
      const res = await axios.get(`${API_URL}/faculty/external-submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data);
    } catch (err) {
      // If it's a network error (no response) or CORS, show the fallback UI instead of a red banner
      if (!err.response) {
        setSubmissionsError(true);
      } else {
        setErrorMsg("Failed to load submissions");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmission = async (id, status) => {
    try {
      setLoading(true);
      await axios.patch(`${API_URL}/faculty/external-submissions/${id}/status?status=${status}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg(`Submission ${status} successfully`);
      fetchSubmissions();
    } catch (err) {
      setErrorMsg(`Failed to ${status} submission`);
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
      if (res.data.message && res.data.students.length === 0) {
        // Optional: show info msg instead of error
        console.log("Attendance Info:", res.data.message);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("Failed to load attendance roster");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (formDataObj) => {

  const data = {
    title: formDataObj.get("title"),
    description: formDataObj.get("description"),
    event_type: createEventType,
    event_date: formDataObj.get("event_date"),
    location: formDataObj.get("location"),
    year: formDataObj.get("year"),
    section: formDataObj.get("section"),

    organizer: formDataObj.get("organizer"),
    venue: formDataObj.get("venue"),
    max_participants: createEventType === "Internal" ? formDataObj.get("max_participants") || null : null,
    registration_deadline: createEventType === "Internal" ? formDataObj.get("registration_deadline") || null : null,
    external_registration_link: createEventType === "External" ? formDataObj.get("external_registration_link") : null,
  };

  try {
    setLoading(true);

    await axios.post(`${API_URL}/faculty/events`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setShowConfirmModal(false);
    setShowCreateModal(false);

    setShowSuccessAnimation(true);

    fetchEvents();

    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, 2200);

  } catch (err) {
    setErrorMsg("Failed to create event");
  } finally {
    setLoading(false);
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

      {/* SECTION 1: TABS & FILTERS */}
      <div className="flex gap-4 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors ${activeTab === "events" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}
        >
          My Events
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors ${activeTab === "submissions" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}
        >
          External Submissions {submissions.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{submissions.length}</span>}
        </button>
      </div>

      {activeTab === "events" && (
        <>
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex flex-wrap gap-4">
            <FilterSelect label="Year" value={filterYear} onChange={setFilterYear} options={["All", "1", "2", "3", "4"]} />
            <FilterSelect label="Section" value={filterSection} onChange={setFilterSection} options={["All", "A", "B", "C", "D"]} />
            <FilterSelect label="Event Type" value={filterType} onChange={setFilterType} options={["All", "Internal", "External"]} />
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

                      <div className="flex justify-between items-center text-sm border-t border-gray-100/50 pt-3 mt-4">
                        {e.event_type === 'Internal' ? (
                          <>
                            <span className="text-gray-600 font-medium">Reg: {e.total_students}</span>
                            <span className="text-green-600 font-medium">Prs: {e.present_count}</span>
                            <span className="text-red-600 font-medium">Abs: {e.absent_count}</span>
                          </>
                        ) : (
                          <span className="text-blue-600 font-medium w-full text-center">External Event</span>
                        )}
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
                  {selectedEventDetails.status !== 'Upcoming' && selectedEventDetails.event_type !== 'External' && (
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
                  )}
                  {selectedEventDetails.event_type === 'External' && (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center mb-2">
                      <p className="text-sm font-medium text-blue-700 italic">This is an external event. Attendance tracking is not required.</p>
                    </div>
                  )}
                  {selectedEventDetails.status === 'Upcoming' && selectedEventDetails.event_type !== 'External' && (
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center mb-2">
                      <p className="text-sm font-medium text-indigo-700 italic">Attendance will be available when the event starts.</p>
                    </div>
                  )}
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

                  {(selectedEventDetails.status === 'Ongoing' || selectedEventDetails.status === 'Completed') && selectedEventDetails.event_type === 'Internal' ? (
                    <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {attendanceData ? (
                        attendanceData.students.length > 0 ? (
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
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${student.attendance_status === 'present' ? 'bg-green-100 text-green-700' : student.attendance_status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {student.attendance_status === 'present' ? 'Present' : student.attendance_status === 'absent' ? 'Absent' : 'Not Marked'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <select
                                      className="text-xs p-1.5 border border-gray-200 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                      value={student.result || "none"}
                                      onChange={(e) => handleMarkResult(student.student_id, e.target.value)}
                                      disabled={student.attendance_status !== 'present' || selectedEventDetails.status === 'Completed'}
                                    >
                                      <option value="none">None</option>
                                      <option value="participant">Participant</option>
                                      <option value="runner_up">Runner-up</option>
                                      <option value="winner">Winner</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      disabled={selectedEventDetails.status === 'Completed'}
                                      onClick={() => handleMarkAttendance(student.student_id, student.attendance_status === 'present' ? 'absent' : 'present')}
                                      className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {selectedEventDetails.status === 'Completed' ? 'Locked' : `Mark ${student.attendance_status === 'present' ? 'Absent' : 'Present'}`}
                                    </button>
                                  </td>
                                </tr>
                              )) : (
                                <tr><td colSpan="4" className="text-center py-6 text-gray-400">No students match your filter</td></tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="text-4xl mb-3">📅</div>
                            <p className="text-gray-500 font-medium">{attendanceData.message || "No registrations for this event."}</p>
                          </div>
                        )
                      ) : (
                        <p className="text-center text-gray-400 py-6">Loading attendance...</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <div className="text-3xl mb-2 opacity-50">📋</div>
                      <p className="text-gray-500 font-medium text-sm">
                        {selectedEventDetails.event_type === 'External'
                          ? "This is an external event. Attendance tracking is not required."
                          : selectedEventDetails.status === 'Upcoming'
                            ? "Attendance will be available when the event starts."
                            : "Event has completed. Please review final stats above."}
                      </p>
                    </div>
                  )}
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
        </>
      )}

      {activeTab === "submissions" && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white/50">
            <h3 className="font-bold text-lg text-gray-800">Pending External Submissions</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            {submissionsError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4 opacity-50">🌐</div>
                <h4 className="text-gray-800 font-bold text-lg">External submissions are currently unavailable.</h4>
                <p className="text-gray-500 text-sm mt-1">Please check your network connection or try again later.</p>
                <button onClick={fetchSubmissions} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition">Retry Connection</button>
              </div>
            ) : submissions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Student</th>
                    <th className="py-3 px-6 font-semibold">Event Details</th>
                    <th className="py-3 px-6 font-semibold">Achievement</th>
                    <th className="py-3 px-6 font-semibold">Files</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-800">{sub.student_name}</div>
                        <div className="text-xs text-gray-500">{sub.student_roll_no}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-800">{sub.event_name}</div>
                        <div className="text-xs text-gray-500">{sub.organizer}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{new Date(sub.event_date).toLocaleDateString()}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">{sub.achievement_type || 'General'}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 mt-1 uppercase">
                          {sub.position || 'Participant'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          {sub.certificate_file && (
                            <a href={`${API_URL}/${sub.certificate_file}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold">
                              📄 Certificate
                            </a>
                          )}
                          {sub.proof_file && (
                            <a href={`${API_URL}/${sub.proof_file}`} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-bold">
                              🔗 Proof
                            </a>
                          )}
                          {!sub.certificate_file && !sub.proof_file && <span className="text-xs text-gray-400">No files</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleReviewSubmission(sub.id, "approved")}
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewSubmission(sub.id, "rejected")}
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-400 font-medium">
                No pending submissions to review.
              </div>
            )}
          </div>
        </div>
      )}

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
                  <select required value={createEventType} onChange={(e) => setCreateEventType(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="Internal">Internal Event</option>
                    <option value="External">External Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
                  <input required type="date" name="event_date" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
              </div>

              {createEventType === "Internal" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Max Participants (Optional)</label>
                    <input type="number" name="max_participants" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Registration Deadline</label>
                    <input type="datetime-local" name="registration_deadline" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">External Registration Link</label>
                  <input required type="url" name="external_registration_link" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="https://example.com/register" />
                </div>
              )}

              {createEventType === "Internal" && (
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
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Location / Venue</label>
                  <input required type="text" name="venue" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="e.g. Seminar Hall" />
                  <input type="hidden" name="location" value="Default" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Organizer</label>
                  <input required type="text" name="organizer" className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="e.g. Google / IT Dept" />
                </div>
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

      {showConfirmModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">

          <div className="bg-white rounded-2xl p-6 w-[420px] text-center shadow-xl animate-fade-in">

            <h3 className="text-lg font-bold mb-3">
              Confirm Event Creation
            </h3>

            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to create this event?
              Students will receive alerts immediately.
            </p>

            <div className="flex justify-center gap-3">

              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => handleCreateEvent(tempFormData)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Proceed
              </button>

            </div>

          </div>

        </div>
      )}


      {showSuccessAnimation && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="bg-white p-10 rounded-2xl shadow-xl text-center animate-fade-in">

            <svg
              className="mx-auto mb-4"
              width="90"
              height="90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                className="circle-animation"
              />

              <path
                d="M30 52 L45 65 L70 40"
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="check-animation"
              />
            </svg>

            <h2 className="text-lg font-bold text-gray-800">
              Event Created Successfully
            </h2>

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
