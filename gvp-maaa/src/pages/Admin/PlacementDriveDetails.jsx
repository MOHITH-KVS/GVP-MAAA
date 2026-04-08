import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function PlacementDriveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    drive: null,
    eligible_students: [],
    applied_students: [],
    interview_status: [],
    selection_results: [],
  });

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/drives/${id}/details`);
        console.log(`[AdminPlacementDriveDetails] GET /api/drives/${id}/details`, res.data);
        setData(res.data || {});
      } catch (err) {
        console.error("[AdminPlacementDriveDetails] fetchDetails error", err);
        setError("Unable to load drive details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between rounded-3xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Drive Details</h1>
          <p className="mt-1 text-sm text-slate-600">Eligible students, applications, interview tracking, and final outcomes.</p>
        </div>
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm" onClick={() => navigate("/admin/placement")}>
          Back
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Loading drive details...</div>
      ) : (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Drive Info</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <p>Title: {data.drive?.title || "N/A"}</p>
              <p>Company: {data.drive?.company_name || "N/A"}</p>
              <p>Date: {data.drive?.date || "N/A"}</p>
              <p>Mode: {data.drive?.mode || "N/A"}</p>
              <p>Status: {data.drive?.status || "N/A"}</p>
              <p>Location: {data.drive?.location || "N/A"}</p>
            </div>
          </section>

          <DetailTable title="Eligible Students" rows={data.eligible_students} columns={["student_id", "name", "roll_no", "cgpa", "status", "current_round", "final_result"]} emptyText="No eligible students" />

          <DetailTable title="Applied Students" rows={data.applied_students} columns={["student_id", "name", "roll_no", "cgpa", "status", "current_round", "final_result"]} emptyText="No applied students" />

          <DetailTable title="Interview Status" rows={data.interview_status} columns={["student_id", "name", "status", "current_round"]} emptyText="No interview status available" />

          <DetailTable title="Selection Results" rows={data.selection_results} columns={["student_id", "name", "final_result"]} emptyText="No selection results available" />
        </>
      )}
    </div>
  );
}

function DetailTable({ title, rows, columns, emptyText }) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {!Array.isArray(rows) || rows.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-semibold">
                    {col.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${title}-${idx}`} className="border-b border-slate-100">
                  {columns.map((col) => (
                    <td key={`${title}-${idx}-${col}`} className="px-3 py-2 text-slate-700">
                      {String(row[col] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
