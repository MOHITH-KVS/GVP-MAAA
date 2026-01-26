import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("user_role");

  // ❌ No token → login
  if (!token) {
    return <Navigate to="/auth/student/signin" replace />;
  }

  // ❌ Role mismatch → block
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // ✅ Access allowed
  return children;
}
