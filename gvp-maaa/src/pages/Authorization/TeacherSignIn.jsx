import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchoolIcon from "@mui/icons-material/School";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import axios from "axios";

/* ===== ALLOWED COLLEGE DOMAINS ===== */
const ALLOWED_DOMAINS = ["@gvpcdpgc.edu.in"];

export default function TeacherSignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [typingStarted, setTypingStarted] = useState({ email: false, password: false });
  const [loginSuccess, setLoginSuccess] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);


  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));
  const isFormValid =
  email &&
  password &&
  isValidCollegeEmail(email);

  const validateField = (field, values) => {
    if (field === "email") {
      if (!values.email.trim()) return "Please enter your email.";
      if (!isValidCollegeEmail(values.email)) return "Please use your official college email (@gvpcdpgc.edu.in).";
      return "";
    }
    if (field === "password") {
      if (!values.password) return "Please enter your password.";
      return "";
    }
    return "";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const values = { email, password };
        ["email", "password"].forEach((field) => {
          const shouldValidate = touched[field] || (typingStarted[field] && values[field].trim().length > 1);
          if (!shouldValidate) return;
          const msg = validateField(field, values);
          if (msg) next[field] = msg;
          else delete next[field];
        });
        return next;
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [email, password, touched, typingStarted]);

  const handleBlur = (field) => {
    const values = { email, password };
    setTouched((prev) => ({ ...prev, [field]: true }));
    const msg = validateField(field, values);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const focusFirstInvalid = (errorsMap) => {
    if (errorsMap.email) {
      emailRef.current?.focus();
      return;
    }
    if (errorsMap.password) {
      passwordRef.current?.focus();
    }
  };


  const handleSignIn = async (e) => {
  e.preventDefault();
  if (loading) return;
  setError("");

  const clientErrors = {
    email: validateField("email", { email, password }),
    password: validateField("password", { email, password }),
  };
  const normalizedErrors = Object.fromEntries(
    Object.entries(clientErrors).filter(([, value]) => value)
  );
  if (Object.keys(normalizedErrors).length > 0) {
    setTouched({ email: true, password: true });
    setFieldErrors(normalizedErrors);
    setError(Object.values(normalizedErrors)[0]);
    focusFirstInvalid(normalizedErrors);
    return;
  }

  try {
    setLoading(true);

    const response = await axios.post("http://localhost:8000/login", {
      email,
      password
    });

    const data = response.data;

    // Store JWT token
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("role", "faculty");
    localStorage.setItem("user", JSON.stringify(data));

    // role check
    if (data.role !== "faculty") {
      throw new Error("Invalid teacher credentials");
    }

    setLoginSuccess(true);

    setTimeout(() => {
      navigate("/teacher", { replace: true });
    }, 1200);

  } catch (err) {
    setTimeout(() => {
      setLoading(false);
      setError(err.response?.data?.detail || err.message || "Login failed");
    }, 1000);
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

      {/* ✅ SUCCESS POPUP */}
      {loginSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-sm text-center animate-scaleIn">

            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
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
              Login Successful
            </h2>

            <p className="text-sm text-slate-600 mt-2">
              Redirecting to your teaching dashboard...
            </p>

            <div className="mt-4 flex justify-center">
              <CircularProgress />
            </div>

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

        <form className="space-y-5" onSubmit={handleSignIn}>

          <Input
            label="College email"
            placeholder="faculty@gvpcdpgc.edu.in"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setTypingStarted((prev) => ({ ...prev, email: true }));
              setEmail(value);
              setError("");
              if (fieldErrors.email && validateField("email", { email: value, password }) === "") {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }
            }}
            onBlur={() => handleBlur("email")}
            inputRef={emailRef}
            onKeyDown={(e) => handleEnterToNext(e, passwordRef)}
          />
          {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setTypingStarted((prev) => ({ ...prev, password: true }));
                setPassword(value);
                setError("");
                if (fieldErrors.password && validateField("password", { email, password: value }) === "") {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }
              }}
              onBlur={() => handleBlur("password")}
              inputRef={passwordRef}
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

          {fieldErrors.password && <p className="text-sm text-red-600">{fieldErrors.password}</p>}

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2
              ${
                loading || !isFormValid
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
          >

            {loading ? (
              <>
                <CircularProgress size={18} color="inherit" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}

          </button>
        </form>

        <div className="flex justify-between text-sm text-slate-500 mt-4">
          <button onClick={() => navigate("/auth/forgot-password")}>
            Forgot password?
          </button>

          <button
            onClick={() => navigate("/auth/teacher/signup")}
            className="hover:underline text-indigo-600 font-medium"
          >
            Create account
          </button>
        </div>

      </div>
    </div>
  );
}

/* ===== HELPERS ===== */

function Input({ label, type = "text", placeholder, value, onChange, inputRef, onKeyDown }) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

