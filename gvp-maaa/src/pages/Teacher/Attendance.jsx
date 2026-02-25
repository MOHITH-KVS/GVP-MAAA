import { useEffect, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";

export default function Attendance() {
  const token = localStorage.getItem("access_token");

  /* ================= STATES ================= */
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  const getToday = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
 };
 
 const [date, setDate] = useState(getToday());
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState("weekly");
  const [reportData, setReportData] = useState(null);

  /* ================= LOAD MY SUBJECTS ================= */
  useEffect(() => {
    const loadMySubjects = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/faculty/my-subjects",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        setSubjects(data);
      } catch (err) {
        console.error("Error loading subjects", err);
      }
    };

    loadMySubjects();
  }, []);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (subject) => {
    if (!subject) return;

    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:8000/faculty/attendance/students?year=${subject.year}&section=${subject.section}&subject_id=${subject.subject_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
console.log("STUDENTS RESPONSE:", data);

if (Array.isArray(data)) {
  setStudents(data);

  setAttendanceData(
    data.map((s) => ({
      student_id: s.id,
      status: true,
    }))
  );
 } else {
  console.log("Unexpected response:", data);
  setStudents([]);
 }
    } catch (err) {
      console.error("Error loading students", err);
    }

    setLoading(false);
  };

  /* ================= SUBJECT CHANGE ================= */
  const handleSubjectChange = (id) => {
    const subject = subjects.find(
      (s) => s.subject_id === parseInt(id)
    );

    setSelectedSubject(subject);
    loadStudents(subject);
  };

  /* ================= TOGGLE ================= */
  const toggleAttendance = (id) => {
    setAttendanceData((prev) =>
      prev.map((s) =>
        s.student_id === id
          ? { ...s, status: !s.status }
          : s
      )
    );
  };

  /* ================= SAVE ================= */
  const confirmSaveAttendance = async () => {
    await fetch("http://localhost:8000/faculty/attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject_id: selectedSubject.subject_id,
        date: date,
        year: selectedSubject.year,
        section: selectedSubject.section,
        records: attendanceData,
      }),
    });

    await loadStudents(selectedSubject); // 🔥 refresh

    setShowPreview(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  /* ================= LOAD REPORT ================= */
  const loadReport = async (type) => {
    if (!selectedSubject) {
      alert("Select subject first");
      return;
    }

    setReportType(type);

    const url =
      type === "weekly"
        ? `http://localhost:8000/faculty/attendance/weekly/${selectedSubject.subject_id}`
        : `http://localhost:8000/faculty/attendance/monthly/${selectedSubject.subject_id}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setReportData(data);
    setShowReport(true);
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadReport = () => {
    const url =
      reportType === "weekly"
        ? `http://localhost:8000/faculty/attendance/weekly/${selectedSubject.subject_id}/download`
        : `http://localhost:8000/faculty/attendance/monthly/${selectedSubject.subject_id}/download`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">

      {/* ================= SUBJECT + DATE ================= */}
      <div className="glass rounded-2xl p-6 grid md:grid-cols-4 gap-4">

        <div>
          <label className="text-xs text-gray-500">
            Select Class
          </label>
          <select
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full mt-1 p-2 rounded-xl border"
          >
            <option value="">Select</option>
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.subject_name} - {s.year}{s.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>

        <button
          onClick={() => loadReport("weekly")}
          className="bg-indigo-600 text-white py-2 rounded-xl flex items-center justify-center gap-2"
        >
          <AssessmentIcon />
          Weekly Report
        </button>

        <button
          onClick={() => loadReport("monthly")}
          className="bg-purple-600 text-white py-2 rounded-xl flex items-center justify-center gap-2"
        >
          <AssessmentIcon />
          Monthly Report
        </button>

      </div>

      {/* ================= STUDENT LIST ================= */}
      <div className="glass rounded-2xl p-6">

        {loading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            Select subject to load students
          </p>
        ) : (
          <div className="space-y-3">

            {students.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center p-4 rounded-xl bg-white/80"
              >
                <div>
                  <p className="font-medium">
                    {s.roll} – {s.name}
                  </p>

                  <div className="flex gap-2 mt-2 items-center">
                    {s.last_5.map((item, i) => (
                      <span
                        key={i}
                        title={item.date}
                        className={`w-4 h-4 rounded-full ${
                          item.status ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {s.present}/{s.total}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.percentage}%
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      attendanceData.find(
                        (a) => a.student_id === s.id
                      )?.status
                    }
                    onChange={() => toggleAttendance(s.id)}
                    className="w-5 h-5"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={confirmSaveAttendance}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl"
            >
              Save Attendance
            </button>
          </div>
        )}
      </div>

      {/* ================= REPORT MODAL ================= */}
      {showReport && reportData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md">

            <h3 className="font-semibold text-lg mb-4">
              {reportType === "weekly"
                ? "Weekly Report"
                : "Monthly Report"}
            </h3>

            <div className="space-y-2 text-sm">
              <p>Total Classes: {reportData.total_records}</p>
              <p>Present: {reportData.total_present}</p>
              <p>Absent: {reportData.total_absent}</p>
              <p>Class Average: {reportData.class_average}%</p>
            </div>

            <button
              onClick={downloadReport}
              className="mt-6 w-full bg-green-600 text-white py-2 rounded-xl"
            >
              Download PDF Report
            </button>

            <button
              onClick={() => setShowReport(false)}
              className="mt-3 w-full border py-2 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/*================= PREVIEW ================= */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md text-center space-y-4">

            <h3 className="text-lg font-semibold">
              Attendance Preview
            </h3>

            <div className="space-y-2 text-sm">
              <p>Total Students: {previewData.total}</p>
              <p className="text-green-600">
                Present: {previewData.present}
              </p>
              <p className="text-red-600">
                Absent: {previewData.absent}
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPreview(false)}
                className="w-full border py-2 rounded-xl"
              >
                Edit
              </button>

              <button
                onClick={confirmSaveAttendance}
                className="w-full bg-green-600 text-white py-2 rounded-xl"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS ================= */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          
          <div className="relative bg-white w-[380px] h-[260px] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center">

            {/* Register Slide In */}
            <div className="absolute inset-0 flex items-center justify-center animate-registerIn">
              <div className="w-64 h-40 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg shadow-inner relative p-6">

                {/* Writing Line Animation */}
                <div className="mt-6 space-y-3">
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-writingLine"></div>
                  </div>
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-writingLine delay-300"></div>
                  </div>
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-writingLine delay-500"></div>
                  </div>
                </div>

              </div>
            </div>

            {/* Final Stamp */}
            <div className="absolute inset-0 flex items-center justify-center animate-stampIn pointer-events-none">
              <div className="mt-16 text-center opacity-0 animate-fadeStamp">
                <div className="text-3xl text-green-600 font-bold tracking-wide">
                  ✔
                </div>
                <p className="text-sm font-semibold mt-2">
                  Attendance Recorded
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
