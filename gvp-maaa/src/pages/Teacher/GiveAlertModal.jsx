import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";
import InfoIcon from "@mui/icons-material/Info";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

export default function GiveAlertModal({ onClose }) {
  const [alertType, setAlertType] = useState("Announcement");
  const [targetMode, setTargetMode] = useState("class"); // class, multiple_classes, students
  const [message, setMessage] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searching, setSearching] = useState(false);

  const [showRecheck, setShowRecheck] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("http://localhost:8000/faculty/subjects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubject(data[0].subject_id);
          }
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    }
    if (token) fetchSubjects();
  }, [token]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`http://localhost:8000/faculty/search-students?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);

  const canSend = (() => {
    if (message.length < 5) return false;
    if (targetMode === "class" && !selectedSubject) return false;
    if (targetMode === "multiple_classes" && selectedSubjects.length === 0) return false;
    if (targetMode === "students" && selectedStudents.length === 0) return false;
    return true;
  })();

  /* ================= CONFIG ================= */
  const ALERT = {
    Emergency: {
      btn: "bg-red-600 hover:bg-red-700",
      ring: "ring-red-400",
      bg: "bg-red-50",
      icon: <WarningIcon fontSize="small" />,
      emoji: "🚨",
      anim: "animate-alertEmergency",
    },
    Announcement: {
      btn: "bg-amber-500 hover:bg-amber-600",
      ring: "ring-amber-400",
      bg: "bg-amber-50",
      icon: <CampaignIcon fontSize="small" />,
      emoji: "📢",
      anim: "animate-alertAnnouncement",
    },
    Info: {
      btn: "bg-blue-600 hover:bg-blue-700",
      ring: "ring-blue-400",
      bg: "bg-blue-50",
      icon: <InfoIcon fontSize="small" />,
      emoji: "ℹ️",
      anim: "animate-alertInfo",
    },
    Reminder: {
      btn: "bg-purple-600 hover:bg-purple-700",
      ring: "ring-purple-400",
      bg: "bg-purple-50",
      icon: <NotificationsActiveIcon fontSize="small" />,
      emoji: "⏳",
      anim: "animate-alertInfo",
    },
  };

  const active = ALERT[alertType];

  const handleFinalSend = async () => {
    setSending(true);
    try {
      const payload = {
        type: alertType,
        message: message,
        target: targetMode,
      };
      if (targetMode === "class") payload.subject_id = selectedSubject;
      if (targetMode === "multiple_classes") payload.subject_ids = selectedSubjects;
      if (targetMode === "students") payload.student_ids = selectedStudents.map(s => s.student_id);

      const res = await fetch("http://localhost:8000/faculty/send-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSentCount(data.students_targeted || 0);
        setShowRecheck(false);
        setSuccess(true);
        setTimeout(onClose, 2600);
      } else {
        alert("Failed to send alert");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending alert");
    } finally {
      setSending(false);
      setShowRecheck(false);
    }
  };

  const toggleSubject = (sid) => {
    setSelectedSubjects(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  const addStudent = (student) => {
    if (!selectedStudents.find(s => s.student_id === student.student_id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setSearchQuery("");
  };

  const removeStudent = (sid) => {
    setSelectedStudents(selectedStudents.filter(s => s.student_id !== sid));
  };

  return (
    <>
      {/* ================= MAIN MODAL ================= */}
      {!success && !showRecheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Send Alert</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
            </div>

            {/* BODY */}
            <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1">

              {/* ALERT TYPE */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Alert Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(ALERT).map(type => (
                    <button
                      key={type}
                      onClick={() => setAlertType(type)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${alertType === type
                          ? `${ALERT[type].bg} ring-2 ${ALERT[type].ring} border-transparent text-gray-800`
                          : "hover:bg-gray-50 text-gray-600"
                        }`}
                    >
                      {ALERT[type].icon}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* TARGET MODE */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Send To</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {[
                    { id: "class", label: "Whole Class" },
                    { id: "multiple_classes", label: "Multiple Classes" },
                    { id: "students", label: "Specific Students" }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setTargetMode(m.id)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${targetMode === m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TARGET DYNAMIC CONTENT */}
              <div className="min-h-[100px] bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {targetMode === "class" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Target Class</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-100 outline-none bg-white font-medium text-gray-700"
                    >
                      {subjects.length === 0 && <option value="">Loading subjects...</option>}
                      {subjects.map(s => (
                        <option key={s.subject_id} value={s.subject_id}>
                          {s.subject_name} ({s.year}-{s.section})
                        </option>
                      ))}
                    </select>
                    {selectedSubject && <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1 font-medium"><InfoIcon sx={{ fontSize: 14 }} /> Alert will be sent to all students in this class.</p>}
                  </div>
                )}

                {targetMode === "multiple_classes" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Classes</label>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                      {subjects.map(s => (
                        <label key={s.subject_id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition border border-transparent hover:border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(s.subject_id)}
                            onChange={() => toggleSubject(s.subject_id)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">{s.subject_name} ({s.year}-{s.section})</span>
                        </label>
                      ))}
                    </div>
                    {selectedSubjects.length > 0 && <p className="text-xs font-semibold text-indigo-600 mt-2">{selectedSubjects.length} classes selected</p>}
                  </div>
                )}

                {targetMode === "students" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Search Student</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name or roll no..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-sm"
                      />
                      {searching && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</span>}

                      {searchQuery.length >= 2 && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map(st => (
                            <div
                              key={st.student_id}
                              onClick={() => addStudent(st)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                            >
                              <span className="font-medium text-sm">{st.name}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{st.roll_no}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedStudents.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Selected Students ({selectedStudents.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedStudents.map(st => (
                            <div key={st.student_id} className="flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg shadow-sm text-sm">
                              <span className="font-medium">{st.name}</span>
                              <button onClick={() => removeStudent(st.student_id)} className="text-gray-400 hover:text-red-500 ml-1"><CloseIcon sx={{ fontSize: 14 }} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MESSAGE */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Alert Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the alert message here…"
                  className="w-full p-3 border rounded-xl resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition text-sm bg-gray-50 focus:bg-white"
                />
              </div>

            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50/50 rounded-b-2xl">
              <span className="text-xs text-gray-400 font-medium tracking-wide">
                {targetMode === "class" ? "Targeting complete class" : targetMode === "multiple_classes" ? `Targeting ${selectedSubjects.length} classes` : `Targeting ${selectedStudents.length} students`}
              </span>
              <button
                disabled={!canSend}
                onClick={() => setShowRecheck(true)}
                className={`px-6 py-2.5 rounded-xl text-white font-medium transition shadow-sm ${canSend ? active.btn : "bg-gray-300 cursor-not-allowed text-gray-500 shadow-none"
                  }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RECHECK ================= */}
      {showRecheck && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Confirm Alert details</h3>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Alert Type</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${ALERT[alertType].bg} ${ALERT[alertType].btn.split(' ')[0].replace('bg-', 'text-')}`}>{alertType}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Target</span>
                <span className="font-semibold text-right max-w-[60%]">
                  {targetMode === 'class' ? "Whole Class" : targetMode === 'multiple_classes' ? `${selectedSubjects.length} Classes` : `${selectedStudents.length} Students`}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Message</span>
                <p className="bg-gray-50 border border-gray-100 p-3 rounded-xl italic break-words">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowRecheck(false)}
                disabled={sending}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 border border-transparent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSend}
                disabled={sending}
                className={`px-6 py-2.5 rounded-xl font-medium text-white shadow-sm flex items-center justify-center gap-2 ${active.btn} ${sending ? 'opacity-80 cursor-wait' : ''}`}
              >
                {sending ? 'Sending...' : 'Send Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS POPUP ================= */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 text-center text-white shadow-2xl ${active.btn.split(' ')[0]} ${active.anim}`}>
            <div className="text-4xl mb-3 drop-shadow-md">{active.emoji}</div>
            <h3 className="text-xl font-bold mb-1 tracking-wide">Alert Sent Successfully</h3>
            <p className="text-sm font-medium opacity-90 mb-4">
              Alert was delivered to {sentCount} students.
            </p>
            <div className="bg-black/10 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wider mb-1">Message Preview:</p>
              <p className="text-sm line-clamp-2">{message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
