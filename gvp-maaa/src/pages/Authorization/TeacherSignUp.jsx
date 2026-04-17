import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  { id: 11, name: "CSE" },
  { id: 12, name: "CSM" },
  { id: 14, name: "ECE" },
  { id: 15, name: "MECH" },
  { id: 1,  name: "CIVIL" },
 ];



  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({
    name: false,
    employeeId: false,
    departmentId: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [typingStarted, setTypingStarted] = useState({
    name: false,
    employeeId: false,
    departmentId: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [capsLockOnPassword, setCapsLockOnPassword] = useState(false);
  const [capsLockOnConfirm, setCapsLockOnConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const nameRef = useRef(null);
  const employeeIdRef = useRef(null);
  const departmentRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);




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

  const handleEnterToNext = (e, nextRef) => {
    if (e.key !== "Enter") return;
    if (!nextRef?.current) return;
    e.preventDefault();
    nextRef.current.focus();
  };


  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const getPasswordStrengthMeta = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const label = score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong";
    return { checks, score, label };
  };

  const passwordStrengthMeta = getPasswordStrengthMeta(form.password);

  const validateField = (field, values) => {
    if (field === "name") {
      if (!values.name.trim()) return "Name cannot be empty";
      return "";
    }
    if (field === "employeeId") {
      if (!values.employeeId.trim()) return "Employee ID is required";
      return "";
    }
    if (field === "departmentId") {
      if (!values.departmentId) return "Please select your department";
      return "";
    }
    if (field === "email") {
      if (!values.email.trim()) return "Please enter your email";
      if (!isValidCollegeEmail(values.email)) return "Please use your college email (@gvpcdpgc.edu.in)";
      return "";
    }
    if (field === "password") {
      if (!values.password) return "Password is required";
      return "";
    }
    if (field === "confirmPassword") {
      if (!values.confirmPassword) return "Please confirm your password";
      if (values.password !== values.confirmPassword) return "Passwords do not match";
      return "";
    }
    return "";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setValidationErrors((prev) => {
        const next = { ...prev };
        const values = { ...form };
        ["name", "employeeId", "departmentId", "email", "password", "confirmPassword"].forEach((field) => {
          const currentValue = values[field] || "";
          const shouldValidate = touched[field] || (typingStarted[field] && currentValue.toString().trim().length > 1);
          if (!shouldValidate) return;
          const msg = validateField(field, values);
          if (msg) next[field] = msg;
          else delete next[field];
        });
        return next;
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [form, touched, typingStarted]);

  const handleBlur = (field) => {
    const values = { ...form };
    setTouched((prev) => ({ ...prev, [field]: true }));
    const msg = validateField(field, values);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const clearFieldErrorIfValid = (field, nextForm) => {
    if (validationErrors[field] && validateField(field, nextForm) === "") {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const isFieldValid = (field, value) => {
    const interacted = touched[field] || typingStarted[field];
    return interacted && String(value || "").trim() && !validationErrors[field] && !fieldErrors[field];
  };

  const handleCapsLock = (e, setter) => {
    setter(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
  };

  const focusFirstInvalid = (errorsMap) => {
    if (errorsMap.name) {
      nameRef.current?.focus();
      return;
    }
    if (errorsMap.employeeId) {
      employeeIdRef.current?.focus();
      return;
    }
    if (errorsMap.departmentId) {
      departmentRef.current?.focus();
      return;
    }
    if (errorsMap.email) {
      emailRef.current?.focus();
      return;
    }
    if (errorsMap.password) {
      passwordRef.current?.focus();
      return;
    }
    if (errorsMap.confirmPassword) {
      confirmPasswordRef.current?.focus();
    }
  };


  const isNameValid = form.name.trim().length > 0;
  const isEmployeeIdValid = form.employeeId.trim().length > 0;
  const isDepartmentValid = !!form.departmentId;

  const isPasswordMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;


  const handleSubmit = async (e) => {
  e.preventDefault();
  if (loading) return;   // prevent double click
  setLoading(true);
  setError("");
  setSuccess("");

  const clientErrors = {
    name: validateField("name", form),
    employeeId: validateField("employeeId", form),
    departmentId: validateField("departmentId", form),
    email: validateField("email", form),
    password: validateField("password", form),
    confirmPassword: validateField("confirmPassword", form),
  };
  const normalizedErrors = Object.fromEntries(
    Object.entries(clientErrors).filter(([, value]) => value)
  );
  if (Object.keys(normalizedErrors).length > 0) {
    setTouched({
      name: true,
      employeeId: true,
      departmentId: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setValidationErrors(normalizedErrors);
    setError(Object.values(normalizedErrors)[0]);
    focusFirstInvalid(normalizedErrors);
    setLoading(false);
    return;
  }


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
  setLoading(false);
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

    const response = await fetch("http://localhost:8000/signup/teacher", {
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

    // ⏳ force spinner to be visible
  setTimeout(() => {
    setLoading(false);
    setSuccess("Teacher account created successfully. Redirecting to login...");

    setTimeout(() => {
      navigate("/auth/teacher/signin");
    }, 3000);

  }, 1000);


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

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={(e) => {
              setTypingStarted((prev) => ({ ...prev, name: true }));
              handleChange(e);
              const nextForm = { ...form, name: e.target.value.replace(/[^A-Za-z\s]/g, "") };
              clearFieldErrorIfValid("name", nextForm);
            }}
            onBlur={() => handleBlur("name")}
            inputRef={nameRef}
            onKeyDown={(e) => handleEnterToNext(e, employeeIdRef)}
          />
          {validationErrors.name && (
            <p className="text-sm text-red-600">
              {validationErrors.name}
            </p>
          )}
          {!validationErrors.name && isFieldValid("name", form.name) && (
            <p className="text-sm text-emerald-600" role="status" aria-live="polite">✔ Looks good</p>
          )}

          <Input
            label="Employee ID"
            name="employeeId"
            value={form.employeeId}
            onChange={(e) => {
              setTypingStarted((prev) => ({ ...prev, employeeId: true }));
              handleChange(e);
              const nextForm = { ...form, employeeId: e.target.value.replace(/[^A-Za-z0-9/]/g, "") };
              clearFieldErrorIfValid("employeeId", nextForm);
            }}
            onBlur={() => handleBlur("employeeId")}
            inputRef={employeeIdRef}
            onKeyDown={(e) => handleEnterToNext(e, departmentRef)}
          />
          {validationErrors.employeeId && (
            <p className="text-sm text-red-600">
              {validationErrors.employeeId}
            </p>
          )}
          {!validationErrors.employeeId && isFieldValid("employeeId", form.employeeId) && (
            <p className="text-sm text-emerald-600" role="status" aria-live="polite">✔ Looks good</p>
          )}

          {/* DEPARTMENT DROPDOWN */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Department
            </label>
            <select
              ref={departmentRef}
              name="departmentId"
              value={form.departmentId}
              onChange={(e) => {
                setTypingStarted((prev) => ({ ...prev, departmentId: true }));
                handleChange(e);
                const nextForm = { ...form, departmentId: e.target.value };
                clearFieldErrorIfValid("departmentId", nextForm);
              }}
              onBlur={() => handleBlur("departmentId")}
              onKeyDown={(e) => handleEnterToNext(e, emailRef)}
              className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {validationErrors.departmentId && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.departmentId}</p>
            )}
            {!validationErrors.departmentId && isFieldValid("departmentId", form.departmentId) && (
              <p className="text-sm text-emerald-600 mt-1" role="status" aria-live="polite">✔ Looks good</p>
            )}
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => {
              setTypingStarted((prev) => ({ ...prev, email: true }));
              handleChange(e);
              const nextForm = { ...form, email: e.target.value.toLowerCase() };
              clearFieldErrorIfValid("email", nextForm);
            }}
            onBlur={() => handleBlur("email")}
            inputRef={emailRef}
            onKeyDown={(e) => handleEnterToNext(e, passwordRef)}
          />
          {validationErrors.email && (
            <p className="text-sm text-red-600">
              {validationErrors.email}
            </p>
          )}
          {!validationErrors.email && isFieldValid("email", form.email) && (
            <p className="text-sm text-emerald-600" role="status" aria-live="polite">✔ Looks good</p>
          )}



          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => {
                setTypingStarted((prev) => ({ ...prev, password: true }));
                handleChange(e);
                const nextForm = { ...form, password: e.target.value };
                clearFieldErrorIfValid("password", nextForm);
                clearFieldErrorIfValid("confirmPassword", {
                  ...nextForm,
                  confirmPassword: form.confirmPassword,
                });
              }}
              onBlur={() => handleBlur("password")}
              inputRef={passwordRef}
              onKeyUp={(e) => handleCapsLock(e, setCapsLockOnPassword)}
              onKeyDown={(e) => {
                handleCapsLock(e, setCapsLockOnPassword);
                handleEnterToNext(e, confirmPasswordRef);
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-500"
            >
              {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </button>
          </div>
          {!validationErrors.password && isFieldValid("password", form.password) && (
            <p className="text-sm text-emerald-600" role="status" aria-live="polite">✔ Looks good</p>
          )}
          {capsLockOnPassword && (
            <p className="text-xs text-amber-600" role="status" aria-live="polite">Caps Lock is on</p>
          )}

          {form.password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((step) => {
                  const level = passwordStrengthMeta.score <= 2 ? 1 : passwordStrengthMeta.score <= 4 ? 2 : 3;
                  const active = step <= level;
                  const color = passwordStrengthMeta.label === "Strong"
                    ? "bg-emerald-500"
                    : passwordStrengthMeta.label === "Medium"
                    ? "bg-amber-500"
                    : "bg-red-500";
                  return (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full ${active ? color : "bg-slate-200"}`}
                    />
                  );
                })}
              </div>
              <p className={`text-sm font-medium ${
                passwordStrengthMeta.label === "Strong"
                  ? "text-emerald-600"
                  : passwordStrengthMeta.label === "Medium"
                  ? "text-amber-600"
                  : "text-red-600"
              }`}>
                Password Strength: {passwordStrengthMeta.label}
              </p>
            </div>
          )}

          <div className="relative">
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => {
                setTypingStarted((prev) => ({ ...prev, confirmPassword: true }));
                handleChange(e);
                const nextForm = { ...form, confirmPassword: e.target.value };
                clearFieldErrorIfValid("confirmPassword", nextForm);
              }}
              onBlur={() => handleBlur("confirmPassword")}
              inputRef={confirmPasswordRef}
              onKeyUp={(e) => handleCapsLock(e, setCapsLockOnConfirm)}
              onKeyDown={(e) => {
                handleCapsLock(e, setCapsLockOnConfirm);
              }}
            />
            {(validationErrors.confirmPassword || form.confirmPassword) && (
              isPasswordMatch ? (
                <p className="text-sm text-emerald-600">
                  ✔ Passwords match
                </p>
              ) : (
                <p className="text-sm text-red-600">
                  {validationErrors.confirmPassword || "Passwords do not match"}
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
          {capsLockOnConfirm && (
            <p className="text-xs text-amber-600" role="status" aria-live="polite">Caps Lock is on</p>
          )}

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
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
        </form>

        <p className="text-sm text-center text-slate-500 mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/auth/teacher/signin")}
            className="text-indigo-600 font-medium hover:underline"
          >
            Sign In
          </button>
        </p>


        {/* ✅ SUCCESS MODAL — ADD HERE */}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-slate-800">
                Teacher Account Created Successfully
              </h2>

              <p className="text-sm text-slate-600 mt-2">
                Please login to manage your classes. Redirecting to login page...
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

function Input({ label, name, value, onChange, onBlur, type = "text", inputRef, onKeyDown, onKeyUp }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        type={type}
        className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}


function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  );
}

