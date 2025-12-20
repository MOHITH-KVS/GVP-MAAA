import { useState } from "react";

/* ===== DATA (SAME AS BEFORE) ===== */
const LUNCH = { time: "12:50 - 01:40" };

const TIMETABLE = {
  Monday: [
    { time: "09:00 - 09:50", subject: "DBMS", type: "theory" },
    { time: "10:00 - 10:50", subject: "OS", type: "theory" },
    { time: "11:00 - 11:50", subject: "CN", type: "theory" },
    { lunch: true },
    { time: "01:40 - 02:30", subject: "FREE", type: "free" },
    { time: "02:40 - 04:40", subject: "DBMS LAB", type: "lab" },
  ],
  Tuesday: [
    { time: "09:00 - 09:50", subject: "OS", type: "theory" },
    { time: "10:00 - 10:50", subject: "DBMS", type: "theory" },
    { time: "11:00 - 11:50", subject: "FREE", type: "free" },
    { lunch: true },
    { time: "01:40 - 02:30", subject: "CN", type: "theory" },
  ],
  Wednesday: [
    { time: "09:00 - 09:50", subject: "CN", type: "theory" },
    { time: "10:00 - 12:40", subject: "CN LAB", type: "lab" },
    { lunch: true },
    { time: "01:40 - 02:30", subject: "FREE", type: "free" },
  ],
  Thursday: [
    { time: "09:00 - 09:50", subject: "DBMS", type: "theory" },
    { time: "10:00 - 11:50", subject: "OS LAB", type: "lab" },
    { lunch: true },
    { time: "01:40 - 02:30", subject: "CN", type: "theory" },
  ],
  Friday: [
    { time: "09:00 - 09:50", subject: "OS", type: "theory" },
    { time: "10:00 - 11:50", subject: "DBMS", type: "theory" },
    { lunch: true },
    { time: "01:40 - 03:30", subject: "FREE", type: "free" },
  ],
};

/* ===== COLORS ===== */
const COLORS = {
  theory: "bg-blue-50 border-blue-200",
  lab: "bg-green-50 border-green-200",
  free: "bg-gray-50 border-gray-200",
};

export default function Timetable() {
  const [day, setDay] = useState("All");
  const [openDay, setOpenDay] = useState("Monday");

  return (
    <div className="space-y-12">

      {/* ================= TIMETABLE SECTION ================= */}
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">📅 Timetable</h1>

        <div className="flex gap-3 overflow-x-auto">
          {["All", ...Object.keys(TIMETABLE)].map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium
                ${day === d ? "bg-indigo-600 text-white" : "bg-white/70 hover:bg-white"}`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* ALL VIEW */}
        {day === "All" && (
          <div className="space-y-4">
            {Object.keys(TIMETABLE).map((d) => (
              <div key={d} className="border rounded-2xl bg-white/70">
                <button
                  onClick={() => setOpenDay(openDay === d ? "" : d)}
                  className="w-full flex justify-between px-5 py-4 font-semibold"
                >
                  {d}
                  <span>{openDay === d ? "−" : "+"}</span>
                </button>

                {openDay === d && (
                  <div className="px-5 pb-5 space-y-3">
                    {TIMETABLE[d].map((p, i) =>
                      p.lunch ? (
                        <LunchBreak key={i} />
                      ) : (
                        <PeriodCard key={i} p={p} />
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SINGLE DAY VIEW */}
        {day !== "All" && (
          <div className="space-y-3">
            {TIMETABLE[day].map((p, i) =>
              p.lunch ? <LunchBreak key={i} /> : <PeriodCard key={i} p={p} />
            )}
          </div>
        )}
      </div>

      {/* ================= ANALYTICS PLACEHOLDERS ================= */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">📊 Timetable Analytics</h2>
          <p className="text-gray-500">
            Insights will appear here once data is analyzed
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartPlaceholder title="Weekly Workload Distribution" />
          <ChartPlaceholder title="Theory vs Lab vs Free Time" />
          <ChartPlaceholder title="Free Period Analysis" />
          <ChartPlaceholder title="Subject Frequency Overview" />

        </div>

        {/* FULL WIDTH CHART */}
        <ChartPlaceholder
          title="Before vs After Lunch Academic Load"
          full
        />
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function PeriodCard({ p }) {
  return (
    <div
      className={`rounded-xl border p-4 transition hover:scale-[1.01]
        ${COLORS[p.type]}`}
    >
      <p className="text-sm text-gray-500">{p.time}</p>
      <h3 className="font-semibold">{p.subject}</h3>
    </div>
  );
}

function LunchBreak() {
  return (
    <div
      className="rounded-xl p-4 text-center border border-yellow-300
      bg-gradient-to-r from-yellow-50 to-orange-50
      hover:shadow-md transition"
    >
      <p className="text-lg font-semibold">🍽 Lunch Break</p>
      <p className="text-sm text-gray-600">{LUNCH.time} • Relax & Recharge</p>
    </div>
  );
}

function ChartPlaceholder({ title, full }) {
  return (
    <div
      className={`glass rounded-2xl p-6 flex flex-col justify-center items-center text-gray-400
        ${full ? "lg:col-span-2 h-72" : "h-64"}`}
    >
      <p className="text-sm uppercase tracking-wide mb-2">
        {title}
      </p>
      <p className="text-sm">
        Analytics Agent will render chart here
      </p>
    </div>
  );
}
