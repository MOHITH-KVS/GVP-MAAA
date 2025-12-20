import { useState } from "react";

/* ================= MOCK DATA ================= */

const STUDENT = {
  cgpa: 7.4,
  backlogs: 0,
  skills: ["Aptitude", "DSA"],
};

const COMPANIES = [
  {
    name: "TCS",
    minCGPA: 6.5,
    maxBacklogs: 0,
    skills: ["Aptitude", "Communication"],
  },
  {
    name: "Infosys",
    minCGPA: 7.0,
    maxBacklogs: 1,
    skills: ["DSA", "DBMS"],
  },
  {
    name: "Wipro",
    minCGPA: 6.0,
    maxBacklogs: 2,
    skills: ["Aptitude"],
  },
];

const INTERVIEWS = [
  {
    company: "Infosys",
    date: "22 Dec 2025",
    mode: "Online",
    status: "upcoming",
  },
  {
    company: "TCS",
    date: "10 Dec 2025",
    mode: "Offline",
    status: "completed",
    round: null,
  },
];

export default function Placement() {
  const [showModal, setShowModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  /* ===== Update form state ===== */
  const [round, setRound] = useState("");
  const [weakArea, setWeakArea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");

  /* ===== eligibility calc ===== */
  const eligibilityScore = (c) => {
    let score = 0;
    if (STUDENT.cgpa >= c.minCGPA) score += 40;
    if (STUDENT.backlogs <= c.maxBacklogs) score += 30;

    const matched = c.skills.filter((s) =>
      STUDENT.skills.includes(s)
    );
    score += (matched.length / c.skills.length) * 30;

    return Math.round(score);
  };

  const upcoming = INTERVIEWS.filter(i => i.status === "upcoming");
  const past = INTERVIEWS.filter(i => i.status === "completed");
  const pendingInterview = past.find(i => i.round === null);

  const openModal = (interview) => {
    setSelectedInterview(interview);
    setShowModal(true);
  };

  const handleSave = () => {
    console.log({
      company: selectedInterview.company,
      round,
      weakArea,
      difficulty,
      confidence,
      notes,
    });

    setShowModal(false);
    setRound("");
    setWeakArea("");
    setDifficulty("");
    setConfidence(3);
    setNotes("");
  };

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">🎯 Placements</h1>
        <p className="text-gray-500">
          Eligibility, interview schedule & outcomes
        </p>
      </div>

      {/* ================= ACTION REQUIRED ================= */}
      {pendingInterview && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div>
            <p className="font-medium text-yellow-800">⚠️ Action Required</p>
            <p className="text-sm text-yellow-700">
              You have a completed interview pending update
            </p>
          </div>
          <button
            onClick={() => openModal(pendingInterview)}
            className="px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm"
          >
            Update Now
          </button>
        </div>
      )}

      {/* ================= OVERVIEW ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OverviewCard title="Eligible Companies" value={COMPANIES.length} />
        <OverviewCard title="Upcoming Interviews" value={upcoming.length} />
        <OverviewCard title="Completed Interviews" value={past.length} />
        <OverviewCard title="Offers" value="0" />
      </div>

      {/* ================= UPCOMING ================= */}
      <Section title="⏳ Upcoming Interviews">
        {upcoming.map((i, idx) => (
          <Card key={idx}>
            <div>
              <h3 className="font-semibold">{i.company}</h3>
              <p className="text-sm text-gray-500">
                {i.date} • {i.mode}
              </p>
            </div>
            <Badge text="Upcoming" />
          </Card>
        ))}
      </Section>

      {/* ================= ELIGIBILITY ================= */}
      <Section title="🏢 Company-wise Eligibility">
        {COMPANIES.map((c, idx) => {
          const score = eligibilityScore(c);
          return (
            <Card key={idx}>
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-gray-500">
                  CGPA ≥ {c.minCGPA} • Backlogs ≤ {c.maxBacklogs}
                </p>
                <p className="text-sm mt-1">
                  Eligibility: <span className="font-semibold">{score}%</span>
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {score >= 60 ? "Eligible" : "Not Eligible"}
              </span>
            </Card>
          );
        })}
      </Section>

      {/* ================= PAST ================= */}
      <Section title="✅ Past Interviews">
        {past.map((i, idx) => (
          <Card key={idx}>
            <div>
              <h3 className="font-semibold">{i.company}</h3>
              <p className="text-sm text-gray-500">
                {i.date} • {i.mode}
              </p>
            </div>
            <button
              onClick={() => openModal(i)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
            >
              Update Interview
            </button>
          </Card>
        ))}
      </Section>

      {/* ================= 📊 PLACEMENT INSIGHTS (RESTORED) ================= */}
      <Section title="📊 Placement Insights">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsPlaceholder title="Round-wise Performance" />
          <AnalyticsPlaceholder title="Skill Gap Analysis" />
          <AnalyticsPlaceholder title="Interview Difficulty vs Outcome" />
          <AnalyticsPlaceholder title="Confidence vs Selection Trend" />
        </div>
      </Section>

      {/* ================= MODAL ================= */}
      {showModal && selectedInterview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 space-y-4">
            <h3 className="font-semibold">Interview Update</h3>
            <p className="text-sm text-gray-500">
              Company: <b>{selectedInterview.company}</b>
            </p>

            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Highest round completed</option>
              <option>Aptitude</option>
              <option>Technical</option>
              <option>HR</option>
              <option>Selected</option>
              <option>Rejected</option>
            </select>

            <select
              value={weakArea}
              onChange={(e) => setWeakArea(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Weak area / Reason</option>
              <option>Technical knowledge</option>
              <option>Coding / DSA</option>
              <option>Communication</option>
              <option>Confidence</option>
              <option>Time management</option>
              <option>Not shared</option>
            </select>

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Interview difficulty</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            <div>
              <label className="text-sm text-gray-500">
                Confidence level: {confidence}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="w-full"
              />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional feedback / notes"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/40 flex justify-between items-center">
      {children}
    </div>
  );
}

function OverviewCard({ title, value }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-white/40">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function Badge({ text }) {
  return (
    <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
      {text}
    </span>
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
