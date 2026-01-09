import { useState, useMemo } from "react";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";
import SearchIcon from "@mui/icons-material/Search";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";

/* ------------------ SAMPLE DATA ------------------ */
const INITIAL_STUDENTS = [
  { id: 1, name: "Ravi Kumar", roll: "21CS001", section: "A", presentDays: 10 },
  { id: 2, name: "Anusha", roll: "21CS014", section: "A", presentDays: 9 },
  { id: 3, name: "Suresh", roll: "21CS021", section: "B", presentDays: 15 },
  { id: 4, name: "Priya", roll: "21CS032", section: "B", presentDays: 9 },
  { id: 5, name: "Kiran", roll: "21CS045", section: "A", presentDays: 12 },
];

export default function Attendance() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [totalDays, setTotalDays] = useState(21);

  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("All");
  const [subject, setSubject] = useState("DBMS");
  const [search, setSearch] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ------------------ DATE LOGIC ------------------ */
  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diff =
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const uploadDays = calculateDays();

  /* ------------------ CONFIRM UPLOAD ------------------ */
  const confirmUpload = () => {
    if (uploadDays === 0) {
      alert("Please select valid date range");
      return;
    }

    setTotalDays((prev) => prev + uploadDays);

    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        presentDays:
          s.presentDays +
          Math.floor(Math.random() * (uploadDays + 1)), // demo logic
      }))
    );

    setShowUploadModal(false);
    setFromDate("");
    setToDate("");
  };

  /* ------------------ CALCULATED ------------------ */
  const computedStudents = students.map((s) => ({
    ...s,
    attendance: Math.round((s.presentDays / totalDays) * 100),
  }));

  /* ------------------ AT-RISK LOGIC ------------------ */
  const atRiskStudents = useMemo(() => {
    return computedStudents
      .filter(
        (s) =>
          s.attendance < 85 &&
          (section === "All" || s.section === section)
      )
      .sort((a, b) => a.attendance - b.attendance);
  }, [computedStudents, section]);

  const visibleStudents = atRiskStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll.toLowerCase().includes(search.toLowerCase())
  );

  const criticalCount = atRiskStudents.filter(
    (s) => s.attendance < 75
  ).length;

  const lastUpdated = new Date().toLocaleString();

  /* ------------------ ALERTS ------------------ */
  const sendAlert = (student) => {
    alert(
      `Alert sent to ${student.name}\nAttendance in ${subject}: ${student.attendance}%`
    );
  };

  const sendAlertAll = () => {
    alert(`Alerts sent to all at-risk students`);
  };

  return (
    <div className="space-y-8">

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
        <Select label="Section" value={section} onChange={setSection} options={["All", "A", "B"]} />
        <Select label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />

        <div className="flex items-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full py-2 rounded-xl bg-green-600 text-white flex items-center justify-center gap-2"
          >
            <UploadIcon fontSize="small" />
            Upload Attendance
          </button>
        </div>
      </div>

      {/* ================= KPI ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Total Students" value={students.length} />
        <Kpi title="Total Days Uploaded" value={totalDays} />
        <Kpi title="At-Risk Students" value={atRiskStudents.length} />
        <Kpi title="Critical (<75%)" value={criticalCount} />
      </div>

      {/* ================= AT-RISK STUDENTS ================= */}
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <WarningIcon className="text-red-500" />
            At-Risk Students ({visibleStudents.length})
          </h3>

          <button
            onClick={sendAlertAll}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm"
          >
            Alert All
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          Last updated: {lastUpdated}
        </p>

        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border"
          />
        </div>

        <div className="space-y-2">
          {visibleStudents.map((s) => (
            <div
              key={s.id}
              className="flex justify-between items-center p-4 rounded-xl bg-white/70"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.roll} · Sec {s.section}
                </p>
                <p className="text-xs text-gray-400">
                  {s.presentDays} / {totalDays} days attended
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">
                  {s.attendance}%
                </span>
                <button
                  onClick={() => sendAlert(s)}
                  className="p-2 rounded-full bg-indigo-100"
                >
                  <CampaignIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= UPLOAD MODAL ================= */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <CloseIcon />
            </button>

            <h3 className="text-lg font-semibold mb-4">
              Upload Attendance
            </h3>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p><b>Year:</b> {year}</p>
              <p><b>Section:</b> {section}</p>
              <p><b>Subject:</b> {subject}</p>
            </div>

            <label className="text-sm font-medium">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl"
            />

            <label className="text-sm font-medium mt-3 block">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full mt-1 p-2 border rounded-xl"
            />

            <p className="text-xs text-gray-500 mt-3">
              Total Days Selected: <b>{uploadDays}</b>
            </p>

            <label className="text-sm font-medium mt-4 block">
              Upload CSV file
            </label>
            <input type="file" accept=".csv" className="w-full mt-1" />

            <button
              onClick={confirmUpload}
              className="w-full mt-6 py-2 rounded-xl bg-green-600 text-white"
            >
              Confirm Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= REUSABLE ================= */

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 rounded-xl border"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
