import { useState } from "react";

/* ================= ADMIN SETTINGS PAGE ================= */

export default function Settings() {

  /* ===== GLOBAL ACADEMIC YEAR ===== */
  const [currentAcademicYear, setCurrentAcademicYear] = useState("2025–26");
  const [pendingAcademicYear, setPendingAcademicYear] = useState("2025–26");

  /* ===== CURRENT ADMISSION BATCH ===== */
  const [currentBatch, setCurrentBatch] = useState("2025");
  const [pendingBatch, setPendingBatch] = useState("2025");

  /* ===== GLOBAL CHANGE TRACKER ===== */
  const [hasChanges, setHasChanges] = useState(false);

  /* ===== MODALS & STATUS ===== */
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNoChange, setShowNoChange] = useState(false);

  /* ================= LOGIC ================= */

  const openConfirm = () => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      setShowNoChange(true);
      setTimeout(() => setShowNoChange(false), 2000);
    }
  };

  const applyChanges = () => {
    setShowConfirm(false);
    setSaving(true);

    setTimeout(() => {
      setCurrentAcademicYear(pendingAcademicYear);
      setCurrentBatch(pendingBatch);

      setHasChanges(false);
      setSaving(false);
      setSaved(true);

      setTimeout(() => setSaved(false), 1800);
    }, 1200);
  };

  return (
    <div className="space-y-14 relative">

      {/* ================= HEADER ================= */}
      <div className="p-6 rounded-2xl border bg-white">
        <h1 className="text-2xl font-semibold text-slate-800">
          System Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Configure institution-wide academic structure, governance rules,
          analytics behavior, and administrative controls.
        </p>
      </div>

      {/* ================= ACADEMIC CYCLE ================= */}
      <Section title="Academic Cycle Configuration">

        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <span className="px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-medium">
            Active: {currentAcademicYear}
          </span>

          <select
            value={pendingAcademicYear}
            onChange={(e) => {
              setPendingAcademicYear(e.target.value);
              setHasChanges(true);
            }}
            className="border rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option>2024–25</option>
            <option>2025–26</option>
            <option>2026–27</option>
          </select>
        </div>

        <div className="bg-white border rounded-2xl p-6 space-y-4">
          <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-medium">
            Active Batch: {currentBatch}
          </span>

          <select
            value={pendingBatch}
            onChange={(e) => {
              setPendingBatch(e.target.value);
              setHasChanges(true);
            }}
            className="border rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option>2024</option>
            <option>2025</option>
            <option>2026</option>
          </select>
        </div>

      </Section>

      {/* ================= INSTITUTION SETTINGS ================= */}
      <Section title="Institution Settings">
        <SettingCard>
          <Input label="Institution Name" value="GVP College of Engineering" onChange={() => setHasChanges(true)} />
          <Select label="Semester Mode" options={["Odd", "Even"]} onChange={() => setHasChanges(true)} />
          <Select label="Timezone" options={["IST", "UTC"]} onChange={() => setHasChanges(true)} />
          <Select label="Data Refresh Cycle" options={["Daily", "Weekly"]} onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= ACADEMIC RULES ================= */}
      <Section title="Academic Configuration">
        <SettingCard>
          <Input label="Attendance Risk Threshold (%)" value="75" onChange={() => setHasChanges(true)} />
          <Input label="CGPA Risk Threshold" value="6.5" onChange={() => setHasChanges(true)} />
          <Input label="Syllabus Delay Tolerance (%)" value="10" onChange={() => setHasChanges(true)} />
          <Select label="Risk Evaluation Mode" options={["Rule-based", "Hybrid (Future)"]} onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= ROLES ================= */}
      <Section title="Roles & Access Control">
        <SettingCard>
          <Toggle label="Admin – Full Access" checked onChange={() => setHasChanges(true)} />
          <Toggle label="Principal – View & Reports" checked onChange={() => setHasChanges(true)} />
          <Toggle label="HOD – Department Analytics" checked onChange={() => setHasChanges(true)} />
          <Toggle label="Faculty – Limited Access" onChange={() => setHasChanges(true)} />
          <Toggle label="Student – View Only" onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= ALERTS ================= */}
      <Section title="Alerts & Notifications">
        <SettingCard>
          <Toggle label="Attendance Drop Alerts" checked onChange={() => setHasChanges(true)} />
          <Toggle label="CGPA Drop Alerts" checked onChange={() => setHasChanges(true)} />
          <Toggle label="Syllabus Delay Alerts" onChange={() => setHasChanges(true)} />
          <Select label="Alert Frequency" options={["Immediate", "Weekly Summary"]} onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= ANALYTICS ================= */}
      <Section title="Analytics & Reports Settings">
        <SettingCard>
          <Select label="Analytics Refresh Interval" options={["Daily", "Weekly"]} onChange={() => setHasChanges(true)} />
          <Select label="Report Snapshot Retention" options={["30 Days", "60 Days", "90 Days"]} onChange={() => setHasChanges(true)} />
          <Select label="Default Report Format" options={["PDF", "Excel"]} onChange={() => setHasChanges(true)} />
          <Toggle label="Auto-Generate Monthly Reports (Future)" onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= SECURITY ================= */}
      <Section title="Security & Audit">
        <SettingCard>
          <Input label="Session Timeout (minutes)" value="30" onChange={() => setHasChanges(true)} />
          <Toggle label="Enable Audit Logs" checked onChange={() => setHasChanges(true)} />
          <Toggle label="Restrict Data Export" onChange={() => setHasChanges(true)} />
        </SettingCard>
      </Section>

      {/* ================= SAVE ================= */}
      <div className="flex justify-end">
        <button
          onClick={openConfirm}
          className="px-6 py-3 rounded-xl bg-slate-800 text-white text-sm"
        >
          Save Settings
        </button>
      </div>

      {showConfirm && <ConfirmModal onCancel={() => setShowConfirm(false)} onConfirm={applyChanges} />}
      {saving && <SavingOverlay />}
      {saved && <SavedOverlay />}
      {showNoChange && <NoChangeOverlay />}
    </div>
  );
}

/* ================= OVERLAYS ================= */

function SavingOverlay() {
  return (
    <Overlay>
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-700">
          Applying configuration changes…
        </p>
      </div>
    </Overlay>
  );
}

function SavedOverlay() {
  return (
    <Overlay>
      <p className="text-sm font-semibold text-emerald-600">
        ✓ Settings saved successfully
      </p>
    </Overlay>
  );
}

function NoChangeOverlay() {
  return (
    <Overlay>
      <p className="text-sm font-medium text-amber-600">
        No changes detected
      </p>
    </Overlay>
  );
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white border rounded-xl px-6 py-4 shadow-lg">
        {children}
      </div>
    </div>
  );
}

/* ================= REUSABLE ================= */

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input defaultValue={value} onChange={onChange} className="w-full border rounded-xl px-3 py-2 text-sm" />
    </div>
  );
}

function Select({ label, options, onChange }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <select onChange={onChange} className="w-full border rounded-xl px-3 py-2 text-sm">
        {options.map((o, i) => <option key={i}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm">{label}</span>
      <input type="checkbox" defaultChecked={checked} onChange={onChange} />
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
