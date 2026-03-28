import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";

export default function UploadResourceModal({ onClose }) {
  const [type, setType] = useState("Study Material");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem("access_token");

  // Fetch subjects for the dropdown
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("http://localhost:8000/faculty/subjects", {
          headers: { Authorization: `Bearer ${token}` }
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
          if (data.length > 0) setSubject(data[0].subject_id);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    }
    if (token) fetchSubjects();
  }, [token]);

  const canPublish = type && subject && title && file && !uploading;

  const handleFinalPublish = async () => {
    if (!canPublish) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("subject_id", subject);
      formData.append("type", type);
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/faculty/upload-resource", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setSuccess(true);
        window.dispatchEvent(new Event("resourceUploaded"));
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        const err = await res.json();
        alert("Upload failed: " + JSON.stringify(err));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* ================= MAIN MODAL ================= */}
      {!success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-xl font-bold text-gray-800">Upload Resource</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type segmented buttons */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Resource Type</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {["Study Material", "Assignment", "Notice", "External Link", "Other"].map(o => (
                    <button
                      key={o}
                      onClick={() => setType(o)}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === o ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Academic Target (Subject)</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-700 font-medium cursor-pointer"
                >
                  {subjects.length === 0 && <option value="">Loading subjects...</option>}
                  {subjects.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_name} ({s.year}-{s.section})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Machine Learning Unit 3 Notes"
                  className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Description <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full p-2.5 rounded-xl border resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              {/* Drag Drop File */}
              {type !== "External Link" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 block">Upload File</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors group">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {!file ? (
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
                          <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                          <span className="text-green-500 font-bold ml-auto">✔</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 border border-transparent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalPublish}
                disabled={!canPublish}
                className={`px-6 py-2.5 rounded-xl font-medium text-white transition-all shadow-sm ${(!canPublish) ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} flex items-center justify-center gap-2`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Publishing...
                  </>
                ) : 'Publish Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS ANIMATION MODAL ================= */}
      {success && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center justify-center gap-4 transform transition-transform scale-100 animate-[pulse_0.5s_ease-out]">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center relative shadow-inner animate-[popIn_0.4s_ease-out]">
              <svg className="w-10 h-10 animate-[drawCheck_0.5s_ease-out_forwards]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ strokeDasharray: 50, strokeDashoffset: 50 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center animate-[fadeIn_0.5s_ease-out_0.2s_both]">
              <h3 className="text-lg font-bold text-gray-800">Resource Published Successfully</h3>
              <p className="text-sm text-gray-500 mt-2">{title || "Material"} has been published successfully and students have been notified.</p>
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
    </>
  );
}
