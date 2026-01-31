import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useEffect } from "react";

/* ================= MAIN PAGE ================= */

export default function TeacherProfilePage({ onBack, profile }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [department, setDepartment] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [publications, setPublications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");



  if (!profile) {
  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading profile...</p>
    </div>
  );
 }


 useEffect(() => {
  if (profile) {
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setBio(profile.bio || "");
    setExpertise(profile.expertise || []);
    setQualifications(profile.qualification || []);
    setDepartment(profile.department_id || "")
    setCertifications(profile.certifications || []);
    setPublications(profile.publications || []);
    setClasses(profile.classes || []);
    setName(profile.name || "");
    setEmployeeId(profile.employee_id || "");
    setLinkedin(profile.linkedin || "");
    setGithub(profile.github || "");
    setPortfolio(profile.portfolio || "");



  }
 }, [profile]);

  const handleSave = async () => {
  try {
    const token = localStorage.getItem("access_token");
    console.log("TOKEN:", token);


    const res = await fetch("http://127.0.0.1:8000/faculty/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
      name,
      phone,
      bio,
      qualification,
      department,

      linkedin,
      github,
      portfolio,

      expertise,
      certifications,
      publications,
      classes
    })


    });

    if (!res.ok) {
    const err = await res.text();
    console.error("BACKEND ERROR:", err);
    throw new Error("Save failed");
  }


    setEditMode(false);
    alert("Profile updated successfully ✅");
  } catch (err) {
    alert("Failed to save profile ❌");
    console.error(err);
  }
 };


  const handleCancel = () => {
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between px-8 py-5 border-b">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
            B
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-sm text-gray-500">
              {profile?.designation || "Faculty"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <EditIcon fontSize="small" />
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
              >
                <SaveIcon fontSize="small" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <CancelIcon fontSize="small" />
                Cancel
              </button>
            </>
          )}

          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* ===== LEFT TABS ===== */}
        <aside className="w-72 border-r p-6 space-y-2">
          <ProfileTab label="Overview" value="overview" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Academic Info" value="academic" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Classes & Attendance" value="classes" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Expertise" value="expertise" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Certifications" value="certifications" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Publications" value="publications" activeTab={activeTab} setActiveTab={setActiveTab} />
          <ProfileTab label="Admin Remarks" value="remarks" activeTab={activeTab} setActiveTab={setActiveTab} />
        </aside>

        {/* ===== RIGHT CONTENT ===== */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewSection
              profile={profile}
              name={name}
              setName={setName}
              employeeId={employeeId}
              setEmployeeId={setEmployeeId}
              email={email}
              phone={phone}
              bio={bio}
              editMode={editMode}
              setEmail={setEmail}
              setPhone={setPhone}
              setBio={setBio}
              linkedin={linkedin}
              setLinkedin={setLinkedin}
              github={github}
              setGithub={setGithub}
              portfolio={portfolio}
              setPortfolio={setPortfolio}
            />


          )}
          {activeTab === "academic" && (
            <AcademicSection
              editMode={editMode}
              qualifications={qualifications}
              setQualifications={setQualifications}
              department={department}
              setDepartment={setDepartment}
            />
          )}

          {activeTab === "classes" && (
            <ClassesSection
              editMode={editMode}
              classes={classes}
              setClasses={setClasses}
            />
          )}


          {activeTab === "expertise" && (
            <ExpertiseSection
              items={expertise}
              editMode={editMode}
              setItems={setExpertise}
            />
          )}
          {activeTab === "certifications" && (
            <CertificationsSection
              editMode={editMode}
              certifications={certifications}
              setCertifications={setCertifications}
            />
          )}

          {activeTab === "publications" && (
            <PublicationsSection
              editMode={editMode}
              publications={publications}
              setPublications={setPublications}
            />
          )}


          {activeTab === "remarks" && <RemarksSection />}
        </main>
      </div>
    </div>
  );
}

/* ================= LEFT TAB ================= */

function ProfileTab({ label, value, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm transition
        ${
          activeTab === value
            ? "bg-indigo-100 text-indigo-700 font-medium"
            : "hover:bg-gray-100 text-gray-600"
        }`}
    >
      {label}
    </button>
  );
}

/* ================= SECTIONS ================= */

function OverviewSection({
  name,
  setName,
  employeeId,
  setEmployeeId,
  email,
  phone,
  bio,
  editMode,
  setEmail,
  setPhone,
  setBio,
  linkedin, setLinkedin,
  github, setGithub,
  portfolio, setPortfolio,
}) {
  return (
    <Section title="Personal Information">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Info
          label="Name"
          value={name}
          editMode={editMode}
          onChange={setName}
        />

        <Info
          label="Employee ID"
          value={employeeId}
          editMode={editMode}
          onChange={setEmployeeId}
        />

        <Info
          label="Email"
          value={email}
          editMode={editMode}
          onChange={setEmail}
        />
        <Info
          label="Phone"
          value={phone}
          editMode={editMode}
          onChange={setPhone}
        />
        <Info label="Status" value="Active" locked />
      </div>

      <h3 className="mt-8 mb-2 font-semibold">About</h3>
      {!editMode ? (
        <p className="text-sm text-gray-600">{bio}</p>
      ) : (
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full p-3 border rounded-xl text-sm"
          rows={3}
        />
      )}

      <h3 className="mt-8 mb-4 font-semibold">Social Links</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Info label="LinkedIn" value={linkedin} editMode={editMode} onChange={setLinkedin} />
        <Info label="GitHub" value={github} editMode={editMode} onChange={setGithub} />
        <Info label="Portfolio" value={portfolio} editMode={editMode} onChange={setPortfolio} />
      </div>


    </Section>
  );
}

function AcademicSection({ editMode, qualifications, setQualifications, department, setDepartment }) {

  return (
  <Section title="Academic Information">
    <div className="grid grid-cols-2 gap-6">

      <div>
        <p className="text-xs text-gray-400">Qualifications</p>
        {editMode ? (
          <input
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        ) : (
          <p>{qualifications || "—"}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-400">Department</p>
        {editMode ? (
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        ) : (
          <p>{department || "—"}</p>
        )}
      </div>

    </div>
  </Section>
 );
}

function ClassesSection({ editMode, classes, setClasses }) {

  const addRow = () => {
    setClasses([
      ...classes,
      {
        year: "",
        section: "",
        subject: "",
        students: "",
        attendance: null
      }
    ]);
  };

  const updateRow = (index, field, value) => {
    const updated = [...classes];
    updated[index][field] = value;
    setClasses(updated);
  };

  const removeRow = (index) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  return (
    <Section title="Classes & Attendance">

      {editMode && (
        <button
          onClick={addRow}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          + Add Class
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border rounded-xl">
          <thead className="bg-gray-50">
            <tr>
              <th>Year</th>
              <th>Section</th>
              <th>Subject</th>
              <th>Students</th>
              <th>Avg Attendance</th>
              {editMode && <th>Action</th>}
            </tr>
          </thead>

          <tbody>
            {classes.map((row, i) => (
              <tr key={i} className="border-t">

                {/* Editable fields */}
                {["year", "section", "subject", "students"].map(field => (
                  <td key={field} className="px-3 py-2">
                    {editMode ? (
                      <input
                        value={row[field]}
                        onChange={(e) => updateRow(i, field, e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      row[field] || "—"
                    )}
                  </td>
                ))}

                {/* Attendance – read only */}
                <td className="px-3 py-2 text-gray-500">
                  {row.attendance ?? "Auto"}
                </td>

                {/* Delete */}
                {editMode && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                )}

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}



function ExpertiseSection({ items, editMode, setItems }) {
  return (
    <Section title="Expertise">
      {!editMode ? (
        <ChipGroup items={items} />
      ) : (
        <input
          value={items.join(", ")}
          onChange={(e) => setItems(e.target.value.split(","))}
          className="w-full p-3 border rounded-xl text-sm"
          placeholder="Comma separated values"
        />
      )}
    </Section>
  );
}

function CertificationsSection({ editMode, certifications, setCertifications }) {

  const addCert = () => {
    setCertifications([...certifications, { name: "", link: "" }]);
  };

  const updateCert = (i, field, value) => {
    const updated = [...certifications];
    updated[i][field] = value;
    setCertifications(updated);
  };

  const removeCert = (i) => {
    setCertifications(certifications.filter((_, idx) => idx !== i));
  };

  return (
    <Section title="Certifications">
      {editMode && (
        <button
          onClick={addCert}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          + Add Certification
        </button>
      )}

      {certifications.map((c, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {editMode ? (
            <>
              <input
                value={c.name}
                onChange={(e) => updateCert(i, "name", e.target.value)}
                placeholder="Certificate Name"
                className="p-2 border rounded"
              />
              <input
                value={c.link}
                onChange={(e) => updateCert(i, "link", e.target.value)}
                placeholder="Certificate Link"
                className="p-2 border rounded"
              />
              <button
                onClick={() => removeCert(i)}
                className="text-red-600"
              >
                Delete
              </button>
            </>
          ) : (
            <a
              href={c.link}
              target="_blank"
              className="text-indigo-600 underline"
            >
              {c.name}
            </a>
          )}
        </div>
      ))}
    </Section>
  );
}



function PublicationsSection({ editMode, publications, setPublications }) {

  const addPub = () => {
    setPublications([...publications, { name: "", link: "" }]);
  };

  const updatePub = (i, field, value) => {
    const updated = [...publications];
    updated[i][field] = value;
    setPublications(updated);
  };

  const removePub = (i) => {
    setPublications(publications.filter((_, idx) => idx !== i));
  };

  return (
    <Section title="Publications">
      {editMode && (
        <button
          onClick={addPub}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          + Add Publication
        </button>
      )}

      {publications.map((p, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {editMode ? (
            <>
              <input
                value={p.name}
                onChange={(e) => updatePub(i, "name", e.target.value)}
                placeholder="Publication Name"
                className="p-2 border rounded"
              />
              <input
                value={p.link}
                onChange={(e) => updatePub(i, "link", e.target.value)}
                placeholder="Publication Link"
                className="p-2 border rounded"
              />
              <button
                onClick={() => removePub(i)}
                className="text-red-600"
              >
                Delete
              </button>
            </>
          ) : (
            <a
              href={p.link}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline"
            >
              {p.name}
            </a>
          )}
        </div>
      ))}
    </Section>
  );
}


function RemarksSection() {
  return (
    <Section title="Admin Remarks">
      <p className="text-sm text-gray-600">
        Consistently strong academic performance. Positive student feedback.
      </p>
    </Section>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">{title}</h2>
      {children}
    </div>
  );
}

function Info({ label, value, editMode, onChange }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {editMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full mt-1 p-2 border rounded-lg text-sm"
        />
      ) : (
        <p className="font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="font-medium">{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map(([label, value]) => (
        <div key={label} className="p-4 border rounded-xl">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border rounded-xl overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-sm text-left text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChipGroup({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
