import { useState } from "react";

/* ===== SAMPLE TEACHER TIMETABLE DATA ===== */
const TIMETABLE = {
  Monday: [
    {
      time: "09:00 - 09:50",
      subject: "DBMS",
      year: "3rd Year",
      section: "A",
      type: "Lecture",
    },
    {
      time: "10:00 - 10:50",
      subject: "OS",
      year: "3rd Year",
      section: "B",
      type: "Lecture",
    },
    {
      time: "11:00 - 11:50",
      subject: "CN",
      year: "4th Year",
      section: "A",
      type: "Lecture",
    },
    {
      time: "12:50 - 01:40",
      subject: "Lunch Break",
      type: "Break",
    },
    {
      time: "02:40 - 04:40",
      subject: "DBMS LAB",
      year: "4th Year",
      section: "B",
      type: "Lab",
    },
  ],

  Tuesday: [
    {
      time: "09:00 - 09:50",
      subject: "DBMS",
      year: "3rd Year",
      section: "A",
      type: "Lecture",
    },
  ],
  Wednesday: [],
  Thursday: [],
  Friday: [],
};

const DAYS = ["All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Timetable() {
  const [activeDay, setActiveDay] = useState("Monday");

  const daysToRender =
    activeDay === "All" ? Object.keys(TIMETABLE) : [activeDay];

  return (
    <div className="space-y-8">

      {/* ================= HEADER ================= */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 border">
        <h1 className="text-2xl font-semibold">🕒 Teacher Timetable</h1>
        <p className="text-gray-600 mt-1">
          Your teaching schedule across years and sections
        </p>
      </div>

      {/* ================= DAY FILTER ================= */}
      <div className="flex gap-3 flex-wrap">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition
              ${
                activeDay === day
                  ? "bg-indigo-600 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* ================= TIMETABLE ================= */}
      <div className="space-y-6">
        {daysToRender.map((day) => (
          <div key={day} className="space-y-4">

            {/* DAY HEADER */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{day}</h2>
            </div>

            {/* SLOTS */}
            {TIMETABLE[day]?.length > 0 ? (
              <div className="space-y-3">
                {TIMETABLE[day].map((slot, index) => (
                  <TimetableCard key={index} slot={slot} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No classes scheduled
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ================= ANALYTICS PLACEHOLDER ================= */}
      <div className="rounded-2xl p-6 bg-white border">
        <h3 className="font-semibold mb-1">📊 Timetable Analytics</h3>
        <p className="text-sm text-gray-500">
          Insights will appear here once timetable data is analyzed.
        </p>
      </div>
    </div>
  );
}

/* ================= TIMETABLE CARD ================= */

function TimetableCard({ slot }) {
  if (slot.type === "Break") {
    return (
      <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-5 py-4 text-center">
        <p className="font-semibold">🍽 {slot.subject}</p>
        <p className="text-sm text-gray-600">{slot.time} • Relax & Recharge</p>
      </div>
    );
  }

  const isLab = slot.type === "Lab";

  return (
    <div
      className={`rounded-xl border px-5 py-4 space-y-1
        ${isLab ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"}
      `}
    >
      <div className="flex justify-between text-sm text-gray-500">
        <span>{slot.time}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs
            ${
              isLab
                ? "bg-green-100 text-green-700"
                : "bg-indigo-100 text-indigo-700"
            }`}
        >
          {slot.type}
        </span>
      </div>

      <h3 className="font-semibold text-gray-800">
        {slot.subject}
      </h3>

      <p className="text-sm text-gray-600">
        {slot.year} • Section {slot.section}
      </p>
    </div>
  );
}
