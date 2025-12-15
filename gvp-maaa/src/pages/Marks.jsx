import { useState } from "react";

/* ===== SAMPLE DATA ===== */
const DATA = {
  "Sem 6": {
    DBMS: { mid1: 24, mid2: 18, assign: 8, sem: 45 },
    OS: { mid1: 18, mid2: 16, assign: 7, sem: 38 },
    CN: { mid1: 22, mid2: 24, assign: 9, sem: 50 },
  },
  "Sem 5": {
    DBMS: { mid1: 21, mid2: 20, assign: 8, sem: 42 },
    OS: { mid1: 17, mid2: 15, assign: 6, sem: 36 },
    CN: { mid1: 20, mid2: 22, assign: 8, sem: 44 },
  },
};

/* ===== COLOR LOGIC ===== */
function getColor(percent) {
  if (percent < 50) return "bg-red-500";
  if (percent <= 75) return "bg-yellow-400";
  return "bg-green-500";
}

export default function Marks() {
  const [semester, setSemester] = useState("Sem 6");
  const [subject, setSubject] = useState("DBMS");

  const subjects = Object.keys(DATA[semester]);
  const s = DATA[semester][subject];

  const internal = Math.round((s.mid1 + s.mid2) / 2) + s.assign;
  const total = internal + s.sem;

  return (
    <div className="space-y-10">

      {/* ===== HEADER WITH SGPA / CGPA ===== */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Marks Dashboard</h1>
          <p className="text-gray-500">
            Semester-wise academic performance
          </p>
        </div>

        <div className="flex gap-4">
          <StatBox label="SGPA" value="8.12" />
          <StatBox label="CGPA" value="8.02" />
        </div>
      </div>

      {/* ===== SEMESTER BUTTONS ===== */}
      <Section title="Semester">
        <ButtonGroup
          options={Object.keys(DATA)}
          active={semester}
          onChange={setSemester}
        />
      </Section>

      {/* ===== SUBJECT BUTTONS ===== */}
      <Section title="Subjects">
        <ButtonGroup
          options={subjects}
          active={subject}
          onChange={setSubject}
        />
      </Section>

      {/* ===== MARKS VISUALIZATION ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Gauge title="Mid 1" value={s.mid1} max={30} />
        <Gauge title="Mid 2" value={s.mid2} max={30} />
        <Gauge title="Assignments" value={s.assign} max={10} />
        <Gauge title="Internal" value={internal} max={40} highlight />
        <Gauge title="Semester Exam" value={s.sem} max={70} />
        <Gauge title="Total" value={total} max={110} highlight />
      </div>

      {/* ===== PERFORMANCE SUMMARY ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoCard title="Strongest Subject" value="DBMS" />
        <InfoCard title="Weakest Subject" value="OS" />
        <InfoCard
          title="Performance Status"
          value="On Track"
          accent="text-green-600"
        />
      </div>

      {/* ===== ANALYTICS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBox title="Mid 1 vs Mid 2 vs Semester Comparison" />
        <ChartBox title="Subject-wise Marks Comparison" />
      </div>

      {/* ===== FEEDBACK ===== */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-2">
          Feedback & Suggestions
        </h3>
        <ul className="text-sm text-gray-600 list-disc ml-5 space-y-1">
          <li>Focus more on OS to improve overall score.</li>
          <li>Strong consistency observed in DBMS.</li>
          <li>Aim 45+ in semester exam for distinction.</li>
        </ul>
      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function ButtonGroup({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-xl text-sm transition
            ${
              active === opt
                ? "bg-indigo-600 text-white"
                : "bg-white/70 hover:bg-white"
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Gauge({ title, value, max, highlight }) {
  const percent = Math.round((value / max) * 100);

  return (
    <div
      className={`glass rounded-2xl p-6 ${
        highlight && "ring-2 ring-indigo-200"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">
        {value} <span className="text-sm text-gray-400">/ {max}</span>
      </p>
      <div className="mt-4 h-2 bg-gray-200 rounded-full">
        <div
          className={`h-2 rounded-full ${getColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{percent}%</p>
    </div>
  );
}

function InfoCard({ title, value, accent }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-lg font-semibold mt-2 ${accent || ""}`}>
        {value}
      </p>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="glass rounded-xl px-5 py-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title} (Chart renders here)
    </div>
  );
}
