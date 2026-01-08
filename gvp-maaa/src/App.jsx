import { BrowserRouter, Routes, Route } from "react-router-dom";

/* ================= AUTH ================= */
import RoleSelect from "./pages/Authorization/RoleSelect";

/* STUDENT AUTH */
import StudentSignIn from "./pages/Authorization/StudentSignIn";
import StudentSignUp from "./pages/Authorization/StudentSignUp";
import StudentAccountSuccess from "./pages/Authorization/StudentAccountSuccess";

/* TEACHER AUTH */
import TeacherSignIn from "./pages/Authorization/TeacherSignIn";
import TeacherSignUp from "./pages/Authorization/TeacherSignUp";
import TeacherAccountSuccess from "./pages/Authorization/TeacherAccountSuccess";


/* ================= DASHBOARDS ================= */
import StudentDashboard from "./dashboards/StudentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= ROLE SELECTION ================= */}
        <Route path="/" element={<RoleSelect />} />
        <Route path="/auth" element={<RoleSelect />} />

        {/* ================= STUDENT AUTH ================= */}
        <Route path="/auth/student/signin" element={<StudentSignIn />} />
        <Route path="/auth/student/signup" element={<StudentSignUp />} />
        <Route
          path="/auth/student/success"
          element={<StudentAccountSuccess />}
        />

        {/* ================= TEACHER AUTH ================= */}
        <Route path="/auth/teacher/signin" element={<TeacherSignIn />} />
        <Route path="/auth/teacher/signup" element={<TeacherSignUp />} />
        <Route
          path="/auth/teacher/success"
          element={<TeacherAccountSuccess />}
        />


        {/* ================= DASHBOARDS ================= */}
        {/* (temporary direct access – backend auth later) */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}
