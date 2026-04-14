import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import api from "../../utils/axios";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonProfile from "../../components/skeletons/SkeletonProfile";
import SkeletonTable from "../../components/skeletons/SkeletonTable";

/* ================= MAIN PAGE ================= */

export default function TeacherProfilePage({ onBack, profile, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [formData, setFormData] = useState({
    branch_id: "",
    designation: "",
    experience: "",
    qualification: "",
  });

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState([]);
  const [qualifications, setQualifications] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [publications, setPublications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");

  const getInitials = (name) => {
    if (!name) return "?";

    const parts = String(name).trim().split(" ").filter(Boolean);

    if (parts.length === 0) return "?";
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];

    const safeName = String(name || "?");
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    let mounted = true;

    const fetchTeacherProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/faculty/profile");
        const data = res?.data || profile || null;
        if (!mounted) return;
        console.log("Teacher Data:", data);
        setTeacher(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        if (!mounted) return;
        const fallbackTeacher = profile || null;
        setTeacher(fallbackTeacher);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTeacherProfile();

    return () => {
      mounted = false;
    };
  }, [profile]);

  useEffect(() => {
    if (!teacher) return;

    setEmail(teacher?.email || "");
    setPhone(teacher?.phone || "");
    setBio(teacher?.bio || "");
    setExpertise(Array.isArray(teacher?.expertise) ? teacher.expertise : []);
    setQualifications(teacher?.qualifications || "");
    setCertifications(Array.isArray(teacher?.certifications) ? teacher.certifications : []);
    setPublications(Array.isArray(teacher?.publications) ? teacher.publications : []);
    setName(teacher?.name || "");
    setEmployeeId(teacher?.employee_id || "");
    setLinkedin(teacher?.linkedin || "");
    setGithub(teacher?.github || "");
    setPortfolio(teacher?.portfolio || "");

    setFormData({
      branch_id: teacher?.branch_id ?? "",
      designation: teacher?.designation || "",
      experience: teacher?.experience ?? "",
      qualification: teacher?.qualification || teacher?.qualifications || "",
    });
  }, [teacher]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setClassesLoading(true);
      const res = await api.get("/faculty/classes");
      setClasses(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch classes", err);
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-2xl p-8 space-y-5">
          <SkeletonBox className="h-10 w-72" />
          <SkeletonProfile />
          <SkeletonTable rows={4} />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-2xl p-8 space-y-5">
          <SkeletonBox className="h-10 w-72" />
          <SkeletonProfile />
          <SkeletonTable rows={4} />
        </div>
      </div>
    );
  }

  const handleSave = async () => {
  try {
    const token = localStorage.getItem("access_token");
    console.log("TOKEN:", token);


    const res = await fetch("http://localhost:8000/faculty/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
      name,
      phone,
      bio,
      qualifications,

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

  if (onProfileUpdated) {
   onProfileUpdated();
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

  const handleAcademicSave = async () => {
    try {
      await api.put("/faculty/profile", {
        branch_id: formData.branch_id,
        designation: formData.designation,
        experience_years: Number(formData.experience),
        qualification: formData.qualification,
      });

      setIsEditing(false);

      const res = await api.get("/faculty/profile");
      setTeacher(res?.data || null);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between px-8 py-5 border-b">
        <div className="flex items-center gap-4">
          <div className="relative inline-block">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl ${getAvatarColor(teacher?.name)}`}
            >
              {getInitials(teacher?.name)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{teacher?.name ?? "N/A"}</h2>
            <p className="text-sm text-gray-500">
              {teacher?.designation || "Faculty"}
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
        </aside>

        {/* ===== RIGHT CONTENT ===== */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewSection
              profile={teacher}
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
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              teacher={teacher}
              classes={classes}
              formData={formData}
              setFormData={setFormData}
              handleAcademicSave={handleAcademicSave}
            />
          )}

          {activeTab === "classes" && (
            <ClassesSection
              classes={classes}
              loading={classesLoading}
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

function AcademicSection({ isEditing, setIsEditing, teacher, classes, formData, setFormData, handleAcademicSave }) {
  const classRows = Array.isArray(classes) ? classes : [];
  const departments = [
    { id: 1, name: "CSE" },
    { id: 2, name: "CSM" },
    { id: 3, name: "ECE" },
    { id: 4, name: "EEE" },
    { id: 5, name: "MECH" },
    { id: 6, name: "CIVIL" },
  ];

  const subjectNames = classRows
    .map((row) => row?.subject)
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  const subjectsFromTeacher = Array.isArray(teacher?.subjects)
    ? teacher.subjects
        .map((value) => (typeof value === "string" ? value : value?.name))
        .filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];

  const subjects = Array.from(
    new Set([
      ...subjectsFromTeacher.map((value) => value.trim()),
      ...subjectNames,
    ])
  );

  const subjectCount = teacher?.subjects_count ?? teacher?.subjects?.length ?? subjects.length ?? 0;
  const totalStudents = teacher?.total_students ?? 0;
  const avgAttendance = teacher?.avg_attendance ?? 0;
  const avgMarks = teacher?.avg_marks ?? 0;
  const atRiskStudents = teacher?.at_risk_students ?? 0;
  const studentsPlaced = teacher?.students_placed ?? 0;
  const successRate = teacher?.placement_success_rate ?? 0;

  const isCoordinator = teacher?.is_coordinator === true;
  const coordinatorValidTill = teacher?.coordinator_valid_till || "N/A";

  return (
    <Section title="Academic Information">
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Academic Details</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
              >
                Edit Academic Info
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcademicSave}
                  className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      branch_id: teacher?.branch_id ?? "",
                      designation: teacher?.designation || "",
                      experience: teacher?.experience ?? "",
                      qualification: teacher?.qualification || teacher?.qualifications || "",
                    });
                    setIsEditing(false);
                  }}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Department</p>
              {isEditing ? (
                <select
                  value={formData.branch_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: Number(e.target.value) })
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{teacher?.department || "Not Assigned"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Designation</p>
              {isEditing ? (
                <input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              ) : (
                <p className="font-medium">{teacher?.designation || "N/A"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Experience</p>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              ) : (
                <p className="font-medium">{teacher?.experience ?? 0} Years</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400">Qualification</p>
            {isEditing ? (
              <input
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm"
              />
            ) : (
              <p className="font-medium">{teacher?.qualification || teacher?.qualifications || "N/A"}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Teaching Load</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Subjects Count:</span> <span className="font-medium">{subjectCount}</span></p>
              <p><span className="text-gray-500">Total Students:</span> <span className="font-medium">{totalStudents}</span></p>
              <p>
                <span className="text-gray-500">Subjects:</span>{" "}
                <span className="font-medium">{subjects.length ? subjects.join(", ") : "N/A"}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance Metrics</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Average Attendance:</span> <span className="font-medium">{avgAttendance}%</span></p>
              <p><span className="text-gray-500">Average Marks:</span> <span className="font-medium">{avgMarks}</span></p>
              <p><span className="text-gray-500">At-Risk Students:</span> <span className="font-medium">{atRiskStudents}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Placement Contribution</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Students Placed:</span> <span className="font-medium">{studentsPlaced}</span></p>
              <p><span className="text-gray-500">Success Rate:</span> <span className="font-medium">{successRate}%</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Coordinator Role</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Placement Coordinator:</span> <span className="font-medium">{isCoordinator ? "Yes" : "No"}</span></p>
              <p><span className="text-gray-500">Valid Till:</span> <span className="font-medium">{coordinatorValidTill || "N/A"}</span></p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ClassesSection({ classes, loading }) {

  if (loading) {
    return (
      <Section title="Classes & Attendance">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SkeletonTable rows={6} />
        </div>
      </Section>
    );
  }

  return (
    <Section title="Classes & Attendance">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Classes & Attendance</h2>

        {classes.length === 0 && (
          <div className="text-center py-10 text-gray-400">No classes assigned yet</div>
        )}

        {classes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="w-1/6 py-3">Year</th>
                  <th className="w-1/6 py-3">Section</th>
                  <th className="w-2/6 py-3">Subject</th>
                  <th className="w-1/6 py-3 text-center">Students</th>
                  <th className="w-1/6 py-3 text-center">Avg Attendance</th>
                </tr>
              </thead>

              <tbody>
                {classes.map((cls, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition">
                    <td className="py-4">{cls.year ?? "-"}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                        {cls.section ?? "-"}
                      </span>
                    </td>
                    <td className="py-4 font-medium">{cls.subject ?? "-"}</td>
                    <td className="py-4 text-center font-semibold">{cls.students ?? 0}</td>
                    <td className="py-4 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {cls.avg_attendance ?? 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  const canEdit = editMode && typeof onChange === "function";

  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {canEdit ? (
        <input
          value={value || ""}
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

