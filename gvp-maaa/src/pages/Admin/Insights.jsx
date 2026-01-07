/* ================= ADMIN INSIGHTS ================= */

export default function Insights() {
  return (
    <div className="space-y-12">

      {/* ================= PREMIUM HEADER ================= */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <h1 className="text-3xl font-semibold">
          Institutional Intelligence
        </h1>
        <p className="text-sm opacity-90 mt-2 max-w-3xl">
          Campus-wide academic insights that monitor performance, detect risks,
          and support strategic administrative decisions.
        </p>
        <p className="text-xs mt-3 opacity-80">
          Intelligence mode active • Updated today
        </p>
      </div>

      {/* ================= KPI SNAPSHOT ================= */}
      <Section title="Campus Health Snapshot">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <KPI label="Overall Attendance" value="81%" />
          <KPI label="Average CGPA" value="7.4" />
          <KPI label="At-Risk Students" value="312" danger />
          <KPI label="Departments" value="6" />
          <KPI label="Faculty Members" value="148" />
          <KPI label="Active Alerts" value="9" warning />
        </div>
      </Section>

      {/* ================= STUDENT ANALYTICS ================= */}
      <Section title="Student Analytics & Risk Distribution">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ChartCard
            title="At-Risk vs Safe Students"
            desc="Overall academic risk distribution across the institution"
          />
          <ChartCard
            title="Attendance Distribution"
            desc="Attendance range analysis across students"
          />
          <ChartCard
            title="CGPA Distribution"
            desc="Academic performance breakdown"
          />
          <ChartCard
            title="Section-wise Risk Analysis"
            desc="Risk comparison between sections"
          />
        </div>
      </Section>

      {/* ================= DEPARTMENT ANALYTICS ================= */}
      <Section title="Department Performance Analytics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Department-wise Attendance"
            desc="Attendance comparison across departments"
          />
          <ChartCard
            title="Department-wise CGPA"
            desc="Average CGPA comparison across departments"
          />
        </div>
      </Section>

      {/* ================= FACULTY ANALYTICS ================= */}
      <Section title="Faculty Teaching Impact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Faculty vs Student Outcomes"
            desc="Teaching impact based on student performance"
          />
          <ChartCard
            title="Faculty Load Distribution"
            desc="Teaching load and engagement levels"
          />
        </div>
      </Section>

      {/* ================= SUBJECT ANALYTICS ================= */}
      <Section title="Subject & Syllabus Risk Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Subject Risk Heatmap"
            desc="Correlation between syllabus progress and CGPA"
          />
          <ChartCard
            title="Syllabus Completion Status"
            desc="Planned vs completed syllabus tracking"
          />
        </div>
      </Section>

      {/* ================= ALERT ANALYTICS ================= */}
      <Section title="Alert Effectiveness Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Risk Before vs After Alerts"
            desc="Impact of early alerts on student risk"
          />
          <ChartCard
            title="Alert Frequency by Department"
            desc="Alert distribution across departments"
          />
        </div>
      </Section>

      {/* ================= CORRELATION INSIGHTS ================= */}
      <Section title="Academic Correlation Insights">
        <InsightBox
          items={[
            "Attendance below 75% strongly correlates with higher failure probability",
            "Subjects with syllabus delays consistently show CGPA decline",
            "Early alerts significantly reduce high-risk student count",
          ]}
        />
      </Section>

      {/* ================= ADMIN ACTIONS ================= */}
      <Section title="Recommended Administrative Actions">
        <InsightBox
          items={[
            "Initiate academic review for departments with low CGPA trends",
            "Assign faculty mentoring for high-risk subjects",
            "Trigger early-warning alerts before mid-semester",
            "Increase monitoring for sections with repeated attendance drops",
          ]}
        />
      </Section>

    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function KPI({ label, value, danger, warning }) {
  return (
    <div
      className={`p-5 rounded-2xl border bg-white
      ${danger ? "border-red-300 bg-red-50" : ""}
      ${warning ? "border-amber-300 bg-amber-50" : ""}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function ChartCard({ title, desc }) {
  return (
    <div className="bg-white border rounded-2xl p-6">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
      <div className="mt-4 h-40 flex items-center justify-center border border-dashed rounded-xl text-sm text-gray-400">
        📊 Analytics Agent will render chart here
      </div>
    </div>
  );
}

function InsightBox({ items }) {
  return (
    <div className="bg-white border rounded-2xl p-6 space-y-3 text-sm text-gray-700">
      {items.map((item, i) => (
        <p key={i}>• {item}</p>
      ))}
    </div>
  );
}
