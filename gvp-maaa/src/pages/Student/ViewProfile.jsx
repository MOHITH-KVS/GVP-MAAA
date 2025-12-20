import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";

const SECTIONS = [
  "Overview",
  "Academics",
  "Attendance",
  "Skills",
  "Certificates",
  "Placements",
  "Remarks",
];

export default function ViewProfile({ onClose }) {
  const [active, setActive] = useState("Overview");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
              M
            </div>
            <div>
              <h1 className="text-xl font-semibold">Mohith Kintali</h1>
              <p className="text-sm text-slate-500">
                B.Tech · CSE (AIML) · 4th Year
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-[240px_1fr] gap-8 h-[calc(100vh-80px)]">

        {/* LEFT NAV */}
        <aside className="bg-white border rounded-xl p-4 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition
                ${
                  active === s
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "hover:bg-slate-50"
                }`}
            >
              {s}
            </button>
          ))}
        </aside>

        {/* RIGHT CONTENT */}
        <main className="bg-white border rounded-xl p-6 overflow-y-auto">

          {active === "Overview" && (
            <>
              <Section title="Personal Information">
                <InfoGrid />
              </Section>

              <Section title="Quick Stats">
                <div className="grid md:grid-cols-4 gap-4">
                  <Stat label="CGPA" value="8.84" />
                  <Stat label="Attendance" value="92%" />
                  <Stat label="Credits" value="146 / 160" />
                  <Stat label="Backlogs" value="0" />
                </div>
              </Section>
            </>
          )}

          {active === "Academics" && (
            <Section title="Academic History (All Years)">
              {["Year 1", "Year 2", "Year 3", "Year 4"].map((y) => (
                <div key={y} className="mb-6">
                  <h3 className="text-indigo-600 font-medium mb-2">{y}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Semester sem="Semester 1" sgpa="8.2" attendance="90%" />
                    <Semester sem="Semester 2" sgpa="8.5" attendance="92%" />
                  </div>
                </div>
              ))}
            </Section>
          )}

          {active === "Attendance" && (
            <Section title="Attendance Summary">
              Overall attendance is <b>92%</b>.  
              No shortage or warnings.
            </Section>
          )}

          {active === "Skills" && (
            <Section title="Skills">
              {["Python", "React", "UI/UX", "ML", "Power BI"].map((s) => (
                <Chip key={s} text={s} />
              ))}
            </Section>
          )}

          {active === "Certificates" && (
            <Section title="Certifications">
              <ul className="text-sm space-y-2">
                <li>✔ Google Data Analytics</li>
                <li>✔ AWS Cloud Foundations</li>
                <li>✔ Coursera Machine Learning</li>
              </ul>
            </Section>
          )}

          {active === "Placements" && (
            <Section title="Placements & Internships">
              Internship Ready.  
              No offers yet.
            </Section>
          )}

          {active === "Remarks" && (
            <Section title="Remarks">
              No disciplinary issues.  
              Academic performance is consistent.
            </Section>
          )}

        </main>
      </div>
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-semibold mb-4">{title}</h2>
    {children}
  </div>
);

const Stat = ({ label, value }) => (
  <div className="border rounded-lg p-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

const Semester = ({ sem, sgpa, attendance }) => (
  <div className="border rounded-lg p-4 text-sm">
    <p className="font-medium">{sem}</p>
    <p>SGPA: {sgpa}</p>
    <p>Attendance: {attendance}</p>
  </div>
);

const Chip = ({ text }) => (
  <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-sm mr-2 mb-2">
    {text}
  </span>
);

const InfoGrid = () => (
  <div className="grid md:grid-cols-4 gap-4 text-sm">
    <Info label="Roll No" value="21A91A05XX" />
    <Info label="Email" value="student@gvp.edu" />
    <Info label="Phone" value="+91 XXXXX XXXXX" />
    <Info label="Status" value="Active" />
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-slate-400">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);
