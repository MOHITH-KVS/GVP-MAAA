import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

const EMPTY_STATE_TEXT = "No placement drives available yet.";

export default function Placement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    total_drives: 0,
    eligible_drives: 0,
    not_eligible_count: 0,
    applied: 0,
    selected: 0,
    rejected: 0,
  });
  const [drives, setDrives] = useState([]);
  const [snapshot, setSnapshot] = useState({
    eligible_drives_count: 0,
    not_eligible_count: 0,
    main_issue: "No major issue identified.",
    next_action: "Keep applying and preparing.",
  });
  const [prediction, setPrediction] = useState({ probability: 0, reasons: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [feedbackInsights, setFeedbackInsights] = useState({
    has_feedback: false,
    common_failure_round: null,
    common_difficulty: null,
    common_issue: null,
  });

  const [applyBusyByDrive, setApplyBusyByDrive] = useState({});
  const [confirmForceApplyDrive, setConfirmForceApplyDrive] = useState(null);
  const [feedbackDrive, setFeedbackDrive] = useState(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    round_reached: "",
    difficulty: "medium",
    issues_faced: "",
    comment: "",
    rating: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Action completed successfully");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user?.user_id || user?.student_id || user?.id || null;

  const showSuccessModal = (message) => {
    setSuccessMessage(message || "Action completed successfully");
    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), 2000);
  };

  const fetchDashboardData = async () => {
    if (!studentId) {
      setLoading(false);
      setError("Student login is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [summaryRes, placementRes, intelligenceRes] = await Promise.all([
        api.get(`/api/student/${studentId}/placement-summary`),
        api.get("/api/student/placement"),
        api.get("/api/student/placement-intelligence"),
      ]);

      const summaryData = summaryRes.data || {};
      const placementData = placementRes.data || {};
      const drivesData = Array.isArray(placementData.drives) ? placementData.drives : [];
      const intelligenceData = intelligenceRes.data || {};

      const mainIssue =
        (Array.isArray(intelligenceData?.readiness?.reasons) && intelligenceData.readiness.reasons[0]) ||
        intelligenceData?.feedback_insights?.common_issue ||
        "No major issue identified.";

      const nextAction =
        (Array.isArray(intelligenceData?.action_plan?.priority_actions) && intelligenceData.action_plan.priority_actions[0]) ||
        (Array.isArray(intelligenceData?.recommendations) && intelligenceData.recommendations[0]) ||
        "Keep applying and preparing.";

      const cleanSummary = {
        total_drives: Number(summaryData.total_drives || drivesData.length || 0),
        eligible_drives: Number(summaryData.eligible_drives || 0),
        not_eligible_count: Number(summaryData.not_eligible_count || 0),
        applied: Number(summaryData.applied || 0),
        selected: Number(summaryData.selected || 0),
        rejected: Number(summaryData.rejected || 0),
      };

      setSummary(cleanSummary);
      setDrives(drivesData);
      setSnapshot({
        eligible_drives_count: cleanSummary.eligible_drives,
        not_eligible_count: cleanSummary.not_eligible_count,
        main_issue: mainIssue,
        next_action: nextAction,
      });
      setPrediction({
        probability: Number(intelligenceData?.prediction?.probability || 0),
        reasons: Array.isArray(intelligenceData?.prediction?.reasons) ? intelligenceData.prediction.reasons : [],
      });
      setSuggestions(Array.isArray(intelligenceData?.recommendations) ? intelligenceData.recommendations : []);
      setFeedbackInsights(intelligenceData?.feedback_insights || {});
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load placement dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [studentId]);

  const applyToDrive = async (drive, forceApply = false) => {
    setApplyBusyByDrive((prev) => ({ ...prev, [drive.drive_id]: true }));
    setError("");
    try {
      const payload = forceApply ? { force_apply: true } : {};
      const res = await api.post(`/api/student/apply/${drive.drive_id}`, payload);
      const applicationType = res?.data?.application_type || "normal";

      setDrives((prev) =>
        prev.map((item) =>
          item.drive_id === drive.drive_id
            ? {
                ...item,
                applied: true,
                status: "applied",
                application_type: applicationType,
              }
            : item
        )
      );

      setSummary((prev) => ({
        ...prev,
        applied: prev.applied + (drive.applied ? 0 : 1),
      }));

      const hasExternalApplyLink = Boolean(drive.apply_link && /^https?:\/\//i.test(String(drive.apply_link)));
      if (hasExternalApplyLink) {
        window.open(drive.apply_link, "_blank", "noopener,noreferrer");
      }

      showSuccessModal(applicationType === "force_apply" ? "Applied with eligibility warning" : "Applied successfully");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to apply for this drive right now.");
    } finally {
      setApplyBusyByDrive((prev) => ({ ...prev, [drive.drive_id]: false }));
      setConfirmForceApplyDrive(null);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackDrive) return;
    if (!feedbackForm.round_reached.trim()) {
      setError("Round reached is required.");
      return;
    }

    setFeedbackSubmitting(true);
    setError("");
    try {
      await api.post(`/api/student/drives/${feedbackDrive.drive_id}/feedback`, {
        round_reached: feedbackForm.round_reached.trim(),
        difficulty: feedbackForm.difficulty,
        issues_faced: feedbackForm.issues_faced.trim() || null,
        comment: feedbackForm.comment.trim() || null,
        rating: feedbackForm.rating ? Number(feedbackForm.rating) : null,
      });

      setFeedbackDrive(null);
      setFeedbackForm({ round_reached: "", difficulty: "medium", issues_faced: "", comment: "", rating: "" });
      showSuccessModal("Drive feedback submitted");
      await fetchDashboardData();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to submit feedback right now.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const completionStats = useMemo(() => {
    const total = Math.max(1, summary.applied);
    return {
      selection_rate: Math.round((summary.selected * 100) / total),
      rejection_rate: Math.round((summary.rejected * 100) / total),
    };
  }, [summary]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 pb-10">
      {error && <ErrorBanner message={error} />}

      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Career Snapshot</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Industrial Placement Dashboard</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HeroItem label="Eligible Drives" value={snapshot.eligible_drives_count} />
          <HeroItem label="Not Eligible" value={snapshot.not_eligible_count} />
          <HeroItem label="Main Issue" value={snapshot.main_issue} />
          <HeroItem label="Next Action" value={snapshot.next_action} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Drive List</h2>
            <p className="mt-1 text-sm text-slate-500">Decision-driven applications with full eligibility context.</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Applied: {summary.applied}</p>
            <p>Selected: {summary.selected}</p>
          </div>
        </div>

        {drives.length === 0 ? (
          <EmptyState message={EMPTY_STATE_TEXT} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {drives.map((drive) => {
              const notEligible = !Boolean(drive.is_eligible);
              const busy = Boolean(applyBusyByDrive[drive.drive_id]);
              const applied = Boolean(drive.applied);
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const deadlineDate = drive.registration_deadline ? new Date(drive.registration_deadline) : null;
              const deadlinePassed = Boolean(deadlineDate && !Number.isNaN(deadlineDate.getTime()) && deadlineDate < todayStart);
              const effectivelyClosed = String(drive.status || "").toLowerCase() === "closed" || deadlinePassed;

              return (
                <article key={drive.drive_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{drive.company_name || "Company"}</h3>
                      <p className="text-sm text-slate-600">{drive.role || "Role not specified"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${notEligible ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {notEligible ? "Not Eligible" : "Eligible"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    <p>Package: {drive.package ? `${drive.package} LPA` : "N/A"}</p>
                    <p>Date: {formatDateOnly(drive.drive_date)}</p>
                    <p>Location: {drive.location || "N/A"}</p>
                    <p>Mode: {drive.mode || "N/A"}</p>
                    <p>Status: {drive.status || "not applied"}</p>
                  </div>

                  {notEligible ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Why you are not eligible: {(Array.isArray(drive.reasons) && drive.reasons[0]) || "Criteria mismatch"}
                    </div>
                  ) : null}

                  {effectivelyClosed ? (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      This drive is closed because the registration deadline has passed.
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={applied || busy || effectivelyClosed}
                      onClick={() => {
                        if (effectivelyClosed) return;
                        if (notEligible) {
                          setConfirmForceApplyDrive(drive);
                          return;
                        }
                        applyToDrive(drive, false);
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {applied ? "Applied" : effectivelyClosed ? "Closed" : busy ? "Applying..." : "Apply"}
                    </button>

                    <button
                      type="button"
                      disabled={!drive.details_pdf}
                      onClick={() => {
                        if (drive.details_pdf) {
                          window.open(drive.details_pdf, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      View Details
                    </button>

                    {(applied || drive.final_result === "selected" || drive.final_result === "rejected") && (
                      <button
                        type="button"
                        onClick={() => setFeedbackDrive(drive)}
                        className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700"
                      >
                        Submit Feedback
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Predictions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <KpiCard label="Selection Probability" value={`${prediction.probability || 0}%`} />
          <KpiCard label="Selection Rate" value={`${completionStats.selection_rate}%`} />
          <KpiCard label="Rejection Rate" value={`${completionStats.rejection_rate}%`} />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prediction Reasons</p>
          {(prediction.reasons || []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No prediction reasons available yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {prediction.reasons.slice(0, 4).map((item, idx) => (
                <li key={`${item}-${idx}`}>• {item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Suggestions</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actionable Suggestions</p>
            {suggestions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No suggestions available yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {suggestions.slice(0, 6).map((item, idx) => (
                  <li key={`${item}-${idx}`}>• {item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feedback Insights</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>Common Failure Round: {feedbackInsights.common_failure_round || "N/A"}</p>
              <p>Common Difficulty: {feedbackInsights.common_difficulty || "N/A"}</p>
              <p>Common Issue: {feedbackInsights.common_issue || "N/A"}</p>
            </div>
          </div>
        </div>
      </section>

      {confirmForceApplyDrive ? (
        <ConfirmModal
          title="Eligibility Warning"
          message={`You are not eligible for ${confirmForceApplyDrive.company_name}. Do you still want to apply?`}
          onCancel={() => setConfirmForceApplyDrive(null)}
          onConfirm={() => applyToDrive(confirmForceApplyDrive, true)}
          busy={Boolean(applyBusyByDrive[confirmForceApplyDrive.drive_id])}
        />
      ) : null}

      {feedbackDrive ? (
        <FeedbackModal
          drive={feedbackDrive}
          form={feedbackForm}
          setForm={setFeedbackForm}
          onCancel={() => setFeedbackDrive(null)}
          onSubmit={submitFeedback}
          busy={feedbackSubmitting}
        />
      ) : null}

      {showSuccess ? <SuccessModal message={successMessage} /> : null}
    </div>
  );
}

function LoadingState() {
  return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading placement dashboard...</div>;
}

function HeroItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="mt-4 text-sm text-slate-500">{message}</p>;
}

function ErrorBanner({ message }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

function ConfirmModal({ title, message, onCancel, onConfirm, busy }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm" disabled={busy}>
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" disabled={busy}>
            {busy ? "Applying..." : "Confirm Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackModal({ drive, form, setForm, onCancel, onSubmit, busy }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-900">Drive Feedback</h4>
        <p className="mt-1 text-sm text-slate-600">
          {drive.company_name} - {drive.role}
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Round Reached" value={form.round_reached} onChange={(value) => setForm((prev) => ({ ...prev, round_reached: value }))} required />
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Difficulty</label>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={form.difficulty}
            onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Field label="Issues Faced" value={form.issues_faced} onChange={(value) => setForm((prev) => ({ ...prev, issues_faced: value }))} />
          <Field label="Comment" value={form.comment} onChange={(value) => setForm((prev) => ({ ...prev, comment: value }))} />
          <Field label="Rating (1-5)" type="number" value={form.rating} onChange={(value) => setForm((prev) => ({ ...prev, rating: value }))} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm" disabled={busy}>
            Cancel
          </button>
          <button onClick={onSubmit} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" disabled={busy}>
            {busy ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
      />
    </div>
  );
}

function SuccessModal({ message }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl" style={{ animation: "placement-success-pop 300ms ease-out" }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <p className="text-lg font-semibold text-slate-900">Success</p>
        <p className="mt-1 text-sm text-slate-600">{message || "Action completed successfully"}</p>
      </div>
      <style>{`@keyframes placement-success-pop { from { opacity: 0; transform: scale(0.8);} to { opacity: 1; transform: scale(1);} }`}</style>
    </div>
  );
}

function formatDateOnly(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}
