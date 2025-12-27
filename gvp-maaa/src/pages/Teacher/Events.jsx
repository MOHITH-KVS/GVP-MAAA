import { useState, useMemo } from "react";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";

/* ================= SAMPLE DATA ================= */
const EVENTS = [
  {
    id: 1,
    title: "AI & ML Workshop",
    type: "Workshop",
    date: "22 Sep 2025",
    venue: "Seminar Hall",
    year: "3rd Year",
    section: "A",
    status: "Upcoming",
    students: [
      { name: "Ravi", roll: "21CS001", attended: true },
      { name: "Anusha", roll: "21CS014", attended: false },
      { name: "Kiran", roll: "21CS045", attended: true },
      { name: "Priya", roll: "21CS032", attended: false },
    ],
  },
];

/* ================= MAIN ================= */
export default function Events() {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");

  /* FILTERS */
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  /* ALERT COMPOSER */
  const [showAlert, setShowAlert] = useState(false);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertType, setAlertType] = useState("Reminder");
  const [alertMessage, setAlertMessage] = useState("");

  /* FILTER CONTEXT */
  const filterContext = `${year !== "All" ? year : "All Years"} · ${
    section !== "All" ? `Section ${section}` : "All Sections"
  } · ${type !== "All" ? type : "All Events"}`;

  /* APPLY FILTERS */
  const filteredEvents = useMemo(() => {
    return EVENTS.filter(
      (e) =>
        (year === "All" || e.year === year) &&
        (section === "All" || e.section === section) &&
        (type === "All" || e.type === type) &&
        (status === "All" || e.status === status)
    );
  }, [year, section, type, status]);

  const openAlertComposer = (target) => {
    setAlertTarget(`${target} (${filterContext})`);
    setAlertMessage("");
    setShowAlert(true);
  };

  const sendAlert = () => {
    alert(
      `Alert Sent\n\nTo: ${alertTarget}\nType: ${alertType}\n\n${alertMessage}`
    );
    setShowAlert(false);
  };

  /* ================= OVERALL ANALYTICS ================= */
  const overallStats = useMemo(() => {
    let present = 0;
    let absent = 0;

    filteredEvents.forEach((e) =>
      e.students.forEach((s) =>
        s.attended ? present++ : absent++
      )
    );

    return { present, absent };
  }, [filteredEvents]);

  return (
    <div className="space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="text-sm text-gray-500">
          Manage participants, attendance, and event alerts
        </p>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="glass rounded-2xl px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Filter label="Year" value={year} onChange={setYear}
            options={["All", "3rd Year", "4th Year"]} />
          <Filter label="Section" value={section} onChange={setSection}
            options={["All", "A", "B"]} />
          <Filter label="Event Type" value={type} onChange={setType}
            options={["All", "Workshop", "Hackathon"]} />
          <Filter label="Status" value={status} onChange={setStatus}
            options={["All", "Upcoming", "Completed"]} />
        </div>
      </div>

      {/* ================= OVERALL ANALYTICS ================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Overall Event Analytics ({filterContext})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartBox title="Overall Attendance Ratio (Donut Chart)" />
          <ChartBox title="Event Type Participation (Bar Chart)" />
          <ChartBox title="Attendance Trend Over Time (Line Chart)" />
        </div>

        <p className="text-sm text-gray-500">
          Present: {overallStats.present} · Absent: {overallStats.absent}
        </p>
      </div>

      {/* ================= EVENTS ================= */}
      {filteredEvents.map((e) => {
        const isOpen = openId === e.id;

        const searched = e.students.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.roll.toLowerCase().includes(search.toLowerCase())
        );

        const absent = searched.filter((s) => !s.attended);
        const present = searched.filter((s) => s.attended);
        const totalRegistered = e.students.length;

        return (
          <div key={e.id} className="glass rounded-2xl p-6 space-y-6">

            {/* ================= EVENT SUMMARY ================= */}
            <div className="flex flex-wrap justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold">{e.title}</h3>
                <p className="text-sm text-gray-500">
                  {e.type} · {e.date} · {e.venue}
                </p>
                <p className="text-sm text-gray-500">
                  {e.year} · Sec {e.section}
                </p>

                <div className="mt-2 flex gap-6 text-sm">
                  <span>
                    Total Registered: <strong>{totalRegistered}</strong>
                  </span>
                  <span className="text-green-600">
                    Present: <strong>{present.length}</strong>
                  </span>
                  <span className="text-red-600">
                    Absent: <strong>{absent.length}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    openAlertComposer("All Registered Students")
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white flex items-center gap-2"
                >
                  <CampaignIcon fontSize="small" />
                  Send Alert
                </button>

                <button
                  onClick={() => {
                    setOpenId(isOpen ? null : e.id);
                    setSearch("");
                  }}
                  className="px-4 py-2 rounded-xl border"
                >
                  {isOpen ? "Hide Students" : "View Students"}
                </button>
              </div>
            </div>

            {/* ================= EVENT ANALYTICS ================= */}
            {isOpen && <EventAnalytics />}

            {/* ================= STUDENT LIST ================= */}
            {isOpen && (
              <div className="border-t pt-6 space-y-6">

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or roll number"
                  className="w-full max-w-3xl px-5 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                {absent.length > 0 && (
                  <div>
                    <h4 className="text-red-600 font-semibold mb-3">
                      Absent Students ({absent.length})
                    </h4>

                    <div className="space-y-2">
                      {absent.map((s) => (
                        <StudentRow
                          key={s.roll}
                          student={s}
                          onAlert={() =>
                            openAlertComposer(`${s.name} (${s.roll})`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {present.length > 0 && (
                  <div>
                    <h4 className="text-green-600 font-semibold mb-3">
                      Present Students ({present.length})
                    </h4>

                    <div className="space-y-2">
                      {present.map((s) => (
                        <StudentRow
                          key={s.roll}
                          student={s}
                          onAlert={() =>
                            openAlertComposer(`${s.name} (${s.roll})`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ================= ALERT COMPOSER ================= */}
      {showAlert && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Send Alert</h3>
              <button onClick={() => setShowAlert(false)}>
                <CloseIcon />
              </button>
            </div>

            <div className="rounded-xl bg-indigo-50 p-3 text-sm">
              <p className="text-gray-600">Sending alert to:</p>
              <p className="font-semibold text-indigo-700">
                {alertTarget}
              </p>
            </div>

            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full p-2 rounded-xl border"
            >
              <option>Reminder</option>
              <option>Event Starting Soon</option>
              <option>Absent Notification</option>
              <option>Custom Message</option>
            </select>

            <textarea
              rows={4}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-3 rounded-xl border"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAlert(false)}
                className="px-4 py-2 rounded-xl border"
              >
                Cancel
              </button>
              <button
                onClick={sendAlert}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
              >
                Send Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function Filter({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] px-3 rounded-xl border"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function StudentRow({ student, onAlert }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-xl bg-white/70">
      <span>
        {student.name} ({student.roll})
      </span>

      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 rounded-full text-xs ${
            student.attended
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {student.attended ? "Present" : "Absent"}
        </span>

        <button
          onClick={onAlert}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-sm"
        >
          Alert
        </button>
      </div>
    </div>
  );
}

function ChartBox({ title }) {
  return (
    <div className="glass rounded-2xl p-6 text-center text-gray-400">
      {title}
      <br />
      (Analytics Agent will render here)
    </div>
  );
}

function EventAnalytics() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h4 className="font-semibold text-gray-700">
        Event Analytics
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartBox title="Attendance Ratio (Donut Chart)" />
        <ChartBox title="Participation Trend (Line Chart)" />
        <ChartBox title="Alert Impact / Engagement (Bar Chart)" />
      </div>
    </div>
  );
}
