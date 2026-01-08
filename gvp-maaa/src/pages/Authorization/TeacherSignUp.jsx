import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/* ===== ALLOWED COLLEGE DOMAINS ===== */
const ALLOWED_DOMAINS = ["@gvpcdpgc.edu.in"];

export default function TeacherSignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    employeeId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const getPasswordStrength = (password) => {
    if (password.length < 6) return "Weak";
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return "Strong";
    return "Medium";
  };

  const passwordStrength = getPasswordStrength(form.password);

  const handleSubmit = () => {
    const { name, employeeId, email, password, confirmPassword } = form;

    if (!name || !employeeId || !email || !password || !confirmPassword) {
      setError("Please fill in all the fields.");
      return;
    }

    if (!isValidCollegeEmail(email)) {
      setError("Please use your official college email (@gvpcdpgc.edu.in).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    navigate("/auth/teacher/success");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">

      <div className="relative z-10 w-full max-w-md bg-white border rounded-2xl shadow-xl p-8">

        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 
                          flex items-center justify-center text-white mb-4">
            <LocalLibraryIcon />
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Create Teacher Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Start managing your classes
          </p>
        </div>

        <div className="space-y-3">
          <Input label="Full Name" name="name" value={form.name} onChange={handleChange} />
          <Input label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />

          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-500"
            >
              {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </button>
          </div>

          {form.password && (
            <p className={`text-sm font-medium ${
              passwordStrength === "Strong"
                ? "text-emerald-600"
                : passwordStrength === "Medium"
                ? "text-amber-600"
                : "text-red-600"
            }`}>
              Password Strength: {passwordStrength}
            </p>
          )}

          <div className="relative">
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-slate-500"
            >
              {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 mt-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Create Account
          </button>
        </div>

        <p className="text-sm text-center text-slate-500 mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/auth/teacher/signin")}
            className="text-indigo-600 font-medium hover:underline"
          >
            Sign In
          </button>
        </p>

        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400">or sign up with</span>
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

function Input({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SocialButton({ icon: Icon, label }) {
  return (
    <button className="flex items-center justify-center gap-2 py-2 rounded-xl border hover:bg-slate-50 transition text-sm font-medium">
      <Icon fontSize="small" />
      {label}
    </button>
  );
}
