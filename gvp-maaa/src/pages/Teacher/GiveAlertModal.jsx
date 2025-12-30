import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import CampaignIcon from "@mui/icons-material/Campaign";
import InfoIcon from "@mui/icons-material/Info";

export default function GiveAlertModal({ onClose }) {
  const [alertType, setAlertType] = useState("Announcement");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [showRecheck, setShowRecheck] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSend = year && section && message.length > 5;

  /* ================= CONFIG ================= */
  const ALERT = {
    Emergency: {
      btn: "bg-red-600 hover:bg-red-700",
      ring: "ring-red-400",
      bg: "bg-red-50",
      icon: <WarningIcon fontSize="small" />,
      emoji: "🚨",
      anim: "animate-alertEmergency",
    },
    Announcement: {
      btn: "bg-amber-500 hover:bg-amber-600",
      ring: "ring-amber-400",
      bg: "bg-amber-50",
      icon: <CampaignIcon fontSize="small" />,
      emoji: "📢",
      anim: "animate-alertAnnouncement",
    },
    Info: {
      btn: "bg-blue-600 hover:bg-blue-700",
      ring: "ring-blue-400",
      bg: "bg-blue-50",
      icon: <InfoIcon fontSize="small" />,
      emoji: "ℹ️",
      anim: "animate-alertInfo",
    },
  };

  const active = ALERT[alertType];

  const handleFinalSend = () => {
    setShowRecheck(false);
    setSuccess(true);
    setTimeout(onClose, 2600);
  };

  return (
    <>
      {/* ================= MAIN MODAL ================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl">

          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-lg font-semibold">Give Alert</h2>
            <button onClick={onClose}><CloseIcon /></button>
          </div>

          {/* BODY */}
          <div className="px-5 py-4 space-y-5">

            {/* ALERT TYPE */}
            <div>
              <p className="text-sm font-medium mb-2">Alert Type</p>
              <div className="flex gap-2">
                {Object.keys(ALERT).map(type => (
                  <button
                    key={type}
                    onClick={() => setAlertType(type)}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm transition ${
                      alertType === type
                        ? `${ALERT[type].bg} ring-2 ${ALERT[type].ring}`
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {ALERT[type].icon}
                      {type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TARGET */}
            <div className="grid grid-cols-3 gap-3">
              <Select label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
              <Select label="Section" value={section} onChange={setSection} options={["A", "B"]} />
              <Select label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />
            </div>

            {/* MESSAGE */}
            <div>
              <label className="text-sm font-medium">Alert Message</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type the alert message here…"
                className="w-full mt-1 p-3 border rounded-xl resize-none"
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-5 py-4 border-t flex justify-end">
            <button
              disabled={!canSend}
              onClick={() => setShowRecheck(true)}
              className={`px-5 py-2 rounded-lg text-white ${
                canSend ? active.btn : "bg-gray-400"
              }`}
            >
              Send Alert
            </button>
          </div>
        </div>
      </div>

      {/* ================= RECHECK ================= */}
      {showRecheck && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scaleIn">
            <h3 className="text-lg font-semibold mb-4">Recheck Alert</h3>

            <div className="space-y-2 text-sm text-gray-700">
              <p><b>Type:</b> {alertType}</p>
              <p><b>Target:</b> {year} {section} · {subject || "All Subjects"}</p>
              <p><b>Message:</b></p>
              <p className="bg-gray-50 p-2 rounded-lg">{message}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRecheck(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>
              <button
                onClick={handleFinalSend}
                className={`px-5 py-2 rounded-lg text-white ${active.btn}`}
              >
                Final Send Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS POPUP (CENTERED + MESSAGE) ================= */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 text-center text-white shadow-2xl ${active.btn} ${active.anim}`}>
            <div className="text-3xl mb-2">{active.emoji}</div>
            <h3 className="text-lg font-semibold mb-1">Alert Sent Successfully</h3>
            <p className="text-sm opacity-90 mb-3">
              {year} Year · Section {section} · {subject || "All Subjects"}
            </p>
            <p className="text-sm bg-white/20 rounded-lg p-2">
              {message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= HELPERS ================= */

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 border rounded-lg"
      >
        <option value="">Select</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
