import { BrowserRouter, Routes, Route } from "react-router-dom";

/* AUTH */
import RoleSelect from "./pages/Authorization/RoleSelect";
import StudentSignIn from "./pages/Authorization/StudentSignIn";

/* DASHBOARDS (keep for later) */
import StudentDashboard from "./dashboards/StudentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Role selection */}
        <Route path="/" element={<RoleSelect />} />
        <Route path="/auth" element={<RoleSelect />} />

        {/* Student auth */}
        <Route
          path="/auth/student/signin"
          element={<StudentSignIn />}
        />

        {/* Dashboards (temporary direct access) */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}
