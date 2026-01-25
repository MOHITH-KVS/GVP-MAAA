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
  departmentId: "",   // ✅ ADD THIS LINE
  email: "",
  password: "",
  confirmPassword: "",
 });


  const DEPARTMENTS = [
    { id: 12, name: "CSE" },
    { id: 13, name: "IT" },
    { id: 14, name: "ECE" },
    { id: 15, name: "EEE" },
    { id: 16, name: "MECH" },
    { id: 17, name: "CIVIL" },
 ];


  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");




  const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "name") {
    // allow only letters & spaces
    const cleanName = value.replace(/[^A-Za-z\s]/g, "");
    setForm({ ...form, name: cleanName });
  }
  else if (name === "employeeId") {
    // allow only letters & numbers
    const cleanId = value.replace(/[^A-Za-z0-9/]/g, "");
    setForm({ ...form, employeeId: cleanId });
  }
  else if (name === "email") {
  setForm({ ...form, email: value.toLowerCase() });
}

  else {
    setForm({ ...form, [name]: value });
  }

  setError("");
  setFieldErrors({});
 };


  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const getPasswordStrength = (password) => {
  if (password.length < 6) return "Weak";
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return "Strong";
  return "Medium";
 };

  const passwordStrength = getPasswordStrength(form.password);


  const isNameValid = form.name.trim().length > 0;
  const isEmployeeIdValid = form.employeeId.trim().length > 0;
  const isDepartmentValid = !!form.departmentId;

  const isPasswordMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;


  const handleSubmit = async () => {
  if (loading) return;   // prevent double click
  setLoading(true);
  setError("");

  if (!form.name || !form.email || !form.password || !form.confirmPassword) {
  setError("Please fill in all fields");
  setLoading(false);
  return;
 }


  if (!form.departmentId) {
  setError("Please select your department");
  setLoading(false);   // ✅ ADD
  return;
 }


  if (form.password !== form.confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  if (!isValidCollegeEmail(form.email)) {
  setError("Please use your official college email (@gvpcdpgc.edu.in)");
  setLoading(false);
  return;
 }


  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      employee_id: form.employeeId.trim(),          // ✅ ADD THIS LINE
      department_id: parseInt(form.departmentId, 10),
    };

    console.log("Sending payload:", payload); // 🔥 DEBUG

    const response = await fetch("http://127.0.0.1:8000/signup/teacher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Teacher signup failed");
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      navigate("/auth/teacher/signin");
    }, 3000);

  } catch (err) {
    setError(err.message || "Signup failed");
    setLoading(false);

  }
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
          {!isNameValid && (
            <p className="text-sm text-red-600">
              Name cannot be empty
            </p>
          )}

          <Input label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} />
          {!isEmployeeIdValid && (
            <p className="text-sm text-red-600">
              Employee ID is required
            </p>
          )}

          {/* DEPARTMENT DROPDOWN */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Department
            </label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          {form.email && !isValidCollegeEmail(form.email) && (
            <p className="text-sm text-red-600">
              Please use your college email (@gvpcdpgc.edu.in)
            </p>
          )}



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
            {form.confirmPassword && (
              isPasswordMatch ? (
                <p className="text-sm text-emerald-600">
                  ✔ Passwords match
                </p>
              ) : (
                <p className="text-sm text-red-600">
                  Passwords do not match
                </p>
              )
            )}

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
            disabled={
              loading ||
              !isNameValid ||
              !isEmployeeIdValid ||
              !isDepartmentValid ||
              !isPasswordMatch
            }
            className={`w-full py-2.5 mt-2 rounded-xl text-white font-medium
              transition flex items-center justify-center gap-2
              ${
                loading ||
                !isNameValid ||
                !isEmployeeIdValid ||
                !isDepartmentValid ||
                !isPasswordMatch
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
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

        {/* ✅ SUCCESS MODAL — ADD HERE */}
        {success && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-sm text-center">
              <h2 className="text-lg font-semibold">
                Teacher Account Created Successfully
              </h2>

              <p className="text-sm text-slate-600 mt-2">
                Redirecting to sign in…
              </p>

              <div className="mt-4 flex justify-center">
                <Spinner />
              </div>
            </div>
          </div>
        )}
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
