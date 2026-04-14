import { useState, useMemo, useEffect, useRef } from "react";
import api from "../../utils/axios";
import * as XLSX from "xlsx";
import SkeletonBox from "../../components/skeletons/SkeletonBox";
import SkeletonCard from "../../components/skeletons/SkeletonCard";
import SkeletonTable from "../../components/skeletons/SkeletonTable";

export default function Marks() {
  const [year, setYear] = useState("3");
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("Mid-1");
  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [filename, setFilename] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  // SCALING & HISTORY STATES
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);

  // SCALING PROGRESS MODALS
  const [showScalingConfirm, setShowScalingConfirm] = useState(false);
  const [showScalingProgress, setShowScalingProgress] = useState(false);
  const [scalingStep, setScalingStep] = useState(0); 
  const [showScalingSuccess, setShowScalingSuccess] = useState(false);
  const [scaledFileUrl, setScaledFileUrl] = useState(null);
  const [scaledFileName, setScaledFileName] = useState("");

  // UPLOAD PREVIEW & HASH DETECTION MODALS
  const [previewData, setPreviewData] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [uploadStep, setUploadStep] = useState(0); 
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classAvg, setClassAvg] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  const assignmentOptions = Array.from({ length: 5 }, (_, i) => `Assignment-${i+1}`);
  const examOptions = ["Total", "Mid-1", "Mid-2", "Semester", ...assignmentOptions];

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
      const data = Array.isArray(res.data) ? res.data : [];
      setSubjects(data);
      if (data.length > 0) {
        setSubject(data[0].subject_name);
      } else {
        setPageLoading(false);
      }
    } catch(err){
      console.error("Failed to load subjects",err);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (subject) {
      fetchStudents();
    }
  }, [year, section, subject, exam]);

  const fetchStudents = async () => {
    try {
      const subjectObj = subjects.find(s => s.subject_name === subject);
      const res = await api.get("/faculty/marks", {
        params: { year, section, subject_id: subjectObj?.subject_id, exam }
      });
      const data = res.data;
      setStudents(data.students);
      setClassAvg(data.stats.average);
      setHighestScore(data.stats.highest);
      setFailCount(data.stats.fail_count);
      setTotalStudents(data.stats.total_students);
    } catch (err) {
      setStudents([]);
    } finally {
      setPageLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-8">
        <div>
          <SkeletonBox className="h-9 w-72" />
          <SkeletonBox className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <SkeletonTable rows={6} />
        </div>
      </div>
    );
  }

  const downloadTemplate = async () => {
    if (!year || !section || !subject) {
      setMessage("Please select year, section and subject");
      setMessageType("error");
      return;
    }
    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) return;

    try {
      const res = await api.get(
        `/faculty/marks/template?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "marks_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage("Template downloaded successfully");
      setMessageType("success");
    } catch (error) {
      console.error("Download failed", error);
      setMessage("Download failed");
      setMessageType("error");
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students]
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll_no.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const valA = a.marks ?? -1;
        const valB = b.marks ?? -1;
        return valB - valA;
      });
  }, [students, search]);

  /* ====================== UPLOAD EXCEL FILE PARSING ====================== */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
        setFile(null);
        setFilename("");
        return;
    }

    if (!year || !section || !subject) {
        setMessage("Please select year, section and subject before uploading.");
        setMessageType("error");
        e.target.value = "";
        return;
    }

    setFile(selectedFile);
    setFilename(selectedFile.name);

    const subjectObj = subjects.find(s => s.subject_name === subject);

    // Parse the file via FileReader and xlsx
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const regNumbers = json.map(row => row["Register Number"] || row["register_number"] || row["Roll No"] || row["Register No"]).filter(Boolean);
        if (regNumbers.length === 0) {
           setMessage("No register numbers found in the file.");
           setMessageType("error");
           return;
        }

        const valRes = await api.post("/faculty/marks/validate-students", {
            register_numbers: regNumbers,
            year: parseInt(year),
            section: section
        });

        if (!valRes.data.success || !valRes.data.valid) {
            setMessage(valRes.data.message || valRes.data.error || "Student data mismatch with selected Year/Section");
            setMessageType("error");
            return;
        }

        const anRes = await api.post("/faculty/marks/analyze-upload", {
            register_numbers: regNumbers,
            subject_id: subjectObj.subject_id,
            exam: exam
        });

        if (!anRes.data.success) {
            setMessage(anRes.data.error || "Failed to analyze upload");
            setMessageType("error");
            return;
        }

        const statusMap = {};
        anRes.data.data.forEach(item => {
            statusMap[item.register_number] = item.status;
        });

        const enrichedData = json.map(row => {
            const reg = row["Register Number"] || row["register_number"] || row["Roll No"] || row["Register No"];
            const isNew = statusMap[reg] !== "existing";
            return {
                ...row,
                "Status": isNew ? "🟢 New" : "🔴 Exists"
            };
        });

        setPreviewData(enrichedData);
        setShowPreviewModal(true);
      } catch (err) {
        console.error(err);
        setMessage("Error parsing or validating file");
        setMessageType("error");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
    
    // Clear input so same file can be triggered again
    e.target.value = ""; 
  };

  /* ====================== PROCEED UPLOAD LOGIC ====================== */
  const proceedUpload = async (overrideFlag = overwrite) => {
    setShowPreviewModal(false);
    setShowDuplicateWarning(false);
    setShowUploadProgress(true);
    
    setUploadStep(1); // Reading...
    await new Promise(r => setTimeout(r, 400));
    setUploadStep(2); // Validating...
    await new Promise(r => setTimeout(r, 500));
    setUploadStep(3); // Uploading...

    const subjectObj = subjects.find(s => s.subject_name === subject);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("overwrite", overrideFlag.toString());

      const res = await fetch(
        `http://localhost:8000/faculty/marks/upload?year=${year}&section=${section}&subject_id=${subjectObj.subject_id}&exam=${exam}`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
          body: formData
        }
      );

      const data = await res.json();
      
      // Handle the strict duplicate rule
      if (data.duplicate && !overrideFlag) {
         setShowUploadProgress(false);
         setShowDuplicateWarning(true);
         return;
      }
      
      if (!res.ok || !data.success) {
        setMessage(data.error || "Upload failed");
        setMessageType("error");
        setShowUploadProgress(false);
      } else {
        setMessage(data.message || "Upload Successful ✅");
        setMessageType("success");
        setShowUploadProgress(false);
        setShowUploadSuccess(true);
        // Auto close after 1.5s
        setTimeout(() => setShowUploadSuccess(false), 1500);
        await fetchStudents(); 
      }
    } catch (err) {
      setMessage("Upload error");
      setMessageType("error");
      setShowUploadProgress(false);
    }
  };

  /* ====================== SCALING LOGIC ====================== */
  const handleScaleClick = () => {
    if (!file) {
      setMessage("Please upload an Excel file first");
      setMessageType("error");
      return;
    }
    setShowScalingConfirm(true);
  };

  const processScaling = async () => {
    setShowScalingConfirm(false);
    setShowScalingProgress(true);
    setScalingStep(1); 
    await new Promise(r => setTimeout(r, 500));
    setScalingStep(2); 
    await new Promise(r => setTimeout(r, 600));
    setScalingStep(3); 

    const subjectObj = subjects.find(s => s.subject_name === subject);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", year);
      formData.append("section", section);
      formData.append("subject_id", subjectObj.subject_id);

      const res = await fetch(`http://localhost:8000/faculty/apply-scaling`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to process scaling");
      }

      setScalingStep(4);
      await new Promise(r => setTimeout(r, 500));

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const disposition = res.headers.get("content-disposition");
      let dlFilename = `scaled_marks_${Date.now()}.xlsx`;
      if (disposition && disposition.includes("filename=")) {
         dlFilename = disposition.split("filename=")[1].replace(/"/g, "");
      }

      setScaledFileUrl(url);
      setScaledFileName(dlFilename);
      
      setShowScalingProgress(false);
      setShowScalingSuccess(true);
    } catch (err) {
      setMessage(err.message || "Error processing file");
      setMessageType("error");
      setShowScalingProgress(false);
    }
  };

  const handleScaleAction = async (actionType) => {
    if (actionType === "undo") {
      const confirmed = window.confirm("Are you sure you want to undo last scaling?");
      if (!confirmed) return;
    }

    const subjectObj = subjects.find(s => s.subject_name === subject);
    if (!subjectObj?.subject_id) return;
    
    setLoading(true);
    try {
      const res = await api.post(`/faculty/undo-scaling`, {
        year: parseInt(year),
        section,
        subject_id: subjectObj.subject_id
      });
      setMessage(res.data.message || `Undo successful!`);
      setMessageType("success");
      await fetchStudents();
      fetchHistoryLogs(); 
    } catch (err) {
      setMessage(`Failed to undo scaling`);
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
      if (!res.data.success) {
          throw new Error(res.data.error || "Failed to load");
      }
      setHistoryLogs(res.data.logs);
      setShowHistoryDrawer(true);
    } catch (err) {
      setMessage("Failed to load scaling history");
      setMessageType("error");
    }
  };

  return (
    <div className="space-y-10">
      {message && (
        <div className={`toast ${messageType}`}>
          {message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">Marks & Performance</h1>
        <p className="text-sm text-gray-500">
          Evaluate performance, identify toppers and students at risk
        </p>
      </div>

      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <FilterSelect label="Year" value={year} onChange={setYear} options={["1","2","3","4"]} />
          <FilterSelect label="Section" value={section} onChange={setSection} options={["A","B","C","D"]} />
          <FilterSelect label="Subject" value={subject} onChange={setSubject} options={subjects.map((s) => s.subject_name).filter(Boolean)} />
          <FilterSelect label="Exam" value={exam} onChange={setExam} options={examOptions} />

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
                  className="h-[44px] px-6 rounded-xl bg-indigo-600 text-white flex items-center gap-2 whitespace-nowrap shadow-md shadow-indigo-100 font-medium"
                  disabled={!year || !section || !subject}
                >
                  Upload Excel
                </button>
                {filename && (
                  <span className="text-sm text-gray-600 truncate max-w-[150px]">
                    {filename}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <input type="checkbox" checked={overwrite} onChange={() => setOverwrite(!overwrite)} className="rounded" />
                Overwrite existing marks
              </label>
            </div>

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
                  onClick={handleScaleClick} 
                  className="h-[44px] px-6 rounded-xl bg-green-600 text-white hover:bg-green-700 whitespace-nowrap font-medium shadow-md shadow-green-100 transition-colors disabled:opacity-50"
                  disabled={loading}
               >
                 Apply Scaling (Generate Excel)
               </button>
               <button 
                  onClick={fetchHistoryLogs} 
                  className="h-[44px] px-6 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap font-medium disabled:opacity-50 transition-colors"
                  disabled={loading}
               >
                 View History
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================= EXCEL UPLOAD MODALS ======================= */}
      
      {/* 1. PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 transition-opacity">
          <div className="bg-white rounded-[1.25rem] p-6 w-full max-w-[600px] shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-3">Preview Excel Data</h2>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-inner custom-scrollbar">
               {previewData.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No recognizable row data found in the spreadsheet.</div>
               ) : (
                  <div className="w-full overflow-x-auto min-w-[500px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {Object.keys(previewData[0]).map((col, i) => (
                            <th key={i} className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="p-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                                {val !== undefined && val !== null && val !== "" ? String(val) : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="px-5 py-2.5 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => proceedUpload(overwrite)} 
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors"
              >
                Proceed Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DUPLICATE WARNING MODAL */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 transition-opacity">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center transform scale-100">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-5 text-4xl shadow-inner">⚠️</div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Duplicate File</h3>
            <p className="text-gray-500 text-center mb-8 font-medium">This exact file was already successfully uploaded for this module. Are you sure you want to proceed?</p>
            <div className="flex gap-4 w-full justify-between">
              <button onClick={() => setShowDuplicateWarning(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => proceedUpload(true)} className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md transition-colors">Upload Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. UPLOAD PROGRESS MICRO INTERACTION */}
      {showUploadProgress && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
               <span className="text-4xl animate-pulse">
                 {uploadStep === 1 ? '📄' : uploadStep === 2 ? '🔍' : '☁️'}
               </span>
               <div className="absolute inset-0 border-[5px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-5 text-center">
              {uploadStep === 1 ? "Reading Excel..." : 
               uploadStep === 2 ? "Validating data..." : 
               "Uploading data safely..."}
            </h3>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner flex">
               <div 
                 className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                 style={{ width: `${uploadStep * 33.33}%` }}
               ></div>
            </div>
          </div>
        </div>
      )}

      {/* 4. UPLOAD SUCCESS UI */}
      {showUploadSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-[320px] w-full shadow-2xl flex flex-col items-center transform transition-transform animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5 animate-bounce shadow-inner">
              <span className="text-5xl">✔</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Success</h3>
            <p className="text-gray-500 font-medium mb-6">Upload Successful</p>
            <button onClick={() => setShowUploadSuccess(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 uppercase tracking-widest text-sm w-full transition-colors">Close</button>
          </div>
        </div>
      )}


      {/* ======================= SCALING & HISTORY MODALS ======================= */}

      {/* RIGHT SIDE DRAWER FOR HISTORY */}
      {showHistoryDrawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setShowHistoryDrawer(false)}></div>
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Scaling History</h3>
              <button onClick={() => setShowHistoryDrawer(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              {historyLogs.length === 0 ? (
                  <div className="text-gray-500 text-center py-10">No scaling history yet</div>
              ) : (
                  <div className="space-y-4">
                     {historyLogs.map((log, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-300 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                             <span className="font-semibold text-gray-800 capitalize">{log.action_type.replace('_', ' ')}</span>
                             <span className="text-xs text-gray-400">
                                {new Date(log.timestamp).toLocaleString([], {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}
                             </span>
                           </div>
                           <p className="text-sm text-gray-600 mb-2">By Faculty: {log.faculty_name}</p>
                           {log.file_name && (
                             <p className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded truncate max-w-full" title={log.file_name}>
                               📄 {log.file_name}
                             </p>
                           )}
                        </div>
                     ))}
                  </div>
              )}
            </div>
            <div className="p-4 border-t bg-white">
              <button
                onClick={() => handleScaleAction("undo")}
                className="w-full py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors disabled:opacity-50"
                disabled={loading || historyLogs.length === 0}
              >
                Undo Last Action
              </button>
            </div>
          </div>
        </>
      )}

      {/* CONFIRMATION MODAL */}
      {showScalingConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Apply Scaling?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This will scale marks and generate a downloadable file. Original data will not be modified.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowScalingConfirm(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={processScaling} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors">Apply Scaling</button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS MODAL */}
      {showScalingProgress && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
               <span className="text-5xl animate-pulse">
                 {scalingStep === 1 ? '📄' : scalingStep === 2 ? '🔍' : scalingStep === 3 ? '⚙️' : '📊'}
               </span>
               <div className="absolute inset-0 border-[5px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              {scalingStep === 1 ? "Reading Excel file..." : 
               scalingStep === 2 ? "Validating data..." : 
               scalingStep === 3 ? "Applying scaling..." : "Finalizing file..."}
            </h3>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mt-6">
               <div 
                 className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                 style={{ width: `${scalingStep === 1 ? 20 : scalingStep === 2 ? 40 : scalingStep === 3 ? 70 : 100}%` }}
               ></div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showScalingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5 animate-bounce shadow-inner">
              <span className="text-4xl">✔</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Scaling Completed Successfully ✅</h3>
            <p className="text-gray-500 text-center mb-8 font-medium">Your file is ready to download</p>
            
            <div className="flex flex-col gap-3 w-full">
              <a 
                href={scaledFileUrl} 
                download={scaledFileName}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md flex justify-center items-center transition-colors shadow-indigo-100"
              >
                Download Scaled File
              </a>
              <button 
                onClick={() => setShowScalingSuccess(false)} 
                className="w-full py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors bg-gray-50 border border-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= METRICS AND TABLE GRIDS ======================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Kpi title="Class Average" value={`${classAvg}%`} />
        <Kpi title="Highest Score" value={highestScore} />
        <Kpi title="Total Students" value={totalStudents} />
        <Kpi title="Fail Count" value={failCount} danger />
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Student Marks ({exam})</h3>
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
                  <span className="text-xs text-gray-500">{exam === "Total" ? "Total Score" : exam}</span>
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

function FilterSelect({label,value,onChange,options}){
  return(
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold mt-1 text-gray-800">{value}</p>
    </div>
  );
}