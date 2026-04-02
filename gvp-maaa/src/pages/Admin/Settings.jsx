import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../utils/axios";

const defaultSettings = {
  attendance_threshold: 75,
  cgpa_threshold: 6.5,
  attendance_alert_enabled: true,
  cgpa_alert_enabled: true,
  alert_frequency: "immediate",
  report_retention_days: 30,
  analytics_refresh_interval: "daily",
  report_format: "PDF",
  marks_format: null,
  attendance_format: null,
  assignment_format: null,
  resources_format: null,
  session_timeout: 30,
};

const tabs = [
  { id: "general", label: "General" },
  { id: "academic", label: "Academic Rules" },
  { id: "alerts", label: "Alerts" },
  { id: "reports", label: "Reports" },
  { id: "security", label: "Security" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [formValues, setFormValues] = useState(defaultSettings);
  const [originalValues, setOriginalValues] = useState(defaultSettings);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [previewImpact, setPreviewImpact] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const previewTimer = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setDirty(JSON.stringify(formValues) !== JSON.stringify(originalValues));
    validateAll(formValues, setValidationErrors);
  }, [formValues, originalValues]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) {
        return undefined;
      }

      event.preventDefault();
      event.returnValue = "Your changes are not saved";
      return "Your changes are not saved";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get("/api/settings");
      const data = response.data || {};
      const { settings_last_updated, ...settingsData } = data;
      const normalized = {
        ...defaultSettings,
        ...settingsData,
      };
      setFormValues(normalized);
      setOriginalValues(normalized);
      setLastUpdatedAt(settings_last_updated ? new Date(settings_last_updated) : null);
      validateAll(normalized, setValidationErrors);
      await loadAuditLogs();
    } catch (error) {
      console.error("Failed to load settings", error);
      setErrorMessage("Unable to load settings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(originalValues),
    [formValues, originalValues]
  );

  const updateField = (key, value) => {
    const normalized = value === "" ? null : value;
    setFormValues((prev) => ({ ...prev, [key]: normalized }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const saveSettings = async () => {
    const errors = validateAll(formValues, setValidationErrors);
    if (Object.keys(errors).length > 0) {
      setErrorMessage("Please fix validation errors before saving.");
      return;
    }

    const updates = Object.entries(formValues).reduce((acc, [key, value]) => {
      if (JSON.stringify(originalValues[key]) !== JSON.stringify(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      setSuccessMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await api.put("/api/settings", updates);
      setOriginalValues(formValues);
      setDirty(false);
      setSuccessMessage("Settings updated successfully");
      setLastUpdatedAt(response.data?.updated_at ? new Date(response.data.updated_at) : new Date());
      await loadAuditLogs();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to save settings", error);
      const detail = error?.response?.data?.detail;
      setErrorMessage(detail || "Unable to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaultValues = {
      attendance_threshold: 75,
      cgpa_threshold: 6.5,
      attendance_alert_enabled: true,
      cgpa_alert_enabled: true,
      alert_frequency: "immediate",
      report_retention_days: 30,
      analytics_refresh_interval: "daily",
      report_format: "PDF",
      session_timeout: 30,
    };

    setFormValues(defaultValues);
    setDirty(true);
    setErrorMessage("");
    setSuccessMessage("");
    validateAll(defaultValues, setValidationErrors);
  };

  const discardChanges = () => {
    setFormValues(originalValues);
    setDirty(false);
    setErrorMessage("");
    setSuccessMessage("");
    validateAll(originalValues, setValidationErrors);
  };

  const hasErrors = Object.keys(validationErrors).length > 0;

  const loadAuditLogs = async () => {
    try {
      const response = await api.get("/api/settings/logs");
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error("Unable to load audit logs", error);
    }
  };

  useEffect(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }

    if (
      validationErrors.attendance_threshold ||
      validationErrors.cgpa_threshold ||
      formValues.attendance_threshold == null ||
      formValues.cgpa_threshold == null
    ) {
      setPreviewImpact(null);
      setPreviewError("");
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");

    previewTimer.current = setTimeout(async () => {
      try {
        const response = await api.post("/api/settings/preview-impact", {
          attendance_threshold: formValues.attendance_threshold,
          cgpa_threshold: formValues.cgpa_threshold,
        });
        setPreviewImpact(response.data || null);
      } catch (error) {
        console.error("Preview impact failed", error);
        setPreviewImpact(null);
        setPreviewError("Unable to calculate impact preview.");
      } finally {
        setPreviewLoading(false);
      }
    }, 500);

    return () => {
      if (previewTimer.current) {
        clearTimeout(previewTimer.current);
      }
    };
  }, [formValues.attendance_threshold, formValues.cgpa_threshold, validationErrors.attendance_threshold, validationErrors.cgpa_threshold]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <SelectField
              label="Analytics Refresh Interval"
              value={formValues.analytics_refresh_interval}
              options={["daily", "weekly", "monthly"]}
              onChange={(value) => updateField("analytics_refresh_interval", value)}
            />
          </div>
        );
      case "academic":
        return (
          <div className="space-y-6">
            <NumberField
              label="Attendance Threshold (%)"
              value={formValues.attendance_threshold}
              error={validationErrors.attendance_threshold}
              onChange={(value) => updateField("attendance_threshold", value)}
            />
            <NumberField
              label="CGPA Threshold"
              value={formValues.cgpa_threshold}
              error={validationErrors.cgpa_threshold}
              onChange={(value) => updateField("cgpa_threshold", value)}
            />
            {previewLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Calculating impact preview...
              </div>
            ) : previewError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {previewError}
              </div>
            ) : previewImpact ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                ⚠️ {previewImpact.at_risk_students} students will be marked at risk with the current thresholds.
              </div>
            ) : null}
          </div>
        );
      case "alerts":
        return (
          <div className="space-y-6">
            <ToggleField
              label="Attendance Alert"
              checked={formValues.attendance_alert_enabled}
              onChange={(checked) => updateField("attendance_alert_enabled", checked)}
            />
            <ToggleField
              label="CGPA Alert"
              checked={formValues.cgpa_alert_enabled}
              onChange={(checked) => updateField("cgpa_alert_enabled", checked)}
            />
            <SelectField
              label="Alert Frequency"
              value={formValues.alert_frequency}
              options={["immediate", "daily", "weekly"]}
              onChange={(value) => updateField("alert_frequency", value)}
            />
          </div>
        );
      case "reports":
        return (
          <div className="space-y-6">
            <NumberField
              label="Retention Days"
              value={formValues.report_retention_days}
              error={validationErrors.report_retention_days}
              onChange={(value) => updateField("report_retention_days", value)}
            />
            <SelectField
              label="Marks Format"
              value={formValues.marks_format ?? ""}
              options={["", "PDF", "Excel", "DOCX"]}
              onChange={(value) => updateField("marks_format", value)}
            />
            <SelectField
              label="Attendance Format"
              value={formValues.attendance_format ?? ""}
              options={["", "PDF", "Excel", "DOCX"]}
              onChange={(value) => updateField("attendance_format", value)}
            />
            <SelectField
              label="Assignment Format"
              value={formValues.assignment_format ?? ""}
              options={["", "PDF", "Excel", "DOCX"]}
              onChange={(value) => updateField("assignment_format", value)}
            />
            <SelectField
              label="Resources Format"
              value={formValues.resources_format ?? ""}
              options={["", "PDF", "Excel", "DOCX"]}
              onChange={(value) => updateField("resources_format", value)}
            />
            <p className="text-sm text-slate-500">Leave empty to use the system default format.</p>
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <NumberField
              label="Session Timeout (minutes)"
              value={formValues.session_timeout}
              error={validationErrors.session_timeout}
              onChange={(value) => updateField("session_timeout", value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Store and manage institution-wide settings independently from the core app behavior.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <aside className="space-y-4 rounded-3xl border bg-white p-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="rounded-3xl border bg-white p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold capitalize">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="text-sm text-gray-500">Update and save the currently selected settings category.</p>
              <p className="text-sm text-slate-500 mt-2">
                Last updated: {lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : "Not available"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => resetToDefaults()}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Reset to Default
              </button>
              <button
                onClick={saveSettings}
                disabled={!dirty || saving || hasErrors}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  saving
                    ? "cursor-wait bg-slate-300 text-slate-600"
                    : dirty && !hasErrors
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Loading settings...
            </div>
          ) : (
            <div className="space-y-6">
              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              {renderTabContent()}
              {auditLogs.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold">Recent Changes</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="font-medium">{log.key.replace(/_/g, " ")}</p>
                        <p>{String(log.old_value)} → {String(log.new_value)}</p>
                        <p className="text-xs text-slate-500">by {log.updated_by} • {new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">⚠️ You have unsaved changes</span>
              <span>Save or discard your changes before leaving.</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={discardChanges}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveSettings}
                disabled={!dirty || saving || hasErrors}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function validateAll(values, setErrors) {
  const errors = {};

  if (values.attendance_threshold === "" || values.attendance_threshold == null || Number.isNaN(Number(values.attendance_threshold))) {
    errors.attendance_threshold = "Provide a valid attendance threshold";
  } else if (values.attendance_threshold < 0 || values.attendance_threshold > 100) {
    errors.attendance_threshold = "Attendance must be between 0 and 100";
  }

  if (values.cgpa_threshold === "" || values.cgpa_threshold == null || Number.isNaN(Number(values.cgpa_threshold))) {
    errors.cgpa_threshold = "Provide a valid CGPA threshold";
  } else if (values.cgpa_threshold < 0 || values.cgpa_threshold > 10) {
    errors.cgpa_threshold = "CGPA must be between 0 and 10";
  }

  if (values.report_retention_days === "" || values.report_retention_days == null || Number.isNaN(Number(values.report_retention_days))) {
    errors.report_retention_days = "Provide valid retention days";
  } else if (Number(values.report_retention_days) <= 0) {
    errors.report_retention_days = "Retention days must be greater than 0";
  }

  if (values.session_timeout === "" || values.session_timeout == null || Number.isNaN(Number(values.session_timeout))) {
    errors.session_timeout = "Provide a valid session timeout";
  } else if (Number(values.session_timeout) <= 0) {
    errors.session_timeout = "Session timeout must be greater than 0";
  }

  const formatFields = [
    "marks_format",
    "attendance_format",
    "assignment_format",
    "resources_format"
  ];

  for (const field of formatFields) {
    const value = values[field];
    if (value != null && value !== "" && !["pdf", "excel", "docx"].includes(String(value).toLowerCase())) {
      errors[field] = "Choose a valid format or leave empty";
    }
  }

  setErrors(errors);
  return errors;
}

function formatRelativeTime(date) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes === 0) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function NumberField({ label, value, onChange, error }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"
        }`}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "" ? "Default" : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600" />
        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold border-b pb-2">{title}</h2>
      {children}
    </div>
  );
}

function SettingCard({ children }) {
  return (
    <div className="bg-white border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  );
}

function ConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 space-y-4">
        <p className="font-semibold">Confirm Settings Change</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} className="bg-slate-800 text-white px-4 py-2 rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}
