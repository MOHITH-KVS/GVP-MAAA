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
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchCoordinatorContext = async (initial = false) => {
      if (initial) setLoading(true);
      setError("");
      try {
        const roleRes = await api.get("/api/user/role");
        const nextIsCoordinator = Boolean(roleRes?.data?.isCoordinator);
        if (!isMounted) return;
        setIsCoordinator(nextIsCoordinator);

        if (nextIsCoordinator) {
          const drivesRes = await api.get("/api/faculty/coordinator/drives");
          if (!isMounted) return;
          setDrives(Array.isArray(drivesRes?.data?.drives) ? drivesRes.data.drives : []);
        } else {
          setDrives([]);
        }
      } catch (err) {
        if (!isMounted) return;
        const detail = err?.response?.data?.detail || "Unable to load coordinator access.";
        setError(detail);
        setIsCoordinator(false);
        setDrives([]);
      } finally {
        if (isMounted && initial) {
          setLoading(false);
        }
      }
    };

    fetchCoordinatorContext(true);
    const intervalId = window.setInterval(() => fetchCoordinatorContext(false), 10000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const lockCard = useMemo(() => {
    if (isCoordinator) {
      return {
        title: "Coordinator Access Active",
        description: "You have active coordinator access for assigned drives.",
        helper: "",
      };
    }
    return {
      title: "Coordinator Access Locked",
      description: "You are not currently assigned as a Placement Coordinator.",
      helper: "Contact admin if you believe this is incorrect.",
    };
  }, [isCoordinator]);

  if (loading) {
    return (
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading coordinator workspace...</p>
      </div>
    );
  }

  const isLocked = !isCoordinator;

  return (
    <div className="space-y-6 pb-10">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Placement Coordinator</h1>
        <p className="mt-2 text-sm text-slate-600">Coordinator workspace with managed drive actions and student progress control.</p>
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

      <div className="relative">
        <div
          className={`transition-opacity duration-300 ${isLocked ? "pointer-events-none opacity-60 blur-sm" : "opacity-100"}`}
          aria-hidden={isLocked}
        >
          <TeacherPlacement forceReadOnly={isLocked} forceReadOnlyReason={lockCard.description} />
        </div>

        {isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">🔒</div>
              <h3 className="text-xl font-semibold text-slate-900">{lockCard.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{lockCard.description}</p>
              {lockCard.helper ? <p className="mt-2 text-xs text-slate-500">{lockCard.helper}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
