import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import SmartTaskManager from "../../components/SmartTaskManager";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";
import SkeletonProfile from "../../components/skeletons/SkeletonProfile";

export default function Overview({ profile }) {
  const [data, setData] = useState({
    profile: { name: "", department: "", semester: "", classId: "" },
    attendance: null,
    cgpa: null,
    sgpa: null,
    pendingAssignments: null,
    upcomingEvents: [],
    subjects: [],
    assignments: [],
    events: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marksSubjects, setMarksSubjects] = useState([]);
  const [attendanceSubjects, setAttendanceSubjects] = useState([]);
  const [attendanceSubject, setAttendanceSubject] = useState("All Subjects");
  const [selectedAttendanceSubjectId, setSelectedAttendanceSubjectId] = useState(null);
  const [view, setView] = useState("daily");
  const [attendanceData, setAttendanceData] = useState([]);
  const [semester, setSemester] = useState("");
  const navigate = useNavigate();

  const normalizeText = (value) => value?.toString().trim().toLowerCase() || "";
  const getSubjectName = (item) =>
    (item?.subject || item?.subject_name || item?.name || item?.course || "").toString().trim();
  const getDateLabel = (item, index) =>
    item?.date || item?.attendance_date || item?.day || item?.label || `Point ${index + 1}`;

  const handleAttendanceSubjectChange = (e) => {
    const selectedId = e.target.value ? Number(e.target.value) : null;
    const selected = attendanceSubjectOptions.find((subject) => subject.id === selectedId);
    setAttendanceSubject(selected?.name || "All Subjects");
    setSelectedAttendanceSubjectId(selectedId);
  };

  const buildAttendanceUrl = ({ studentId, semester, subjectId, view }) => {
    const params = new URLSearchParams();
    if (studentId) params.set("student_id", studentId);
    if (semester) params.set("semester", semester);
    if (subjectId) params.set("subject_id", subjectId);
    params.set("view", (view || "daily").toString().toLowerCase());
    return `http://localhost:8000/student/attendance?${params.toString()}`;
  };

  const token = localStorage.getItem("access_token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId =
    user?.user_id || user?.student_id || user?.id || profile?.student_id || profile?.id || null;

  useEffect(() => {
    async function fetchOverview() {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const profileRes = await fetch("http://localhost:8000/student/profile", { headers });
        const profileData = profileRes.ok ? await profileRes.json() : {};
        const semesterValue =
          profileData?.semester || profileData?.sem || profile?.semester || "";
        setSemester(semesterValue);

        const attendanceUrl = buildAttendanceUrl({
          studentId,
          semester: semesterValue,
          view,
        });

        const [attendanceRes, marksRes, assignmentsRes, eventsRes] = await Promise.all([
          fetch(attendanceUrl, { headers }),
          fetch("http://localhost:8000/student/my-marks", { headers }),
          fetch("http://localhost:8000/student/assignments", { headers }),
          fetch("http://localhost:8000/student/events", { headers }),
        ]);

        if (
          profileRes.status === 401 ||
          attendanceRes.status === 401 ||
          marksRes.status === 401 ||
          assignmentsRes.status === 401 ||
          eventsRes.status === 401
        ) {
          console.error("Unauthorized: Session expired");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        const attendanceData = attendanceRes.ok ? await attendanceRes.json() : {};
        const marksData = marksRes.ok ? await marksRes.json() : {};
        const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : {};
        const eventsData = eventsRes.ok ? await eventsRes.json() : {};

        const attendanceSubjectsRaw = Array.isArray(attendanceData)
          ? attendanceData
              .filter((subject) => subject && (subject.subject_id || subject.id))
              .map((subject) => ({
                id: subject.subject_id ?? subject.id,
                name:
                  subject.subject_name ||
                  subject.subject ||
                  subject.name ||
                  `Subject ${subject.subject_id ?? subject.id}`,
              }))
          : [];

        setAttendanceSubjects(attendanceSubjectsRaw);

        const studentName =
          profileData?.name ||
          profileData?.student_name ||
          user?.name ||
          profile?.name ||
          "Student";
        const department = profileData?.department || profileData?.branch || profile?.department || "";
        const semester = profileData?.semester || profileData?.sem || profile?.semester || "";

        let attendance = null;
        if (typeof attendanceData === "number") attendance = attendanceData;
        else if (attendanceData?.overall !== undefined) attendance = attendanceData.overall;
        else if (attendanceData?.percentage !== undefined) attendance = attendanceData.percentage;
        else if (attendanceData?.attendance_percentage !== undefined) attendance = attendanceData.attendance_percentage;
        else if (Array.isArray(attendanceData) && attendanceData.length > 0) {
          const total = attendanceData.reduce((sum, item) => {
            const value = item?.percentage ?? item?.attendance ?? item?.attendance_percentage ?? 0;
            return sum + Number(value || 0);
          }, 0);
          attendance = Math.round(total / attendanceData.length);
        }
        attendance = attendance !== null && attendance !== undefined ? Math.max(0, Math.min(100, Number(attendance) || 0)) : null;

        const cgpa = [marksData?.cgpa, marksData?.gpa, marksData?.avg, marksData?.average].find((value) => value !== undefined && value !== null) ?? null;
        const sgpa = [marksData?.sgpa, marksData?.semester_gpa, marksData?.semester_sgpa, marksData?.current_sgpa].find((value) => value !== undefined && value !== null) ?? null;

        const assignmentsList = Array.isArray(assignmentsData)
          ? assignmentsData
          : Array.isArray(assignmentsData?.assignments)
          ? assignmentsData.assignments
          : Array.isArray(assignmentsData?.data)
          ? assignmentsData.data
          : [];

        const pendingCount = assignmentsList.filter((a) => a && a?.status !== "submitted" && !a?.submitted).length;

        const eventsList = Array.isArray(eventsData)
          ? eventsData
          : Array.isArray(eventsData?.events)
          ? eventsData.events
          : Array.isArray(eventsData?.data)
          ? eventsData.data
          : [];

        const upcomingEvents = eventsList.slice(0, 2);

        const attendanceRecordsRaw = Array.isArray(attendanceData?.records)
          ? attendanceData.records
          : Array.isArray(attendanceData?.trend)
          ? attendanceData.trend
          : Array.isArray(attendanceData?.history)
          ? attendanceData.history
          : Array.isArray(attendanceData?.data)
          ? attendanceData.data
          : Array.isArray(attendanceData)
          ? attendanceData
          : [];

        const attendanceArray = Array.isArray(attendanceRecordsRaw) ? attendanceRecordsRaw : [];
        setAttendanceData(attendanceArray);

        const marksSubjectsRaw = Array.isArray(marksData?.subjects)
          ? marksData.subjects
          : Array.isArray(marksData?.data)
          ? marksData.data
          : [];

        const mergedSubjects = Array.isArray(marksData?.subjects)
          ? marksData.subjects
          : marksSubjectsRaw;

        const derivedClassId =
          profileData?.class_id ||
          (profileData?.year && profileData?.section
            ? `${profileData.year}-${profileData.section}`
            : "");

        setData({
          profile: { name: studentName, department, semester, classId: derivedClassId },
          attendance,
          cgpa: cgpa !== null ? Number(cgpa) : null,
          sgpa: sgpa !== null ? Number(sgpa) : null,
          pendingAssignments: pendingCount,
          upcomingEvents,
          subjects: Array.isArray(mergedSubjects) ? mergedSubjects : [],
          assignments: assignmentsList,
          events: eventsList,
        });

        setMarksSubjects(marksSubjectsRaw);
        setAttendanceData(attendanceArray);
      } catch (err) {
        console.error("FETCH ERROR:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    if (!token) {
      console.warn("No authentication token found");
      setLoading(false);
      return;
    }

    fetchOverview();
  }, [token, profile, user?.name]);

  useEffect(() => {
    if (!token || !semester || !studentId) return;

    async function fetchAttendanceBySubject() {
      try {
        const url = buildAttendanceUrl({
          studentId,
          semester,
          subjectId: selectedAttendanceSubjectId,
          view,
        });

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          console.error("Unauthorized: Session expired");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        const attendanceResponse = res.ok ? await res.json() : [];
        const attendanceArray = Array.isArray(attendanceResponse) ? attendanceResponse : [];
        setAttendanceData(attendanceArray);
      } catch (err) {
        console.error("Attendance fetch failed:", err);
        setAttendanceData([]);
      }
    }

    fetchAttendanceBySubject();
  }, [selectedAttendanceSubjectId, semester, token, studentId, view]);

  const attendanceDisplay = data.attendance !== null && data.attendance !== undefined ? `${data.attendance}%` : "--";
  const cgpaDisplay = data.cgpa !== null && data.cgpa !== undefined ? data.cgpa.toFixed(2) : "--";
  const sgpaDisplay = data.sgpa !== null && data.sgpa !== undefined ? data.sgpa.toFixed(2) : "--";
  const pendingAssignmentDisplay = data.pendingAssignments !== null && data.pendingAssignments !== undefined ? data.pendingAssignments : "--";
  const upcomingEventsCount = data.upcomingEvents?.length ?? 0;

  const attendanceSubjectOptions = useMemo(() => {
    const options = [{ name: "All Subjects", id: null }, ...attendanceSubjects];
    return options;
  }, [attendanceSubjects]);

  const attendanceTrendData = useMemo(() => {
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) return [];

    const formatPoint = (point) => ({
      label: point?.date ?? point?.label ?? "",
      value: Number(point?.percentage ?? point?.value ?? 0),
    });

    if (selectedAttendanceSubjectId) {
      const selectedSubject = attendanceData.find(
        (subject) =>
          subject.subject_id === selectedAttendanceSubjectId ||
          subject.id === selectedAttendanceSubjectId
      );
      return Array.isArray(selectedSubject?.trend)
        ? selectedSubject.trend.map(formatPoint)
        : [];
    }

    const trendMap = {};
    const labelOrder = [];

    attendanceData.forEach((subject) => {
      if (!Array.isArray(subject?.trend)) return;
      subject.trend.forEach((point) => {
        const label = point?.date ?? point?.label;
        if (!label) return;

        if (!trendMap[label]) {
          trendMap[label] = { total: 0, count: 0 };
          labelOrder.push(label);
        }

        trendMap[label].total += Number(point?.percentage ?? 0);
        trendMap[label].count += 1;
      });
    });

    return labelOrder.map((label) => ({
      label,
      value: Number(
        ((trendMap[label].total || 0) / (trendMap[label].count || 1)).toFixed(2)
      ),
    }));
  }, [attendanceData, selectedAttendanceSubjectId]);

  const overallPercentage = useMemo(() => {
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) return null;
    if (selectedAttendanceSubjectId) {
      const selectedSubject = attendanceData.find(
        (subject) =>
          subject.subject_id === selectedAttendanceSubjectId ||
          subject.id === selectedAttendanceSubjectId
      );
      return selectedSubject?.percentage !== undefined
        ? Number(selectedSubject.percentage)
        : null;
    }

    const percents = attendanceData
      .map((subject) => Number(subject?.percentage ?? 0))
      .filter((value) => !Number.isNaN(value));

    if (!percents.length) return null;
    return Number((percents.reduce((sum, value) => sum + value, 0) / percents.length).toFixed(2));
  }, [attendanceData, selectedAttendanceSubjectId]);

  const attendanceStatus = useMemo(() => {
    if (overallPercentage === null || overallPercentage === undefined) return "--";
    if (overallPercentage >= 75) return "Safe";
    if (overallPercentage >= 65) return "Warning";
    return "At Risk";
  }, [overallPercentage]);

  const getRiskStatus = (assessmentName, marks) => {
    const name = (assessmentName || "").toString().toLowerCase();
    if (marks === null || marks === undefined || marks === "-") return "--";
    const numeric = Number(marks);
    if (Number.isNaN(numeric)) return "--";

    if (name.includes("assignment")) {
      return numeric < 5 ? "At Risk" : "Good";
    }
    if (name.includes("mid")) {
      return numeric < 15 ? "At Risk" : "Good";
    }
    return "Good";
  };

  const performanceRows = useMemo(() => {
    const normalizedSelectedSubject = normalizeText(attendanceSubject);

    return marksSubjects.flatMap((subject) => {
      const subjectName = getSubjectName(subject) || "Unknown";
      if (
        normalizedSelectedSubject !== "all subjects" &&
        normalizeText(subjectName) !== normalizedSelectedSubject
      ) {
        return [];
      }

      const rows = [];
      const addRow = (assessmentName, value) => {
        if (value === undefined || value === null || value === "-") return;
        const numericValue = Number(value);
        const marks = Number.isNaN(numericValue) ? value : numericValue;
        const status = getRiskStatus(assessmentName, marks);

        rows.push({
          subject: subjectName,
          assessment: assessmentName,
          marks,
          status,
        });
      };

      if (subject?.assignments && typeof subject.assignments === "object") {
        Object.entries(subject.assignments).forEach(([key, value]) => {
          const assessmentLabel = key.toString().replace(/A(\d+)/i, "Assignment $1");
          addRow(assessmentLabel, value);
        });
      }

      addRow("Mid-1", subject?.mid1 ?? subject?.mid_1);
      addRow("Mid-2", subject?.mid2 ?? subject?.mid_2);
      addRow("Semester", subject?.semester ?? subject?.sem ?? subject?.semester_marks ?? subject?.semesterMarks);

      return rows;
    });
  }, [marksSubjects, attendanceSubject]);

  const riskSubjects = useMemo(
    () =>
      performanceRows.reduce((risks, row) => {
        if (row.status === "At Risk") {
          risks.push(`${row.subject} - ${row.assessment} is at risk (${row.marks})`);
        }
        return risks;
      }, []),
    [performanceRows]
  );

  const subjectStatus = (status) => {
    if (!status || status === "--") {
      return { text: "--", color: "text-slate-500" };
    }

    return status === "At Risk"
      ? { text: "At Risk", color: "text-amber-600" }
      : { text: "Good", color: "text-emerald-600" };
  };

  function getSubjectMarkValue(subject) {
    if (!subject) return null;

    const directMark = subject?.mark ?? subject?.marks ?? subject?.score ?? subject?.total ?? subject?.obtained ?? subject?.value;
    if (typeof directMark === "number" && !Number.isNaN(directMark)) return directMark;
    if (typeof directMark === "string" && directMark.trim() !== "" && !Number.isNaN(Number(directMark))) {
      return Number(directMark);
    }

    if (subject?.marks && typeof subject.marks === "object") {
      const nestedValue = Object.values(subject.marks).find(
        (value) => value !== undefined && value !== null && value !== "" && !Number.isNaN(Number(value))
      );
      if (nestedValue !== undefined) return Number(nestedValue);
    }

    const candidates = [
      subject?.mid1,
      subject?.mid_1,
      subject?.mid2,
      subject?.mid_2,
      subject?.semester,
      subject?.sem,
      subject?.final,
      subject?.end_sem,
      subject?.marks1,
      subject?.marks2,
    ];

    const candidate = candidates.find(
      (value) => value !== undefined && value !== null && value !== "" && !Number.isNaN(Number(value))
    );
    return candidate !== undefined ? Number(candidate) : null;
  }

  const recentActivity = useMemo(() => {
    const items = [];
    if (Array.isArray(data.assignments)) {
      data.assignments.slice(0, 2).forEach((assignment) => {
        if (assignment?.title || assignment?.name) {
          items.push({
            id: `a-${assignment?.id ?? assignment?.title ?? Math.random()}`,
            message: `New assignment uploaded: ${assignment?.title || assignment?.name}`,
          });
        }
      });
    }
    if (Array.isArray(data.events)) {
      data.events.slice(0, 2).forEach((event) => {
        if (event?.title || event?.name) {
          items.push({
            id: `e-${event?.id ?? event?.title ?? Math.random()}`,
            message: `Upcoming event: ${event?.title || event?.name}`,
          });
        }
      });
    }
    return items.slice(0, 3);
  }, [data.assignments, data.events]);

  if (loading) return <StudentOverviewSkeleton />;

  return (
    <div className="space-y-6 animate-fadeIn text-gray-800 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Student Overview</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {data.profile.name || user?.name || "Student"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {data.profile.department ? `${data.profile.department} • ` : ""}
            {data.profile.semester ? `Semester ${data.profile.semester}` : "--"}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="glass rounded-3xl border border-slate-200 p-5 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance</p>
            <p className="mt-4 text-3xl font-bold text-slate-900">{attendanceDisplay}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center font-semibold text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<CheckCircleIcon />}
          iconColor="text-emerald-600"
          bgGradient="from-emerald-50/50 to-emerald-50"
          title="SGPA"
          value={sgpaDisplay}
          subtext="Semester GPA"
        />
        <KpiCard
          icon={<CheckCircleIcon />}
          iconColor="text-slate-700"
          bgGradient="from-slate-50/50 to-slate-50"
          title="CGPA"
          value={cgpaDisplay}
          subtext="Cumulative GPA"
        />
        <KpiCard
          icon={<AssignmentIcon />}
          iconColor="text-amber-500"
          bgGradient="from-amber-50/50 to-amber-50"
          title="Pending Assignments"
          value={pendingAssignmentDisplay}
          subtext="To be submitted"
        />
        <KpiCard
          icon={<EventIcon />}
          iconColor="text-purple-500"
          bgGradient="from-purple-50/50 to-purple-50"
          title="Upcoming Events"
          value={upcomingEventsCount > 0 ? upcomingEventsCount : "--"}
          subtext="Next events"
        />
      </div>

      <SmartTaskManager
        studentData={{
          studentId,
          studentName: data.profile.name || user?.name || "You",
          classId: data.profile.classId,
          attendance: data.attendance,
          attendanceTrend: 0,
          mid1: marksSubjects?.[0]?.mid1 || 0,
          mid2: marksSubjects?.[0]?.mid2 || 0,
          assignment: marksSubjects?.[0]?.assignments?.A1 || 0,
          pendingAssignments: data.assignments.filter((a) => a?.status !== "submitted" && !a?.submitted),
          assignmentsAll: data.assignments,
          upcomingEvents: data.upcomingEvents,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-8 space-y-4">
          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-blue-50/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Attendance Trend</h3>
                  <p className="text-sm text-gray-500">Your attendance history by subject</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</label>
                    <select
                      value={selectedAttendanceSubjectId ?? ""}
                      onChange={handleAttendanceSubjectChange}
                      className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {attendanceSubjectOptions.map((subject) => (
                        <option key={subject.id ?? "all"} value={subject.id ?? ""}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">View</label>
                    <select
                      value={view}
                      onChange={(e) => setView(e.target.value)}
                      className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:items-end mb-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overall Percentage</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {overallPercentage !== null ? `${overallPercentage}%` : "--"}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{attendanceStatus}</p>
                </div>
              </div>

              {attendanceTrendData.length === 0 ? (
                <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
                  <p className="text-sm text-slate-500">No attendance data available for selected subject</p>
                </div>
              ) : (
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#94a3b8"
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}
                        labelFormatter={(label) => label}
                        formatter={(value) => [`${value}%`, "Attendance"]}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-slate-100/20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Subject Performance</h3>
                  <p className="text-sm text-gray-500">Review marks by subject and assessment</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-3 font-semibold text-slate-600">Subject</th>
                      <th className="py-3 text-center font-semibold text-slate-600">Assessment</th>
                      <th className="py-3 text-center font-semibold text-slate-600">Marks</th>
                      <th className="py-3 text-center font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceRows.length > 0 ? (
                      performanceRows.map((row, index) => {
                        const status = subjectStatus(row.marks);
                        return (
                          <tr key={`${row.subject}-${row.assessment}-${index}`} className="border-b border-slate-100">
                            <td className="py-4 font-medium text-slate-900">{row.subject}</td>
                            <td className="py-4 text-center text-slate-700">{row.assessment}</td>
                            <td className="py-4 text-center text-slate-700">{row.marks !== undefined ? row.marks : "--"}</td>
                            <td className="py-4 text-center">
                              <span className={`font-semibold ${status.color}`}>{status.text}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-500">
                          No subject performance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-100/20 via-transparent to-orange-100/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-red-700 text-lg mb-4 flex items-center gap-2">
                <WarningIcon className="text-red-500" />
                At Risk
              </h3>
              {riskSubjects.length > 0 ? (
                <div className="space-y-3">
                  {riskSubjects.map((risk, index) => (
                    <div key={index} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-700">{risk}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">No risks detected</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-transparent to-purple-100/20 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Quick Links</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/student/attendance")}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View Attendance Details
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/student/assignments")}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  View Assignments
                </button>
              </div>
            </div>
          </div>

          {recentActivity.length > 0 && (
            <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/20 via-transparent to-slate-100/20 pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="font-bold text-gray-900 text-lg mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm text-slate-700">{activity.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentOverviewSkeleton() {
  return (
    <div className="space-y-6 text-gray-800 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-10 w-64 mt-2" />
          <SkeletonBox className="h-4 w-56 mt-2" />
        </div>
        <div className="flex gap-4">
          <div className="glass rounded-3xl border border-slate-200 p-5 min-w-[220px]">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-8 w-24 mt-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="glass rounded-2xl p-6">
        <SkeletonBox className="h-7 w-48" />
        <SkeletonBox className="h-4 w-72 mt-2" />
        <SkeletonBox className="h-40 w-full mt-5 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        <div className="lg:col-span-8 space-y-4">
          <div className="glass rounded-2xl p-6">
            <SkeletonBox className="h-6 w-44" />
            <SkeletonBox className="h-4 w-64 mt-2" />
            <SkeletonBox className="h-28 w-full mt-4 rounded-2xl" />
            <SkeletonBox className="h-[250px] w-full mt-4 rounded-2xl" />
          </div>

          <div className="glass rounded-2xl p-6">
            <SkeletonBox className="h-6 w-44" />
            <SkeletonBox className="h-4 w-64 mt-2" />
            <div className="mt-4">
              <SkeletonTable rows={5} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-2xl p-6">
            <SkeletonProfile />
          </div>
          <div className="glass rounded-2xl p-6">
            <SkeletonTable rows={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, iconColor, bgGradient, title, value, subtext }) {
  return (
    <div className="glass rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${bgGradient} shadow-inner backdrop-blur-sm transition-transform duration-300`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{value}</p>
          <p className="text-xs font-medium text-slate-500">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
