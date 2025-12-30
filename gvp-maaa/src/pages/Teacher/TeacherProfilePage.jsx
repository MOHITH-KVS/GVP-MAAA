import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

/* ================= MAIN PAGE ================= */

export default function TeacherProfilePage({ onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);

  /* ===== Editable fields (Teacher controlled) ===== */
  const [email, setEmail] = useState("bhanu@gvp.edu");
  const [phone, setPhone] = useState("+91 XXXXX XXXXX");
  const [bio, setBio] = useState(
    "Passionate educator with interest in databases and systems."
  );
  const [expertise, setExpertise] = useState([
    "DBMS",
    "Operating Systems",
    "Computer Networks",
  ]);

  const handleSave = () => {
    setEditMode(false);
    // later → API call
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
            <h2 className="text-xl font-semibold">Bhanu Prasad</h2>
            <p className="text-sm text-gray-500">
              Associate Professor · CSE
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
              email={email}
              phone={phone}
              bio={bio}
              editMode={editMode}
              setEmail={setEmail}
              setPhone={setPhone}
              setBio={setBio}
            />
          )}
          {activeTab === "academic" && <AcademicSection />}
          {activeTab === "classes" && <ClassesSection />}
          {activeTab === "expertise" && (
            <ExpertiseSection
              items={expertise}
              editMode={editMode}
              setItems={setExpertise}
            />
          )}
          {activeTab === "certifications" && <CertificationsSection />}
          {activeTab === "publications" && <PublicationsSection />}
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
  email,
  phone,
  bio,
  editMode,
  setEmail,
  setPhone,
  setBio,
}) {
  return (
    <Section title="Personal Information">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Info label="Employee ID" value="CSE1023" locked />
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

      <h3 className="mt-8 mb-4 font-semibold">Quick Stats</h3>
      <StatsGrid
        stats={[
          ["Experience", "12 Years"],
          ["Subjects", "3"],
          ["Students", "180+"],
          ["Classes / Week", "15"],
        ]}
      />
    </Section>
  );
}

function AcademicSection() {
  return (
    <Section title="Academic Information">
      <InfoGrid
        items={[
          ["Qualification", "Ph.D (Computer Science)"],
          ["Specialization", "Databases, OS"],
          ["Department", "CSE"],
          ["Joining Year", "2012"],
        ]}
      />
    </Section>
  );
}

function ClassesSection() {
  return (
    <Section title="Classes & Attendance">
      <Table
        headers={["Year", "Section", "Subject", "Students", "Avg Attendance"]}
        rows={[
          ["3rd Year", "A", "DBMS", "60", "82%"],
          ["3rd Year", "B", "OS", "58", "79%"],
          ["4th Year", "A", "CN", "62", "85%"],
        ]}
      />
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

function CertificationsSection() {
  return (
    <Section title="Certifications & FDPs">
      <List
        items={[
          "AICTE FDP on AI – 2023",
          "NPTEL Advanced DBMS",
          "Faculty Development Program – IIT Madras",
        ]}
      />
    </Section>
  );
}

function PublicationsSection() {
  return (
    <Section title="Publications">
      <List
        items={[
          "Journal on Distributed Systems – IEEE",
          "Conference on Cloud Computing – 2022",
        ]}
      />
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

function Info({ label, value, editMode, onChange, locked }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {locked ? (
        <p className="font-medium text-gray-500">{value} 🔒</p>
      ) : editMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full mt-1 p-2 border rounded-lg text-sm"
        />
      ) : (
        <p className="font-medium">{value}</p>
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
