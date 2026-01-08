import { useNavigate } from "react-router-dom";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import CastForEducationIcon from "@mui/icons-material/CastForEducation";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50">

      {/* BACKGROUND DECOR */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl"></div>

      {/* GRID OVERLAY */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* MAIN */}
      <div className="relative z-10 w-full max-w-4xl px-6">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-slate-800">
            Welcome to{" "}
            <span className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              GVP-MAAA
            </span>
          </h1>
          <p className="text-slate-500 mt-2">
            Select your role to continue
          </p>
        </div>

        {/* ROLE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* STUDENT */}
          <RoleCard
            icon={LocalLibraryIcon}
            title="Student"
            desc="Access courses, attendance, performance and insights."
            gradient="from-blue-500 to-cyan-500"
            onClick={() => navigate("/auth/student/signin")}
          />

          {/* TEACHER */}
          <RoleCard
            icon={CastForEducationIcon}
            title="Teacher"
            desc="Manage classes, assignments, alerts and analytics."
            gradient="from-indigo-500 to-purple-500"
            onClick={() => navigate("/auth/teacher/signin")}
          />

          {/* ADMIN */}
          <RoleCard
            icon={AdminPanelSettingsIcon}
            title="Administrator"
            desc="Institution control, analytics and system configuration."
            gradient="from-slate-700 to-slate-900"
            restricted
            onClick={() => navigate("/auth/admin/signin")}
          />

        </div>

        {/* FOOTER */}
        <p className="text-center text-sm font-medium text-slate-600 mt-12">
          Administrative access is restricted to authorized personnel only.
        </p>

      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, gradient, onClick, restricted }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl p-6 border
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                 hover:ring-2 hover:ring-indigo-200"
    >
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient}
                    flex items-center justify-center text-white mb-6`}
      >
        <Icon fontSize="medium" />
      </div>

      <h3 className="text-lg font-semibold text-slate-800">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mt-2">
        {desc}
      </p>

      {restricted && (
        <span className="inline-block mt-4 px-3 py-1 text-xs font-semibold
                         text-red-600 bg-red-50 rounded-full">
          Restricted access
        </span>
      )}
    </div>
  );
}
