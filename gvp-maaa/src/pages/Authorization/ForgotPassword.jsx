import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SchoolIcon from "@mui/icons-material/School";
import CircularProgress from "@mui/material/CircularProgress";

const ALLOWED_DOMAINS = ["@gvpcdpgc.edu.in"];

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isValidCollegeEmail = (email) =>
    ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));

  const handleSubmit = async () => {
    setError("");

    if (!email) {
      setError("Please enter your college email.");
      return;
    }

    if (!isValidCollegeEmail(email)) {
      setError("Use your official college email.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:8000/forgot-password?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to send reset link");
      }

      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4">
            <SchoolIcon />
          </div>

          <h1 className="text-2xl font-semibold text-slate-800">
            Forgot Password
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Enter your registered college email
          </p>
        </div>

        {!success ? (
          <>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="yourname@gvpcdpgc.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500"
              />

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-medium transition
                  ${
                    loading
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
              >
                {loading ? (
                  <div className="flex justify-center">
                    <CircularProgress size={20} color="inherit" />
                  </div>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>

            <button
              onClick={() => navigate("/auth")}
              className="mt-4 text-sm text-indigo-600 hover:underline w-full"
            >
              Back to Login
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-green-600 font-medium">
              ✅ Password reset link sent!
            </p>

            <p className="text-sm text-slate-500 mt-2">
              Please check your email.
            </p>

            <button
              onClick={() => navigate("/auth")}
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

