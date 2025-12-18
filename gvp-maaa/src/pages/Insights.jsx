import { useState } from "react";

export default function Insights() {
  const [activeTab, setActiveTab] = useState("future");

  return (
    <div className="space-y-10">

      {/* ================= HERO ================= */}
      <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <h1 className="text-3xl font-semibold">🧠 Personal Insights</h1>
        <p className="mt-2 max-w-2xl text-white/90">
          Insights that explain your performance, predict outcomes,
          and guide improvement — supported with visuals.
        </p>
        <p className="mt-1 text-sm text-white/70">
          Insight mode active • Updated today
        </p>
      </div>

      {/* ================= NAV ================= */}
      <div className="flex gap-3 overflow-x-auto">
        {[
          { id: "future", label: "Future Snapshot" },
          { id: "trends", label: "Why This Is Happening" },
          { id: "placements", label: "Placement Intelligence" },
          { id: "actions", label: "Action Plan" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition
              ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/70 hover:bg-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= FUTURE SNAPSHOT ================= */}
      {activeTab === "future" && (
        <FutureSnapshot />
      )}

      {/* ================= WHY THIS IS HAPPENING ================= */}
      {activeTab === "trends" && (
        <InsightBlock title="🧠 Why This Is Happening">
          <p className="text-sm text-gray-600">
            Your attendance directly influences both CGPA growth
            and placement eligibility.
          </p>

          <ChartPlaceholder title="Attendance vs CGPA Trend (with prediction)" />

          <CauseEffect
            cause="Attendance inconsistency"
            effect={[
              "Slower CGPA improvement",
              "Reduced placement eligibility",
            ]}
          />
        </InsightBlock>
      )}

      {/* ================= PLACEMENT INTELLIGENCE ================= */}
      {activeTab === "placements" && (
        <InsightBlock title="🎯 Placement Intelligence">

          <p className="text-sm text-gray-600">
            Visual comparison of your interview performance
            and skill readiness.
          </p>

          <ChartPlaceholder title="Interview Round Performance Comparison" />
          <ChartPlaceholder title="Skill Readiness Radar (Current vs Required)" />

          <IntelligenceCard
            title="Main Blocker"
            points={[
              "HR communication",
              "Confidence during discussion",
            ]}
          />
        </InsightBlock>
      )}

      {/* ================= ACTION PLAN ================= */}
      {activeTab === "actions" && (
        <div className="space-y-6">

          <ActionCard
            title="🔴 Next 7 Days"
            actions={[
              "Attend all remaining classes",
              "Practice HR answers (15 mins/day)",
            ]}
          />

          <ActionCard
            title="🟡 Next 30 Days"
            actions={[
              "Mock interviews",
              "Communication practice",
            ]}
          />

          <ActionCard
            title="🟢 Semester Focus"
            actions={[
              "CGPA ≥ 8.5",
              "Placement readiness ≥ 80%",
            ]}
          />

        </div>
      )}

    </div>
  );
}

/* ================= COMPONENTS ================= */

function FutureSnapshot() {
  return (
    <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
      <h2 className="text-xl font-semibold">🔮 Your Future Snapshot</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SnapshotItem label="Academics" value="Improving" />
        <SnapshotItem label="Placements" value="On Track" />
        <SnapshotItem label="Risk Level" value="Manageable ⚠️" />
      </div>

      <div className="rounded-2xl bg-indigo-50 p-5">
        <p className="text-sm font-medium text-indigo-700">
          Priority Insight
        </p>
        <p className="text-sm text-indigo-600 mt-1">
          Improving attendance gives the highest overall impact
          on CGPA and placement eligibility.
        </p>
      </div>
    </div>
  );
}

function ChartPlaceholder({ title }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      <div className="h-64 flex items-center justify-center text-gray-400 bg-white rounded-xl">
        Chart will render here
      </div>
    </div>
  );
}

function InsightBlock({ title, children }) {
  return (
    <div className="rounded-3xl p-8 bg-white/80 border border-white/50 space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function SnapshotItem({ label, value }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function CauseEffect({ cause, effect }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700">Cause</p>
      <p className="text-sm text-gray-600">{cause}</p>
      <p className="text-sm font-medium text-gray-700 mt-3">Effect</p>
      <ul className="list-disc ml-5 text-sm text-gray-600">
        {effect.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function IntelligenceCard({ title, points }) {
  return (
    <div className="rounded-2xl p-5 bg-gray-50 border border-gray-200">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <ul className="mt-2 list-disc ml-5 text-sm text-gray-600">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ title, actions }) {
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-white/50">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {actions.map((a, i) => (
          <li key={i}>✔ {a}</li>
        ))}
      </ul>
    </div>
  );
}
