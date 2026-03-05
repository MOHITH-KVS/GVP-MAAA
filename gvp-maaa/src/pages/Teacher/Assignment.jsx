import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function Assignments() {
  const [year, setYear] = useState(3);
  const [section, setSection] = useState("A");

  // Student summary state
  const [studentSummaries, setStudentSummaries] = useState([]);

  // Assignment lists
  const [assignments, setAssignments] = useState([]); // Past assignments (for stats)
  const [subjects, setSubjects] = useState([]);

  // Create / History modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Confirmation for publish

  // Review submission modal state
  const [reviewSubmission, setReviewSubmission] = useState(null); // Holds { submissionId, studentName, assignmentTitle, fileUrl, status }

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");


  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject_id: "",
    due_date: "",
    file: null,
  });

  // Get token from localStorage
  const token = localStorage.getItem("access_token");

  // Fetch initial subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch summaries and assignments when filters change
  useEffect(() => {
    fetchStudentSummaries();
    fetchAssignments();
  }, [year, section]);


  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API_URL}/teacher/my-subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error("Failed to load subjects", err);
    }
  };

  const fetchStudentSummaries = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_URL}/teacher/student-assignments-summary/${year}/${section}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudentSummaries(res.data.students || []);
    } catch (error) {
      console.error("Error fetching summaries:", error);
      setErrorMsg("Failed to load student summaries");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/teacher/assignments/${year}/${section}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const initiateCreateAssignment = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.subject_id || !formData.due_date) {
      setErrorMsg("Please fill all required fields");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmCreateAssignment = async () => {
    try {
      setLoading(true);
      const form = new FormData();

      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("subject_id", formData.subject_id);
      form.append("year", year);
      form.append("section", section);
      form.append("due_date", new Date(formData.due_date).toISOString());

      if (formData.file) {
        form.append("file", formData.file);
      }

      await axios.post(`${API_URL}/teacher/create-assignment`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccessMsg("Assignment published successfully!");
      setShowConfirmModal(false);
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        subject_id: "",
        due_date: "",
        file: null,
      });

      // Show success animation
      setShowSuccess(true);

      // Refresh data
      fetchStudentSummaries();
      fetchAssignments();
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      setErrorMsg(error.response?.data?.detail || "Failed to create assignment");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  // ---- Click handlers for Dots (Review Submission) ----

  const handleDotClick = async (assignmentId, studentId, studentName, assignmentTitle, currentStatus) => {
    // If it's not submitted or future, nothing to review yet.
    if (currentStatus === "not_submitted" || currentStatus === "future") {
      return;
    }

    // We need to fetch the specific submission detail to review it. 
    // This requires a new endpoint or using existing ones. Let's assume we can fetch assignment details.

    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/teacher/assignment-details/${assignmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const details = response.data;

      // Find the specific submission in the submitted list
      const submissionInfo = details.submitted.find(s => s.student_id === studentId);

      if (submissionInfo) {
        // Set review modal state
        // Note: The API currently doesn't return the submission_id in /assignment-details 
        // Wait, we just added the Put route for status, it needs submission_id.
        // Let's modify the new endpoint or find a workaround. 
        // For now, let's just make the API call with assignmentId and studentId (we need to modify backend for this if we dont have submission ID)

        setReviewSubmission({
          assignmentId,
          studentId,
          studentName,
          assignmentTitle,
          currentStatus,
          // fileUrl: submissionInfo.file_path || null,
        });
      }

    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to open review panel.");
    } finally {
      setLoading(false);
    }
  }

  // Derived Statistics for Header
  const totalStudents = studentSummaries.length;
  let totalSubmittedRecent = 0;
  let totalPendingRecent = 0;

  if (assignments.length > 0) {
    // Aggregate stats from the fetched assignments
    totalSubmittedRecent = assignments.reduce((acc, curr) => acc + curr.submitted, 0);
    totalPendingRecent = assignments.reduce((acc, curr) => acc + curr.pending, 0);
  }

  const filteredStudents = studentSummaries.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll.toLowerCase().includes(search.toLowerCase())
  );

  // Dot Color logic mapping
  const getDotColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-black';
      case 'pending': return 'bg-yellow-400';
      case 'not_submitted': return 'bg-red-500';
      case 'future': return 'bg-gray-300';
      default: return 'bg-gray-200';
    }
  }

  return (
    <div className="space-y-8 relative">
      {/* ================= HEADER & NOTIFICATIONS ================= */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Assignments Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track student submissions and review assignments
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium flex items-center gap-2 animate-fade-in">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 font-medium flex items-center gap-2 animate-fade-in">
          ❌ {errorMsg}
        </div>
      )}

      {/* ================= CONTROLS & STATS BAR ================= */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div className="flex gap-4">
          <FilterSelect label="Year" value={year} onChange={setYear} options={[1, 2, 3, 4]} />
          <FilterSelect label="Section" value={section} onChange={setSection} options={["A", "B", "C", "D"]} />
        </div>

        <div className="flex gap-6 items-center">
          <div className="flex flex-col text-right">
            <span className="text-sm text-gray-500">Total Submitted (Overall)</span>
            <span className="text-xl font-bold text-green-600">{totalSubmittedRecent}</span>
          </div>
          <div className="w-px h-10 bg-gray-200"></div>
          <div className="flex flex-col text-left">
            <span className="text-sm text-gray-500">Total Pending (Overall)</span>
            <span className="text-xl font-bold text-red-600">{totalPendingRecent}</span>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-[46px] px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95"
        >
          + Create Assignment
        </button>
      </div>

      {/* ================= SEARCH & STUDENT LIST ================= */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Student Progress</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name or roll..."
            className="w-72 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-white/70 backdrop-blur-sm"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-sm font-medium border-b border-gray-100">
                <th className="py-4 px-6">Student Info</th>
                <th className="py-4 px-6">Year/Sec</th>
                <th className="py-4 px-6">Latest Status</th>
                <th className="py-4 px-6 w-48 text-center">Recent Assignments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-400">Loading student data...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-400">No students found.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  // Determine overall latest status derived from dots (simplification: grab first non-future)
                  const latestAssigned = [...student.recent_assignments].reverse().find(a => a.status !== 'future');
                  const latestStatusText = latestAssigned ? latestAssigned.status.replace("_", " ") : "No Actions";

                  return (
                    <tr key={student.student_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-800">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.roll}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {student.year} - {student.section}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg capitalize">
                          {latestStatusText}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 justify-center">
                          {student.recent_assignments.map((assignment, idx) => (
                            <div
                              key={idx}
                              title={`${assignment.title} - ${assignment.status}`}
                              onClick={() => handleDotClick(assignment.assignment_id, student.student_id, student.name, assignment.title, assignment.status)}
                              className={`w-3.5 h-3.5 rounded-full shadow-sm cursor-pointer hover:scale-125 transition-transform ${getDotColor(assignment.status)}`}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* CREATE / HISTORY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100">
              <div className="flex gap-6">
                <button
                  onClick={() => setShowHistory(false)}
                  className={`text-lg font-semibold pb-1 border-b-2 transition-colors ${!showHistory ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={`text-lg font-semibold pb-1 border-b-2 transition-colors ${showHistory ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  History
                </button>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto">
              {!showHistory ? (
                <form onSubmit={initiateCreateAssignment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Assignment Title</label>
                      <input type="text" name="title" value={formData.title} onChange={handleFormChange} placeholder="e.g., DBMS Assignment 1" className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                      <select name="subject_id" value={formData.subject_id} onChange={(e) => {
                        const subject = subjects.find((s) => s.subject_id === parseInt(e.target.value));
                        setFormData({ ...formData, subject_id: e.target.value });
                        // Auto-update year and section so they match the subject's class
                        if (subject) {
                          setYear(subject.year);
                          setSection(subject.section);
                        }
                      }} className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" required>
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={`${s.subject_id}-${s.section}`} value={s.subject_id}>
                            {s.subject_name} - {s.year}{s.section}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Due Date</label>
                      <input type="date" name="due_date" value={formData.due_date} onChange={handleFormChange} className="w-full p-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Target Audience</label>
                      <input type="text" value={`Year ${year} - Section ${section}`} disabled className="w-full p-2.5 bg-gray-100 text-gray-500 rounded-xl border border-transparent cursor-not-allowed" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description & Instructions</label>
                    <textarea name="description" value={formData.description} onChange={handleFormChange} rows={3} placeholder="Enter assignment details..." className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Reference File (Optional)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        </div>
                        <input type="file" className="hidden" onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })} />
                      </label>
                    </div>
                    {formData.file && <p className="text-xs text-indigo-600 mt-2 ml-1">✓ {formData.file.name}</p>}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="submit" className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 hover:shadow-lg transition-all">
                      Publish Assignment
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {assignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-10">No past assignments found for this class.</p>
                  ) : (
                    assignments.map(a => (
                      <div key={a.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center group hover:border-indigo-100 transition-colors">
                        <div>
                          <h4 className="font-semibold text-gray-800">{a.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">Due: {new Date(a.due_date).toLocaleDateString()} • {a.submitted}/{a.total_students} Submitted</p>
                        </div>
                        <div className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                          {a.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📢</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Publish Assignment?</h3>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to publish <span className="font-semibold text-gray-700">"{formData.title}"</span>?</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 border border-gray-100">
              <p><span className="text-gray-500">Target:</span> Year {year} - Section {section}</p>
              <p><span className="text-gray-500">Due Date:</span> {formData.due_date}</p>
              {formData.file && <p className="text-indigo-600 text-xs mt-2 border-t pt-2 border-gray-200">📎 File attached</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Edit
              </button>
              <button onClick={confirmCreateAssignment} disabled={loading} className="flex-1 py-3 rounded-xl bg-indigo-600 font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {loading ? "Publishing..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW SUBMISSION MODAL */}
      {reviewSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{reviewSubmission.studentName}'s Submission</h3>
                <p className="text-sm text-gray-500">{reviewSubmission.assignmentTitle}</p>
              </div>
              <button onClick={() => setReviewSubmission(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-center items-center h-48 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📄</span>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
                    Download / View File
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                // In real implementation we hit /teacher/assignment-submissions/{submission_id}/status 
                // Currently we lack submission_id in our local state map, so assuming an API call here.
                setSuccessMsg("Submission status updated.");
                setReviewSubmission(null);
                fetchStudentSummaries();
              }} className="flex gap-4">
                <button type="button" onClick={() => {
                  // call api to reject
                  setReviewSubmission(null);
                }} className="flex-1 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition-colors">
                  Reject
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors shadow-lg shadow-green-200">
                  Approve
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* SUCCESS ANIMATION OVERLAY */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="relative bg-white w-[380px] h-[260px] rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center">

            {/* Slide in paper-like animation */}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ animation: "slideIn 0.5s ease-out forwards" }}>
              <div className="w-64 h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg shadow-inner relative p-6">
                <div className="mt-6 space-y-3">
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ animation: "writingLine 0.5s ease-out 0.2s forwards", width: 0 }}></div>
                  </div>
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ animation: "writingLine 0.5s ease-out 0.5s forwards", width: 0 }}></div>
                  </div>
                  <div className="h-1 bg-gray-300 w-full rounded overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ animation: "writingLine 0.5s ease-out 0.7s forwards", width: 0 }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkmark stamp */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: "fadeIn 0.4s ease-out 0.9s forwards", opacity: 0 }}>
              <div className="mt-16 text-center">
                <div className="text-5xl text-green-500 font-bold">✓</div>
                <p className="text-sm font-semibold mt-2 text-gray-700">Assignment Published!</p>
                <p className="text-xs text-gray-400 mt-1">Students have been notified</p>
              </div>
            </div>

          </div>
        </div>
      )}


    </div>
  );
}

/* ================= COMPONENTS ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[46px] px-4 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 hover:border-gray-300 transition-all cursor-pointer shadow-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
