import { BrowserRouter, Routes, Route } from "react-router-dom";

/* ================= AUTH ================= */
import RoleSelect from "./pages/Authorization/RoleSelect";

/* FORGOT PASSWORD */
import ForgotPassword from "./pages/Authorization/ForgotPassword";

/* RESET PASSWORD */
import ResetPassword from "./pages/Authorization/ResetPassword";


/* STUDENT AUTH */
import StudentSignIn from "./pages/Authorization/StudentSignIn";
import StudentSignUp from "./pages/Authorization/StudentSignUp";
import StudentAccountSuccess from "./pages/Authorization/StudentAccountSuccess";


/* TEACHER AUTH */
import TeacherSignIn from "./pages/Authorization/TeacherSignIn";
import TeacherSignUp from "./pages/Authorization/TeacherSignUp";
import TeacherAccountSuccess from "./pages/Authorization/TeacherAccountSuccess";

/* ADMIN AUTH */
import AdminSignIn from "./pages/Authorization/AdminSignIn";
import AdminAccountSuccess from "./pages/Authorization/AdminAccountSuccess";

/* ================= PROTECTED ROUTE ================= */
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Smart404 from "./components/Smart404";


/* ================= DASHBOARDS ================= */
import StudentDashboard from "./dashboards/StudentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

/* ================= ADMIN SUB-PAGES ================= */
import Overview from "./pages/Admin/Overview";
import Students from "./pages/Admin/Students";
import Teachers from "./pages/Admin/Teachers";
import Academics from "./pages/Admin/Academics";
import Timetable from "./pages/Admin/Timetable";
import Alerts from "./pages/Admin/Alerts";
import Insights from "./pages/Admin/Insights";
import Settings from "./pages/Admin/Settings";
import AdminPlacement from "./pages/Admin/Placement";
import PlacementDriveDetails from "./pages/Admin/PlacementDriveDetails";

/* ================= STUDENT SUB-PAGES ================= */
import StudentAgentView from "./pages/Student/StudentAgentView";

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

        {/* ================= ADMIN AUTH ================= */}
        <Route path="/auth/admin/signin" element={<AdminSignIn />} />
        <Route
          path="/auth/admin/success"
          element={<AdminAccountSuccess />}
        />

      
        {/* ================= DASHBOARDS ================= */}
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="academics" element={<Academics />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="insights" element={<Insights />} />
          <Route path="placement" element={<AdminPlacement />} />
          <Route path="placement/drives/:id" element={<PlacementDriveDetails />} />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        </Route>

        <Route
          path="/student/ai-insights"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentAgentView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute allowedRole="faculty">
              <TeacherDashboard />
            </ProtectedRoute>
          }
       />
      {/* FORGOT PASSWORD */}
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      {/* RESET PASSWORD */}
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="*" element={<Smart404 />} />


      </Routes>
    </BrowserRouter>
  );
}
