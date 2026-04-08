import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

const STATUS_OPTIONS = ["Applied", "Round 1", "Round 2", "Selected", "Rejected"];

export default function TeacherPlacement() {
  const [drives, setDrives] = useState([]);
  const [studentDrives, setStudentDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({
    student_id: "",
    drive_id: "",
    comment: "",
    rating: "",
  });

  const studentDriveByDrive = useMemo(() => {
    return studentDrives.reduce((acc, row) => {
      if (!acc[row.drive_id]) {
        acc[row.drive_id] = [];
      }
      acc[row.drive_id].push(row);
      return acc;
    }, {});
  }, [studentDrives]);

  const fetchPlacementData = async () => {
    setLoading(true);
    setError("");
    try {
      const [drivesRes, studentDrivesRes] = await Promise.all([
        api.get("/api/drives"),
        api.get("/api/student-drives"),
      ]);

      console.log("[TeacherPlacement] GET /api/drives", drivesRes.data);
      console.log("[TeacherPlacement] GET /api/student-drives", studentDrivesRes.data);

      setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
      setStudentDrives(Array.isArray(studentDrivesRes.data) ? studentDrivesRes.data : []);
    } catch (err) {
      console.error("[TeacherPlacement] fetchPlacementData error", err);
      setError("Unable to load placement drives. Verify API/DB records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacementData();
  }, []);

  const assignStudents = async (driveId) => {
    try {
      const res = await api.post(`/api/drives/${driveId}/assign`);
      console.log(`[TeacherPlacement] POST /api/drives/${driveId}/assign`, res.data);
      fetchPlacementData();
    } catch (err) {
      console.error("[TeacherPlacement] assignStudents error", err);
      setError("Failed to assign students. Check role access and DB data.");
    }
  };

  const updateInterviewStatus = async (studentDriveId, value) => {
    try {
      const payload = mapStatusToPayload(value);
      const res = await api.put(`/api/teacher/update-status`, {
        student_drive_id: studentDriveId,
        ...payload,
      });
      console.log("[TeacherPlacement] PUT /api/teacher/update-status", res.data);
      fetchPlacementData();
    } catch (err) {
      console.error("[TeacherPlacement] updateInterviewStatus error", err);
      setError("Failed to update interview status.");
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: Number(feedbackForm.student_id),
        drive_id: Number(feedbackForm.drive_id),
        comment: feedbackForm.comment,
        rating: feedbackForm.rating ? Number(feedbackForm.rating) : null,
      };
      const res = await api.post("/api/feedback", payload);
      console.log("[TeacherPlacement] POST /api/feedback", res.data);
      setFeedbackForm({ student_id: "", drive_id: "", comment: "", rating: "" });
      fetchPlacementData();
    } catch (err) {
      console.error("[TeacherPlacement] submitFeedback error", err);
      setError("Failed to add feedback.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Placement</h1>
        <p className="mt-2 text-sm text-slate-600">Manage assigned drives, interview status, and feedback.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Assigned Drives</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading drives...</p>
        ) : drives.length === 0 ? (
          <p className="text-sm text-slate-500">No placement drives available yet.</p>
        ) : (
          <div className="space-y-4">
            {drives.map((drive) => (
              <div key={drive.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{drive.company_name}</h3>
                    <p className="text-sm text-slate-600">
                      Date: {drive.drive_date || "N/A"} | Mode: {drive.mode || "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() => assignStudents(drive.id)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Assign Students
                  </button>
                </div>

                <div className="mt-4">
                  {(studentDriveByDrive[drive.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No interviews assigned.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600">
                            <th className="px-3 py-2 font-semibold">Student ID</th>
                            <th className="px-3 py-2 font-semibold">Eligibility</th>
                            <th className="px-3 py-2 font-semibold">Applied</th>
                            <th className="px-3 py-2 font-semibold">Probability</th>
                            <th className="px-3 py-2 font-semibold">Current Round</th>
                            <th className="px-3 py-2 font-semibold">Result</th>
                            <th className="px-3 py-2 font-semibold">Update Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(studentDriveByDrive[drive.id] || []).map((row) => (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="px-3 py-2 text-slate-800">{row.student_id}</td>
                              <td className="px-3 py-2 text-slate-700">{row.is_eligible ? "Yes" : "No"}</td>
                              <td className="px-3 py-2 text-slate-700">{row.applied ? "Yes" : "No"}</td>
                              <td className="px-3 py-2 text-slate-700">{Math.round(row.probability_score || 0)}%</td>
                              <td className="px-3 py-2 text-slate-700">{row.current_round || 0}</td>
                              <td className="px-3 py-2 text-slate-700">{row.final_result || "pending"}</td>
                              <td className="px-3 py-2">
                                <select
                                  defaultValue=""
                                  className="rounded-lg border border-slate-300 px-2 py-1"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      updateInterviewStatus(row.id, e.target.value);
                                    }
                                  }}
                                >
                                  <option value="">Select</option>
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Add Feedback</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitFeedback}>
          <input
            required
            type="number"
            placeholder="Student ID"
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={feedbackForm.student_id}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, student_id: e.target.value }))}
          />
          <input
            required
            type="number"
            placeholder="Drive ID"
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={feedbackForm.drive_id}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, drive_id: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            max="5"
            placeholder="Rating (1-5)"
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={feedbackForm.rating}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: e.target.value }))}
          />
          <input
            required
            placeholder="Feedback comment"
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={feedbackForm.comment}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, comment: e.target.value }))}
          />
          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 md:col-span-2">
            Submit Feedback
          </button>
        </form>
      </section>
    </div>
  );
}

function mapStatusToPayload(statusValue) {
  if (statusValue === "Applied") {
    return { status: "applied", final_result: "pending" };
  }

  if (statusValue === "Round 1") {
    return { current_round: 1, status: "in_progress", final_result: "pending" };
  }

  if (statusValue === "Round 2") {
    return { current_round: 2, status: "in_progress", final_result: "pending" };
  }

  if (statusValue === "Selected") {
    return { status: "completed", final_result: "selected" };
  }

  if (statusValue === "Rejected") {
    return { status: "completed", final_result: "rejected" };
  }

  return {};
}
