import { useState, useEffect } from "react";

export default function Resources() {

  const [year, setYear] = useState(3);
  const [section, setSection] = useState("A");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("All");

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showUpload, setShowUpload] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const token = localStorage.getItem("access_token");

  /* ================= FETCH RESOURCES ================= */

  useEffect(() => {
    fetchResources();
  }, [year, section]);

  async function fetchResources() {
    try {

      setLoading(true);

      const res = await fetch(
        `http://localhost:8000/faculty/resources/${year}/${section}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setResources(data);
      } else {
        setResources([]);
      }

    } catch (err) {
      console.error("Error loading resources:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  /* ================= FILTER ================= */

  const filteredResources = resources.filter((r) => {

    const subjectMatch = !subject || r.subject === subject;
    const typeMatch = type === "All" || r.type === type;

    return subjectMatch && typeMatch;

  });

  /* ================= UI ================= */

  return (
    <div className="space-y-12">

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-sm text-gray-500">
          Upload and manage learning materials for students
        </p>
      </div>

      {/* FILTER BAR */}

      <div className="glass rounded-2xl px-6 py-4">
        <div className="flex flex-wrap items-end gap-6">

          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            options={[3, 4]}
          />

          <FilterSelect
            label="Section"
            value={section}
            onChange={setSection}
            options={["A", "B"]}
          />

          <FilterSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            options={["", "DBMS", "OS", "CN"]}
          />

          <FilterSelect
            label="Type"
            value={type}
            onChange={setType}
            options={["All", "Notes", "PPT", "Assignment", "Reference", "Link"]}
          />

          <div className="ml-auto">
            <button
              onClick={() => setShowUpload(true)}
              className="h-[44px] px-7 rounded-xl bg-indigo-600 text-white font-medium"
            >
              Upload Resource
            </button>
          </div>

        </div>
      </div>

      {/* UPLOAD PANEL */}

      {showUpload && (

        <div className="glass rounded-2xl p-6 space-y-5">

          <h3 className="text-lg font-semibold">Upload New Resource</h3>

          <div className="bg-indigo-50 rounded-xl p-3 text-sm">
            Uploading for <b>{year}</b> Year, Section <b>{section}</b>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Input label="Resource Title" />

            <Select
              label="Resource Type"
              options={["Notes", "PPT", "Assignment", "Reference", "Link"]}
            />

            <div className="md:col-span-2">

              <label className="text-xs text-gray-500">
                Resource Description
              </label>

              <textarea
                rows={4}
                className="w-full mt-1 p-3 rounded-xl border"
              />

            </div>

            <div className="md:col-span-2">

              <label className="text-xs text-gray-500">
                Upload File
              </label>

              <input
                type="file"
                className="w-full mt-1 p-2 rounded-xl border"
              />

            </div>

          </div>

          <div className="flex justify-end gap-3">

            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
            >
              Publish Resource
            </button>

          </div>

        </div>

      )}

      {/* CONFIRM POPUP */}

      {showConfirm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">

            <h3 className="text-lg font-semibold">
              Confirm Resource Publishing
            </h3>

            <div className="bg-gray-50 rounded-xl p-4 text-sm">

              <p><b>Year:</b> {year}</p>
              <p><b>Section:</b> {section}</p>

            </div>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-xl"
              >
                Edit
              </button>

              <button
                onClick={() => {
                  setShowConfirm(false);
                  setShowUpload(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl"
              >
                Publish
              </button>

            </div>

          </div>

        </div>

      )}

      {/* RESOURCE LIST */}

      <div className="glass rounded-2xl p-6 space-y-5">

        <h3 className="text-lg font-semibold">Uploaded Resources</h3>

        {loading && (
          <p className="text-gray-500">Loading resources...</p>
        )}

        {!loading && filteredResources.length === 0 && (
          <p className="text-gray-400">No resources uploaded yet</p>
        )}

        {!loading && filteredResources.map((r) => {

          const percent =
            r.total_students > 0
              ? Math.round((r.accessed / r.total_students) * 100)
              : 0;

          return (

            <div key={r.id} className="rounded-2xl bg-white/70 p-5 space-y-3">

              <div className="flex justify-between">

                <div>

                  <p className="font-semibold">{r.title}</p>

                  <p className="text-sm text-gray-500">
                    {r.type} · Uploaded {r.created_at}
                  </p>

                </div>

                <div className="flex gap-3">

                  <ActionButton label="View" />
                  <ActionButton label="Delete" danger />

                </div>

              </div>

              <div>

                <p className="text-sm text-indigo-600">
                  Accessed {r.accessed} / {r.total_students}
                </p>

                <div className="w-full h-2 bg-gray-200 rounded-full mt-2">

                  <div
                    className="h-2 bg-indigo-500 rounded-full"
                    style={{ width: `${percent}%` }}
                  />

                </div>

              </div>

            </div>

          );

        })}

      </div>

    </div>
  );
}

/* REUSABLE COMPONENTS */

function FilterSelect({ label, value, onChange, options }) {

  return (

    <div className="flex flex-col gap-1">

      <label className="text-xs text-gray-500">{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] w-40 px-3 rounded-xl border"
      >

        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}

      </select>

    </div>

  );

}

function Input({ label }) {

  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input className="w-full mt-1 p-2 rounded-xl border" />
    </div>
  );

}

function Select({ label, options }) {

  return (
    <div>

      <label className="text-xs text-gray-500">{label}</label>

      <select className="w-full mt-1 p-2 rounded-xl border">

        {options.map(o => (
          <option key={o}>{o}</option>
        ))}

      </select>

    </div>
  );

}

function ActionButton({ label, danger }) {

  return (

    <button
      className={`px-3 py-1.5 rounded-xl text-sm ${danger
          ? "bg-red-100 text-red-600"
          : "bg-indigo-100 text-indigo-700"
        }`}
    >
      {label}
    </button>

  );

}