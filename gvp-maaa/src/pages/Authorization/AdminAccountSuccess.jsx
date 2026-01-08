import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

export default function AdminAccountSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/admin");
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">

      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl px-12 py-14 
                      text-center animate-scaleFade max-w-md">

        {/* ICON */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-700 
                        flex items-center justify-center text-red-400">
          <VerifiedUserIcon style={{ fontSize: 48 }} />
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-semibold text-slate-100">
          Administrator Access Granted
        </h1>

        {/* SUBTEXT */}
        <p className="text-slate-400 mt-3 leading-relaxed">
          Your credentials have been successfully verified.  
          Redirecting you to the administrative dashboard…
        </p>

        {/* FOOTER ICON */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <AdminPanelSettingsIcon fontSize="small" />
          <span>GVP-MAAA Secure Admin System</span>
        </div>

      </div>
    </div>
  );
}
