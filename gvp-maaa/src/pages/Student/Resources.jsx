import { useState, useEffect } from "react";

const TYPE_STYLE = {
  PDF: "bg-red-100 text-red-700",
  PPT: "bg-orange-100 text-orange-700",
  Video: "bg-blue-100 text-blue-700",
  Notes: "bg-green-100 text-green-700",
  Assignment: "bg-indigo-100 text-indigo-700",
  Reference: "bg-purple-100 text-purple-700",
  Link: "bg-teal-100 text-teal-700"
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("All");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/student/resources", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setResources(data);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ===== SUBJECT LIST (DYNAMIC) ===== */
  const subjects = ["All", ...new Set(resources.map(r => r.subject))];

  /* ===== FILTER LOGIC ===== */
  const filteredResources = resources.filter((r) => {
    return subjectFilter === "All" || r.subject === subjectFilter;
  });

  /* ===== HANDLE VIEW/DOWNLOAD RESOURCE ===== */
  async function handleAction(resource, actionType) {
    try {
      await fetch(`http://localhost:8000/student/resource-access/${resource.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action_type: actionType })
      });
      // Assuming file_url is "uploads/resources/filename.ext"
      const fileUrl = `http://localhost:8000/${resource.file_url.replace(/\\/g, "/")}`;

      if (actionType === "view") {
        window.open(fileUrl, "_blank");
      } else if (actionType === "download") {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = resource.file_url.split('/').pop() || "resource";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(`Failed to record ${actionType} access`, err);
    }
  }

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">📚 Resources</h1>
        <p className="text-gray-500">
          Study materials organized by subject
        </p>
      </div>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="flex gap-6 flex-col md:flex-row">

        {/* ===== SUBJECT SIDE PANEL ===== */}
        <aside className="w-full md:w-56 glass rounded-2xl p-4 space-y-2 h-fit md:sticky top-4">
          <p className="text-xs uppercase text-gray-400 mb-2 font-semibold tracking-wider">Subjects</p>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition font-medium
                ${subjectFilter === sub
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-white/60"}`}
            >
              {sub}
            </button>
          ))}
        </aside>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 space-y-6">

          {/* RESOURCE LIST */}
          <div className="space-y-4">
            {loading ? (
              <div className="glass rounded-2xl p-6 text-center text-gray-500">
                Loading resources...
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <p>No resources found for this subject.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredResources.map((res, i) => (
                  <ResourceCard key={i} data={res} onAction={(type) => handleAction(res, type)} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function ResourceCard({ data, onAction }) {

  // Default color if type isn't matched
  const typeClasses = TYPE_STYLE[data.type] || "bg-gray-100 text-gray-700";

  const d = new Date(data.created_at);
  const dateStr = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-white/60 shadow-sm hover:shadow-md transition-shadow group bg-white/40">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-bold text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">{data.title}</h3>
        </div>
        <p className="text-sm text-gray-600 font-medium">
          {data.subject}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${typeClasses}`}>
            {data.type}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            • Uploaded on {dateStr}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-max mt-2 sm:mt-0">
        <button
          onClick={() => onAction("view")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-indigo-600 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View
        </button>
        <button
          onClick={() => onAction("download")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download
        </button>
      </div>
    </div>
  );
}
