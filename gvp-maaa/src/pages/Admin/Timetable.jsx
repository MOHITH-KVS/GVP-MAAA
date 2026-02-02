import { useState, useEffect } from "react";

export default function Timetable() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [timetables, setTimetables] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadData, setUploadData] = useState(null);



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
 }, []);



const fetchTimetables = async () => {
  try {
    const token = localStorage.getItem("access_token");

    const res = await fetch("http://127.0.0.1:8000/timetables", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setTimetables(data);
  } catch (err) {
    console.error("Error loading timetables", err);
  }
 };

 // ================= UPLOAD TIMETABLE API =================
 const uploadTimetable = async (data) => {
  try {
    const formData = new FormData();
    formData.append("title", data.title);

    if (data.file) {
      formData.append("file", data.file);
    } else {
      formData.append("link", data.link);
    }

    const token = localStorage.getItem("access_token");

    const res = await fetch(
      "http://127.0.0.1:8000/admin/timetables/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Upload failed");
    }

  } catch (err) {
    console.error("Upload error:", err);
    alert("Failed to upload timetable");
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
  const [link, setLink] = useState("");

  const handleProceed = () => {
    if (!title) {
      alert("Title is required");
      return;
    }

    if (!file && !link) {
      alert("Please upload a file or provide a link");
      return;
    }

    onProceed({
      title,
      file,
      link,
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

        {/* FILE */}
        <input
          type="file"
          accept=".pdf,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files[0])}
        />

        {/* LINK */}
        <input
          className="w-full border px-3 py-2 rounded-lg"
          placeholder="Or paste link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
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

