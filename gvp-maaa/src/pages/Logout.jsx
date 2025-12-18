import { useEffect, useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";

export default function Logout({ onBack }) {
  const [visible, setVisible] = useState(false);

  // Animate IN
  useEffect(() => {
    setVisible(true);
  }, []);

  // Animate OUT (Login Again)
  const handleLoginAgain = () => {
    setVisible(false);
    setTimeout(onBack, 300);
  };

  // Exit app
  const handleExit = () => {
    setVisible(false);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

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
          Logged out — for now
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          You’ve safely logged out of your dashboard.
        </p>

        <p className="text-slate-500 text-sm italic mb-8">
          Take a break. Reflect.  
          Every successful student comes back stronger.
        </p>

        {/* ACTIONS */}
        <div className="space-y-3">
          {/* PRIMARY */}
          <button
            onClick={handleLoginAgain}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium
            hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            🔁 Login Again
          </button>

          {/* SECONDARY */}
          <button
            onClick={handleExit}
            className="w-full py-3 rounded-xl border border-slate-200
            text-slate-600 hover:bg-slate-50 transition"
          >
            🚪 Exit
          </button>
        </div>

        {/* FOOTER */}
        <p className="mt-8 text-xs text-slate-400">
          GVP-MAAA · Your academic companion
        </p>
      </div>
    </div>
  );
}
