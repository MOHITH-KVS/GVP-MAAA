import { useState, useEffect } from "react";
import api from "../../utils/axios";

const API_URL = "http://127.0.0.1:8000";

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    assignment_id: "",
    submission_text: "",
    file: null,
  });

  // Fetch assignments on mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/student/assignments");
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setErrorMsg("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.assignment_id) {
      setErrorMsg("Please select an assignment");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("submission_text", form.submission_text);

      if (form.file) {
        formData.append("file", form.file);
      }

      const response = await api.post(
        `/student/submit-assignment/${form.assignment_id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowUpload(false);
        setConfirm(false);
        setForm({ assignment_id: "", submission_text: "", file: null });
        fetchAssignments(); // Refresh list
      }, 2200);
    } catch (error) {
      setErrorMsg(
        error.response?.data?.detail || "Failed to submit assignment"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter assignments
  const filtered = assignments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "completed") return ["submitted", "approved", "rejected"].includes(a.status);
    return a.status === filter;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter((a) => ["submitted", "approved", "rejected"].includes(a.status)).length,
    pending: assignments.filter((a) => a.status === "pending").length,
  };

  return (
    <div className="space-y-10 relative">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">📝 Assignments</h1>
          <p className="text-gray-500">
            View assignments and track your progress
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          📤 Submit Assignment
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Pending" value={stats.pending} color="red" />
      </div>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-100 text-red-700 font-medium">
          ❌ {errorMsg}
        </div>
      )}

      {/* FILTER */}
      <div className="flex gap-3">
        {["all", "submitted", "pending"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl capitalize transition ${filter === f
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ASSIGNMENTS LIST */}
      {loading && filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Loading assignments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No assignments found
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onSubmit={() => {
                setForm({ ...form, assignment_id: assignment.id });
                setShowUpload(true);
              }}
            />
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <Modal onClose={() => { setShowUpload(false); setForm({ assignment_id: "", submission_text: "", file: null }); }}>
          {!confirm ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Submit Assignment</h2>

              <div className="mb-3">
                <label className="text-sm text-gray-600">Select Assignment *</label>
                <select
                  value={form.assignment_id}
                  onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-xl border bg-gray-50"
                >
                  <option value="">Choose Assignment</option>
                  {assignments.filter(a => a.status === 'pending').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} - Due {new Date(a.due_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="text-sm text-gray-600">Comments/Notes</label>
                <textarea
                  value={form.submission_text}
                  onChange={(e) => setForm({ ...form, submission_text: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-4 py-2 rounded-xl border bg-gray-50"
                  placeholder="Add any notes about your submission..."
                />
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600">Upload File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                  className="w-full mt-1 px-4 py-2 rounded-xl border bg-gray-50"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  disabled={!form.assignment_id || loading}
                  onClick={() => setConfirm(true)}
                  className="flex-1 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continue
                </button>

                <button
                  onClick={() => { setShowUpload(false); setForm({ assignment_id: "", submission_text: "", file: null }); }}
                  className="flex-1 py-2 rounded-xl border"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">Confirm Submission</h2>

              <div className="text-sm text-gray-600 space-y-2 mb-6">
                <p><b>Assignment:</b> {assignments.find(a => a.id == form.assignment_id)?.title}</p>
                <p><b>Due:</b> {new Date(assignments.find(a => a.id == form.assignment_id)?.due_date).toLocaleDateString()}</p>
                {form.file && <p><b>File:</b> {form.file.name}</p>}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Confirm & Submit"}
                </button>

                <button
                  onClick={() => setConfirm(false)}
                  className="flex-1 py-2 rounded-xl border"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* SUCCESS TOAST */}
      {success && <SuccessToast />}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function AssignmentCard({ assignment, onSubmit }) {
  const isDueToday = new Date(assignment.due_date).toDateString() === new Date().toDateString();
  const isOverdue = new Date(assignment.due_date) < new Date();
  const daysLeft = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-xl border p-5 hover:shadow-md transition">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{assignment.title}</h3>
          <p className="text-sm text-gray-500 mt-1">📚 {assignment.subject}</p>

          <div className="mt-3 flex gap-2">
            {assignment.status === "submitted" && (
              <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                ⌛ Under Review
              </span>
            )}
            {assignment.status === "approved" && (
              <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                ✓ Approved
              </span>
            )}
            {assignment.status === "rejected" && (
              <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                ❌ Rejected
              </span>
            )}
            {assignment.status === "pending" && isOverdue && (
              <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                ⚠️ Overdue
              </span>
            )}
            {assignment.status === "pending" && isDueToday && (
              <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                🔔 Due Today
              </span>
            )}
            {assignment.status === "pending" && !isOverdue && !isDueToday && (
              <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                ⏳ {daysLeft} days left
              </span>
            )}
          </div>
        </div>

        {(assignment.status === "pending" || assignment.status === "rejected") && (
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 whitespace-nowrap"
          >
            {assignment.status === "rejected" ? "Resubmit" : "Submit"}
          </button>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        📅 Due {new Date(assignment.due_date).toLocaleDateString()}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

/* ===== MODAL WITH BACKGROUND BLUR ===== */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* FULL PAGE GLASS BACKDROP */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-md"
      />

      {/* MODAL CARD */}
      <div className="relative z-[100000] bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg text-gray-500 hover:text-black"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}

function SuccessToast() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center">
          ✓
        </div>
        <h2 className="text-xl font-semibold">Submitted Successfully!</h2>
      </div>
    </div>
  );
}
