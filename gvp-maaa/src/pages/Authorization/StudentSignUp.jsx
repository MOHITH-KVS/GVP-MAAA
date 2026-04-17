import { useEffect, useRef, useState } from "react";
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
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({
    name: false,
    roll: false,
    password: false,
    confirmPassword: false,
  });
  const [typingStarted, setTypingStarted] = useState({
    name: false,
    roll: false,
    password: false,
    confirmPassword: false,
  });
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);
  const rollRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);


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

  const isRollValid =
  form.roll.length > 0 && /^\d{10}$/.test(form.roll);


  // ✅ ADD HERE (COMPONENT LEVEL)
  const isPasswordMatch =
  form.password &&
  form.confirmPassword &&
  form.password === form.confirmPassword;

  const isNameValid = form.name.trim().length > 0;

  const validateField = (field, values) => {
    if (field === "name") {
      if (!values.name.trim()) return "Name cannot be empty";
      return "";
    }
    if (field === "roll") {
      if (!values.roll) return "Roll number is required";
      if (!/^\d{10}$/.test(values.roll)) return "Roll number must be exactly 10 digits";
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
        ["name", "roll", "password", "confirmPassword"].forEach((field) => {
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

  const focusFirstInvalid = (errorsMap) => {
    if (errorsMap.name) {
      nameRef.current?.focus();
      return;
    }
    if (errorsMap.roll) {
      rollRef.current?.focus();
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

  /* ===== SUBMIT ===== */
  const handleSubmit = async (e) => {
  e.preventDefault();
  if (loading) return;   // 🚫 BLOCK double click

  setLoading(true);
  setError("");
  setSuccess("");

  const clientErrors = {
    name: validateField("name", form),
    roll: validateField("roll", form),
    password: validateField("password", form),
    confirmPassword: validateField("confirmPassword", form),
  };
  const normalizedErrors = Object.fromEntries(
    Object.entries(clientErrors).filter(([, value]) => value)
  );
  if (Object.keys(normalizedErrors).length > 0) {
    setTouched({ name: true, roll: true, password: true, confirmPassword: true });
    setValidationErrors(normalizedErrors);
    setError(Object.values(normalizedErrors)[0]);
    focusFirstInvalid(normalizedErrors);
    setLoading(false);
    return;
  }



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
    const response = await fetch("http://localhost:8000/signup/student", {
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

  const handleEnterToNext = (e, nextRef) => {
    if (e.key !== "Enter") return;
    if (!nextRef?.current) return;
    e.preventDefault();
    nextRef.current.focus();
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
            onKeyDown={(e) => handleEnterToNext(e, rollRef)}
          />
          {fieldErrors.name && (
            <p className="text-sm text-red-600">
              {fieldErrors.name}
            </p>
          )}

          {validationErrors.name && (
            <p className="text-sm text-red-600">
              {validationErrors.name}
            </p>
          )}

          <Input
              label="Roll Number"
              name="roll"
              value={form.roll}
              onChange={(e) => {
                setTypingStarted((prev) => ({ ...prev, roll: true }));
                handleChange(e);
                const cleanRoll = e.target.value.replace(/\D/g, "").slice(0, 10);
                const nextForm = {
                  ...form,
                  roll: cleanRoll,
                  email: cleanRoll ? `${cleanRoll}@gvpcdpgc.edu.in` : "",
                };
                clearFieldErrorIfValid("roll", nextForm);
              }}
              onBlur={() => handleBlur("roll")}
              inputRef={rollRef}
              onKeyDown={(e) => handleEnterToNext(e, passwordRef)}
            />
            {fieldErrors.roll_no && (
              <p className="text-sm text-red-600">
                {fieldErrors.roll_no}
              </p>
            )}

            {/* 🔴 LIVE ROLL VALIDATION MESSAGE */}
            {(validationErrors.roll || (touched.roll && form.roll)) && (
              isRollValid ? (
                <p className="text-sm text-emerald-600">
                  ✔ Valid roll number
                </p>
              ) : (
                <p className="text-sm text-red-600">
                  {validationErrors.roll || "Roll number must be exactly 10 digits"}
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
              onKeyDown={(e) => handleEnterToNext(e, confirmPasswordRef)}
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
              <p
                className={`text-sm font-medium ${
                  passwordStrengthMeta.label === "Strong"
                    ? "text-emerald-600"
                    : passwordStrengthMeta.label === "Medium"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                Password Strength: {passwordStrengthMeta.label}
              </p>
            </div>
          )}

          {/* CONFIRM PASSWORD */}
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
                  {validationErrors.confirmPassword || "Passwords do not match"}
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
          type="submit"
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

        </form>

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

function Input({ label, name, value, onChange, type = "text" , disabled, inputRef, onKeyDown }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
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



