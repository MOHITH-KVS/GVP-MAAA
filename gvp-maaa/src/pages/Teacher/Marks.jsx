import { useState, useMemo, useEffect, useRef } from "react";
import api from "../../utils/axios";
// import * as XLSX from 'xlsx';

const API = "http://localhost:8000";

export default function Marks() {


  const [year, setYear] = useState("3");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("Mid-1");

  const [search, setSearch] = useState("");

  // Toast state
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success | error

  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [filename, setFilename] = useState("");

  const [overwrite, setOverwrite] = useState(false);

  // SCALING & HISTORY STATES
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [uploadStep, setUploadStep] = useState(0); // 0=none, 1=Reading rows..., 2=Validating data..., 3=Uploading...

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Stats from backend
  const [classAvg, setClassAvg] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  // Dynamic assignment options
  const assignmentOptions = Array.from({ length: 5 }, (_, i) => `Assignment-${i+1}`);
  const examOptions = ["Total", "Mid-1", "Mid-2", "Semester", ...assignmentOptions];

  // Auto clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchSubjects = async () => {

  try {

    const res = await api.get("/faculty/my-subjects");

    console.log("Subjects from backend:", res.data);

    const data = Array.isArray(res.data) ? res.data : [];
    setSubjects(data);

    if (data.length > 0) {
      setSubject(data[0].subject_name);
    }

  } catch(err){
    console.error("Failed to load subjects",err);
  }

 };
  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);
  /* ================= FETCH STUDENTS ================= */

  useEffect(() => {
    if (subject) {
      fetchStudents();
    }
  }, [year, section, subject, exam]);

  const fetchStudents = async () => {
    try {
      // For flat subject structure
      const subjectObj = subjects.find(
        s => s.subject_name === subject
      );

      const res = await api.get("/faculty/marks", {
        params: {
          year,
          section,
          subject_id: subjectObj?.subject_id,
          exam
        }
      });

      // Map to expected structure with marks field based on selected exam
      const data = res.data;
      const studentsData = data.students;

      setStudents(studentsData);
      setClassAvg(data.stats.average);
      setHighestScore(data.stats.highest);
      setFailCount(data.stats.fail_count);
      setTotalStudents(data.stats.total_students);
    } catch (err) {
      console.error("Failed to load students/marks");
      setStudents([]);
    }
  };

  /* ================= DOWNLOAD TEMPLATE ================= */

  const downloadTemplate = async () => {
    if (!year || !section || !subject) {
      setMessage("Please select year, section and subject");
      setMessageType("error");
      return;
    }

    const subjectObj = subjects.find(
      s => s.subject_name === subject
    );

    if (!subjectObj?.subject_id) {
      setMessage("Invalid subject selected");
      setMessageType("error");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/faculty/marks/template?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setMessage(err.detail || err.error || "Download failed");
        setMessageType("error");
        return;
      }

      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "marks_template.xlsx";
      link.click();

    } catch (err) {
      console.error("Download error:", err);
      setMessage("Download failed: " + err.message);
      setMessageType("error");
    }
  };

  /* ================= SORTING ================= */

  const sortedStudents = useMemo(() => {

    return [...students]
      .filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const valA = a.marks ?? -1;
        const valB = b.marks ?? -1;
        return valB - valA;
      });

  }, [students, search]);

  /* ================= FILE HANDLING ================= */

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setFile(null);
      setFilename("");
      return;
    }

    setFile(selectedFile);
    setFilename(selectedFile.name);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("overwrite", overwrite.toString());

      const subjectObj = subjects.find(s => s.subject_name === subject);
      if (!subjectObj?.subject_id) {
        setMessage("Invalid subject selected");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `http://localhost:8000/faculty/marks/preview?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}&exam=${exam}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: formData
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Preview failed");
        setMessageType("error");
        setPreviewData([]);
        setLoading(false);
        return;
      }

      // CORRECTED ERROR HANDLING
      if (data.error) {
        setMessage(data.error);
        setMessageType("error");
        setLoading(false);
        return;
      }

      if (!data.preview || data.preview.length === 0) {
        setMessage("No valid data found for selected exam column");
        setMessageType("error");
        setLoading(false);
        return;
      }

      setPreviewData(data.preview);
      setShowPreview(true);
      setLoading(false);

    } catch (err) {
      console.error("Preview error:", err);
      setMessage("Failed to process Excel file");
      setMessageType("error");
      setPreviewData([]);
      setLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;
    setLoading(true);

    // Check if overwrite is OFF and some data already exists
    if (!overwrite && previewData.some(student => student.status === "exists")) {
      setMessage("Some marks already exist. Enable overwrite to replace.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) {
      setMessage("Invalid subject selected");
      setMessageType("error");
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("overwrite", overwrite.toString());
    
    // 3-step animation flow BEFORE sending
    setUploadStep(1); // Reading
    await new Promise(r => setTimeout(r, 500));
    setUploadStep(2); // Validating
    await new Promise(r => setTimeout(r, 500));
    setUploadStep(3); // Uploading
    await new Promise(r => setTimeout(r, 400));
    
    try {
      const res = await fetch(
        `http://localhost:8000/faculty/marks/upload?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}&exam=${exam}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: formData
        }
      );
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        setMessageType("error");
        setLoading(false);
        setUploadStep(0);
        return;
      }
      setMessage("Upload Successful ✅");
      setMessageType("success");
      setShowPreview(false);
      setFile(null);
      setFilename("");
      setPreviewData([]);
      setUploadStep(0);
      await fetchStudents(); // refresh UI
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("Upload error");
      setMessageType("error");
      setUploadStep(0);
    } finally {
      setLoading(false); // ALWAYS RESET
    }
  };

  /* ================= SCALING ENGINE & HISTORY ================= */

  const handleScaleAction = async (actionType) => {
    if (!year || !section || !subject) return;
    
    if (actionType === "undo") {
      const confirmed = window.confirm("Are you sure you want to undo last scaling?");
      if (!confirmed) return;
    }

    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) return;
    
    setLoading(true);
    try {
      const res = await api.post(`/faculty/${actionType}-scaling`, {
        year: parseInt(year),
        section,
        subject_id: subjectObj.subject_id
      });
      setMessage(res.data.message || `${actionType} successful!`);
      setMessageType("success");
      await fetchStudents();
      if (actionType === "undo") fetchHistoryLogs(); // refresh logs if undone
    } catch (err) {
      setMessage(err.response?.data?.error || `Failed to ${actionType} scaling`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async () => {
    if (!year || !section || !subject) {
        setMessage("Select Year, Section, Subject to view history.");
        setMessageType("error");
        return;
    }
    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) return;

    try {
      const res = await api.get("/faculty/scaling-logs", {
        params: { year, section, subject_id: subjectObj.subject_id }
      });
      setHistoryLogs(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      setMessage("Failed to load scaling history");
      setMessageType("error");
    }
  };

  /* ================= EXCEL UPLOAD ================= */

  // Handled by handleConfirmUpload function above

  return (

    <div className="space-y-10">

      {/* TOAST NOTIFICATION */}
      {message && (
        <div className={`toast ${messageType}`}>
          {message}
        </div>
      )}

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">Marks & Performance</h1>
        <p className="text-sm text-gray-500">
          Evaluate performance, identify toppers and students at risk
        </p>
      </div>

      {/* FILTER BAR */}

      <div className="glass rounded-2xl px-6 py-4">

        <div className="flex flex-wrap items-center gap-6">

          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={["1","2","3","4"]}
          />

          <FilterSelect
            label="Section"
            value={section}
            onChange={setSection}
            options={["A","B","C","D"]}
          />

          <FilterSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={subjects.map((s) => s.subject_name).filter(Boolean)}
          />

          <FilterSelect
            label="Exam"
            value={exam}
            onChange={setExam}
            options={examOptions}
          />

          <div className="flex flex-wrap items-center gap-4 w-full mt-8 pt-4 border-t">

            <button
              onClick={downloadTemplate}
              className="h-[44px] px-6 rounded-xl border bg-gray-100 hover:bg-gray-200 whitespace-nowrap"
            >
              Download Template
            </button>

            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="h-[44px] px-6 rounded-xl bg-indigo-600 text-white flex items-center gap-2 whitespace-nowrap"
                  disabled={loading || !year || !section || !subject}
                >
                  Upload Excel
                </button>
                {filename && (
                  <span className="text-sm text-gray-600 truncate max-w-[150px]">
                    {filename}
                  </span>
                )}
              </div>
              <label
                className="flex items-center gap-2 text-sm"
                title="If enabled, existing marks will be replaced"
              >
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={() => setOverwrite(!overwrite)}
                  className="rounded"
                />
                Overwrite existing marks
              </label>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
            />
            
            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
               <button 
                  onClick={() => handleScaleAction("apply")} 
                  className="h-[44px] px-6 rounded-xl bg-green-600 text-white hover:bg-green-700 whitespace-nowrap disabled:opacity-50"
                  disabled={loading}
               >
                 Apply Scaling
               </button>
               <button 
                  onClick={() => handleScaleAction("recalculate")} 
                  className="h-[44px] px-6 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600 whitespace-nowrap disabled:opacity-50"
                  disabled={loading}
               >
                 Recalculate Scaling
               </button>
               <button 
                  onClick={fetchHistoryLogs} 
                  className="h-[44px] px-6 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
                  disabled={loading}
               >
                 View Scaling History
               </button>
            </div>

          </div>

        </div>

      </div>

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Scaling Action History</h3>
            
            {historyLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-6">No historical scaling actions found for this subset.</div>
            ) : (
                <div className="space-y-3 mb-6">
                   {historyLogs.map((log, idx) => (
                      <div key={idx} className="p-4 rounded-xl border flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="font-semibold capitalize">{log.action_type} Scaling</span>
                            <span className="text-sm text-gray-500">By Faculty: {log.faculty_name}</span>
                         </div>
                         <span className="text-sm text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                         </span>
                      </div>
                   ))}
                </div>
            )}
            
            <div className="flex justify-between gap-3 mt-6 border-t pt-4">
              <button
                onClick={() => handleScaleAction("undo")}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50 font-medium"
                disabled={loading || historyLogs.length === 0}
              >
                Undo Last Scaling
              </button>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl"
                disabled={loading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}

      {showPreview && Array.isArray(previewData) && previewData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Preview Excel Data - {exam}</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Total students parsed: <strong>{previewData.length}</strong>
              </p>
            </div>

            <div className="mb-6">
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Register Number</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Marks</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((student, index) => {
                      let rowClass = "";
                      let statusText = "";
                      if (student.status === "invalid") {
                        rowClass = "bg-red-50";
                        statusText = "Invalid";
                      } else if (student.status === "exists") {
                        rowClass = "bg-yellow-50";
                        statusText = "Already Filled";
                      } else if (student.status === "new") {
                        rowClass = "bg-green-50";
                        statusText = "New";
                      }
                      return (
                        <tr key={index} className={`border-t ${rowClass}`}>
                          <td className="px-4 py-2 text-sm">{student.register_number || ""}</td>
                          <td className="px-4 py-2 text-sm">{student.name || ""}</td>
                          <td className="px-4 py-2 text-sm font-medium">{student.marks !== undefined ? student.marks : ""}</td>
                          <td className="px-4 py-2 text-sm">{statusText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData([]);
                  setFile(null);
                }}
                className="px-4 py-2 border rounded-xl"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-6 py-2 bg-green-600 text-white rounded-xl flex items-center gap-2 min-w-[170px] justify-center"
                disabled={loading}
              >
                {uploadStep === 1 ? "Reading rows..." : uploadStep === 2 ? "Validating data..." : uploadStep === 3 ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Kpi title="Class Average" value={`${classAvg}%`} />

        <Kpi title="Highest Score" value={highestScore} />

        <Kpi title="Total Students" value={totalStudents} />

        <Kpi title="Fail Count" value={failCount} danger />

      </div>

      {/* STUDENT LIST */}

      <div className="glass rounded-2xl p-6 space-y-4">

        <div className="flex items-center gap-4">

          <h3 className="text-lg font-semibold">
            Student Marks ({exam})
          </h3>

          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search student"
            className="ml-auto w-72 px-4 py-2 border rounded-xl"
          />

        </div>

        <div className="space-y-2">

          {sortedStudents.length === 0 ? (
            <div className="text-center text-gray-400 py-6">No students found for this class.</div>
          ) : (
            sortedStudents.map((s) => (
              <div
                key={s.roll_no}
                className="flex items-center p-3 bg-white rounded-xl"
              >
                <div className="flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.roll_no}</p>
                </div>
                
                {s.extra_data && Object.keys(s.extra_data).map(k => (
                    <div key={k} className="flex flex-col items-end mr-6 w-24">
                      <span className="text-xs text-gray-500 truncate w-full text-right">{k}</span>
                      <span className="font-medium">{s.extra_data[k] === null || s.extra_data[k] === undefined ? "-" : s.extra_data[k]}</span>
                    </div>
                ))}
                
                <div className="flex flex-col items-end w-24">
                  <span className="text-xs text-gray-500">{exam === "Total" ? "Total Score" : "Marks"}</span>
                  <span className="font-medium text-lg">
                    {s.marks === null || s.marks === undefined ? "-" : s.marks}
                  </span>
                </div>
              </div>
            ))
          )}

        </div>

      </div>

    </div>

  );

}

/* COMPONENTS */

function FilterSelect({label,value,onChange,options}){

  return(

    <div className="flex flex-col gap-1">

      <label className="text-xs font-medium text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border"
      >

        {options.map(o=>(
          <option key={o}>{o}</option>
        ))}

      </select>

    </div>

  );

}

function Kpi({title,value,danger}){

  return(

    <div className={`glass rounded-2xl p-4 ${danger?"text-red-600":""}`}>

      <p className="text-xs text-gray-500">{title}</p>

      <p className="text-2xl font-semibold mt-1">
        {value}
      </p>

    </div>

  );

}