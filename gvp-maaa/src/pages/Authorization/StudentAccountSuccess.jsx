import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function StudentAccountSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/student");
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">

      <div className="bg-white border rounded-2xl shadow-xl px-10 py-12 text-center
                      animate-scaleIn">

        {/* ICON */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 
                        flex items-center justify-center mb-6">
          <CheckCircleIcon className="text-emerald-600" fontSize="large" />
        </div>

        {/* TEXT */}
        <h1 className="text-2xl font-semibold text-slate-800">
          Account Created Successfully
        </h1>

        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
          Your student account has been set up. Redirecting you to your dashboard…
        </p>

        {/* LOADING DOTS */}
        <div className="mt-6 flex justify-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></span>
        </div>
      </div>
    </div>
  );
}
