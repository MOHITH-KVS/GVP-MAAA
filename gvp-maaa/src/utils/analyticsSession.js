import { baseURL, getToken } from "./api";

const SESSION_ID_KEY = "session_id";
const SESSION_STARTED_AT_KEY = "analytics_session_started_at";
const SESSION_LAST_ACTIVITY_KEY = "analytics_session_last_activity";
const USER_ID_KEY = "user_id";
const ROLE_KEY = "role";
const DEPARTMENT_KEY = "department";
const YEAR_KEY = "year";
const SECTION_KEY = "section";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function generateSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${nowMs()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function setSessionFields(sessionId, timestamp, context = {}) {
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  localStorage.setItem(SESSION_STARTED_AT_KEY, String(timestamp));
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(timestamp));

  localStorage.setItem(USER_ID_KEY, context.user_id == null ? "" : String(context.user_id));
  localStorage.setItem(ROLE_KEY, context.role == null ? "" : String(context.role));
  localStorage.setItem(DEPARTMENT_KEY, context.department == null ? "" : String(context.department));
  localStorage.setItem(YEAR_KEY, context.year == null ? "" : String(context.year));
  localStorage.setItem(SECTION_KEY, context.section == null ? "" : String(context.section));
}

export function startNewAnalyticsSession(context = {}) {
  const timestamp = nowMs();
  const sessionId = generateSessionId();
  setSessionFields(sessionId, timestamp, context);
  return sessionId;
}

export function clearAnalyticsSession() {
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(SESSION_STARTED_AT_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(DEPARTMENT_KEY);
  localStorage.removeItem(YEAR_KEY);
  localStorage.removeItem(SECTION_KEY);
}

export function getOrCreateActiveSessionId() {
  const existingSessionId = localStorage.getItem(SESSION_ID_KEY);
  const lastActivityRaw = localStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
  const lastActivity = toNumber(lastActivityRaw);
  const timestamp = nowMs();

  if (!existingSessionId) {
    console.warn("[analytics] session_id missing, creating a new session.");
    return startNewAnalyticsSession();
  }

  if (!lastActivity || timestamp - lastActivity > SESSION_TIMEOUT_MS) {
    console.warn("[analytics] session expired by inactivity, rotating session_id.");
    return startNewAnalyticsSession();
  }

  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(timestamp));
  return existingSessionId;
}

function decodeJwtPayload(token) {
  if (!token) {
    return {};
  }

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return {};
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "faculty") {
    return "teacher";
  }
  return normalized;
}

function normalizeMetadata(metadata = {}) {
  const departmentValue = metadata.department ?? metadata.department_id ?? metadata.branch ?? null;
  const yearValue = metadata.year ?? null;
  const sectionValue = metadata.section ?? null;

  const yearNumber = yearValue == null || yearValue === "" ? null : Number(yearValue);

  return {
    department: departmentValue == null || departmentValue === "" ? null : String(departmentValue).trim(),
    year: Number.isFinite(yearNumber) ? yearNumber : null,
    section: sectionValue == null || sectionValue === "" ? null : String(sectionValue).trim().toUpperCase(),
  };
}

function getStoredUserObject() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildTrackPayload({ page, action, role, metadata = {} }) {
  const payloadToken = decodeJwtPayload(getToken());
  const storedUser = getStoredUserObject();
  const normalizedMetadata = normalizeMetadata(metadata);

  const sessionId = getOrCreateActiveSessionId();

  return {
    user_id: toNumber(localStorage.getItem(USER_ID_KEY) ?? storedUser.user_id ?? payloadToken.user_id),
    role: normalizeRole(role || localStorage.getItem(ROLE_KEY) || storedUser.role || payloadToken.role),
    department:
      normalizedMetadata.department ??
      localStorage.getItem(DEPARTMENT_KEY) ??
      storedUser.department ??
      storedUser.department_id ??
      payloadToken.department ??
      payloadToken.department_id ??
      null,
    year: normalizedMetadata.year ?? toNumber(localStorage.getItem(YEAR_KEY)),
    section: normalizedMetadata.section ?? localStorage.getItem(SECTION_KEY),
    page,
    action,
    session_id: sessionId,
  };
}

export async function sendAnalyticsEvent({ page, action = "visit", role, metadata = {} }) {
  if (!page) {
    return;
  }

  const payload = buildTrackPayload({ page, action, role, metadata });

  if (!payload.session_id) {
    console.warn("[analytics] Unable to send event because session_id is missing.");
    return;
  }

  console.log("Tracking event:", payload);

  await fetch(`${baseURL}/api/analytics/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}
