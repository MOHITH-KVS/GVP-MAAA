import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CircularProgress from "@mui/material/CircularProgress";


export default function AdminSignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isFormValid = email && password && adminKey;


  const handleSignIn = async () => {
  setError("");

  if (!email || !password || !adminKey) {
    setError("All fields are required for administrative access.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch("http://127.0.0.1:8000/login/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        access_key: adminKey
      })
    });

    const data = await response.json();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user_role", data.role);


    if (!response.ok) {
      throw new Error(data.detail || "Admin login failed");
    }

    // store admin session
    localStorage.setItem("user", JSON.stringify(data));

    // keep loader visible for UX
    setTimeout(() => {
      navigate("/admin");
    }, 1000); // 1 second feels perfect



  } catch (err) {
    setError(err.message);
    setLoading(false);
  }  
 };


  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-900 overflow-hidden">

      {/* LOADING */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <CircularProgress color="inherit" />
            <p className="text-sm text-slate-300">
              Verifying administrator access…
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md bg-slate-800 border border-slate-700 
                      rounded-2xl shadow-2xl p-8 text-slate-100">

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-slate-700 
                          flex items-center justify-center text-red-400 mb-4">
            <AdminPanelSettingsIcon />
          </div>

          <h1 className="text-2xl font-semibold">
            Administrator Sign In
          </h1>

          <p className="text-sm text-slate-400 mt-2">
            Administrative access is restricted to authorized personnel only.
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-4">

          <Input
            label="Admin Email"
            placeholder="admin@gvpcdpgc.edu.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD */}
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
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? (
                <VisibilityOffIcon fontSize="small" />
              ) : (
                <VisibilityIcon fontSize="small" />
              )}
            </button>
          </div>

          <Input
            label="Admin Access Key"
            placeholder="Enter admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-400 font-medium">
              {error}
            </p>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading || !isFormValid}
            className={`w-full py-3 mt-2 rounded-xl font-semibold transition
              ${
                loading || !isFormValid
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
         > 
            {loading ? "Signing in..." : "Sign In as Administrator"}
          </button>

        </div>

      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Input({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700
                   focus:outline-none focus:ring-2 focus:ring-red-600 text-slate-100"
      />
    </div>
  );
}
