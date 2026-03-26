import { useState, useEffect } from "react";
import api from "../../utils/api";

/* ================= ADMIN ACADEMICS ================= */

export default function Academics() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(null); // "student" | "faculty"
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);


  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50 to-cyan-50 border">
        <h1 className="text-2xl font-semibold text-slate-800">
          Academic Analytics
        </h1>
        <p className="text-sm text-slate-600">
          Students, faculty performance & syllabus progress
        </p>
      </div>

      {/* ================= ADMIN ACTIONS ================= */}
      <div className="bg-white px-4 py-3 rounded-xl border flex gap-3 flex-wrap items-center">

        <button
          onClick={() => setShowSubjectModal(true)}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
         >
          📘 Manage Subjects
        </button>

        <button
          onClick={() => setShowSyllabusModal(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition"
        >
          🗂 Syllabus Progress
        </button>

        <button
          onClick={() => setShowNoticeModal(true)}
          className="ml-auto px-4 py-2 rounded-lg border border-amber-300 text-amber-600 text-sm hover:bg-amber-50 transition"
        >
          📄 Upload Academic Notice
        </button>

      </div>


      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex flex-wrap gap-4">
        <select className="border px-3 py-2 rounded-lg">
          <option>All Departments</option>
          <option>CSE</option>
          <option>CSM</option>
          <option>ECE</option>
          <option>MECH</option>
          <option>CIVIL</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>All Years</option>
          <option>1st Year</option>
          <option>2nd Year</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>All Semesters</option>
          <option>Sem 1</option>
          <option>Sem 2</option>
        </select>
      </div>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Avg Attendance" value="82%" />
        <Kpi title="Avg CGPA" value="7.6" />
        <Kpi title="At-Risk Students" value="154" danger />
        <Kpi title="Syllabus Delays" value="8 Subjects" warning />
      </div>


      {/* ================= STUDENT ANALYTICS ================= */}
      <AnalyticsSection title="Student Academic Health">
        <ChartCard title="Attendance Trend">
          Analytics agent will render attendance trends
        </ChartCard>
        <ChartCard title="CGPA Distribution">
          Analytics agent will render CGPA distribution
        </ChartCard>
        <ChartCard title="At-Risk Students by Year">
          Analytics agent will render risk segmentation
        </ChartCard>
      </AnalyticsSection>

      {/* ================= FACULTY IMPACT ================= */}
      <AnalyticsSection title="Teaching Impact Analysis">
        <ChartCard title="Avg Student Attendance per Faculty">
          Analytics agent will render faculty impact
        </ChartCard>
        <ChartCard title="Avg Subject CGPA per Faculty">
          Analytics agent will render subject performance
        </ChartCard>
        <ChartCard title="Subjects with Weak Outcomes">
          Analytics agent will highlight problem subjects
        </ChartCard>
      </AnalyticsSection>

      {/* ================= SYLLABUS TRACKING ================= */}
      <AnalyticsSection title="Syllabus Completion Tracking">
        <ChartCard title="Planned vs Completed Syllabus">
          Analytics agent will render syllabus progress
        </ChartCard>
        <ChartCard title="Delayed Subjects by Department">
          Analytics agent will render delay analysis
        </ChartCard>
        <ChartCard title="Faculty-wise Syllabus Status">
          Analytics agent will render faculty progress
        </ChartCard>
      </AnalyticsSection>

      
      {/* ================= ACADEMICS MODALS ================= */}
      {showSubjectModal && (<ManageSubjectsModal onClose={() => setShowSubjectModal(false)}/>)}

      {showSyllabusModal && ( <SyllabusProgressModal onClose={() => setShowSyllabusModal(false)} />)}

      {showNoticeModal && ( <UploadAcademicNoticeModal onClose={() => setShowNoticeModal(false)} />)}

    </div>
  );
}

/* ================= SIMPLE ACADEMIC MODAL ================= */
function ManageSubjectsModal({ onClose }) {
  const [step, setStep] = useState("form"); // form | review | animating | success
  const [action, setAction] = useState("add"); // add | delete | edit

  /* ===== CONTEXT FILTER ===== */
  const [context, setContext] = useState({
  department: "",
  semester: "",
});

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/admin/subjects');
      setSubjects(response.data);
    } catch (err) {
      console.error("Error loading subjects", err);
    }
  };

  /* ===== ADD SUBJECT ===== */
  const [newSubject, setNewSubject] = useState({
    code: "",
    name: "",
    credits: "",
  });

  /* ===== DELETE SUBJECT ===== */
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

  const DEPARTMENT_ID_MAP = {
  CSE: 11,
  CSM: 12,
  ECE: 14,
  MECH: 15,
  CIVIL: 1,
 };
  /* ===== FINAL CONFIRM ===== */
  const confirmAction = async () => {
  try {
    if (action === "add") {

    if (!context.department || !context.semester) {
      alert("Select department and semester");
      return;
    }

    const semesterNumber = parseInt(
      context.semester.replace("Sem ", "")
    );

    const departmentId = DEPARTMENT_ID_MAP[context.department];
    if (!departmentId) {
      alert("Invalid department selected");
      return;
    }

    const response = await api.post('/admin/subjects', {
      subject_code: newSubject.code,
      subject_name: newSubject.name,
      semester: semesterNumber,
      credits: Number(newSubject.credits),
      department_id: departmentId,
    });

    await fetchSubjects();
 }

  if (action === "delete" && selectedSubject) {
      const confirmDelete = window.confirm(
        "Are you sure you want to permanently delete this subject?"
      );

   if (!confirmDelete) return;
      await api.delete(`/admin/subjects/${selectedSubject.subject_id}`);

      await fetchSubjects();
    }

    if (action === "edit" && selectedSubject) {
      const semesterNumber = parseInt(
        context.semester.replace("Sem ", "")
      );

      const departmentId = DEPARTMENT_ID_MAP[context.department];

      await api.put(`/admin/subjects/${selectedSubject.subject_id}`, {
        subject_code: newSubject.code,
        subject_name: newSubject.name,
        semester: semesterNumber,
        credits: Number(newSubject.credits),
        department_id: departmentId,
      });

      await fetchSubjects();
   }

    // move to animation stage
    setStep("animating");

    // after animation completes → show success
    setTimeout(() => {
      setStep("success");

      // keep success visible longer
      setTimeout(() => {

        // reset everything AFTER success finishes
        setNewSubject({ code: "", name: "", credits: "" });
        setContext({ department: "", semester: "" });
        setSelectedSubject(null);
        setDeleteReason("");

        onClose();

      }, 2500); // success visible 2.5 seconds

    }, 1200); // animation duration

  } catch (err) {
    console.error("Error:", err);
  }
 };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Manage Subjects</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* CONTEXT FILTER */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["department", "semester"].map((key) => (
                <select
                  value={context[key]}
                  className="border px-3 py-2 rounded-lg"
                  onChange={(e) =>
                    setContext({ ...context, [key]: e.target.value })
                  }
                >
                  <option value="">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </option>
                  {key === "department" && ["CSE","CSM","ECE","MECH","CIVIL"].map(v => <option key={v}>{v}</option>)}
                  {key === "semester" && ["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5","Sem 6","Sem 7","Sem 8"].map(v => <option key={v}>{v}</option>)}
                  
                </select>
              ))}
            </div>

            {/* ACTION SWITCH */}
            <div className="flex gap-3">
              <button
                onClick={() => setAction("add")}
                className={`px-4 py-2 rounded-lg border ${
                  action === "add" ? "bg-indigo-600 text-white" : ""
                }`}
              >
                ➕ Add Subject
              </button>

              <button
                onClick={() => setAction("delete")}
                className={`px-4 py-2 rounded-lg border ${
                  action === "delete" ? "bg-red-600 text-white" : ""
                }`}
              >
                🗑 Delete Subject
              </button>

              <button
                onClick={() => setAction("edit")}
                className={`px-4 py-2 rounded-lg border ${
                  action === "edit" ? "bg-amber-500 text-white" : ""
                }`}
              >
                ✏ Edit Subject
              </button>
            </div>

            {/* ================= ADD SUBJECT ================= */}
            {action === "add" && (
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={newSubject.code}
                  placeholder="Code"
                  className="border px-3 py-2 rounded-lg"
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, code: e.target.value })
                  }
                />

                <input
                  value={newSubject.name}
                  placeholder="Name"
                  className="border px-3 py-2 rounded-lg"
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, name: e.target.value })
                  }
                />

                <input
                  value={newSubject.credits}
                  placeholder="Credits"
                  type="number"
                  className="border px-3 py-2 rounded-lg"
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, credits: e.target.value })
                  }
                />
              </div>
            )}

            {/* ================= DELETE SUBJECT ================= */}
            {action === "delete" && (
              <>
                <div className="border rounded-lg max-h-40 overflow-y-auto text-sm">

                  {subjects.length === 0 && (
                    <p className="text-center text-gray-400 py-3">
                      No subjects found
                    </p>
                  )}

                  {subjects.map((s) => (
                    <div
                      key={s.subject_id}
                      onClick={() => setSelectedSubject(s)}
                      className={`px-3 py-2 cursor-pointer border-b
                      ${selectedSubject?.subject_id === s.subject_id ? "bg-red-50" : "hover:bg-gray-50"}`}
                    >
                      <b>{s.subject_code}</b> – {s.subject_name} ({s.credits} credits)
                    </div>
                  ))}

                </div>

                {selectedSubject && (
                  <textarea
                    rows={3}
                    placeholder="Reason for deleting this subject (mandatory)"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg"
                  />
                )}
              </>
            )}

           {/* ================= EDIT SUBJECT ================= */}
            {action === "edit" && (
              <div className="border rounded-lg max-h-40 overflow-y-auto text-sm">
                {subjects.map((s) => (
                  <div
                    key={s.subject_id}
                    onClick={() => {
                      setSelectedSubject(s);
                      setNewSubject({
                        code: s.subject_code,
                        name: s.subject_name,
                        credits: s.credits,
                      });
                      setContext({
                        department: Object.keys(DEPARTMENT_ID_MAP).find(
                          (key) => DEPARTMENT_ID_MAP[key] === s.department_id
                        ),
                        semester: `Sem ${s.semester}`,
                      });
                    }}
                    className={`px-3 py-2 cursor-pointer border-b
                    ${
                      selectedSubject?.subject_id === s.subject_id
                        ? "bg-amber-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <b>{s.subject_code}</b> – {s.subject_name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                disabled={
                  (action === "delete" && (!selectedSubject || !deleteReason)) ||
                  ((action === "add" || action === "edit") &&
                    (!newSubject.code ||
                    !newSubject.name ||
                    !newSubject.credits ||
                    !context.department ||
                    !context.semester))
                }
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                Preview
              </button>
            </div>
          </>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4 text-sm">
            <p className="font-medium">Preview before final publish</p>

            {action === "delete" && selectedSubject && (
              <div className="border rounded-lg p-4 bg-red-50 space-y-1">
                <p><b>Subject:</b> {selectedSubject.subject_code} – {selectedSubject.subject_name}</p>
                <p><b>Context:</b> {context.department} {context.semester},</p>
                <p><b>Reason:</b> {deleteReason}</p>
              </div>
            )}

            {(action === "add" || action === "edit") && (
              <div className="border rounded-lg p-4 bg-green-50 space-y-2">
                <p><b>Subject Code:</b> {newSubject.code}</p>
                <p><b>Subject Name:</b> {newSubject.name}</p>
                <p><b>Department:</b> {context.department}</p>
                <p><b>Semester:</b> {context.semester}</p>
                <p><b>Credits:</b> {newSubject.credits}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep("form")} className="px-4 py-2 border rounded-lg">
                Back & Edit
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-white rounded-lg ${
                  action === "add" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                Final Publish
              </button>
            </div>
          </div>
        )}

        {step === "animating" && (
          <div className="relative py-20 overflow-hidden flex flex-col items-center justify-center">

            {/* ========= ADD ANIMATION ========= */}
            {action === "add" && (
              <>
                <div className="absolute w-40 h-40 bg-green-200 rounded-full blur-3xl opacity-60 animate-glowPulse" />

                <div className="flex items-center gap-10 text-6xl relative z-10">
                  <div className="animate-flyBook">📘</div>
                  <div className="animate-stackImpact">📚📚📚</div>
                </div>

                <p className="mt-8 text-gray-600 animate-fadeIn">
                  Integrating subject into academic system...
                </p>
              </>
            )}

            {/* ========= DELETE ANIMATION ========= */}
            {action === "delete" && (
              <>
                <div className="absolute w-40 h-40 bg-red-200 rounded-full blur-3xl opacity-60 animate-glowPulseRed" />

                <div className="text-7xl animate-burnBook">
                  📘
                </div>

                <p className="mt-8 text-red-600 animate-fadeIn">
                  Removing subject from academic registry...
                </p>
              </>
            )}

            {/* ========= EDIT ANIMATION ========= */}
            {action === "edit" && (
              <>
                <div className="absolute w-40 h-40 bg-amber-200 rounded-full blur-3xl opacity-60 animate-glowPulseAmber" />

                <div className="flex items-center gap-6 text-6xl">
                  <div className="animate-updateBook">📘</div>
                  <div className="animate-pencilMove">✏️</div>
                </div>

                <p className="mt-8 text-amber-600 animate-fadeIn">
                  Updating subject details...
                </p>
              </>
            )}

          </div>
        )}
        

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-16 space-y-6">

            <div className="text-6xl animate-successPop">
              ✅
            </div>

            <h3 className="font-semibold text-xl">
              {action === "add" && "Subject Successfully Added to Academic Library"}
              {action === "edit" && "Subject Updated Successfully"}
              {action === "delete" && "Subject Permanently Removed"}
            </h3>

            <p className="text-gray-500">
              Academic subject registry updated
            </p>

          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SYLLABUS PROGRESS MODAL ================= */
function SyllabusProgressModal({ onClose }) {
  /* ===== TEMP DATA ===== */
  const SUBJECTS = [
    {
      id: 1,
      code: "CS301",
      name: "Database Management Systems",
      faculty: "Dr. Ramesh Kumar",
      expected: 70,
      actual: 62,
    },
    {
      id: 2,
      code: "CS302",
      name: "Operating Systems",
      faculty: "Prof. Anjali Sharma",
      expected: 70,
      actual: 74,
    },
    {
      id: 3,
      code: "CS303",
      name: "Computer Networks",
      faculty: "Dr. Suresh Rao",
      expected: 70,
      actual: 45,
    },
  ];

  const POLICY = { warning: 10 };

  const [filter, setFilter] = useState({
    department: "",
    year: "",
    semester: "",
  });

  const [alertSubject, setAlertSubject] = useState(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  /* ===== STATUS LOGIC ===== */
  const getStatus = (expected, actual) => {
    const gap = expected - actual;
    if (gap <= 0)
      return { label: "On Track", color: "bg-green-100 text-green-700" };
    if (gap <= POLICY.warning)
      return { label: "Needs Attention", color: "bg-amber-100 text-amber-700" };
    return { label: "Delayed", color: "bg-red-100 text-red-700" };
  };

  /* ===== PROGRESS BAR ===== */
  const ProgressBar = ({ value }) => {
    let color = "bg-green-500";
    if (value < 60) color = "bg-red-500";
    else if (value < 70) color = "bg-amber-500";

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    );
  };

  /* ===== SEND ALERT ===== */
  const handleSendAlert = () => {
    setSending(true);

    setTimeout(() => {
      setSending(false);
      setSent(true);

      setTimeout(() => {
        setSent(false);
        setAlertMsg("");
        setAlertSubject(null);
      }, 1800);
    }, 1400);
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Syllabus Progress</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* FILTERS (RESTORED) */}
        <div className="grid grid-cols-3 gap-4">
          <select
            className="border px-3 py-2 rounded-lg"
            onChange={(e) => setFilter({ ...filter, department: e.target.value })}
          >
            <option value="">Department</option>
            <option>CSE</option>
            <option>CSM</option>
            <option>ECE</option>
            <option>MECH</option>
            <option>CIVIL</option>
          </select>

          <select
            className="border px-3 py-2 rounded-lg"
            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
          >
            <option value="">Year</option>
            <option>1st Year</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
            <option>4th Year</option>
          </select>

          <select
            className="border px-3 py-2 rounded-lg"
            onChange={(e) => setFilter({ ...filter, semester: e.target.value })}
          >
            <option value="">Semester</option>
            <option>Sem 1</option>
            <option>Sem 2</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Faculty</th>
                <th className="px-4 py-2 text-center">Expected</th>
                <th className="px-4 py-2 text-center">Actual</th>
                <th className="px-4 py-2">Progress</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Alert</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => {
                const status = getStatus(s.expected, s.actual);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2">
                      <p className="font-medium">{s.code}</p>
                      <p className="text-xs text-gray-500">{s.name}</p>
                    </td>

                    <td className="px-4 py-2">{s.faculty}</td>

                    <td className="px-4 py-2 text-center">{s.expected}%</td>

                    <td className="px-4 py-2 text-center">{s.actual}%</td>

                    <td className="px-4 py-2">
                      <ProgressBar value={s.actual} />
                    </td>

                    <td className="px-4 py-2 text-center">
                      <span className={`px-3 py-1 text-xs rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setAlertSubject(s)}
                        className="px-3 py-1 text-xs rounded-lg border text-red-600 hover:bg-red-50"
                      >
                        Alert
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALERT MODAL */}
      {alertSubject && (
        <div className="fixed inset-0 bg-black/40 z-60 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">

            {!sent ? (
              <>
                <h3 className="text-lg font-semibold">Send Alert to Faculty</h3>

                <div className="text-sm">
                  <p><b>Faculty:</b> {alertSubject.faculty}</p>
                  <p><b>Subject:</b> {alertSubject.code} – {alertSubject.name}</p>
                </div>

                <textarea
                  rows={4}
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  placeholder="Write alert message..."
                  className="w-full border rounded-lg px-3 py-2"
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setAlertSubject(null)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSendAlert}
                    disabled={sending || !alertMsg}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {sending ? "Sending..." : "Send Alert"}
                  </button>
                </div>
              </>
            ) : (
              /* SUCCESS (RED) */
              <div className="text-center py-10 space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce">
                  <span className="text-3xl text-red-600">✓</span>
                </div>
                <h4 className="font-semibold text-red-600">
                  Alert Sent Successfully
                </h4>
                <p className="text-sm text-gray-500">
                  Faculty has been notified
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* ================= SIMPLE ACADEMIC MODAL ================= */
 function UploadAcademicNoticeModal({ onClose }) {
  const [step, setStep] = useState("form"); // form | review | animating | success
  const [notice, setNotice] = useState({
    title: "",
    type: "General",
    priority: "Normal",
    audience: "Both", // Students | Teachers | Both
    department: "All",
    year: "All",
    message: "",
    file: null,
  });

  /* ===== PUBLISH HANDLER ===== */
  const handlePublish = () => {
    // simulate API call
    setTimeout(() => {
      setStep("success");
      setTimeout(onClose, 2200);
    }, 1200);
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Upload Academic Notice</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* TYPE & PRIORITY */}
            <div className="grid grid-cols-2 gap-4">
              <select
                className="border px-3 py-2 rounded-lg"
                value={notice.type}
                onChange={(e) =>
                  setNotice({ ...notice, type: e.target.value })
                }
              >
                <option>General</option>
                <option>Exam</option>
                <option>Holiday</option>
                <option>Event</option>
                <option>Urgent</option>
              </select>

              <select
                className="border px-3 py-2 rounded-lg"
                value={notice.priority}
                onChange={(e) =>
                  setNotice({ ...notice, priority: e.target.value })
                }
              >
                <option>Normal</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            {/* AUDIENCE */}
            <div>
              <p className="text-sm font-medium text-gray-600">
                Send Notice To
              </p>
              <div className="flex gap-4 mt-2">
                {["Students", "Teachers", "Both"].map((role) => (
                  <label
                    key={role}
                    className={`px-4 py-2 border rounded-lg cursor-pointer text-sm
                    ${
                      notice.audience === role
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={role}
                      checked={notice.audience === role}
                      onChange={(e) =>
                        setNotice({ ...notice, audience: e.target.value })
                      }
                      className="hidden"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            {/* TITLE */}
            <input
              placeholder="Notice Title"
              className="w-full border px-3 py-2 rounded-lg"
              value={notice.title}
              onChange={(e) =>
                setNotice({ ...notice, title: e.target.value })
              }
            />

            {/* TARGET */}
            <div className="grid grid-cols-2 gap-4">
              <select
                className="border px-3 py-2 rounded-lg"
                value={notice.department}
                onChange={(e) =>
                  setNotice({ ...notice, department: e.target.value })
                }
              >
                <option>All</option>
                <option>CSE</option>
                <option>CSM</option>
                <option>ECE</option>
                <option>MECH</option>
                <option>CIVIL</option>
              </select>

              <select
                className="border px-3 py-2 rounded-lg"
                value={notice.year}
                onChange={(e) =>
                  setNotice({ ...notice, year: e.target.value })
                }
              >
                <option>All</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>

            {/* MESSAGE */}
            <textarea
              rows={4}
              placeholder="Write notice message clearly..."
              className="w-full border px-3 py-2 rounded-lg"
              value={notice.message}
              onChange={(e) =>
                setNotice({ ...notice, message: e.target.value })
              }
            />

            {/* ATTACHMENT */}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) =>
                setNotice({ ...notice, file: e.target.files[0] })
              }
            />

            {/* ACTION */}
            <div className="flex justify-end">
              <button
                disabled={!notice.title || !notice.message}
                onClick={() => setStep("preview")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                Preview Notice
              </button>
            </div>
          </>
        )}

        {/* ================= PREVIEW ================= */}
        {step === "preview" && (
          <div className="space-y-4 text-sm">
            <p className="font-medium">Recheck before publishing</p>

            <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
              <p><b>Title:</b> {notice.title}</p>
              <p><b>Type:</b> {notice.type}</p>
              <p><b>Priority:</b> {notice.priority}</p>
              <p><b>Audience:</b> {notice.audience}</p>
              <p><b>Target:</b> {notice.department} – {notice.year}</p>
              <p><b>Message:</b> {notice.message}</p>
              {notice.file && (
                <p><b>Attachment:</b> {notice.file.name}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Publish Notice
              </button>
            </div>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-10 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>
            <h3 className="font-semibold text-green-600">
              Notice Published Successfully
            </h3>
            <p className="text-sm text-gray-500">
              {notice.audience === "Both"
                ? "Students and teachers have been notified"
                : `${notice.audience} have been notified`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
/* ================= UI HELPERS ================= */

function Kpi({ title, value, danger, warning }) {
  return (
    <div
      className={`p-6 rounded-2xl border bg-white
      ${danger && "border-red-300 bg-red-50"}
      ${warning && "border-amber-300 bg-amber-50"}`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function ActionBtn({ label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border
      ${danger
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-white hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}

function AnalyticsSection({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="p-6 rounded-2xl border bg-white h-64 flex flex-col">
      <p className="font-medium mb-2">{title}</p>
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 border rounded-lg">
        {children}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="text-sm">
      <p className="text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ModalActions({ onCancel, onNext, nextLabel, danger }) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border"
      >
        Cancel
      </button>
      <button
        onClick={onNext}
        className={`px-4 py-2 rounded-lg text-white
        ${danger ? "bg-red-600" : "bg-indigo-600"}`}
      >
        {nextLabel}
      </button>
    </div>
  );
}
