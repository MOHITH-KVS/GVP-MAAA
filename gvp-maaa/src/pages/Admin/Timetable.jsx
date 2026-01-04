import { useState } from "react";

export default function Timetable() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [timetables, setTimetables] = useState([
    {
      id: 1,
      type: "Class Timetable",
      department: "CSE",
      year: "3rd Year",
      section: "A",
      semester: "Sem 1",
      audience: "Students",
      date: "12 Jan 2026",
    },
    {
      id: 2,
      type: "Mid Exam Timetable",
      department: "CSE",
      year: "3rd Year",
      section: "A",
      semester: "Sem 1",
      audience: "Students & Faculty",
      date: "10 Jan 2026",
    },
  ]);

  /* ===== DELETE ===== */
  const confirmDelete = () => {
    setTimetables((prev) =>
      prev.filter((t) => t.id !== deleteItem.id)
    );
    setDeleteItem(null);
    setSuccessMsg("Timetable deleted successfully");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  /* ===== UPLOAD SUCCESS ===== */
  const handleUploadSuccess = () => {
    setShowUpload(false);
    setSuccessMsg("Timetable uploaded and published successfully");
    setTimeout(() => setSuccessMsg(""), 2000);
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
        <select className="border px-3 py-2 rounded-lg">
          <option>Department</option>
          <option>All</option>
          <option>CSE</option>
          <option>CSM</option>
          <option>ECE</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>Year</option>
          <option>All</option>
          <option>1st Year</option>
          <option>2nd Year</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>Section</option>
          <option>All</option>
          <option>A</option>
          <option>B</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>Semester</option>
          <option>All</option>
          <option>Sem 1</option>
          <option>Sem 2</option>
        </select>

        <select className="border px-3 py-2 rounded-lg">
          <option>Timetable Type</option>
          <option>Class Timetable</option>
          <option>Mid Exam Timetable</option>
          <option>Semester Exam Timetable</option>
          <option>Review Timetable</option>
          <option>Event Timetable</option>
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
                <td className="px-4 py-3 font-medium">{t.type}</td>
                <td className="px-4 py-3">
                  {t.department} {t.year} {t.section} ({t.semester})
                </td>
                <td className="px-4 py-3">{t.audience}</td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    Published
                  </span>
                </td>
                <td className="px-4 py-3">{t.date}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleteItem(t)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-full"
                    title="Delete timetable"
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
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this timetable?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
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

      {/* UPLOAD MODAL */}
      {showUpload && (
        <UploadModal
          onCancel={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

/* ================= UPLOAD MODAL ================= */

function UploadModal({ onCancel, onSuccess }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">Upload Timetable</h3>

        <select className="w-full border px-3 py-2 rounded-lg">
          <option>Class Timetable</option>
          <option>Mid Exam Timetable</option>
          <option>Semester Exam Timetable</option>
          <option>Review Timetable</option>
          <option>Event Timetable</option>
        </select>

        <select className="w-full border px-3 py-2 rounded-lg">
          <option>Audience: Students</option>
          <option>Audience: Teachers</option>
          <option>Audience: Both</option>
        </select>

        <input type="file" accept=".pdf,.xls,.xlsx" />

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={onSuccess}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Upload & Publish
          </button>
        </div>
      </div>
    </div>
  );
}
