import { BrowserRouter, Routes, Route } from "react-router-dom";

/* DASHBOARDS */
import StudentDashboard from "./dashboards/StudentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

/* AUTH PAGES */
import RoleSelect from "./pages/Authorization/RoleSelect";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ENTRY / AUTH */}
        <Route path="/" element={<RoleSelect />} />
        <Route path="/auth" element={<RoleSelect />} />

        {/* DASHBOARDS (temporary direct access) */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}
