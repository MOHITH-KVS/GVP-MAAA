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
  /* ================= CORE ================= */
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [totalDays, setTotalDays] = useState(21);

  /* ================= FILTERS ================= */
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("All");
  const [subject, setSubject] = useState("DBMS");
  const [search, setSearch] = useState("");

  /* ================= UPLOAD MODAL ================= */
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ================= ALERT MODAL ================= */
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertStudent, setAlertStudent] = useState(null);
  const [alertText, setAlertText] = useState("");
  const [recheckStep, setRecheckStep] = useState(false);

  /* ================= SUCCESS ANIMATION ================= */
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /* ================= DATE LOGIC ================= */
  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    return Math.max(
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1,
      0
    );
  };

  const uploadDays = calculateDays();

  const confirmUpload = () => {
    if (uploadDays === 0) {
      return;
    }

    setTotalDays((prev) => prev + uploadDays);

    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        presentDays:
          s.presentDays +
          Math.floor(Math.random() * (uploadDays + 1)),
      }))
    );

    setShowUploadModal(false);
    setFromDate("");
    setToDate("");

    // ✅ SUCCESS FEEDBACK
    setSuccessMessage("Attendance updated successfully");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  /* ================= CALCULATIONS ================= */
  const computedStudents = students.map((s) => ({
    ...s,
    attendance: Math.round((s.presentDays / totalDays) * 100),
  }));

  const atRiskStudents = useMemo(() => {
    return computedStudents
      .filter(
        (s) =>
          s.attendance < 85 &&
          (section === "All" || s.section === section)
      )
      .sort((a, b) => a.roll.localeCompare(b.roll));
  }, [computedStudents, section]);

  const visibleStudents = atRiskStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= ALERT FLOW ================= */
  const openAlert = (student) => {
    setAlertStudent(student);
    setAlertText("");
    setRecheckStep(false);
    setShowAlertModal(true);
  };

  const confirmAlertSend = () => {
    setShowAlertModal(false);

    // ✅ SUCCESS FEEDBACK
    setSuccessMessage("Alert sent successfully");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="space-y-8">

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-6 gap-4">
        <Select label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
        <Select label="Section" value={section} onChange={setSection} options={["All", "A", "B"]} />
        <Select label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />

        <div className="md:col-span-3 flex justify-end items-end">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2 rounded-xl bg-green-600 text-white flex items-center gap-2"
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
        <Kpi title="Critical (<75%)" value={atRiskStudents.filter(s => s.attendance < 75).length} />
      </div>

      {/* ================= STUDENT LIST ================= */}
      <div className="glass rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold mb-4">
          <WarningIcon className="text-red-500" />
          At-Risk Students (Roll No Order)
        </h3>

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
            <div key={s.id} className="flex justify-between items-center p-4 rounded-xl bg-white/70">
              <div>
                <p className="font-medium">{s.roll} – {s.name}</p>
                <p className="text-xs text-gray-500">
                  Sec {s.section} · {s.presentDays}/{totalDays} days
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">
                  {s.attendance}%
                </span>
                <button
                  onClick={() => openAlert(s)}
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
            <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4">
              <CloseIcon />
            </button>

            <h3 className="text-lg font-semibold mb-3">Upload Attendance</h3>

            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p><b>Year:</b> {year}</p>
              <p><b>Section:</b> {section}</p>
              <p><b>Subject:</b> {subject}</p>
            </div>

            <label>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-2 border rounded-xl" />

            <label className="mt-3 block">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-2 border rounded-xl" />

            <p className="text-xs mt-2">Total Days: <b>{uploadDays}</b></p>

            <input type="file" className="mt-4" />

            <button onClick={confirmUpload} className="w-full mt-6 py-2 bg-green-600 text-white rounded-xl">
              Confirm Upload
            </button>
          </div>
        </div>
      )}

      {/* ================= ALERT MODAL ================= */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            {!recheckStep ? (
              <>
                <h3 className="font-semibold mb-2">Send Alert</h3>
                <p><b>Name:</b> {alertStudent.name}</p>
                <p><b>Roll:</b> {alertStudent.roll}</p>

                <textarea
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  placeholder="Enter alert description..."
                  className="w-full mt-3 p-2 border rounded-xl"
                />

                <button
                  onClick={() => setRecheckStep(true)}
                  className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-xl"
                >
                  Send Alert
                </button>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-3">Recheck Alert</h3>
                <div className="p-3 bg-gray-100 rounded-xl text-sm mb-4">
                  {alertText}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setRecheckStep(false)} className="flex-1 border py-2 rounded-xl">
                    Back & Edit
                  </button>
                  <button onClick={confirmAlertSend} className="flex-1 bg-green-600 text-white py-2 rounded-xl">
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= SUCCESS ANIMATION ================= */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-10 py-8 text-center animate-[zoomIn_0.3s_ease-out]">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-800">
              {successMessage}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Action completed successfully
            </p>
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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 p-2 rounded-xl border">
        {options.map((o) => <option key={o}>{o}</option>)}
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
