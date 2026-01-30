import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

const SECTIONS = [
  "Overview",
  "Academics",
  "Attendance",
  "Skills",
  "Certificates",
  "Placements",
  "Remarks",
];

export default function ViewProfile({ onClose, profile }) {
  const [active, setActive] = useState("Overview");
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const showSuccessToast = (msg) => {
  setToast(msg);
  setTimeout(() => setToast(""), 3000);
 };

  /* -------- STATE FROM BACKEND -------- */
  const [info, setInfo] = useState(null);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [certTitle, setCertTitle] = useState("");
  const [certLink, setCertLink] = useState("");

  /* -------- INIT -------- */
  useEffect(() => {
    setVisible(true);
    document.body.style.overflow = "hidden";

    if (profile) {
      setInfo({
        name: profile.name,
        email: profile.email,
        roll: profile.roll_no,
        year: profile.year,
        semester: profile.semester,
        status: "Active",

        linkedin: profile.linkedin || "",
        github: profile.github || "",
        portfolio: profile.portfolio || "",
      });

      setSkills(profile.skills || []);
      setCertificates(profile.certificates || []);

    }

    return () => (document.body.style.overflow = "auto");
  }, [profile]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleSaveProfile = async () => {
  try {
    setSaving(true); // 🔄 start spinner

    const token = localStorage.getItem("access_token");

    // ⏳ artificial delay for UX
    await new Promise((res) => setTimeout(res, 1500));

    const res = await fetch("http://127.0.0.1:8000/student/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: info.name,
        year: Number(info.year),
        semester: Number(info.semester),
        skills,
        certificates: certificates,
        linkedin: info.linkedin,
        github: info.github,
        portfolio: info.portfolio,
      }),
    });

    if (!res.ok) throw new Error("Save failed");

    showSuccessToast("Profile updated successfully ✅");
    setEditMode(false);

  } catch (err) {
    alert("Failed to save profile");
  } finally {
    setSaving(false); // ✅ stop spinner
  }
 };



  const addSkill = () => {
    if (!newSkill.trim()) return;
    setSkills([...skills, newSkill]);
    setNewSkill("");
  };

  const addCertificate = () => {
  if (!certTitle.trim() || !certLink.trim()) return;

  setCertificates([
    ...certificates,
    { title: certTitle, link: certLink },
  ]);


  setCertTitle("");
  setCertLink("");
 };

 const deleteCertificate = (index) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this certificate?"
  );

  if (!confirmDelete) return;

  const updated = certificates.filter((_, i) => i !== index);
  setCertificates(updated);
 };





  /* -------- LOADING GUARD -------- */
  if (!info) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <p className="text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
              {info.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{info.name}</h1>
              <p className="text-sm text-slate-500">
                Year {info.year} · Semester {info.semester}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (editMode) {
                  handleSaveProfile();
                } else {
                  setEditMode(true);
                }
              }}
              disabled={saving}
              className={`px-4 py-2 rounded-lg border ${
                saving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {saving ? "Saving..." : editMode ? "Save" : "Edit"}
            </button>



            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-[240px_1fr] gap-8 h-[calc(100vh-80px)]">
        {/* LEFT NAV */}
        <aside className="bg-white border rounded-xl p-4 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                active === s
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </aside>

        {/* RIGHT CONTENT */}
        <main className="bg-white border rounded-xl p-6 overflow-y-auto">
          {/* OVERVIEW */}
          {active === "Overview" && (
            <>
              <Section title="Personal Information">
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  {Object.entries(info).map(([key, value]) => {
                    const lockedFields = ["email", "roll", "status"];
                    const isLocked = lockedFields.includes(key);
                    const isLinkField = ["linkedin", "github", "portfolio"].includes(key);

                    return (
                      <div key={key}>
                        <p className="text-slate-400 capitalize">{key}</p>

                        {editMode && !isLocked ? (
                          <input
                            value={value || ""}
                            onChange={(e) =>
                              setInfo({ ...info, [key]: e.target.value })
                            }
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : isLinkField ? (
                          value ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 underline text-sm break-all"
                            >
                              {value}
                            </a>
                          ) : (
                            <p className="text-slate-400">-</p>
                          )
                        ) : (
                          <p className="font-medium">{value || "-"}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            </>
          )}

          {/* SKILLS */}
          {active === "Skills" && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.length ? (
                  skills.map((s, i) => <Chip key={i} text={s} />)
                ) : (
                  <p className="text-sm text-slate-400">No skills added</p>
                )}
              </div>

              {editMode && (
                <div className="flex gap-2">
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add new skill"
                    className="border rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addSkill}
                    className="px-3 py-2 bg-indigo-600 text-white rounded"
                  >
                    <AddIcon fontSize="small" />
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* CERTIFICATES */}
          {active === "Certificates" && (
            <Section title="Certifications">
              <ul className="space-y-3 text-sm">
                {certificates.length ? (
                  certificates.map((c, i) => (
                    <li
                      key={i}
                      className="border rounded-lg p-3 flex justify-between items-start gap-4"
                    >
                      {/* LEFT CONTENT */}
                      {editMode ? (
                        <div className="flex-1 space-y-2">
                          <input
                            value={c.title}
                            onChange={(e) => {
                              const copy = [...certificates];
                              copy[i].title = e.target.value;
                              setCertificates(copy);
                            }}
                            className="border rounded px-2 py-1 w-full text-sm"
                            placeholder="Certificate title"
                          />

                          <input
                            value={c.link}
                            onChange={(e) => {
                              const copy = [...certificates];
                              copy[i].link = e.target.value;
                              setCertificates(copy);
                            }}
                            className="border rounded px-2 py-1 w-full text-sm"
                            placeholder="Certificate link"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">✔ {c.title}</p>
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 text-sm underline"
                          >
                            View Certificate
                          </a>
                        </div>
                      )}

                      {/* DELETE BUTTON */}
                      {editMode && (
                        <button
                          onClick={() => deleteCertificate(i)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No certificates added</p>
                )}
              </ul>

              {/* ADD NEW CERTIFICATE */}
              {editMode && (
                <div className="mt-4 space-y-2">
                  <input
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    placeholder="Certificate title (e.g. Python NPTEL)"
                    className="border rounded px-3 py-2 w-full text-sm"
                  />

                  <input
                    value={certLink}
                    onChange={(e) => setCertLink(e.target.value)}
                    placeholder="Certificate link (Google Drive / DigiLocker)"
                    className="border rounded px-3 py-2 w-full text-sm"
                  />

                  <button
                    onClick={addCertificate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm"
                  >
                    Add Certificate
                  </button>
                </div>
              )}
            </Section>
          )}



          {/* REMAINING SECTIONS */}
          {active === "Attendance" && (
            <Section title="Attendance Summary">
              Attendance details will appear here.
            </Section>
          )}

          {active === "Placements" && (
            <Section title="Placements">
              Placement information will appear here.
            </Section>
          )}

          {active === "Remarks" && (
            <Section title="Remarks">
              Faculty remarks will appear here.
            </Section>
          )}
        </main>
      </div>
      {/* ✅ SUCCESS TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="font-semibold mb-4">{title}</h2>
    {children}
  </div>
);

const Chip = ({ text }) => (
  <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-sm">
    {text}
  </span>
);
