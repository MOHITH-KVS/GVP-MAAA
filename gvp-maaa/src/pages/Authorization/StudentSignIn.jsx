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

export default function StudentSignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const handleSignIn = async () => {
  setError("");

  if (!email || !password) {
    setError("Please enter both email and password.");
    return;
  }

  if (!isValidCollegeEmail(email)) {
    setError("Please use your official college email (@gvpcdpgc.edu.in).");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // Optional: store user session
    localStorage.setItem("user", JSON.stringify(data));

    // Redirect based on role
    if (data.role === "student") {
      navigate("/student");
    } else {
      setError("Invalid role access");
    }

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl"></div>

      {/* LOADING OVERLAY */}
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

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                          flex items-center justify-center text-white mb-4">
            <SchoolIcon />
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Student Sign In
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your academic dashboard
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-5">

          <Input
            label="College email"
            placeholder="student@gvpcdpgc.edu.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD WITH TOGGLE */}
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

          {error && (
            <p className="text-sm text-red-600 font-medium">
              {error}
            </p>
          )}

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

        {/* EXTRA LINKS */}
        <div className="flex justify-between text-sm text-slate-500 mt-4">
          <button className="hover:underline">
            Forgot password?
          </button>
          <button
            type="button"
            onClick={() => navigate("/auth/student/signup")}
            className="hover:underline text-indigo-600 font-medium"
           >
            Create account
          </button>

        </div>

        {/* DIVIDER */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400">or continue with</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* SOCIAL LOGIN */}
        <div className="grid grid-cols-3 gap-4">
          <SocialButton icon={GoogleIcon} label="Google" />
          <SocialButton icon={GitHubIcon} label="GitHub" />
          <SocialButton icon={LinkedInIcon} label="LinkedIn" />
        </div>

      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Input({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border 
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SocialButton({ icon: Icon, label }) {
  return (
    <button
      className="flex items-center justify-center gap-2 py-2.5 rounded-xl 
                 border hover:bg-slate-50 transition text-sm font-medium"
    >
      <Icon fontSize="small" />
      {label}
    </button>
  );
}
