import { useState } from "react";

/* ===== SAMPLE EVENTS DATA ===== */
const EVENTS = [
  {
    title: "AI & ML Workshop",
    category: "Technical",
    status: "upcoming",
    registered: true,
    attended: false,
    won: false,
    certificate: true,
    career: true,
  },
  {
    title: "College Hackathon 2025",
    category: "Hackathon",
    status: "upcoming",
    registered: false,
    attended: false,
    won: false,
    certificate: true,
    career: true,
  },
  {
    title: "Cultural Fest – AVVISHKAR",
    category: "Cultural",
    status: "past",
    registered: true,
    attended: true,
    won: false,
    certificate: false,
    career: false,
  },
  {
    title: "Resume Building Session",
    category: "Career",
    status: "past",
    registered: true,
    attended: true,
    won: true,
    certificate: true,
    career: true,
  },
];

/* ===== STATUS STYLES ===== */
const STATUS_STYLE = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  past: "bg-gray-100 text-gray-600",
};

export default function Events() {
  const [filter, setFilter] = useState("All");

  const filteredEvents =
    filter === "All"
      ? EVENTS
      : EVENTS.filter((e) => e.category === filter);

  /* ===== PERSONAL STATS ===== */
  const stats = {
    registered: EVENTS.filter((e) => e.registered).length,
    attended: EVENTS.filter((e) => e.attended).length,
    won: EVENTS.filter((e) => e.won).length,
    certificates: EVENTS.filter((e) => e.certificate).length,
  };

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">🎉 Events</h1>
        <p className="text-gray-500">
          Your participation, achievements, and event insights
        </p>
      </div>

      {/* ================= PERSONAL SUMMARY ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InsightCard title="Registered" value={stats.registered} />
        <InsightCard title="Attended" value={stats.attended} />
        <InsightCard title="Wins" value={stats.won} />
        <InsightCard title="Certificates" value={stats.certificates} />
      </div>

      {/* ================= FILTERS ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {["All", "Technical", "Hackathon", "Career", "Cultural"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium
              ${filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white/70 hover:bg-white"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ================= EVENTS LIST ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((event, i) => (
          <EventCard key={i} event={event} />
        ))}
      </div>

      {/* ================= PERSONAL ANALYTICS ================= */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">📊 Your Event Analytics</h2>
        <p className="text-gray-500">
          Insights based on your participation and achievements
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsPlaceholder title="Participation Timeline (Month-wise)" />
          <AnalyticsPlaceholder title="Registered vs Attended vs Won" />
          <AnalyticsPlaceholder title="Event Type Preference" />
          <AnalyticsPlaceholder title="Certificates & Wins Overview" />
        </div>

        <AnalyticsPlaceholder
          title="Career-Oriented vs General Events Participation"
          full
        />
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function InsightCard({ title, value }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/40">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function EventCard({ event }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-3 border border-white/40">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <span
          className={`px-3 py-1 text-xs rounded-full font-medium ${STATUS_STYLE[event.status]}`}
        >
          {event.status.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
          {event.category}
        </span>
        {event.certificate && (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
            Certificate
          </span>
        )}
        {event.won && (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
            Won / Award
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {event.registered
          ? "✅ You registered for this event"
          : "⚠️ Not registered"}
      </p>
    </div>
  );
}

function AnalyticsPlaceholder({ title, full }) {
  return (
    <div
      className={`glass rounded-2xl flex flex-col justify-center items-center text-gray-400
        ${full ? "h-72" : "h-64"}`}
    >
      <p className="text-sm uppercase tracking-wide">{title}</p>
      <p className="text-sm mt-2">Analytics Agent will render here</p>
    </div>
  );
}
