import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const user = JSON.parse(localStorage.getItem("user"));

  // not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // role not allowed
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
