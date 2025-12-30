import { useState } from "react";

/* ================= MAIN ================= */
export default function Insights() {
  /* CONTEXT FILTERS */
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("All");
  const [subject, setSubject] = useState("All");
  const [range, setRange] = useState("Semester");

  return (
    <div className="space-y-12">

      {/* ================= PAGE HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Academic Insights</h1>
        <p className="text-sm text-gray-500">
          Patterns, risks, and trends derived from attendance, assignments, marks, and events
        </p>
      </div>

      {/* ================= CONTEXT FILTERS ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Filter label="Year" value={year} onChange={setYear}
            options={["3rd Year", "4th Year"]} />
          <Filter label="Section" value={section} onChange={setSection}
            options={["All", "A", "B"]} />
          <Filter label="Subject" value={subject} onChange={setSubject}
            options={["All", "DBMS", "OS", "CN"]} />
          <Filter label="Time Range" value={range} onChange={setRange}
            options={["Last 30 Days", "Semester", "Academic Year"]} />
        </div>
      </div>

      {/* ================= KEY OBSERVATIONS ================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Observations</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            tone="danger"
            title="Attendance Drop Detected"
            text="Attendance declined by 14% after Mid-2 examinations, mainly in theory-heavy subjects."
          />
          <InsightCard
            tone="warning"
            title="Assignment Engagement Issue"
            text="Section B shows repeated late assignment submissions across multiple subjects."
          />
          <InsightCard
            tone="danger"
            title="Consistent Underperformance"
            text="8 students show low attendance and low marks across assessments."
          />
        </div>
      </div>

      {/* ================= ATTENDANCE INSIGHTS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Attendance Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Attendance Trend Over Time (Line Chart)" />
          <ChartBox title="Section-wise Attendance Comparison (Bar Chart)" />
        </div>

        <InsightText>
          Attendance decline is higher in theory-based subjects compared to lab-oriented courses.
        </InsightText>
      </div>

      {/* ================= ASSIGNMENT INSIGHTS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Assignment Engagement Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Assignment Submission Trend (Line Chart)" />
          <ChartBox title="Late vs On-time Submissions (Donut Chart)" />
        </div>

        <InsightText>
          Students missing assignments show a 20% lower average attendance rate.
        </InsightText>
      </div>

      {/* ================= MARKS INSIGHTS ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Marks & Learning Outcome Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartBox title="Average Marks Trend (Line Chart)" />
          <ChartBox title="Pass vs Fail Distribution (Bar Chart)" />
        </div>

        <InsightText>
          DBMS shows the highest failure rate despite stable attendance, indicating subject difficulty.
        </InsightText>
      </div>

      {/* ================= STUDENT & CLASS RISK ================= */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Student & Class Risk Insights</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartBox title="Student Risk Distribution (Donut Chart)" />
          <ChartBox title="Section-wise Risk Comparison (Bar Chart)" />
          <ChartBox title="Attendance vs Marks Correlation (Scatter Plot)" />
        </div>

        <InsightText>
          Students with both low attendance and poor assignment completion fall into the highest risk category.
        </InsightText>
      </div>

      {/* ================= GUIDED ACTIONS ================= */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Recommended Actions</h3>

        <ul className="text-sm text-gray-600 space-y-2">
          <li>✔ Send targeted attendance alerts to Section B</li>
          <li>✔ Schedule a revision session for DBMS</li>
          <li>✔ Follow up individually with high-risk students</li>
          <li>✔ Review assignment deadlines for heavy subjects</li>
        </ul>
      </div>

    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function Filter({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] px-3 rounded-xl border"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title}
      <br />
      (Analytics Agent will render here)
    </div>
  );
}

function InsightCard({ title, text, tone }) {
  const color =
    tone === "danger"
      ? "border-red-300 bg-red-50 text-red-700"
      : "border-amber-300 bg-amber-50 text-amber-700";

  return (
    <div className={`rounded-2xl p-5 border ${color}`}>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function InsightText({ children }) {
  return (
    <p className="text-sm text-gray-600 italic">
      {children}
    </p>
  );
}
