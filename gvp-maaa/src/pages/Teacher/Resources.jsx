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

  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Notes");
  const [newDesc, setNewDesc] = useState("");
  const [newFile, setNewFile] = useState(null);

  const token = localStorage.getItem("access_token");

  /* ================= FETCH LOGIC ================= */

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchResources();
    }
  }, [selectedSubject]);

  async function fetchSubjects() {
    try {
      setSubjectsLoading(true);
      const res = await fetch("http://localhost:8000/faculty/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0].subject_id);
        }
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
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
      const res = await fetch(`http://localhost:8000/faculty/resource-access/${resource.id}`, {
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

  /* ================= UPLOAD LOGIC ================= */

  function handlePreUpload() {
    if (!newTitle || !newFile || !selectedSubject) {
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
              {["All", "Notes", "PPT", "Assignment", "Reference", "Link"].map((o) => (
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
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5">
            <h3 className="text-lg font-semibold">Upload Material to {getSubjectName()}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Resource Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Resource Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border bg-white"
                >
                  {["Notes", "PPT", "Assignment", "Reference", "Link"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Resource Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl border resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Upload File</label>
                <input
                  type="file"
                  onChange={(e) => setNewFile(e.target.files[0])}
                  className="w-full mt-1 p-2 rounded-xl border bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUpload(false)}
                className="px-5 py-2 rounded-xl border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreUpload}
                className="px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700"
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
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center justify-center gap-4 transform transition-transform scale-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">Resource Published</h3>
              <p className="text-sm text-gray-500 mt-1">Material uploaded to {getSubjectName()}</p>
            </div>
          </div>
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
                    const dateStr = d.toLocaleDateString();
                    return (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">{a.student_name}</span>
                        <span className="text-sm text-gray-500">{dateStr} {timeStr}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="pt-4 border-t mt-3 flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">Close</button>
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
                    <span className="text-gray-600 font-medium">Accessed</span>
                    <span className="text-indigo-600 font-bold">{r.accessed} <span className="text-gray-400 font-normal">/ {r.total_students} students</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
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