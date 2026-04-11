export const HISTORY_KEY = "history";
export const LAST_VISITED_KEY = "lastVisited";
const MAX_HISTORY_ITEMS = 10;

function safeParseHistory(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getRouteHistory() {
  return safeParseHistory(localStorage.getItem(HISTORY_KEY));
}

export function recordRouteVisit(route) {
  if (!route?.path || !route?.label) {
    return;
  }

  const nextItem = {
    path: route.path,
    label: route.label,
    role: route.role || "unknown",
    ts: Date.now(),
  };

  const history = getRouteHistory();
  const lastItem = history[history.length - 1];

  // Avoid flooding history with repeated writes for the same page render.
  if (lastItem?.path === nextItem.path) {
    localStorage.setItem(LAST_VISITED_KEY, JSON.stringify({ label: nextItem.label, path: nextItem.path }));
    return;
  }

  const nextHistory = [...history, nextItem].slice(-MAX_HISTORY_ITEMS);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  localStorage.setItem(LAST_VISITED_KEY, JSON.stringify({ label: nextItem.label, path: nextItem.path }));
}