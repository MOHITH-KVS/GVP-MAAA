import { useState, useEffect } from "react";

const DEPARTMENT_MAP = {
  CSE: 11,
  CSM: 12,
  ECE: 14,
  MECH: 15,
  CIVIL: 1
};



/* ================= PAGE ================= */

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [department, setDepartment] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showUpdateTeacher, setShowUpdateTeacher] = useState(false);
  const [showDeleteTeacher, setShowDeleteTeacher] = useState(false);
  const [showNotifyTeacher, setShowNotifyTeacher] = useState(false);

  const fetchTeachers = async () => {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      window.location.href = "/auth/admin/signin";
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/admin/teachers", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth/admin/signin";
      return;
    }

    const data = await res.json();
    setTeachers(data);

  } catch (error) {
    console.error("Failed to fetch teachers", error);
  }
 };

  /* ===== FILTER ===== */
  const filtered = teachers.filter((t) => {
    const matchDept = department === "All" || t.department === department;
    const matchSearch =
      (t.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (t.designation?.toLowerCase() || "").includes(search.toLowerCase());

    return matchDept && matchSearch;
  });

  /* ===== CONDITION LOGIC ===== */
  const getCondition = (teacher) => {
    const avgAttendance =
      teacher.classes.reduce((a, c) => a + c.attendance, 0) /
      teacher.classes.length;

    const totalStudents = teacher.classes.reduce(
      (a, c) => a + c.students,
      0
    );

    if (avgAttendance < 70 && totalStudents > 120)
      return { label: "Action Recommended", color: "bg-red-100 text-red-700" };

    if (avgAttendance < 75)
      return { label: "Needs Attention", color: "bg-amber-100 text-amber-700" };

    return { label: "Stable", color: "bg-green-100 text-green-700" };
  };

  useEffect(() => {
  fetchTeachers();
  }, []);

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="bg-white p-6 rounded-2xl border">
        <h1 className="text-2xl font-semibold">Teacher Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Academic performance, class health & intervention insights
        </p>
      </div>

      {/* ================= ADMIN ACTIONS ================= */}
      <div className="bg-white px-4 py-3 rounded-xl border flex gap-3 flex-wrap items-center">

        {/* SECONDARY */}
        <button
          onClick={() => setShowUpdateTeacher(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition"
        >
          Update Teachers
        </button>

        {/* DESTRUCTIVE */}
        <button
          onClick={() => setShowDeleteTeacher(true)}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
        >
          Delete Teachers
        </button>

        {/* NOTIFY (RIGHT SIDE) */}
        <button
          onClick={() => setShowNotifyTeacher(true)}
          className="ml-auto px-4 py-2 rounded-lg border border-amber-300 text-amber-600 text-sm hover:bg-amber-50 transition"
        >
          Notify Teachers
        </button>

      </div>


      {/* ================= FILTERS ================= */}
      <div className="bg-white p-4 rounded-xl border flex gap-4 flex-wrap items-center">
        {["All", "CSE", "CSM", "MECH", "ECE", "CIVIL"].map((d) => (
          <button
            key={d}
            onClick={() => setDepartment(d)}
            className={`px-4 py-2 rounded-lg border text-sm
              ${department === d
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-50"}`}
          >
            {d}
          </button>
        ))}

        {/* 🔍 SEARCH – INCREASED WIDTH */}
        <input
          placeholder="Search teacher name or designation"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto border px-4 py-2 rounded-lg w-[420px]"
        />
      </div>

      {/* ================= ANALYTICS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Avg Student Attendance by Department"
          description="Overall classroom health by department"
        />
        <AnalyticsCard
          title="Teaching Condition Distribution"
          description="Stable vs Attention vs Action Required"
        />
        <AnalyticsCard
          title="Student Strength vs Attendance"
          description="Impact signal for teaching stress zones"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Teacher</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Avg Attendance</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((t) => {
              const condition = getCondition(t);
              const totalStudents = t.classes.reduce(
                (a, c) => a + c.students,
                0
              );
              const avgAttendance =
                t.classes.reduce((a, c) => a + c.attendance, 0) /
                t.classes.length;

              return (
                <tr key={t.id} className="border-t text-sm">
                  <td className="px-4 py-3 font-medium">
                    {t.name}
                    <div className="text-xs text-gray-400">
                      {t.designation}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{t.department}</td>
                  <td className="px-4 py-3 text-center">{t.classes.length}</td>
                  <td className="px-4 py-3 text-center">{totalStudents}</td>
                  <td className="px-4 py-3 text-center">
                    {avgAttendance.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${condition.color}`}
                    >
                      {condition.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedTeacher(t)}
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {selectedTeacher && (
        <TeacherProfileModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
        />
      )}
      {/* ================= TEACHER MODALS ================= */}
      {showUpdateTeacher && (<UpdateTeacherModal teachers={teachers} setTeachers={setTeachers} onClose={() => setShowUpdateTeacher(false)}/>)}
      {showDeleteTeacher && (<DeleteTeacherModal teachers={teachers} setTeachers={setTeachers} onClose={() => setShowDeleteTeacher(false)} />)}
      {showNotifyTeacher && (<NotifyTeacherModal teachers={teachers} onClose={() => setShowNotifyTeacher(false)}  />)}

    </div>
  );
}

/* ================= ANALYTICS CARD ================= */

function AnalyticsCard({ title, description }) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
      <div className="h-40 mt-4 flex items-center justify-center rounded-lg bg-gray-50 border border-dashed text-sm text-gray-400">
        📊 Analytics Agent will render chart here
      </div>
    </div>
  );
}

/* ================= PROFILE MODAL ================= */

function TeacherProfileModal({ teacher, onClose }) {
  const totalStudents = teacher.classes.reduce((a, c) => a + c.students, 0);
  const avgAttendance =
    teacher.classes.reduce((a, c) => a + c.attendance, 0) /
    teacher.classes.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl rounded-2xl p-6 space-y-6">

        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold tracking-wide">
            PROFILE · TEACHER OVERVIEW
          </h2>
          <button onClick={onClose} className="text-sm text-gray-500">
            Close
          </button>
        </div>

        {/* ===== BASIC INFO ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <Info label="Name" value={teacher.name} />
          <Info label="Department" value={teacher.department} />
          <Info label="Designation" value={teacher.designation} />
          <Info label="Experience" value={teacher.experience} />
          <Info label="Email" value={teacher.email} />
          <Info label="Phone" value={teacher.phone} />
          <Info label="Subjects" value={teacher.subjects.join(", ")} />
          <Info label="Alerts Sent" value={teacher.alertsSent} />
        </div>

        {/* ===== KEY INSIGHTS ===== */}
        <div className="grid grid-cols-3 gap-6">
          <InsightCard label="Total Students Handled" value={totalStudents} />
          <InsightCard
            label="Avg Student Attendance"
            value={`${avgAttendance.toFixed(1)}%`}
          />
          <InsightCard
            label="Classes Assigned"
            value={teacher.classes.length}
          />
        </div>

        {/* ===== CLASS TABLE ===== */}
        <div>
          <h3 className="font-medium mb-3">Class-wise Breakdown</h3>
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Avg Attendance</th>
              </tr>
            </thead>
            <tbody>
              {teacher.classes.map((c, i) => (
                <tr key={i} className="border-t text-center">
                  <td className="px-3 py-2">{c.year}</td>
                  <td className="px-3 py-2">{c.section}</td>
                  <td className="px-3 py-2">{c.students}</td>
                  <td className="px-3 py-2">{c.attendance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== PROFILE ANALYTICS ===== */}
        <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-400 text-center">
          📊 Individual teacher analytics will be rendered by Analytics Agent
        </div>
      </div>
    </div>
  );
}

/* ================= DELETE TEACHER MODAL ================= */
function DeleteTeacherModal({ teachers, setTeachers, onClose }) {
  const [step, setStep] = useState("form"); // form | review | success
  const [department, setDepartment] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmText, setConfirmText] = useState("");
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [countdown, setCountdown] = useState(5);


  /* ===== FILTERED TEACHERS ===== */
  const filteredTeachers = teachers.filter((t) => {
    const matchDept = department === "All" || t.department === department;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.designation.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  /* ===== TOGGLE SELECT ===== */
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /* ===== FINAL DELETE ===== */
  const confirmDelete = async () => {
  try {
    const token = localStorage.getItem("access_token");

    const res = await fetch(
      "http://localhost:8000/admin/teachers",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacher_ids: selectedIds,
        }),
      }
    );

    if (!res.ok) throw new Error("Delete failed");

    const deletedTeachers = teachers.filter(t =>
      selectedIds.includes(t.id)
    );

    setRecentlyDeleted(deletedTeachers);

    setTeachers(prev =>
      prev.filter(t => !selectedIds.includes(t.id))
    );

    setStep("success");
    setCountdown(5);

  } catch (err) {
    console.error(err);
    alert("Failed to delete teacher");
  }
};
 
  useEffect(() => {
  if (step !== "success") return;

  if (countdown === 0) {
    setRecentlyDeleted([]);
    onClose();
    return;
  }

  const timer = setTimeout(() => {
    setCountdown(prev => prev - 1);
  }, 1000);

  return () => clearTimeout(timer);
 }, [step, countdown]);




  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-red-600">
            Delete Teachers
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* FILTERS */}
            <div className="flex gap-3">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                <option>All</option>
                <option>CSE</option>
                <option>CSM</option>
                <option>ECE</option>
                <option>MECH</option>
                <option>CIVIL</option>
              </select>

              <input
                placeholder="Search by name or designation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-lg flex-1"
              />
            </div>

            {/* TEACHER LIST */}
            <div className="border rounded-lg max-h-60 overflow-y-auto text-sm">
              {filteredTeachers.length === 0 && (
                <p className="text-center text-gray-400 py-4">
                  No teachers found
                </p>
              )}

              {filteredTeachers.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2 border-b cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelect(t.id)}
                  />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.department} · {t.designation}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                disabled={selectedIds.length === 0}
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Review Delete
              </button>
            </div>
          </>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4">

            <p className="font-medium text-sm text-gray-700">
              Please recheck before deleting the following teachers
            </p>

            <div className="border rounded-lg max-h-48 overflow-y-auto text-sm">
              {teachers
                .filter((t) => selectedIds.includes(t.id))
                .map((t) => (
                  <div
                    key={t.id}
                    className="px-3 py-2 border-b flex justify-between"
                  >
                    <span>{t.name}</span>
                    <span className="text-gray-500">{t.department}</span>
                  </div>
                ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-medium">
                Type DELETE to confirm
              </p>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="border px-3 py-2 rounded-lg w-full"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>

              <button
                disabled={confirmText !== "DELETE"}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
              <div className="text-center py-12 space-y-4">

                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-3xl text-red-600">🗑</span>
                </div>

                <h3 className="text-lg font-semibold text-red-700">
                  Teachers Deleted Successfully
                </h3>

                <p className="text-sm text-gray-500">
                  You can undo this action within {countdown} seconds
                </p>

                {recentlyDeleted.length > 0 && (
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("access_token");

                      for (const teacher of recentlyDeleted) {
                        await fetch(
                          `http://localhost:8000/admin/teachers/${teacher.id}/restore`,
                          {
                            method: "PUT",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );
                      }

                      setTeachers(prev => [...prev, ...recentlyDeleted]);
                      setRecentlyDeleted([]);
                      onClose();
                    }}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg"
                  >
                    Undo
                  </button>
                )}

                {/* Countdown Progress Bar */}
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${(countdown / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
            </div>
          </div>
  );
}

/* ================= UPDATE TEACHER MODAL ================= */
function UpdateTeacherModal({ teachers, setTeachers, onClose }) {
  const [step, setStep] = useState("form"); // form | review | success
  const [department, setDepartment] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [editFields, setEditFields] = useState({
  department: false,
  designation: false,
 });


  const [updatedData, setUpdatedData] = useState({});

  /* ===== FILTERED TEACHERS ===== */
  const filteredTeachers = teachers.filter((t) => {
  const matchDept = department === "All" || t.department === department;
  const matchSearch =
    (t.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (t.designation?.toLowerCase() || "").includes(search.toLowerCase());
  return matchDept && matchSearch;
 });


  const selectedTeacher = teachers.find((t) => t.id === selectedId);
  /* ===== FINAL CONFIRM UPDATE (FIXED) ===== */
  const confirmUpdate = async () => {
  try {
    const token = localStorage.getItem("access_token");

    const payload = {};

    if (editFields.designation)
      payload.designation = updatedData.designation;

    if (editFields.department)
      payload.department_id =
      DEPARTMENT_MAP[updatedData.department];

    const res = await fetch(
      `http://localhost:8000/admin/teachers/${selectedId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error("Update failed");

    const responseData = await res.json();

    setTeachers(prev =>
      prev.map(t => {
        if (t.id !== selectedId) return t;

        return {
          ...t,
          ...updatedData,
          department: editFields.department
            ? updatedData.department
            : t.department,
          designation: editFields.designation
            ? updatedData.designation
            : t.designation,
        };
      })
    );


    setStep("success");

    setTimeout(() => {
      onClose();
    }, 2200);

  } catch (error) {
    console.error(error);
    alert("Failed to update teacher");
  }
 };



  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Update Teacher</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= FORM ================= */}
        {step === "form" && (
          <>
            {/* FILTERS */}
            <div className="flex gap-3">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                <option>All</option>
                <option>CSE</option>
                <option>CSM</option>
                <option>ECE</option>
                <option>MECH</option>
                <option>CIVIL</option>
              </select>

              <input
                placeholder="Search by name or designation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded-lg flex-1"
              />
            </div>

            {/* TEACHER LIST */}
            <div className="border rounded-lg max-h-48 overflow-y-auto text-sm">
              {filteredTeachers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id);
                    setUpdatedData({});
                    setEditFields({
                      department: false,
                      designation: false,
                    });
                  }}
                  className={`px-3 py-2 cursor-pointer border-b hover:bg-gray-50 ${
                    selectedId === t.id ? "bg-indigo-50" : ""
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.department} · {t.designation}
                  </p>
                </div>
              ))}
            </div>

            {/* EDIT OPTIONS */}
            {selectedTeacher && (
              <>
                <p className="text-sm font-medium">
                  Select fields to update
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.keys(editFields).map((key) => (
                    <label key={key} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={editFields[key]}
                        onChange={() =>
                          setEditFields({
                            ...editFields,
                            [key]: !editFields[key],
                          })
                        }
                      />
                      {key.toUpperCase()}
                    </label>
                  ))}
                </div>


                {editFields.department && (
                  <input
                    defaultValue={selectedTeacher.department}
                    onChange={(e) =>
                      setUpdatedData({
                        ...updatedData,
                        department: e.target.value,
                      })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}

                {editFields.designation && (
                  <input
                    defaultValue={selectedTeacher.designation}
                    onChange={(e) =>
                      setUpdatedData({
                        ...updatedData,
                        designation: e.target.value,
                      })
                    }
                    className="border px-3 py-2 rounded-lg w-full"
                  />
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep("review")}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Preview Update
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && selectedTeacher && (
          <div className="space-y-5 text-sm">
            <p className="font-medium">
              Please recheck updated teacher details
            </p>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            
              {editFields.department && (
                <ReviewRow
                  label="Department"
                  oldValue={selectedTeacher.department}
                  newValue={updatedData.department}
                />
              )}

              {editFields.designation && (
                <ReviewRow
                  label="Designation"
                  oldValue={selectedTeacher.designation}
                  newValue={updatedData.designation}
                />
              )}

          
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>

              <button
                onClick={confirmUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Final Publish
              </button>
            </div>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>

            <h3 className="text-lg font-semibold text-green-700">
              Successfully updated the database
            </h3>

            <p className="text-sm text-gray-500">
              Teacher record has been updated
            </p>

            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
            </div>

            <style>
              {`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}
            </style>
          </div>
        )}

      </div>
    </div>
  );
}

/* ===== REVIEW ROW HELPER ===== */
function ReviewRow({ label, oldValue, newValue }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-gray-400 line-through">
          {oldValue || "—"}
        </div>
        <div className="font-medium text-indigo-600">
          {newValue || "—"}
        </div>
      </div>
    </div>
  );
}

/* ================= NOTIFY TEACHER MODAL ================= */
function NotifyTeacherModal({ teachers, onClose }) {
  const [step, setStep] = useState("form"); // form | review | success

  const [target, setTarget] = useState("all"); // all | department | individual
  const [department, setDepartment] = useState("CSE");
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  const [type, setType] = useState("notice"); // notice | reminder | urgent
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  /* ===== FILTERED TEACHERS ===== */
  const departmentTeachers = teachers.filter(
    (t) => t.department === department
  );

  const selectedTeacher = teachers.find(
    (t) => t.id === selectedTeacherId
  );

  /* ===== FINAL SEND ===== */
  const sendNotification = () => {
    // 🔹 Later connect to backend / email / push service
    setStep("success");

    setTimeout(() => {
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Notify Teachers</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ================= FORM ================= */}
        {step === "form" && (
          <div className="space-y-5">

            {/* TARGET */}
            <div>
              <p className="text-sm font-medium mb-2">Send To</p>
              <div className="flex gap-4 text-sm">
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "all"}
                    onChange={() => setTarget("all")}
                  />
                  All Teachers
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "department"}
                    onChange={() => setTarget("department")}
                  />
                  Department
                </label>

                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={target === "individual"}
                    onChange={() => setTarget("individual")}
                  />
                  Individual Teacher
                </label>
              </div>
            </div>

            {/* DEPARTMENT */}
            {target === "department" && (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option>CSE</option>
                <option>CSM</option>
                <option>ECE</option>
                <option>MECH</option>
                <option>CIVIL</option>
              </select>
            )}

            {/* INDIVIDUAL */}
            {target === "individual" && (
              <select
                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.department}
                  </option>
                ))}
              </select>
            )}

            {/* TYPE */}
            <div>
              <p className="text-sm font-medium mb-2">Notification Type</p>
              <div className="flex gap-4 text-sm">
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "notice"}
                    onChange={() => setType("notice")}
                  />
                  📢 Notice
                </label>
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "reminder"}
                    onChange={() => setType("reminder")}
                  />
                  ⏰ Reminder
                </label>
                <label className="flex gap-2 items-center">
                  <input
                    type="radio"
                    checked={type === "urgent"}
                    onChange={() => setType("urgent")}
                  />
                  🚨 Urgent Alert
                </label>
              </div>
            </div>

            {/* TITLE */}
            <input
              placeholder="Notification Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full"
            />

            {/* MESSAGE */}
            <textarea
              placeholder="Write message for teachers..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border px-3 py-2 rounded-lg w-full h-28"
            />

            {/* ATTACHMENT */}
            <div>
              <label className="text-sm font-medium">Attach Document (optional)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mt-1 text-sm"
              />
            </div>

            {/* ACTION */}
            <div className="flex justify-end">
              <button
                onClick={() => setStep("review")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Review Notification
              </button>
            </div>
          </div>
        )}

        {/* ================= REVIEW ================= */}
        {step === "review" && (
          <div className="space-y-4 text-sm">
            <p className="font-medium">Please review notification details</p>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
              <p><b>Target:</b> {target}</p>
              {target === "department" && <p><b>Department:</b> {department}</p>}
              {target === "individual" && (
                <p><b>Teacher:</b> {selectedTeacher?.name}</p>
              )}
              <p><b>Type:</b> {type.toUpperCase()}</p>
              <p><b>Title:</b> {title}</p>
              <p><b>Message:</b> {message}</p>
              {file && <p><b>Attachment:</b> {file.name}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 border rounded-lg"
              >
                Back & Edit
              </button>

              <button
                onClick={sendNotification}
                className={`px-4 py-2 text-white rounded-lg ${
                  type === "urgent"
                    ? "bg-red-600"
                    : "bg-green-600"
                }`}
              >
                Send Notification
              </button>
            </div>
          </div>
        )}

        {/* ================= SUCCESS ================= */}
        {step === "success" && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="text-3xl text-green-600">✓</span>
            </div>

            <h3 className="text-lg font-semibold text-green-700">
              Notification Sent Successfully
            </h3>

            <p className="text-sm text-gray-500">
              Teachers have been notified
            </p>

            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
            </div>

            <style>
              {`
                @keyframes progress {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}
            </style>
          </div>
        )}

      </div>
    </div>
  );
}



/* ================= HELPERS ================= */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function InsightCard({ label, value }) {
  return (
    <div className="border rounded-xl p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
