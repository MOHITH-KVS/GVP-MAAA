import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutIcon from "@mui/icons-material/Logout";

export default function Logout({ onBack, role = "student" }) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  // Animate IN
  useEffect(() => {
  // 🔐 CLEAR AUTH DATA
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user");

  // animate IN
  setVisible(true);
 }, []);


  /* ===== ROLE BASED SIGN-IN ROUTES ===== */
  const roleSignInRoute = {
    student: "/auth/student/signin",
    teacher: "/auth/teacher/signin",
    admin: "/auth/admin/signin",
  };

  // Login Again → role-based redirect (NEW, CLEAN)
  const handleLoginAgain = () => {
    setVisible(false);
    setTimeout(() => {
      if (roleSignInRoute[role]) {
        navigate(roleSignInRoute[role]);
      } else if (onBack) {
        onBack(); // fallback (kept)
      }
    }, 300);
  };

  // Exit app (UNCHANGED)
  const handleExit = () => {
    setVisible(false);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  /* ===== ROLE BASED CONTENT (EXISTING) ===== */
  const content = {
    student: {
      title: "Logged out — for now",
      desc: "You’ve safely logged out of your dashboard.",
      quote:
        "Take a break. Reflect. Every successful student comes back stronger.",
    },
    teacher: {
      title: "Session Ended",
      desc: "You’ve successfully logged out of the faculty dashboard.",
      quote:
        "Thank you for guiding students today. Your impact continues beyond the classroom.",
    },
    admin: {
      title: "Session Ended",
      desc: "You’ve successfully logged out of the administrative dashboard.",
      quote:
        "Thank you for managing and shaping the institution today. Your leadership keeps everything moving forward.",
    },
  };

  const { title, desc, quote } = content[role];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center
      transition-opacity duration-300
      ${visible ? "opacity-100" : "opacity-0"}
      bg-gradient-to-br from-indigo-50 via-white to-indigo-100`}
    >
      {/* CARD */}
      <div
        className={`bg-white/85 backdrop-blur-xl rounded-3xl p-10
        shadow-2xl border border-white/40
        transform transition-all duration-300
        ${visible ? "translate-y-0 scale-100" : "translate-y-6 scale-95"}
        max-w-md w-full text-center`}
      >
        {/* ICON */}
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
          <LogoutIcon fontSize="large" />
        </div>

        {/* TEXT */}
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">
          {title}
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          {desc}
        </p>

        <p className="text-slate-500 text-sm italic mb-8">
          {quote}
        </p>

        {/* ACTIONS */}
        <div className="space-y-3">
          <button
            onClick={handleLoginAgain}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium
            hover:bg-indigo-700 transition"
          >
            🔁 Login Again
          </button>

          <button
            onClick={handleExit}
            className="w-full py-3 rounded-xl border border-slate-200
            text-slate-600 hover:bg-slate-50 transition"
          >
            🚪 Exit
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          GVP-MAAA · Your academic companion
        </p>
      </div>
    </div>
  );
}
