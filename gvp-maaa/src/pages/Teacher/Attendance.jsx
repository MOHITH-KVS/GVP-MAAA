import { useEffect, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function Attendance() {
  const token = localStorage.getItem("access_token");
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

  /* ================= STATES ================= */
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [studentsMessage, setStudentsMessage] = useState("Select subject to load students");
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
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
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("access_token");
      }

      console.error("Failed to fetch subjects");
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Invalid data:", data);
      setSubjects([]);
      return;
    }

    setSubjects(data);

  } catch (err) {
    console.error("Error loading subjects", err);
  }
 };

    loadMySubjects();
  }, []);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (subject) => {
    if (!subject) {
      setStudents([]);
      setAttendanceData([]);
      setStudentsMessage("Select subject to load students");
      setAlreadyMarked(false);
      return;
    }

    const subject_id = Number(subject.subject_id);
    const year = Number(subject.year);
    const section = String(subject.section || "").trim();

    console.log({ subject_id, year, section });

    if (!subject_id || !year || !section) {
      setStudents([]);
      setAttendanceData([]);
      setStudentsMessage("Invalid class details. Please reselect the subject.");
      return;
    }

    setLoading(true);
    setStudentsMessage("Loading students...");

    try {
      // 1️⃣ Load students
      const params = new URLSearchParams({
        year: String(year),
        section,
        subject_id: String(subject_id),
      });

      const res = await fetch(
        `${API_BASE_URL}/faculty/attendance/students?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        setStudents([]);
        setAttendanceData([]);
        setStudentsMessage("Failed to load students");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setStudents([]);
        setAttendanceData([]);
        setStudentsMessage("Invalid response while loading students");
        setLoading(false);
        return;
      }

      setStudents(data);
      setStudentsMessage(data.length === 0 ? "No students found" : "");

      // 2️⃣ Check if attendance exists
      const checkRes = await fetch(
        `${API_BASE_URL}/faculty/attendance/check?subject_id=${subject_id}&date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const checkData = await checkRes.json();
      setAlreadyMarked(checkData.already_marked);

      // 3️⃣ If already marked → load saved attendance
      if (checkData.already_marked) {
        const editRes = await fetch(
          `${API_BASE_URL}/faculty/attendance/by-date?subject_id=${subject_id}&date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const savedData = await editRes.json();

        setAttendanceData(savedData);
      } else {
        // 4️⃣ If new → default all present
        setAttendanceData(
          data.map((s) => ({
            student_id: s.id,
            status: true,
          }))
        );
      }

    } catch (err) {
      console.error("Error loading students", err);
      setStudents([]);
      setAttendanceData([]);
      setStudentsMessage("Failed to load students");
    }

    setLoading(false);
  };

  /* ================= SUBJECT CHANGE ================= */
  const handleSubjectChange = (id) => {
    if (!id) {
      setSelectedSubject(null);
      setStudents([]);
      setAttendanceData([]);
      setAlreadyMarked(false);
      setStudentsMessage("Select subject to load students");
      return;
    }

    const subject = subjects.find(
      (s) => s.subject_id === parseInt(id)
    );

    setSelectedSubject(subject);
    loadStudents(subject);
  };


  useEffect(() => {
    if (selectedSubject) {
      loadStudents(selectedSubject);
    }
  }, [date]);

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

  const handlePreview = () => {
    if (!date) {
      alert("Select date");
      return;
    }

    if (!selectedSubject) {
      alert("Select subject");
      return;
    }

    if (attendanceData.length === 0) {
      alert("No students loaded");
      return;
    }

    const total = attendanceData.length;
    const present = attendanceData.filter(s => s.status).length;
    const absent = total - present;

    setPreviewData({
      total,
      present,
      absent,
    });

    setShowPreview(true);
  };


  /* ================= SAVE ================= */
  const confirmSaveAttendance = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const res = await fetch("http://localhost:8000/faculty/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_id: selectedSubject.subject_id,
          date: date,
          department: selectedSubject.department,  // 🔥 ADD THIS
          year: selectedSubject.year,
          section: selectedSubject.section,
          records: attendanceData,
        }),
      });

      // 🔥 THIS IS THE EXACT LOCATION
      if (!res.ok) {
        if (res.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.removeItem("access_token");
          window.location.href = "/";
          return;
        }

        const error = await res.json();
        alert(error.detail || "Failed to save attendance");
        return;
      }

      await loadStudents(selectedSubject);

      setShowPreview(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      alert("Server error while saving attendance");
    } finally {
      setSaving(false);
    }
  };

 
  
 /* ================= LOAD REPORT ================= */
  const loadReport = async (type) => {
    if (!selectedSubject) {
      alert("Select subject first");
      return;
    }

    const today = new Date();
    let startDate;
    let endDate = new Date(); // today copy

    if (type === "weekly") {
      const todayCopy = new Date();
      const day = todayCopy.getDay(); // 0=Sun,1=Mon
      const mondayOffset = day === 0 ? -6 : 1 - day;

      startDate = new Date(todayCopy);
      startDate.setDate(todayCopy.getDate() + mondayOffset);
    }

    if (type === "monthly") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const formatDate = (d) =>
      d.toISOString().split("T")[0];

    const url = `http://localhost:8000/faculty/attendance/report/${selectedSubject.subject_id}?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      alert("Failed to load report");
      return;
    }

    const data = await res.json();

    setReportType(type);
    setReportData(data);
    setShowReport(true);
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadReport = async () => {
    const today = new Date();
    let startDate;
    let endDate = new Date();

    if (reportType === "weekly") {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(today.getFullYear(), today.getMonth(), diff);
    }

    if (reportType === "monthly") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const formatDate = (d) =>
      d.toISOString().split("T")[0];

    const url = `http://localhost:8000/faculty/attendance/report/${selectedSubject.subject_id}/download?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      alert("Failed to download report");
      return;
    }

    const blob = await response.blob();
    const fileURL = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileURL;
    link.download = "attendance_report.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return "";

    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

        {/* 🔥 ADD THIS EXACTLY HERE */}
        {alreadyMarked && (
          <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl 
                          bg-gradient-to-r from-amber-50 to-yellow-50 
                          border border-yellow-300 
                          text-yellow-900 text-sm 
                          animate-pulse">

            <InfoOutlinedIcon className="text-yellow-600 mt-0.5" />

            <div>
              <p className="font-semibold">
                Attendance Already Recorded
              </p>
              <p className="text-xs mt-1 text-yellow-800">
                You have already marked attendance for this date. 
                You can update it if required.
              </p>
            </div>

          </div>
        )}
        {loading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            {studentsMessage}
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

                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                      Last 5 Classes
                    </p>

                    {s.last_5 && s.last_5.length === 0 ? (
                      <p className="text-xs text-gray-400">No recent records</p>
                    ) : (
                      <div className="flex gap-2 items-center">
                        {s.last_5.map((item, i) => (
                          <div key={i} className="group relative">
                            <span
                              className={`block w-4 h-4 rounded-full ${
                                item.status === true
                                  ? "bg-green-500"
                                  : item.status === false
                                  ? "bg-red-500"
                                  : "bg-gray-300"
                              }`}
                            />

                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 
                                            opacity-0 group-hover:opacity-100 
                                            transition-all duration-200
                                            bg-gray-900 text-white text-xs px-2 py-1 
                                            rounded-md whitespace-nowrap shadow-lg z-20">
                              {formatDate(item.date)} <br />
                              {item.status ? "Present" : "Absent"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
              onClick={handlePreview}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl"
            >
              {alreadyMarked ? "Update Attendance" : "Save Attendance"}
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
              <p className="text-xs text-gray-500">
                Period: {formatDate(reportData.start_date)} – {formatDate(reportData.end_date)}
              </p>
              <p>Total Classes: {reportData.total_records}</p>
              <p>Present: {reportData.present_percentage}%</p>
              <p>Absent: {reportData.absent_percentage}%</p>
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
