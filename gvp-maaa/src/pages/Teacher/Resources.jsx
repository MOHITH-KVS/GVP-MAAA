import { useState, useEffect } from "react";

export default function Resources() {

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [type, setType] = useState("All");

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Modals state
  const [showUpload, setShowUpload] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Analytics detail modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeResource, setActiveResource] = useState(null);
  const [accessDetails, setAccessDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Notes");
  const [newDesc, setNewDesc] = useState("");
  const [newFile, setNewFile] = useState(null);

  const token = localStorage.getItem("token");

  /* ================= FETCH LOGIC ================= */

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchResources();
    }

    // Listen for global uploads from the Quick Actions modal
    const handleGlobalUpload = () => {
      if (selectedSubject) {
        fetchResources();
      }
    };
    window.addEventListener("resourceUploaded", handleGlobalUpload);
    return () => window.removeEventListener("resourceUploaded", handleGlobalUpload);
  }, [selectedSubject]);

  async function fetchSubjects() {
    try {
      setSubjectsLoading(true);
      console.log("TOKEN:", token);
      const res = await fetch("http://localhost:8000/faculty/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0].subject_id);
        }
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }

  async function fetchResources() {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:8000/faculty/resources/${selectedSubject}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setResources(data);
      } else {
        setResources([]);
      }
    } catch (err) {
      console.error("Error loading resources:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccessDetails(resource) {
    setActiveResource(resource);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setAccessDetails([]);
    try {
      const res = await fetch(`http://localhost:8000/faculty/resource-access-details/${resource.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccessDetails(data);
      } else {
        console.error("Failed to load details");
      }
    } catch (err) {
      console.error("Error loading access details:", err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSendReminder() {
    if (!activeResource) return;
    try {
      setSendingReminder(true);
      const res = await fetch(`http://localhost:8000/faculty/send-resource-reminder/${activeResource.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Reminder sent directly to ${data.sent_count} students!`);
      } else {
        const err = await res.json();
        alert("Failed to send reminder: " + (err.detail || ""));
      }
    } catch (e) {
      console.error(e);
      alert("Error sending reminder.");
    } finally {
      setSendingReminder(false);
    }
  }

  /* ================= UPLOAD LOGIC ================= */

  function handlePreUpload() {
    if (!newTitle || !newFile) {
      alert("Please fill all required fields");
      return;
    }
    setShowUpload(false);
    setShowConfirmModal(true);
  }

  async function handleConfirmUpload() {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("title", newTitle);
      formData.append("description", newDesc);
      formData.append("subject_id", selectedSubject);
      formData.append("type", newType);
      formData.append("file", newFile);

      const res = await fetch("http://localhost:8000/faculty/upload-resource", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setShowConfirmModal(false);
        // Show success animation
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          // Reset form
          setNewTitle("");
          setNewDesc("");
          setNewType("Notes");
          setNewFile(null);
          // Refresh resources
          fetchResources();
        }, 2000);
      } else {
        const errorData = await res.json();
        alert("Upload failed: " + JSON.stringify(errorData));
        setShowConfirmModal(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
      setShowConfirmModal(false);
    } finally {
      setUploading(false);
    }
  }

  /* ================= FILTER ================= */

  const filteredResources = resources.filter((r) => {
    return type === "All" || r.type === type;
  });

  const getSubjectName = () => {
    const s = subjects.find(s => String(s.subject_id) === String(selectedSubject));
    return s ? `${s.subject_name} (${s.year}-${s.section})` : "";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-12">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-sm text-gray-500">
          Upload and manage learning materials by subject
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-[44px] w-56 px-3 rounded-xl border bg-white"
              disabled={subjectsLoading || subjects.length === 0}
            >
              {subjectsLoading ? (
                <option value="">Loading...</option>
              ) : subjects.length === 0 ? (
                <option value="">No subjects assigned</option>
              ) : (
                subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name} ({s.year}-{s.section})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-[44px] w-40 px-3 rounded-xl border bg-white"
            >
              {["All", "Notes", "PPT", "Assignment", "Reference", "Link", "Other"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              disabled={!selectedSubject}
              className={`h-[44px] px-7 rounded-xl font-medium ${!selectedSubject ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              Upload Resource
            </button>
          </div>

        </div>
      </div>

      {/* UPLOAD PANEL */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Upload Material to {getSubjectName()}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Resource Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Machine Learning Unit 3 Notes"
                  className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Resource Type</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {["Notes", "PPT", "Assignment", "Reference", "Other"].map(o => (
                    <button
                      key={o}
                      onClick={() => setNewType(o)}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${newType === o ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Description <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full p-2.5 rounded-xl border resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Upload File</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors group">
                  <input
                    type="file"
                    onChange={(e) => setNewFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {!newFile ? (
                    <>
                      <div className="w-10 h-10 mb-2 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p className="text-sm font-medium text-gray-600">Drag file here or click to upload</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 w-full max-w-[80%] mx-auto">
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm w-full">
                        <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                        <span className="text-sm font-medium text-gray-700 truncate">{newFile.name}</span>
                        <span className="text-green-500 font-bold ml-auto">✔</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowUpload(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 border border-transparent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePreUpload}
                disabled={!newTitle || !newFile}
                className={`px-6 py-2.5 rounded-xl font-medium text-white transition-all shadow-sm ${(!newTitle || !newFile) ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                Publish Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Confirm Resource Upload</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">Title:</span> {newTitle}</p>
              <p><span className="font-semibold text-gray-800">Subject:</span> {getSubjectName()}</p>
              <p><span className="font-semibold text-gray-800">Type:</span> {newType}</p>
              <p><span className="font-semibold text-gray-800">File:</span> {newFile?.name}</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowUpload(true); // Let them edit if they want
                }}
                disabled={uploading}
                className="px-4 py-2 rounded-xl text-gray-600 border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className={`px-4 py-2 rounded-xl text-white ${uploading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {uploading ? 'Uploading...' : 'Confirm Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS ANIMATION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center justify-center gap-4 transform transition-transform scale-100 animate-[pulse_0.5s_ease-out]">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center relative shadow-inner animate-[popIn_0.4s_ease-out]">
              <svg className="w-10 h-10 animate-[drawCheck_0.5s_ease-out_forwards]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ strokeDasharray: 50, strokeDashoffset: 50 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center animate-[fadeIn_0.5s_ease-out_0.2s_both]">
              <h3 className="text-lg font-bold text-gray-800">Resource Published Successfully</h3>
              <p className="text-sm text-gray-500 mt-2">{newTitle || "Material"} has been published successfully and students have been notified.</p>
            </div>
          </div>
          <style>{`
            @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
            }
            @keyframes popIn {
              0% { transform: scale(0); opacity: 0; }
              80% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Access Details</h3>
                <p className="text-sm text-gray-500">{activeResource.title}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {detailsLoading ? (
                <p className="text-gray-500 text-center py-4">Loading access records...</p>
              ) : accessDetails.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No students have accessed this resource yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accessDetails.map((a, idx) => {
                    const d = new Date(a.accessed_at);
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                      <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-gray-800 text-sm block">{a.name}</span>
                            <span className="text-xs text-gray-500 font-medium">Roll No: {a.roll_no}</span>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-md font-semibold tracking-wide capitalize ${a.action_type === 'download' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'}`}>
                            {a.action_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>{dateStr} {timeStr}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* REMINDER BOX (Only show if there are un-accessed students, deduced by total_students vs access count) */}
            {!detailsLoading && activeResource.total_students > activeResource.accessed && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-orange-800 font-semibold text-sm">Low Engagement Warning</h4>
                  <p className="text-orange-600 text-xs mt-0.5">Only {activeResource.accessed} of {activeResource.total_students} students engaged.</p>
                </div>
                <button
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {sendingReminder ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            )}

            <div className="pt-4 border-t mt-3 flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium tracking-wide">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE LIST */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h3 className="text-lg font-semibold">Uploaded Resources</h3>

        {loading && (
          <p className="text-gray-500">Loading resources...</p>
        )}

        {!loading && !selectedSubject && (
          <p className="text-gray-400">Please select a subject to view resources</p>
        )}

        {!loading && selectedSubject && filteredResources.length === 0 && (
          <p className="text-gray-400">No resources uploaded yet for this subject</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!loading && filteredResources.map((r) => {

            const percent =
              r.total_students > 0
                ? Math.round((r.accessed / r.total_students) * 100)
                : 0;

            // Format date
            const dateObj = new Date(r.created_at);
            const dateString = dateObj.toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric"
            });

            return (
              <div key={r.id} className="rounded-2xl bg-white/70 p-5 space-y-4 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{r.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium mr-2">{r.type}</span>
                      Uploaded {dateString}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton label="View Details" onClick={() => fetchAccessDetails(r)} />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-600 font-medium tracking-wide text-xs uppercase">Accessed by</span>
                    <span className="text-indigo-600 font-bold">{r.accessed} <span className="text-gray-400 font-normal">/ {r.total_students} students</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center bg-gray-50/80 p-2.5 rounded-xl border border-gray-100/60">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </div>
                      <span className="text-gray-600 font-medium">Downloaded by</span>
                    </div>
                    <span className="text-gray-800 font-bold bg-white px-3 py-1 rounded-lg border shadow-sm">{r.downloads || 0} students</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

/* REUSABLE COMPONENTS */

function ActionButton({ label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${danger
        ? "bg-red-50 text-red-600 hover:bg-red-100"
        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        }`}
    >
      {label}
    </button>
  );
}