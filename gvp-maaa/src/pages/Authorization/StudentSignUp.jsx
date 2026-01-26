import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/* ===== ALLOWED COLLEGE DOMAINS ===== */
const ALLOWED_DOMAINS = ["@gvpcdpgc.edu.in"];

export default function StudentSignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    roll: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);


  /* ===== HANDLE INPUT CHANGE ===== */
  const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "name") {
    // ✅ allow only letters and spaces
    const cleanName = value.replace(/[^A-Za-z\s]/g, "");
    setForm({ ...form, name: cleanName });
  }

  else if (name === "roll") {
    // ✅ only digits + limit to 10
    const cleanRoll = value.replace(/\D/g, "").slice(0, 10);
    setForm({
      ...form,
      roll: cleanRoll,
      email: cleanRoll ? `${cleanRoll}@gvpcdpgc.edu.in` : "",
    });
  }

  else {
    setForm({ ...form, [name]: value });
  }

  setError("");
  setFieldErrors({});

 };


  /* ===== EMAIL VALIDATION ===== */
  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  /* ===== PASSWORD STRENGTH ===== */
  const getPasswordStrength = (password) => {
    if (password.length < 6) return "Weak";
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return "Strong";
    return "Medium";
  };

  const passwordStrength = getPasswordStrength(form.password);
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const isRollValid =
  form.roll.length > 0 && /^\d{10}$/.test(form.roll);


  // ✅ ADD HERE (COMPONENT LEVEL)
  const isPasswordMatch =
  form.password &&
  form.confirmPassword &&
  form.password === form.confirmPassword;

  const isNameValid = form.name.trim().length > 0;

  /* ===== SUBMIT ===== */
  const handleSubmit = async () => {
  if (loading) return;   // 🚫 BLOCK double click

  setLoading(true);
  setError("");
  setSuccess("");



  // 🔹 ROLL NUMBER VALIDATION
  if (!isRollValid) {
  setError("Roll number must be exactly 10 digits");
  setLoading(false);
  return;
}

  // 🔹 Password match validation (FINAL SAFETY)
  if (form.password !== form.confirmPassword) {
    setError("Passwords do not match");
    setLoading(false);
    return;
  }

  const { name, roll, email, password } = form;
  try {
    const response = await fetch("http://127.0.0.1:8000/signup/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        roll_no: roll,
        email,
        password
      }),
    });

    const data = await response.json();

    if (!response.ok) {
    if (typeof data.detail === "object") {
      throw new Error(JSON.stringify(data.detail));
    }
    throw new Error(data.detail || "Signup failed");
}


    // ⏳ FORCE spinner visibility
    setTimeout(() => {
      setLoading(false);
      setSuccess("Student account created successfully.Please login.");

      // redirect after success popup
      setTimeout(() => {
        navigate("/auth/student/signin");
      }, 3000);

    }, 1000);

  } 
  catch (err) {
  setLoading(false);

  try {
    // backend sent JSON error as string
    const parsed = JSON.parse(err.message);

    if (typeof parsed === "object") {
      setFieldErrors(parsed);
      return;
    }
  } catch {
    // not JSON, ignore
  }

  setError(err.message || "Signup failed");
 }
};

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md bg-white border rounded-2xl shadow-xl p-8">

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                          flex items-center justify-center text-white mb-4">
            <LocalLibraryIcon />
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Create Student Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Start accessing your academic dashboard
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-3">

          <Input label="Full Name" name="name" value={form.name} onChange={handleChange} />
          {fieldErrors.name && (
            <p className="text-sm text-red-600">
              {fieldErrors.name}
            </p>
          )}

          {!isNameValid && (
            <p className="text-sm text-red-600">
              Name cannot be empty
            </p>
          )}

          <Input
              label="Roll Number"
              name="roll"
              value={form.roll}
              onChange={handleChange}
            />
            {fieldErrors.roll_no && (
              <p className="text-sm text-red-600">
                {fieldErrors.roll_no}
              </p>
            )}

            {/* 🔴 LIVE ROLL VALIDATION MESSAGE */}
            {form.roll && (
              isRollValid ? (
                <p className="text-sm text-emerald-600">
                  ✔ Valid roll number
                </p>
              ) : (
                <p className="text-sm text-red-600">
                  Roll number must be exactly 10 digits
                </p>
              )
          )}

          <Input
            label="College Email"
            name="email"
            value={form.email}
            disabled
          />
          {fieldErrors.email && (
            <p className="text-sm text-red-600">
              {fieldErrors.email}
            </p>
          )}

          {/* PASSWORD */}
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
              className="absolute right-3 top-9 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </button>
          </div>

          {/* PASSWORD STRENGTH */}
          {form.password && (
            <p
              className={`text-sm font-medium ${
                passwordStrength === "Strong"
                  ? "text-emerald-600"
                  : passwordStrength === "Medium"
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              Password Strength: {passwordStrength}
            </p>
          )}

          {/* CONFIRM PASSWORD */}
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
              className="absolute right-3 top-9 text-slate-500 hover:text-slate-700"
            >
              {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </button>
          </div>
          {/* PASSWORD MATCH STATUS */}
          {form.confirmPassword && (
            form.password === form.confirmPassword ? (
              <p className="text-sm text-emerald-600">
                ✔ Passwords match
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Passwords do not match
              </p>
            )
          )}


          {success && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-sm text-center animate-scaleIn">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center animate-scaleIn">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-lg font-semibold text-slate-800">
                  Account Created Successfully
                </h2>

                <p className="text-sm text-slate-600 mt-2">
                  Please login to access your dashboard, Wait a moment... Redirecting to login page.
                </p>

                <div className="mt-4 flex justify-center">
                  <Spinner />
                </div>
              </div>
            </div>
          )}


          {/* ERROR MESSAGE */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

        <button
            onClick={handleSubmit}
             disabled={loading || !isPasswordMatch || !isRollValid || !isNameValid}
            className={`w-full py-2.5 mt-2 rounded-xl text-white font-medium
              transition flex items-center justify-center gap-2
              ${
                loading || !isPasswordMatch || !isRollValid
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } `}

          >
            {loading ? (
              <>
                <Spinner />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
        </button>

        </div>

        {/* SIGN IN LINK */}
        <p className="text-sm text-center text-slate-500 mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/auth/student/signin")}
            className="text-indigo-600 font-medium hover:underline"
          >
            Sign In
          </button>
        </p>

      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Input({ label, name, value, onChange, type = "text" , disabled }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-xl border
          focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${disabled ? "bg-slate-100 cursor-not-allowed" : ""}
        `}
      />
    </div>
  );
}


function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  );
}


