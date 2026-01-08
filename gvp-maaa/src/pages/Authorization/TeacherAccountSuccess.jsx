import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function TeacherAccountSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/teacher");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">

      <div className="bg-white border rounded-2xl shadow-xl px-10 py-12 text-center animate-scaleFade">

        <CheckCircleIcon
          className="text-emerald-500 mb-4"
          style={{ fontSize: 72 }}
        />

        <h1 className="text-2xl font-semibold text-slate-800">
          Account Created Successfully
        </h1>

        <p className="text-slate-500 mt-2 max-w-sm">
          Your faculty account has been set up.  
          Redirecting you to the teacher dashboard…
        </p>

      </div>
    </div>
  );
}
