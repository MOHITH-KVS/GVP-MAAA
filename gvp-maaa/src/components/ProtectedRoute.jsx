import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");

  // ❌ Not logged in
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  // ❌ Role mismatch
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // ✅ Allowed
  return children;
}
