import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";

export default function UploadResourceModal({ onClose }) {
  const [type, setType] = useState("Study Material");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(false);

  const canPublish =
    type && year && section && title && (file || link || description);

  /* ================= KEYBOARD SHORTCUTS ================= */
  useEffect(() => {
    if (!confirmOpen) return;

    const handler = (e) => {
      if (e.key === "Escape") setConfirmOpen(false);
      if (e.key === "Enter") handleFinalPublish();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [confirmOpen]);

  /* ================= FINAL PUBLISH ================= */
  const handleFinalPublish = () => {
    setConfirmOpen(false);
    setSuccess(true);
  };

  /* ================= SUCCESS FLOW ================= */
  useEffect(() => {
    if (!success) return;

    const t1 = setTimeout(() => setToast(true), 1200);
    const t2 = setTimeout(() => {
      setToast(false);
      onClose();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [success]);

  return (
    <>
      {/* ================= MAIN MODAL ================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl mx-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Upload Resource</h2>
            <button onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {/* Resource Type */}
            <div>
              <p className="text-sm font-medium mb-2">Resource Type</p>
              <div className="flex gap-3 flex-wrap">
                {["Study Material", "Assignment", "Notice", "External Link"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-4 py-2 rounded-full border ${
                        type === t
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Target */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Year" value={year} onChange={setYear} options={["3rd Year", "4th Year"]} />
              <Select label="Section" value={section} onChange={setSection} options={["A", "B"]} />
              <Select label="Subject" value={subject} onChange={setSubject} options={["DBMS", "OS", "CN"]} />
            </div>

            {/* Title */}
            <Input label="Title" value={title} onChange={setTitle} />

            {/* Description / Link */}
            {type !== "External Link" ? (
              <Textarea
                label={type === "Notice" ? "Notice Message" : "Description"}
                value={description}
                onChange={setDescription}
              />
            ) : (
              <Input label="Resource URL" value={link} onChange={setLink} />
            )}

            {/* File */}
            {type !== "External Link" && (
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              disabled={!canPublish}
              onClick={() => setConfirmOpen(true)}
              className={`px-5 py-2 rounded-lg text-white ${
                canPublish
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Publish
            </button>
          </div>

          {/* ================= RECHECK MODAL ================= */}
          {confirmOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">
                  Recheck Before Publishing
                </h3>

                <div className="space-y-2 text-sm text-gray-700">
                  <p><b>Type:</b> {type}</p>
                  <p><b>Year:</b> {year}</p>
                  <p><b>Section:</b> {section}</p>
                  <p><b>Subject:</b> {subject || "All Subjects"}</p>

                  <div>
                    <label className="text-xs text-gray-500">Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Back & Edit
                  </button>
                  <button
                    onClick={handleFinalPublish}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Final Publish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= SUCCESS OVERLAY ================= */}
      {success && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-500/10 backdrop-blur-md">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ripple" />
              <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <p className="text-lg font-semibold text-gray-800">
              Published Successfully
            </p>
            <p className="text-xs text-gray-500">
              Students can view it now
            </p>
          </div>
        </div>
      )}

      {/* ================= TOAST (ABOVE BLUR) ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg">
          Resource published successfully 🎉
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
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 border rounded-lg"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 p-2 border rounded-lg"
      />
    </div>
  );
}
