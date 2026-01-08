import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import SchoolIcon from "@mui/icons-material/School";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/* ===== ALLOWED COLLEGE DOMAINS ===== */
const ALLOWED_DOMAINS = ["@gvpcdpgc.edu.in"];

export default function TeacherSignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const handleSignIn = () => {
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!isValidCollegeEmail(email)) {
      setError("Please use your official college email (@gvpcdpgc.edu.in).");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      navigate("/teacher");
    }, 1800);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <CircularProgress />
            <p className="text-sm text-slate-600 font-medium">
              Signing you in…
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md bg-white border rounded-2xl shadow-xl p-8">

        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 
                          flex items-center justify-center text-white mb-4">
            <SchoolIcon />
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Teacher Sign In
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your teaching dashboard
          </p>
        </div>

        <div className="space-y-5">

          <Input
            label="College email"
            placeholder="faculty@gvpcdpgc.edu.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? (
                <VisibilityOffIcon fontSize="small" />
              ) : (
                <VisibilityIcon fontSize="small" />
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-medium transition
              ${loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>

        <div className="flex justify-between text-sm text-slate-500 mt-4">
          <button className="hover:underline">Forgot password?</button>
          <button
            onClick={() => navigate("/auth/teacher/signup")}
            className="hover:underline text-indigo-600 font-medium"
          >
            Create account
          </button>
        </div>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400">or continue with</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <SocialButton icon={GoogleIcon} label="Google" />
          <SocialButton icon={GitHubIcon} label="GitHub" />
          <SocialButton icon={LinkedInIcon} label="LinkedIn" />
        </div>

      </div>
    </div>
  );
}

/* ===== HELPERS ===== */

function Input({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SocialButton({ icon: Icon, label }) {
  return (
    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border hover:bg-slate-50 transition text-sm font-medium">
      <Icon fontSize="small" />
      {label}
    </button>
  );
}
