import { useEffect, useMemo, useState } from "react";

import api from "../../utils/api";

const EMPTY_MESSAGE = "No placement drives available yet";

export default function Placement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ eligible: 0, upcoming: 0, completed: 0, offers: 0 });
  const [placementData, setPlacementData] = useState({ summary: { total: 0, eligible: 0, applied: 0, selected: 0 }, drives: [] });
  const [applyBusyByDrive, setApplyBusyByDrive] = useState({});
  const [eligibleCompanies, setEligibleCompanies] = useState([]);
  const [upcomingDrives, setUpcomingDrives] = useState([]);
  const [pastDrives, setPastDrives] = useState([]);
  const [intelligence, setIntelligence] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user?.user_id || user?.student_id || user?.id || null;

  useEffect(() => {
    let active = true;

    const loadPlacementData = async () => {
      if (!studentId) {
        if (active) {
          setLoading(false);
          setError(EMPTY_MESSAGE);
        }
        return;
      }

      setLoading(true);
      setError("");

      const safeGet = async (path) => {
        try {
          const response = await api.get(path);
          return { ok: true, data: response.data };
        } catch (requestError) {
          return {
            ok: false,
            status: requestError?.response?.status,
            data: requestError?.response?.data ?? null,
          };
        }
      };

      const [placementResult, summaryResult, eligibleResult, upcomingResult, pastResult, intelligenceResult] = await Promise.all([
        safeGet("/api/student/placement"),
        safeGet("/api/student/placement-summary"),
        safeGet("/api/student/eligible-companies"),
        safeGet("/api/student/upcoming-drives"),
        safeGet("/api/student/past-drives"),
        safeGet("/api/student/placement-intelligence"),
      ]);

      console.log("[StudentPlacement] GET /api/student/placement", placementResult);
      console.log("[StudentPlacement] GET /api/student/placement-summary", summaryResult);
      console.log("[StudentPlacement] GET /api/student/eligible-companies", eligibleResult);
      console.log("[StudentPlacement] GET /api/student/upcoming-drives", upcomingResult);
      console.log("[StudentPlacement] GET /api/student/past-drives", pastResult);
      console.log("[StudentPlacement] GET /api/student/placement-intelligence", intelligenceResult);

      if (!active) {
        return;
      }

      const placementPayload =
        placementResult.ok && placementResult.data && Array.isArray(placementResult.data.drives)
          ? placementResult.data
          : { summary: { total: 0, eligible: 0, applied: 0, selected: 0 }, drives: [] };

      const summaryData = summaryResult.ok ? summaryResult.data : { eligible: 0, upcoming: 0, completed: 0, offers: 0 };
      const eligibleData = Array.isArray(eligibleResult.data) ? eligibleResult.data : [];
      const upcomingData = Array.isArray(upcomingResult.data) ? upcomingResult.data : [];
      const pastData = Array.isArray(pastResult.data) ? pastResult.data : [];
      const intelligenceData = intelligenceResult.ok ? intelligenceResult.data : null;

      setSummary(
        placementResult.ok
          ? {
              eligible: placementPayload?.summary?.eligible || 0,
              upcoming: placementPayload?.summary?.applied || 0,
              completed: pastData.length,
              offers: placementPayload?.summary?.selected || 0,
            }
          : summaryData
      );
      setPlacementData(placementPayload);
      setEligibleCompanies(eligibleData);
      setUpcomingDrives(upcomingData);
      setPastDrives(pastData);
      setIntelligence(intelligenceData);

      const hasAnyData = Boolean(
        summaryData?.eligible ||
          summaryData?.upcoming ||
          summaryData?.completed ||
          summaryData?.offers ||
            (placementPayload?.drives || []).length ||
          eligibleData.length ||
          upcomingData.length ||
          pastData.length
      );

      if (!hasAnyData) {
        setError(EMPTY_MESSAGE);
      }

      setLoading(false);
    };

    loadPlacementData().catch(() => {
      if (active) {
        setError(EMPTY_MESSAGE);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [studentId]);

  const applyForDrive = async (driveId) => {
    setApplyBusyByDrive((prev) => ({ ...prev, [driveId]: true }));
    try {
      await api.post(`/api/student/apply/${driveId}`);
      setPlacementData((prev) => ({
        ...prev,
        drives: (prev.drives || []).map((drive) =>
          drive.drive_id === driveId
            ? {
                ...drive,
                applied: true,
                status: (drive.status || "").toLowerCase() === "not applied" ? "applied" : drive.status,
              }
            : drive
        ),
        summary: {
          ...(prev.summary || {}),
          applied: (prev.summary?.applied || 0) + 1,
        },
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to apply for this drive right now.");
    } finally {
      setApplyBusyByDrive((prev) => ({ ...prev, [driveId]: false }));
    }
  };

  const readiness = intelligence?.readiness || null;
  const interviews = intelligence?.interviews || null;
  const prediction = intelligence?.prediction || null;
  const skills = intelligence?.skill_gap || { missing_skills: [], weak_skills: [], strong_skills: [] };
  const actionPlan = intelligence?.action_plan || { weekly_plan: [], priority_actions: [] };
  const successProbability = intelligence?.success_probability || null;
  const recommendations = intelligence?.recommendations || [];

  const readinessScore = readiness?.readiness_score ?? 0;
  const breakdown = readiness?.breakdown || { cgpa: 0, skills: 0, interview: 0, consistency: 0 };
  const readinessStatus = readiness?.status || "Not Ready";
  const readinessReasons = readiness?.reasons || [];
  const suggestions = readiness?.suggestions || [];
  const placementDrives = placementData?.drives || [];
  const probabilityReasons = successProbability?.reasons || [];
  const improvementActions = successProbability?.improvement_actions || [];
  const probabilityComponents = successProbability?.components || { cgpa: 0, attendance: 0, backlogs: 0, skills: 0 };

  const allEmpty = useMemo(
    () =>
      !loading &&
      error === EMPTY_MESSAGE &&
      !summary.eligible &&
      !summary.upcoming &&
      !summary.completed &&
      !summary.offers &&
      !eligibleCompanies.length &&
      !upcomingDrives.length &&
      !pastDrives.length,
    [eligibleCompanies.length, error, loading, pastDrives.length, summary, upcomingDrives.length]
  );

  if (loading) {
    return <LoadingState />;
  }

  if (allEmpty) {
    return <EmptyState message={error || EMPTY_MESSAGE} />;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Placement Intelligence</p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Career readiness, backed by live data</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              See where you stand, which companies you can apply to, what is blocking you, and the next best action to improve your selection odds.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
            <ScoreRing score={readinessScore} />
            <div className="space-y-2">
              <StatusBadge status={readinessStatus} />
              <p className="text-sm text-slate-500">Overall readiness</p>
              <p className="text-lg font-semibold text-slate-900">{Math.round(readinessScore)}%</p>
              <p className="text-xs text-slate-500">Last updated: {formatDate(readiness?.last_updated)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Eligible companies" value={summary.eligible} hint="Based on your profile" />
        <MetricCard label="Upcoming interviews" value={summary.upcoming} hint="Assigned placement drives" />
        <MetricCard label="Completed interviews" value={summary.completed} hint="Past drive participation" />
        <MetricCard label="Offers" value={summary.offers} hint="Final selected outcomes" />
      </section>

      <Section title="Drive applications" subtitle="Apply directly to eligible drives with live probability and skill match">
        <div className="grid gap-4 lg:grid-cols-2">
          {placementDrives.length ? (
            placementDrives.map((drive) => {
              const eligible = Boolean(drive.is_eligible);
              const alreadyApplied = Boolean(drive.applied);
              const busy = Boolean(applyBusyByDrive[drive.drive_id]);
              return (
                <Panel key={drive.student_drive_id || drive.drive_id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{drive.company_name}</h3>
                        <p className="text-sm text-slate-500">{drive.title || "Placement Drive"}</p>
                      </div>
                      <EligibilityBadge eligible={eligible} />
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Date: {formatDate(drive.drive_date)}</p>
                      <p>Mode: {drive.mode || "N/A"} · Location: {drive.location || "TBD"}</p>
                      <p>Probability: {Math.round(drive.probability_score || 0)}% · Skill match: {Math.round(drive.skill_match || 0)}%</p>
                      <p>Status: {drive.status || "Not Applied"} · Result: {drive.final_result || "pending"}</p>
                      <p>Why: {(drive.reasons && drive.reasons[0]) || "Profile is under evaluation."}</p>
                      <p>Action: {drive.action_to_improve || "Keep preparing for the next round."}</p>
                    </div>
                    {Array.isArray(drive.required_skills) && drive.required_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {drive.required_skills.map((skill) => (
                          <Pill
                            key={`${drive.drive_id}-${skill}`}
                            text={skill}
                            tone={(drive.matched_skills || []).includes(skill) ? "emerald" : "amber"}
                          />
                        ))}
                      </div>
                    ) : null}
                    <div>
                      <button
                        type="button"
                        disabled={!eligible || alreadyApplied || busy}
                        onClick={() => applyForDrive(drive.drive_id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {alreadyApplied ? "Applied" : busy ? "Applying..." : "Apply"}
                      </button>
                    </div>
                  </div>
                </Panel>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No placement drives assigned to your profile yet.</p>
          )}
        </div>
      </Section>

      <Section title="Probability insights" subtitle="Explainable score from CGPA, attendance, backlogs, and skills">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelTitle title="Probability breakdown" />
            <div className="space-y-3">
              <ProbabilityBar label="CGPA" value={probabilityComponents.cgpa} />
              <ProbabilityBar label="Attendance" value={probabilityComponents.attendance} />
              <ProbabilityBar label="Backlogs" value={probabilityComponents.backlogs} />
              <ProbabilityBar label="Skills" value={probabilityComponents.skills} accent />
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Why this score" />
            <div className="space-y-3">
              <StatValue value={`${Math.round(successProbability?.current_probability || 0)}% current`} />
              <StatValue value={`${Math.round(successProbability?.improved_probability || 0)}% improved`} small />
              {probabilityReasons.length ? probabilityReasons.map((reason) => <ReasonItem key={reason} text={reason} />) : <InlineEmpty text="No explanation available yet." />}
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Company eligibility" subtitle="Live eligibility against stored company rules">
        <div className="grid gap-4 lg:grid-cols-2">
          {eligibleCompanies.length ? (
            eligibleCompanies.map((company) => (
              <Panel key={company.company_name}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{company.company_name}</h3>
                      <p className="text-sm text-slate-500">
                        Min CGPA {company.min_cgpa} · Max backlogs {company.max_backlogs}
                      </p>
                    </div>
                    <EligibilityBadge eligible={company.eligible} />
                  </div>

                  {Array.isArray(company.required_skills) && company.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {company.required_skills.map((skill) => (
                        <Pill key={skill} text={skill} tone="slate" />
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-slate-600">
                    {company.reasons.length ? (
                      company.reasons.map((reason) => <ReasonItem key={`${company.company_name}-${reason}`} text={reason} />)
                    ) : (
                      <InlineEmpty text="No eligibility issues found." />
                    )}
                  </div>
                </div>
              </Panel>
            ))
          ) : (
            <p className="text-sm text-slate-500">No eligible companies based on current CGPA and backlog.</p>
          )}
        </div>
      </Section>

      <Section title="Upcoming interviews" subtitle="Drives assigned to you and not completed yet">
        <div className="grid gap-4 lg:grid-cols-2">
          {upcomingDrives.length ? (
            upcomingDrives.map((drive) => (
              <Panel key={drive.student_drive_id}>
                <PanelTitle title={drive.company_name} />
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Date: {formatDate(drive.drive_date)}</p>
                  <p>Mode: {drive.mode || "N/A"}</p>
                  <p>Status: {drive.status || "assigned"}</p>
                  <p>Current round: {drive.current_round ?? 0}</p>
                </div>
              </Panel>
            ))
          ) : (
            <p className="text-sm text-slate-500">No interviews assigned</p>
          )}
        </div>
      </Section>

      <Section title="Past interviews" subtitle="Completed or closed placement drives">
        <div className="grid gap-4 lg:grid-cols-2">
          {pastDrives.length ? (
            pastDrives.map((drive) => (
              <Panel key={drive.student_drive_id}>
                <PanelTitle title={drive.company_name} />
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Date: {formatDate(drive.drive_date)}</p>
                  <p>Mode: {drive.mode || "N/A"}</p>
                  <p>Status: {drive.status || "completed"}</p>
                  <p>Final result: {drive.final_result || "pending"}</p>
                </div>
              </Panel>
            ))
          ) : (
            <p className="text-sm text-slate-500">No placement drives available yet</p>
          )}
        </div>
      </Section>

      {pastDrives.length === 0 ? (
        <Section title="Placement intelligence" subtitle="Insights appear after interview participation">
          <p className="text-sm text-slate-500">No placement drives available yet</p>
        </Section>
      ) : (
        <>
          <Section title="Placement readiness" subtitle="Backend-generated readiness score and component breakdown">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <div className="flex items-center gap-4">
                  <ScoreRing score={readinessScore} />
                  <div>
                    <StatusBadge status={readinessStatus} />
                    <p className="mt-2 text-sm text-slate-500">Readiness score</p>
                    <p className="text-xl font-semibold text-slate-900">{Math.round(readinessScore)}%</p>
                  </div>
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Breakdown" />
                <div className="space-y-3">
                  <ProbabilityBar label="CGPA" value={breakdown.cgpa} />
                  <ProbabilityBar label="Skills" value={breakdown.skills} />
                  <ProbabilityBar label="Interview" value={breakdown.interview} />
                  <ProbabilityBar label="Consistency" value={breakdown.consistency} />
                </div>
              </Panel>
            </div>
          </Section>

          <Section title="What you need to fix" subtitle="Backend-generated reasons and recommendations">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <PanelTitle title="Primary reasons" />
                {readinessReasons.length ? (
                  <div className="space-y-3">
                    {readinessReasons.map((reason) => (
                      <ReasonItem key={reason} text={reason} />
                    ))}
                  </div>
                ) : (
                  <InlineEmpty text="No blockers identified right now." />
                )}
              </Panel>

              <Panel>
                <PanelTitle title="Priority suggestions" />
                {improvementActions.length ? (
                  <div className="space-y-3">
                    {improvementActions.map((item) => (
                      <ActionChip key={item} text={item} />
                    ))}
                  </div>
                ) : (
                  <InlineEmpty text="No suggestions available right now." />
                )}
              </Panel>
            </div>
          </Section>

          <Section title="Interview intelligence" subtitle="Insights from recent interviews and feedback trends">
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel>
                <PanelTitle title="Last round reached" />
                <StatValue value={interviews?.last_round_reached || "No interview recorded"} />
              </Panel>
              <Panel>
                <PanelTitle title="Common weak area" />
                <StatValue value={interviews?.common_weak_area || "No pattern yet"} />
              </Panel>
              <Panel>
                <PanelTitle title="Suggestion" />
                <StatValue value={interviews?.improvement_suggestion || "Start recording interview feedback"} small />
              </Panel>
            </div>
          </Section>

          <Section title="Prediction" subtitle="Selection probability from CGPA, success-rate, and attendance">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <PanelTitle title="Probability outlook" />
                <div className="space-y-4">
                  <ProbabilityBar label="Current probability" value={prediction?.current_probability ?? 0} />
                  <ProbabilityBar label="Improved probability" value={prediction?.improved_probability ?? 0} accent />
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Readiness band" />
                <StatValue value={successProbability?.readiness || "N/A"} />
                <p className="mt-3 text-sm text-slate-600">Model score: {Math.round(successProbability?.score || 0)}</p>
              </Panel>
            </div>
          </Section>

          <Section title="Skill gap" subtitle="Skills missing or weak based on company requirements and feedback">
            <div className="grid gap-4 lg:grid-cols-3">
              <SkillColumn title="Missing skills" items={skills?.missing_skills || []} tone="rose" emptyText="No missing skills recorded." />
              <SkillColumn title="Weak skills" items={skills?.weak_skills || []} tone="amber" emptyText="No weak skills recorded." />
              <SkillColumn title="Strong skills" items={skills?.strong_skills || []} tone="emerald" emptyText="No strong skills recorded." />
            </div>
          </Section>

          <Section title="Action plan" subtitle="Real weekly and priority actions">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <PanelTitle title="Weekly plan" />
                {actionPlan?.weekly_plan?.length ? (
                  <ul className="space-y-3">
                    {actionPlan.weekly_plan.map((task) => (
                      <ListItem key={task} text={task} />
                    ))}
                  </ul>
                ) : (
                  <InlineEmpty text="No weekly plan available right now." />
                )}
              </Panel>
              <Panel>
                <PanelTitle title="Priority actions" />
                {actionPlan?.priority_actions?.length ? (
                  <ul className="space-y-3">
                    {actionPlan.priority_actions.map((task) => (
                      <ListItem key={task} text={task} />
                    ))}
                  </ul>
                ) : (
                  <InlineEmpty text="No priority tasks available right now." />
                )}
              </Panel>
            </div>
          </Section>

          <Section title="Recommendations" subtitle="Actionable placement guidance">
            <Panel>
              {recommendations.length ? (
                <div className="space-y-3">
                  {recommendations.map((item) => (
                    <ReasonItem key={item} text={item} />
                  ))}
                </div>
              ) : (
                <InlineEmpty text="No recommendations available right now." />
              )}
            </Panel>
          </Section>
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-slate-600 shadow-sm">
      Loading placement intelligence...
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Placement Intelligence</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Panel({ children }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>;
}

function PanelTitle({ title }) {
  return <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h3>;
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value ?? 0}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function ScoreRing({ score }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#0f766e ${safeScore}%, #e2e8f0 ${safeScore}% 100%)`,
      }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-center shadow-sm">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{safeScore}</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Score</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === "Ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Borderline"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function EligibilityBadge({ eligible }) {
  const tone = eligible ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{eligible ? "Eligible" : "Not eligible"}</span>;
}

function ReasonItem({ text }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{text}</div>;
}

function ActionChip({ text }) {
  return <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">{text}</div>;
}

function InlineEmpty({ text }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function StatValue({ value, small = false }) {
  return <p className={small ? "text-sm font-semibold text-slate-900" : "text-lg font-semibold text-slate-900"}>{value}</p>;
}

function ProbabilityBar({ label, value, accent = false }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-semibold text-slate-900">{safeValue}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${accent ? "bg-emerald-500" : "bg-slate-700"}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function SkillColumn({ title, items, tone, emptyText }) {
  return (
    <Panel>
      <PanelTitle title={title} />
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((skill) => (
            <Pill key={skill} text={skill} tone={tone} />
          ))
        ) : (
          <InlineEmpty text={emptyText} />
        )}
      </div>
    </Panel>
  );
}

function Pill({ text, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tones[tone] || tones.slate}`}>{text}</span>;
}

function ListItem({ text }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
      <span>{text}</span>
    </li>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not updated yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
