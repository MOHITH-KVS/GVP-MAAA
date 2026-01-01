import { useState } from "react";

/* ===== ADMIN PAGES ===== */
import Overview from "../pages/Admin/Overview";
import Students from "../pages/Admin/Students";
/*import Teachers from "../pages/Admin/Teachers";
import Academics from "../pages/Admin/Academics";
import Timetable from "../pages/Admin/Timetable";
import Alerts from "../pages/Admin/Alerts";
import Analytics from "../pages/Admin/Analytics";
import Reports from "../pages/Admin/Reports";
import Settings from "../pages/Admin/Settings";
import Logout from "../pages/Logout";*/

/* ===== ICONS ===== */
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import NotificationsIcon from "@mui/icons-material/Notifications";
import BarChartIcon from "@mui/icons-material/BarChart";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

/* ================= ADMIN DASHBOARD ================= */

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("overview");
  const [showLogout, setShowLogout] = useState(false);

  /* ===== LOGOUT FLOW ===== */
  if (showLogout) {
    return <Logout onBack={() => setShowLogout(false)} role="admin" />;
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="flex h-full">

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`transition-[width] duration-300 ease-out flex flex-col
          ${sidebarOpen ? "w-72" : "w-20"}
          p-4 glass border-r border-white/40`}
        >
          {/* LOGO */}
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <h2 className="text-xl font-semibold text-indigo-700">
                GVP-MAAA Admin
              </h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/60"
            >
              <MenuIcon fontSize="small" />
            </button>
          </div>

          {/* MENU */}
          <div className="flex-1 overflow-y-auto">

            <SidebarSection title="Management" open={sidebarOpen}>
              <MenuItem
                icon={DashboardIcon}
                label="Dashboard"
                open={sidebarOpen}
                active={activePage === "overview"}
                onClick={() => setActivePage("overview")}
              />

              <MenuItem
                icon={PeopleIcon}
                label="Students"
                open={sidebarOpen}
                active={activePage === "students"}
                onClick={() => setActivePage("students")}
              />

              <MenuItem
                icon={SchoolIcon}
                label="Teachers"
                open={sidebarOpen}
                active={activePage === "teachers"}
                onClick={() => setActivePage("teachers")}
              />
            </SidebarSection>

            <SidebarSection title="Academics" open={sidebarOpen}>
              <MenuItem
                icon={MenuBookIcon}
                label="Academics"
                open={sidebarOpen}
                active={activePage === "academics"}
                onClick={() => setActivePage("academics")}
              />

              <MenuItem
                icon={EventAvailableIcon}
                label="Timetable"
                open={sidebarOpen}
                active={activePage === "timetable"}
                onClick={() => setActivePage("timetable")}
              />
            </SidebarSection>

            <SidebarSection title="Monitoring" open={sidebarOpen}>
              <MenuItem
                icon={NotificationsIcon}
                label="Alerts"
                open={sidebarOpen}
                active={activePage === "alerts"}
                onClick={() => setActivePage("alerts")}
              />

              <MenuItem
                icon={BarChartIcon}
                label="Analytics"
                open={sidebarOpen}
                active={activePage === "analytics"}
                onClick={() => setActivePage("analytics")}
              />

              <MenuItem
                icon={ReportProblemIcon}
                label="Reports"
                open={sidebarOpen}
                active={activePage === "reports"}
                onClick={() => setActivePage("reports")}
              />
            </SidebarSection>

            <SidebarSection title="System" open={sidebarOpen}>
              <MenuItem
                icon={SettingsIcon}
                label="Settings"
                open={sidebarOpen}
                active={activePage === "settings"}
                onClick={() => setActivePage("settings")}
              />

              <MenuItem
                icon={LogoutIcon}
                label="Logout"
                open={sidebarOpen}
                danger
                onClick={() => setShowLogout(true)}
              />
            </SidebarSection>

          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <main className="flex-1 p-8 overflow-y-auto">

          {activePage === "overview" && <Overview />}
          {activePage === "students" && <Students />}
          {activePage === "teachers" && <Teachers />}
          {activePage === "academics" && <Academics />}
          {activePage === "timetable" && <Timetable />}
          {activePage === "alerts" && <Alerts />}
          {activePage === "analytics" && <Analytics />}
          {activePage === "reports" && <Reports />}
          {activePage === "settings" && <Settings />}

        </main>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function SidebarSection({ title, open, children }) {
  return (
    <div className="mb-6">
      {open && (
        <p className="text-xs uppercase text-gray-400 mb-2 tracking-wider">
          {title}
        </p>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, open, active, onClick, danger }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
        ${active ? "bg-indigo-500/10 text-indigo-700" : "hover:bg-white/60"}
        ${danger && "text-red-600 hover:bg-red-50"}
        ${!open && "justify-center"}`}
    >
      <Icon fontSize="small" />
      {open && <span>{label}</span>}
    </div>
  );
}
