import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LAST_VISITED_KEY, getRouteHistory, recordRouteVisit } from "../utils/navigationHistory";

const ROLE_ALIASES = {
  faculty: "teacher",
  teacher: "teacher",
  student: "student",
  admin: "admin",
};

const ROLE_THEMES = {
  student: {
    pageBg: "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_30%),linear-gradient(135deg,_#0b2a6f_0%,_#1d4ed8_45%,_#2563eb_100%)]",
    accentSoft: "bg-blue-300/12 border-blue-200/30 text-blue-100",
    hover: "hover:border-blue-300/40 hover:bg-blue-200/12",
    chip: "group-hover:bg-blue-300/20",
  },
  teacher: {
    pageBg: "bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.2),_transparent_30%),linear-gradient(135deg,_#0b3d2e_0%,_#166534_45%,_#16a34a_100%)]",
    accentSoft: "bg-emerald-300/12 border-emerald-200/30 text-emerald-100",
    hover: "hover:border-emerald-300/40 hover:bg-emerald-200/12",
    chip: "group-hover:bg-emerald-300/20",
  },
  admin: {
    pageBg: "bg-[radial-gradient(circle_at_top,_rgba(196,181,253,0.2),_transparent_30%),linear-gradient(135deg,_#3b0764_0%,_#6b21a8_45%,_#7e22ce_100%)]",
    accentSoft: "bg-violet-300/12 border-violet-200/30 text-violet-100",
    hover: "hover:border-violet-300/40 hover:bg-violet-200/12",
    chip: "group-hover:bg-violet-300/20",
  },
};

const ROLE_ACTIONS = {
  student: [
    { label: "View Attendance", path: "/student/attendance", intentTags: ["attendance"] },
    { label: "Check Results", path: "/student/marks", intentTags: ["result"] },
    { label: "Dashboard", path: "/student", intentTags: [] },
  ],
  teacher: [
    { label: "Take Attendance", path: "/teacher/attendance", intentTags: ["attendance"] },
    { label: "View Classes", path: "/teacher", intentTags: [] },
    { label: "Upload Marks", path: "/teacher/marks", intentTags: ["result"] },
  ],
  admin: [
    { label: "Dashboard", path: "/admin", intentTags: [] },
    { label: "Manage Users", path: "/admin/students", intentTags: ["users"] },
    { label: "View Reports", path: "/admin/insights", intentTags: ["analytics"] },
  ],
};

const INTENT_RULES = [
  { key: "attendance", keywords: ["attendance"], phrase: "manage attendance" },
  { key: "result", keywords: ["result", "results"], phrase: "check results" },
  { key: "analytics", keywords: ["analytics"], phrase: "view reports" },
  { key: "users", keywords: ["users", "user"], phrase: "manage users" },
];

function resolveRole() {
  const storedRole = localStorage.getItem("role") || localStorage.getItem("user_role") || "";
  return ROLE_ALIASES[storedRole.toLowerCase()] || storedRole.toLowerCase() || "student";
}

function resolveIntent(pathname, role) {
  const normalizedPath = pathname.toLowerCase();

  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((keyword) => normalizedPath.includes(keyword))) {
      return { key: rule.key, phrase: rule.phrase };
    }
  }

  return {
    key: null,
    phrase: role === "admin"
      ? "continue to your dashboard"
      : role === "teacher"
        ? "continue to your workspace"
        : "continue to your dashboard",
  };
}

function getActionScores(actions, history, detectedIntentKey) {
  const recentPaths = history.slice(-3).map((entry) => entry.path);

  return actions.map((action) => {
    const frequency = history.filter((entry) => entry.path === action.path).length;
    let score = 0;

    // +5 if action was recently used.
    if (recentPaths.includes(action.path)) {
      score += 5;
    }

    // +2 per frequency of usage.
    score += frequency * 2;

    // +4 if action matches detected intent.
    if (detectedIntentKey && (action.intentTags || []).includes(detectedIntentKey)) {
      score += 4;
    }

    return {
      ...action,
      score,
      frequency,
      recent: recentPaths.includes(action.path),
    };
  });
}

export default function Smart404() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lastAction, setLastAction] = useState(null);
  const [history, setHistory] = useState([]);

  const role = useMemo(() => resolveRole(), []);
  const actions = ROLE_ACTIONS[role] || ROLE_ACTIONS.student;
  const theme = ROLE_THEMES[role] || ROLE_THEMES.student;

  const detectedIntent = useMemo(() => resolveIntent(location.pathname, role), [location.pathname, role]);

  const sentence = useMemo(() => {
    return `Looks like you were trying to ${detectedIntent.phrase}.`;
  }, [detectedIntent]);

  const suggestedActions = useMemo(() => {
    const scored = getActionScores(actions, history, detectedIntent.key);
    return scored
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return a.label.localeCompare(b.label);
      })
      .slice(0, 3);
  }, [actions, history, detectedIntent.key]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_VISITED_KEY);
      if (!stored) {
        setLastAction(null);
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed?.label && parsed?.path) {
        setLastAction(parsed);
      }
    } catch {
      setLastAction(null);
    }

    setHistory(getRouteHistory());
  }, []);

  useEffect(() => {
    setHistory(getRouteHistory());
  }, [location.pathname]);

  const handleNavigate = (action) => {
    recordRouteVisit({ label: action.label, path: action.path, role });
    setHistory(getRouteHistory());
    navigate(action.path);
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${theme.pageBg} text-white`}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <section className="space-y-6">
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${theme.accentSoft}`}>
                <span className="h-2 w-2 rounded-full bg-white/90" />
                Smart 404
              </div>

              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-white/45">{role} workspace</p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  This page is not available.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/72">{sentence}</p>
                <p className="max-w-2xl text-sm leading-7 text-white/48">
                  Pick one of the shortcuts below to continue without backtracking.
                </p>
              </div>

              {lastAction && (
                <div className="rounded-3xl border border-white/10 bg-white/8 p-4 text-sm text-white/80 shadow-lg backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70">Continue your last action</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{lastAction.label}</p>
                      <p className="text-white/45">Resume where you left off.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigate(lastAction)}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 font-medium text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 shadow-xl backdrop-blur-xl sm:p-6">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">AI navigation</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Recommended for you</h2>
              </div>

              <div className="space-y-3">
                {suggestedActions.map((action, index) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleNavigate(action)}
                    className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 ${theme.hover} ${index === 0 ? "border-white/35 bg-white/20 ring-1 ring-white/25" : "border-white/10 bg-white/10"}`}
                  >
                    <span>
                      <span className="block text-base font-medium text-white">{action.label}</span>
                      <span className="mt-1 block text-sm text-white/55">
                        Score {action.score}
                        {action.recent ? " • Recently used" : ""}
                        {action.frequency > 0 ? ` • Used ${action.frequency} times` : ""}
                      </span>
                    </span>
                    <span className={`ml-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white transition ${theme.chip}`}>
                      Go
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}