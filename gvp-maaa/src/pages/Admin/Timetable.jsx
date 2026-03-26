import { useState, useEffect } from "react";
import api from "../../utils/api";

export default function Timetable() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [timetables, setTimetables] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState("");
  const [timetableType, setTimetableType] = useState("");
  const [filterAudience, setFilterAudience] = useState("");





  /* ================= DELETE ================= */
  const confirmDelete = () => {
    setTimetables((prev) => prev.filter((t) => t.id !== deleteItem.id));
    console.log("Delete reason:", deleteReason); // backend audit later
    setDeleteItem(null);
    setDeleteReason("");
    setSuccessMsg("Timetable deleted successfully");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  /* ================= UPLOAD SUCCESS ================= */
  const handleUploadSuccess = () => {
  setShowUpload(false);
  fetchTimetables(); // 🔥 THIS IS IMPORTANT
  setSuccessMsg("Timetable uploaded successfully");
  setTimeout(() => setSuccessMsg(""), 2000);
 };


  useEffect(() => {
  fetchTimetables();
}, [department, section, semester, timetableType, filterAudience]);


const fetchTimetables = async () => {
  try {
    const params = new URLSearchParams();

    if (department) params.append("department", department);
    if (section) params.append("section", section);
    if (semester) params.append("semester", semester);
    if (timetableType) params.append("timetable_type", timetableType);
    if (filterAudience) params.append("audience", filterAudience);

    const response = await api.get(`/timetables?${params.toString()}`);
    setTimetables(response.data);

  } catch (err) {
    console.error("Error fetching timetables:", err);
  }
};
 

 // ================= UPLOAD TIMETABLE API =================
 const uploadTimetable = async (data) => {
  try {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("timetable_type", data.timetableType);
    formData.append("department", data.department);
    formData.append("audience", data.audience);
    formData.append("file", data.file);

    if (data.year) formData.append("year", data.year);
    if (data.section) formData.append("section", data.section);
    if (data.semester) formData.append("semester", data.semester);

    if (data.teacher_id) {
      formData.append("faculty_id", Number(data.teacher_id));
    }

    await api.post('/admin/timetable/upload', formData);

    console.log("Upload success");

  } catch (err) {
    console.error("Upload error:", err);
    throw err;
  }
 };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50 to-cyan-50 border">
        <h1 className="text-2xl font-semibold text-slate-800">
          Timetable Management
        </h1>
        <p className="text-sm text-slate-600">
          Upload and manage published timetables
        </p>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border grid grid-cols-2 md:grid-cols-5 gap-4">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="CSM">CSM</option>
          <option value="ECE">ECE</option>
          <option value="MECH">MECH</option>
          <option value="CIVIL">CIVIL</option>
        </select>


        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="">All Sections</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>



        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
          <option value="4">Semester 4</option>
          <option value="5">Semester 5</option>
          <option value="6">Semester 6</option>
          <option value="7">Semester 7</option>
          <option value="8">Semester 8</option>
        </select>


        <select
          value={timetableType}
          onChange={(e) => setTimetableType(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="">All Types</option>
          <option value="class">Class Timetable</option>
          <option value="mid">Mid Exam</option>
          <option value="semester">Semester Exam</option>
          <option value="event">Event Timetable</option>
        </select>

        <select
          value={filterAudience}
          onChange={(e) => setFilterAudience(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="">All Audience</option>
          <option value="students">Students</option>
          <option value="faculty">Faculty</option>
          <option value="all">All</option>
        </select>


      </div>

      {/* UPLOAD SECTION */}
      <div className="bg-white border rounded-2xl p-6 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Upload Timetable</h3>
          <p className="text-sm text-gray-500">
            Upload approved timetable documents (PDF / Excel)
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl"
        >
          Upload
        </button>
      </div>

      {/* LIST HEADING */}
      <h2 className="text-lg font-semibold text-slate-800">
        Published Timetables
      </h2>

      {/* LIST */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Audience</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Uploaded On</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {timetables.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {t.title}
                </td>

                <td className="px-4 py-3">
                  {t.department || "-"} {t.year || ""} {t.section || ""}
                  {t.semester ? ` (${t.semester})` : ""}
                </td>

                <td className="px-4 py-3">{t.audience}</td>

                <td className="px-4 py-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    Published
                  </span>
                </td>

                <td className="px-4 py-3">
                  {new Date(t.uploaded_at).toLocaleDateString()}
                </td>

                <td className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() =>
                      window.open(
                        `http://127.0.0.1:8000${t.file_url}`,
                        "_blank"
                      )
                    }
                    className="px-3 py-1 text-xs rounded-lg border"
                  >
                    View
                  </button>

                  <button
                    onClick={() => setDeleteItem(t)}
                    className="p-2 hover:bg-red-50 rounded-full"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
         </tbody>

        </table>
      </div>

      {/* DELETE CONFIRM */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-600">
              Delete Timetable
            </h3>

            <textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter reason for deletion (mandatory)"
              className="w-full border px-3 py-2 rounded-lg"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteItem(null);
                  setDeleteReason("");
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!deleteReason}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS ANIMATION */}
      {successMsg && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl text-center space-y-3 animate-bounce">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-green-600">✓</span>
            </div>
            <h3 className="font-semibold text-green-600">
              {successMsg}
            </h3>
          </div>
        </div>
      )}

    {showUpload && (
    <UploadModal
      onCancel={() => setShowUpload(false)}
      onProceed={(data) => {
        setUploadData(data);
        setShowUpload(false);
        setShowConfirm(true);
      }}
    />
  )}

  {showConfirm && (
    <ConfirmUploadModal
      data={uploadData}
      onBack={() => {
        setShowConfirm(false);
        setShowUpload(true);
      }}
      onUpload={async () => {
        setShowConfirm(false);
        setSuccessMsg("Uploading...");
        
        setTimeout(async () => {
          await uploadTimetable(uploadData);
          setSuccessMsg("Timetable uploaded successfully");
          fetchTimetables();

          setTimeout(() => setSuccessMsg(""), 2000);
        }, 2000);
      }}
    />
  )}
    </div>
  );
}

/* ================= UPLOAD MODAL ================= */

function UploadModal({ onCancel, onProceed }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState("");
  const [timetableType, setTimetableType] = useState("class");
  const [audience, setAudience] = useState("students");
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");

  useEffect(() => {
  if (audience === "faculty") {
    fetchTeachers();
  }
 }, [audience, department]);


 const fetchTeachers = async () => {
  try {
    const response = await api.get('/admin/teachers');
    const data = response.data;

    const filtered = department
      ? data.filter((t) => t.department === department)
      : data;

    setTeachers(filtered);

  } catch (err) {
    console.error("Error fetching teachers", err);
  }
 };

  const handleProceed = () => {
    if (!title) {
      alert("Title is required");
      return;
    }

    if (!file) {
      alert("Please upload a file");
      return;
    }

    if (!department) {
      alert("Please select department");
      return;
    }

    if ((audience === "students" || audience === "both") &&
        (!year || !section || !semester)) {
      alert("Please select year, section and semester");
      return;
    }

    if (audience === "faculty" && !selectedTeacher) {
      alert("Please select a teacher");
      return;
    }


     onProceed({
      title,
      file,
      department,
      year: audience !== "faculty" ? year : null,
      section: audience !== "faculty" ? section : null,
      semester: audience !== "faculty" ? semester : null,
      timetableType,
      audience,
      teacher_id: audience === "faculty" ? Number(selectedTeacher) : null
    });

  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">

        <h3 className="font-semibold text-lg">Upload Timetable</h3>

        {/* TITLE */}
        <input
          className="w-full border px-3 py-2 rounded-lg"
          placeholder="Timetable Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* DEPARTMENT */}
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="">Select Department</option>
          <option value="CSE">CSE</option>
          <option value="CSM">CSM</option>
          <option value="ECE">ECE</option>
          <option value="MECH">MECH</option>
        </select>

        {/* SHOW ONLY FOR STUDENTS OR BOTH */}
        {(audience === "students" || audience === "both") && (
          <>
            {/* YEAR */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>

            {/* SECTION */}
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">Select Section</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>

            {/* SEMESTER */}
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">Select Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          </>
        )}


        {/* TIMETABLE TYPE */}
        <select
          value={timetableType}
          onChange={(e) => setTimetableType(e.target.value)}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="class timetable">Class Timetable</option>
          <option value="mid exam">Mid Exam</option>
          <option value="semester exam">Semester Exam</option>
          <option value="event timetable">Event Timetable</option>
        </select>

        {/* 🔥 AUDIENCE FILTER (THIS IS WHAT YOU WANTED) */}
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="">Select Audience</option>
          <option value="students">Students</option>
          <option value="faculty">Teachers</option>
          <option value="both">Students & Teachers</option>
        </select>

        {audience === "faculty" && (
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="">Select Teacher</option>

          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} - {teacher.department}
            </option>
          ))}

        </select>
      )}


        {/* FILE */}
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleProceed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}



function ConfirmUploadModal({ data, onBack, onUpload }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">

        <h3 className="font-semibold text-lg">Confirm Upload</h3>

        <div className="text-sm space-y-2">
          <p><strong>Title:</strong> {data.title}</p>
          <p>
            <strong>File:</strong>{" "}
            {data.file ? data.file.name : "Link Provided"}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onBack} className="px-4 py-2 border rounded-lg">
            Back
          </button>
          <button
            onClick={onUpload}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

