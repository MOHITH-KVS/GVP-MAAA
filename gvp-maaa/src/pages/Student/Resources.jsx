import { useState } from "react";

/* ===== SAMPLE RESOURCES DATA ===== */
const RESOURCES = [
  {
    title: "DBMS Unit-1 Notes",
    subject: "DBMS",
    year: "3rd Year",
    type: "PDF",
    uploadedBy: "Faculty",
    date: "2025-09-05",
    size: "2.4 MB",
    new: true,
    downloaded: true,
    bookmarked: false,
  },
  {
    title: "Operating Systems PPT",
    subject: "OS",
    year: "3rd Year",
    type: "PPT",
    uploadedBy: "Faculty",
    date: "2025-09-01",
    size: "5.1 MB",
    new: false,
    downloaded: true,
    bookmarked: true,
  },
  {
    title: "Computer Networks – Recorded Lecture",
    subject: "CN",
    year: "3rd Year",
    type: "Video",
    uploadedBy: "Admin",
    date: "2025-08-28",
    size: "External Link",
    new: false,
    downloaded: false,
    bookmarked: true,
  },
  {
    title: "Previous Year Question Papers",
    subject: "DBMS",
    year: "2nd Year",
    type: "PDF",
    uploadedBy: "Admin",
    date: "2025-08-20",
    size: "3.8 MB",
    new: false,
    downloaded: false,
    bookmarked: false,
  },
];

const TYPE_STYLE = {
  PDF: "bg-red-100 text-red-700",
  PPT: "bg-orange-100 text-orange-700",
  Video: "bg-blue-100 text-blue-700",
};

export default function Resources() {
  const [yearFilter, setYearFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  /* ===== SUBJECT LIST (DYNAMIC) ===== */
  const subjects = ["All", ...new Set(RESOURCES.map(r => r.subject))];

  /* ===== FILTER LOGIC ===== */
  const filteredResources = RESOURCES.filter((r) => {
    const yearMatch = yearFilter === "All" || r.year === yearFilter;
    const subjectMatch = subjectFilter === "All" || r.subject === subjectFilter;
    return yearMatch && subjectMatch;
  });

  /* ===== STATS ===== */
  const stats = {
    total: filteredResources.length,
    new: filteredResources.filter(r => r.new).length,
    downloaded: filteredResources.filter(r => r.downloaded).length,
    bookmarked: filteredResources.filter(r => r.bookmarked).length,
  };

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">📚 Resources</h1>
        <p className="text-gray-500">
          Study materials organized by year and subject
        </p>
      </div>

      {/* ================= YEAR FILTER (TOP) ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`px-4 py-2 rounded-xl text-sm font-medium
              ${yearFilter === y
                ? "bg-indigo-600 text-white"
                : "bg-white/70 hover:bg-white"}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="flex gap-6">

        {/* ===== SUBJECT SIDE PANEL ===== */}
        <aside className="w-48 glass rounded-2xl p-4 space-y-2">
          <p className="text-xs uppercase text-gray-400 mb-2">Subjects</p>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition
                ${subjectFilter === sub
                  ? "bg-indigo-500/10 text-indigo-700"
                  : "hover:bg-white/60"}`}
            >
              {sub}
            </button>
          ))}
        </aside>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 space-y-6">

          {/* OVERVIEW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <OverviewCard title="Total" value={stats.total} />
            <OverviewCard title="New" value={stats.new} />
            <OverviewCard title="Downloaded" value={stats.downloaded} />
            <OverviewCard title="Bookmarked" value={stats.bookmarked} />
          </div>

          {/* RESOURCE LIST */}
          <div className="space-y-4">
            {filteredResources.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-gray-400">
                No resources found
              </div>
            ) : (
              filteredResources.map((res, i) => (
                <ResourceCard key={i} data={res} />
              ))
            )}
          </div>

          {/* ANALYTICS PLACEHOLDERS */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">📊 Your Resource Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsPlaceholder title="Resource Usage Trend" />
              <AnalyticsPlaceholder title="Subject-wise Consumption" />
              <AnalyticsPlaceholder title="Preferred Resource Type" />
              <AnalyticsPlaceholder title="Download vs Bookmark Behavior" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function OverviewCard({ title, value }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/40">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ResourceCard({ data }) {
  return (
    <div className="glass rounded-2xl p-5 flex justify-between items-center border border-white/40">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{data.title}</h3>
          {data.new && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              NEW
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {data.subject} • {data.year} • {data.uploadedBy}
        </p>
        <p className="text-xs text-gray-400">
          {data.date} • {data.size}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 text-xs rounded-full ${TYPE_STYLE[data.type]}`}>
          {data.type}
        </span>
        <button className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          View
        </button>
      </div>
    </div>
  );
}

function AnalyticsPlaceholder({ title }) {
  return (
    <div className="glass rounded-2xl h-64 flex flex-col justify-center items-center text-gray-400">
      <p className="text-sm uppercase tracking-wide">{title}</p>
      <p className="text-sm mt-2">Analytics Agent will render here</p>
    </div>
  );
}
