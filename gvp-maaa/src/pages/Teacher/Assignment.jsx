import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export default function Assignments() {
  const [year, setYear] = useState(3);
  const [section, setSection] = useState("A");
  const [assignments, setAssignments] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject_id: "",
    due_date: "",
  });

  // Get token from localStorage
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch assignments
  useEffect(() => {
    fetchAssignments();
  }, [year, section]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/teacher/assignments/${year}/${section}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setErrorMsg("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.subject_id ||
      !formData.due_date
    ) {
      setErrorMsg("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        subject_id: parseInt(formData.subject_id),
        year: year,
        section: section,
        due_date: new Date(formData.due_date).toISOString(),
      };

      await axios.post(`${API_URL}/teacher/create-assignment`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMsg("Assignment created successfully! Students will be notified.");
      setShowCreate(false);
      setFormData({
        title: "",
        description: "",
        subject_id: "",
        due_date: "",
      });

      // Refresh assignments
      setTimeout(() => {
        fetchAssignments();
        setSuccessMsg("");
      }, 2000);
    } catch (error) {
      setErrorMsg(
        error.response?.data?.detail || "Failed to create assignment"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject_id.toString().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* ================= PAGE HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">📝 Assignments</h1>
        <p className="text-sm text-gray-500">
          Create assignments, track submissions, and manage deadlines
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-100 text-green-700 font-medium">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-100 text-red-700 font-medium">
          ❌ {errorMsg}
        </div>
      )}

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">
          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={[1, 2, 3, 4]}
          />

          <FilterSelect
            label="Section"
            value={section}
            onChange={setSection}
            options={["A", "B", "C", "D"]}
          />

          <div className="flex-1 min-w-[260px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignments..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
            />
          </div>

          {/* CREATE BUTTON */}
          <div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              disabled={loading}
              className="
                h-[44px]
                px-7
                rounded-xl
                bg-indigo-600
                text-white
                font-medium
                hover:bg-indigo-700
                transition
                disabled:opacity-50
              "
            >
              + Create Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ================= CREATE ASSIGNMENT FORM ================= */}
      {showCreate && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create New Assignment</h3>

          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g., DBMS Assignment 1"
                  className="w-full mt-1 p-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Subject *
                </label>
                <select
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleFormChange}
                  className="w-full mt-1 p-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Subject</option>
                  <option value="1">DBMS</option>
                  <option value="2">Data Structures</option>
                  <option value="3">Operating Systems</option>
                  <option value="4">Computer Networks</option>
                  <option value="5">Web Development</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleFormChange}
                  className="w-full mt-1 p-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Year & Section (Auto)
                </label>
                <input
                  type="text"
                  value={`${year}${section}`}
                  disabled
                  className="w-full mt-1 p-2 rounded-xl border border-gray-300 bg-gray-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">
                Description / Questions
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={4}
                placeholder="Enter assignment details, questions, or instructions..."
                className="w-full mt-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? "Publishing..." : "Publish Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= ASSIGNMENT LIST ================= */}
      <div className="space-y-6">
        {loading && filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No assignments found. Create one to get started! 📝
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const isOpen = openId === assignment.id;
            const totalStudents = assignment.total_students;
            const submittedCount = assignment.submitted;
            const pendingCount = assignment.pending;

            return (
              <div key={assignment.id} className="glass rounded-2xl p-6 space-y-5">
                {/* SUMMARY */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                      Subject ID: {assignment.subject_id} · Year {assignment.year} ·
                      Section {assignment.section} · Due{" "}
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Stat label="Submitted" value={`${submittedCount}/${totalStudents}`} />
                    <Stat label="Pending" value={pendingCount} danger />
                    <button
                      onClick={() => {
                        setOpenId(isOpen ? null : assignment.id);
                        setSearch("");
                      }}
                      className="px-5 py-2 rounded-xl bg-indigo-600 text-white whitespace-nowrap"
                    >
                      {isOpen ? "Hide" : "View Details"}
                    </button>
                  </div>
                </div>

                {/* SUBMISSIONS */}
                {isOpen && (
                  <AssignmentDetailView
                    assignmentId={assignment.id}
                    token={token}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================= ASSIGNMENT DETAIL VIEW ================= */
function AssignmentDetailView({ assignmentId, token }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [assignmentId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/teacher/assignment-details/${assignmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetails(response.data);
    } catch (error) {
      console.error("Error fetching assignment details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (!details) return <div className="text-center py-4">No data available</div>;

  return (
    <div className="border-t pt-6 space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-2">{details.assignment.description}</p>
      </div>

      {/* STATS */}
      <div className="flex flex-wrap gap-4">
        <StatBox label="Total Students" value={details.stats.total} />
        <StatBox
          label="Submitted"
          value={details.stats.submitted}
          color="green"
        />
        <StatBox label="Pending" value={details.stats.pending} color="red" />
      </div>

      {/* SUBMISSION LIST */}
      {details.pending.length > 0 && (
        <StudentBlock
          title="Pending Submission"
          students={details.pending}
          danger
        />
      )}

      {details.submitted.length > 0 && (
        <StudentBlock
          title="Submitted"
          students={details.submitted}
        />
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[44px]
          w-44
          px-3
          rounded-xl
          border border-gray-300
          bg-white
          text-sm
          focus:outline-none
          focus:ring-2
          focus:ring-indigo-500
        "
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div
      className={`px-3 py-2 rounded-xl text-sm ${
        danger ? "bg-red-50 text-red-600" : "bg-gray-50"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function StatBox({ label, value, color = "indigo" }) {
  const colorClass = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className={`px-4 py-3 rounded-xl ${colorClass[color]}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StudentBlock({ title, students, danger }) {
  return (
    <div>
      <h4
        className={`font-semibold mb-3 ${
          danger ? "text-red-600" : "text-green-600"
        }`}
      >
        {title} ({students.length})
      </h4>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {students.map((s) => (
          <div
            key={s.student_id}
            className="flex justify-between items-center p-3 rounded-xi bg-white/70 border border-gray-100"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">{s.roll}</p>
            </div>
            {danger ? (
              <button className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-sm hover:bg-amber-600 transition">
                📧 Remind
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-sm">
                ✓ Submitted
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
