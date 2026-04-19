import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { sendAnalyticsEvent, startNewAnalyticsSession } from "../../utils/analyticsSession";


export default function AdminSignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false, adminKey: false });
  const [typingStarted, setTypingStarted] = useState({ email: false, password: false, adminKey: false });
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const adminKeyRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const isFormValid = email && password && adminKey;

  const validateField = (field, values) => {
    if (field === "email") {
      if (!values.email.trim()) return "Enter your administrator email address.";
      return "";
    }
    if (field === "password") {
      if (!values.password) return "Enter your password.";
      return "";
    }
    if (field === "adminKey") {
      if (!values.adminKey) return "Enter your administrator access key.";
      return "";
    }
    return "";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const values = { email, password, adminKey };
        ["email", "password", "adminKey"].forEach((field) => {
          const currentValue = field === "adminKey" ? values.adminKey : values[field];
          const shouldValidate = touched[field] || (typingStarted[field] && currentValue.trim().length > 1);
          if (!shouldValidate) return;
          const msg = validateField(field, values);
          if (msg) next[field] = msg;
          else delete next[field];
        });
        return next;
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [email, password, adminKey, touched, typingStarted]);

  const handleBlur = (field) => {
    const values = { email, password, adminKey };
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
      return;
    }
    if (errorsMap.adminKey) {
      adminKeyRef.current?.focus();
    }
  };


  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading || loginSuccess) return;
    setError("");

    const clientErrors = {
      email: validateField("email", { email, password, adminKey }),
      password: validateField("password", { email, password, adminKey }),
      adminKey: validateField("adminKey", { email, password, adminKey }),
    };
    const normalizedErrors = Object.fromEntries(
      Object.entries(clientErrors).filter(([, value]) => value)
    );
    if (Object.keys(normalizedErrors).length > 0) {
      setTouched({ email: true, password: true, adminKey: true });
      setFieldErrors(normalizedErrors);
      setError(Object.values(normalizedErrors)[0]);
      focusFirstInvalid(normalizedErrors);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post("http://localhost:8000/login/admin", {
        email,
        password,
        access_key: adminKey
      });

      const data = response.data;

      // Store JWT token
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", "admin");
      localStorage.setItem("user", JSON.stringify(data));
      startNewAnalyticsSession({
        user_id: data.user_id,
        role: "admin",
        department: data.department ?? data.department_id ?? null,
        year: data.year ?? null,
        section: data.section ?? null,
      });
      await sendAnalyticsEvent({
        page: "/login",
        action: "login",
        role: "admin",
        metadata: {
          department: data.department ?? data.department_id ?? null,
        },
      });

      // role check
      if (data.role !== "admin") {
        throw new Error("Invalid admin credentials");
      }

      setLoginSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 1200);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Admin login failed");
      setLoading(false);
    }
  };

  const handleEnterToNext = (e, nextRef) => {
    if (e.key !== "Enter") return;
    if (nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
      return;
    }
    e.preventDefault();
    if (!loading && !loginSuccess) formRef.current?.requestSubmit();
  };

  const handleCapsLock = (e) => {
    setCapsLockOn(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
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

      {/* ✅ SUCCESS POPUP */}
      {loginSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm text-center border border-slate-700">

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

            <h2 className="text-lg font-semibold text-slate-100">
              Admin Login Successful
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              Redirecting to admin dashboard…
            </p>

            <div className="mt-4 flex justify-center">
              <CircularProgress color="inherit" />
            </div>

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
        <form ref={formRef} className="space-y-4" onSubmit={handleSignIn}>

          <Input
            label="Admin Email"
            placeholder="admin@gvpcdpgc.edu.in"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setTypingStarted((prev) => ({ ...prev, email: true }));
              setEmail(value);
              setError("");
              if (fieldErrors.email && validateField("email", { email: value, password, adminKey }) === "") {
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
          {fieldErrors.email && <p className="text-sm text-red-400">{fieldErrors.email}</p>}

          {/* PASSWORD */}
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
                if (fieldErrors.password && validateField("password", { email, password: value, adminKey }) === "") {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }
              }}
              onBlur={() => handleBlur("password")}
              inputRef={passwordRef}
              onKeyUp={handleCapsLock}
              onKeyDown={(e) => {
                handleCapsLock(e);
                handleEnterToNext(e, adminKeyRef);
              }}
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
          {fieldErrors.password && <p className="text-sm text-red-400">{fieldErrors.password}</p>}
          {capsLockOn && (
            <p className="text-xs text-amber-400" role="status" aria-live="polite">Caps Lock is on</p>
          )}

          <Input
            label="Admin Access Key"
            placeholder="Enter admin key"
            value={adminKey}
            onChange={(e) => {
              const value = e.target.value;
              setTypingStarted((prev) => ({ ...prev, adminKey: true }));
              setAdminKey(value);
              setError("");
              if (fieldErrors.adminKey && validateField("adminKey", { email, password, adminKey: value }) === "") {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.adminKey;
                  return next;
                });
              }
            }}
            onBlur={() => handleBlur("adminKey")}
            inputRef={adminKeyRef}
            onKeyDown={(e) => handleEnterToNext(e, null)}
          />
          {fieldErrors.adminKey && <p className="text-sm text-red-400">{fieldErrors.adminKey}</p>}

          {error && (
            <p className="text-sm text-red-400 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
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

        </form>

      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Input({ label, type = "text", placeholder, value, onChange, onBlur, inputRef, onKeyDown, onKeyUp }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700
                   focus:outline-none focus:ring-2 focus:ring-red-600 text-slate-100"
      />
    </div>
  );
}

