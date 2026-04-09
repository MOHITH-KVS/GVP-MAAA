import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import TeacherPlacement from "./Placement";

function formatDateTime(value) {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function PlacementCoordinator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentState, setAssignmentState] = useState("not_assigned");
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    const fetchCoordinatorContext = async () => {
      setLoading(true);
      setError("");
      try {
        const [meRes, drivesRes] = await Promise.all([
          api.get("/api/auth/me"),
          api.get("/api/faculty/coordinator/drives"),
        ]);

        const capability = meRes?.data?.capabilities?.placement_coordinator || {};
        setAssignmentState(String(capability.assignment_state || "not_assigned"));
        setDrives(Array.isArray(drivesRes?.data?.drives) ? drivesRes.data.drives : []);
      } catch (err) {
        setError(err?.response?.data?.detail || "Unable to load coordinator access.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoordinatorContext();
  }, []);

  const statusCard = useMemo(() => {
    if (assignmentState === "active") {
      return {
        title: "Coordinator Access Active",
        subtitle: "You can manage placement progress for assigned drives.",
        style: "border-emerald-200 bg-emerald-50 text-emerald-900",
      };
    }
    if (assignmentState === "expired") {
      return {
        title: "Coordinator Access Expired",
        subtitle: "Your coordinator assignment period has ended. Contact admin to extend access.",
        style: "border-amber-200 bg-amber-50 text-amber-900",
      };
    }
    return {
      title: "No Coordinator Assignment",
      subtitle: "You do not have placement coordinator privileges yet.",
      style: "border-slate-200 bg-slate-50 text-slate-900",
    };
  }, [assignmentState]);

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading coordinator workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className={`rounded-3xl border p-6 shadow-sm ${statusCard.style}`}>
        <h1 className="text-2xl font-semibold">Placement Coordinator</h1>
        <p className="mt-2 text-sm">{statusCard.title}</p>
        <p className="mt-1 text-sm opacity-90">{statusCard.subtitle}</p>
      </section>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Assigned Drives</h2>
        {drives.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No active drive assignments found.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {drives.map((drive) => (
              <div key={drive.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{drive.company_name || "Company"}</p>
                <p className="text-xs text-slate-700">{drive.title || "Drive"}</p>
                <p className="mt-1 text-xs text-slate-600">Drive date: {formatDateTime(drive.drive_date)}</p>
                <p className="text-xs text-slate-600">Deadline: {formatDateTime(drive.registration_deadline)}</p>
                <p className="text-xs text-slate-600">Status: {drive.status || "open"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {assignmentState === "active" ? (
        <TeacherPlacement />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Placement Actions Locked</h3>
          <p className="mt-2 text-sm text-slate-600">
            Student status updates and coordinator actions are disabled until your coordinator assignment is active.
          </p>
        </section>
      )}
    </div>
  );
}
