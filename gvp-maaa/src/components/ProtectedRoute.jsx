import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");

  const normalizeRole = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "teacher" ? "faculty" : normalized;
  };

  // ❌ Not logged in
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  // ❌ Role mismatch
  if (allowedRole && normalizeRole(role) !== normalizeRole(allowedRole)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Allowed
  return children;
}
