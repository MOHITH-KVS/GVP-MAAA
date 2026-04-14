import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import api from "../utils/api";
import { useAlertSound } from "../hooks/useAlertSound";

/* ===== ADMIN PAGES ===== */
import Overview from "../pages/Admin/Overview";
import Students from "../pages/Admin/Students";
import Teachers from "../pages/Admin/Teachers";
import Academics from "../pages/Admin/Academics";
import Timetable from "../pages/Admin/Timetable";
import Alerts from "../pages/Admin/Alerts";
import Insights from "../pages/Admin/Insights";
import Settings from "../pages/Admin/Settings";
import ErrorBoundary from "../components/ErrorBoundary";
import Logout from "../pages/Logout";
import Smart404 from "../components/Smart404";
import { recordRouteVisit } from "../utils/navigationHistory";

/* ===== ICONS ===== */
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import NotificationsIcon from "@mui/icons-material/Notifications";
import BarChartIcon from "@mui/icons-material/BarChart";
import WorkIcon from "@mui/icons-material/Work";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

/* ================= ADMIN DASHBOARD ================= */

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useAlertSound(alerts);

  const availableAdminPages = [
    "overview",
    "students",
    "teachers",
    "academics",
    "timetable",
    "alerts",
    "insights",
    "placement",
    "settings",
  ];

  const activePage = location.pathname.replace(/\/$/, "").split("/")[2] || "overview";

  useEffect(() => {
    if (!availableAdminPages.includes(activePage)) {
      return;
    }

    const path = activePage === "overview" ? "/admin" : `/admin/${activePage}`;
    const labelMap = {
      overview: "Dashboard",
      students: "Manage Users",
      insights: "View Reports",
    };

    recordRouteVisit({ label: labelMap[activePage] || "Dashboard", path, role: "admin" });
  }, [activePage]);

  useEffect(() => {
    let isMounted = true;

    const fetchAdminAlerts = async () => {
      try {
        const response = await api.get("/api/admin/alerts");
        if (!isMounted) {
          return;
        }

        setAlerts(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching admin alerts", error);
      }
    };

    fetchAdminAlerts();
    const intervalId = setInterval(fetchAdminAlerts, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  /* ===== LOGOUT FLOW ===== */
  if (showLogout) {
    return (
      <Logout
        role="admin"
        onBack={() => setShowLogout(false)}
      />
    );
  }

  if (!availableAdminPages.includes(activePage)) {
    return <Smart404 />;
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="flex h-full">

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`transition-all duration-300 flex flex-col ${sidebarOpen ? "w-72" : "w-20"} p-4 glass border-r border-white/40`}
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

          {/* MENU GROUP */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex flex-col gap-2">
              <SidebarSection title="Management" open={sidebarOpen}>
                <MenuItem
                  icon={DashboardIcon}
                  label="Overview"
                  open={sidebarOpen}
                  active={activePage === "overview"}
                  onClick={() => navigate("/admin")}
                />

                <MenuItem
                  icon={PeopleIcon}
                  label="Students"
                  open={sidebarOpen}
                  active={activePage === "students"}
                  onClick={() => navigate("/admin/students")}
                />

                <MenuItem
                  icon={SchoolIcon}
                  label="Teachers"
                  open={sidebarOpen}
                  active={activePage === "teachers"}
                  onClick={() => navigate("/admin/teachers")}
                />
              </SidebarSection>

              <SidebarSection title="Academics" open={sidebarOpen}>
                <MenuItem
                  icon={MenuBookIcon}
                  label="Academics"
                  open={sidebarOpen}
                  active={activePage === "academics"}
                  onClick={() => navigate("/admin/academics")}
                />

                <MenuItem
                  icon={EventAvailableIcon}
                  label="Timetable"
                  open={sidebarOpen}
                  active={activePage === "timetable"}
                  onClick={() => navigate("/admin/timetable")}
                />
              </SidebarSection>

              <SidebarSection title="Monitoring" open={sidebarOpen}>
                <MenuItem
                  icon={NotificationsIcon}
                  label="Alerts"
                  open={sidebarOpen}
                  active={activePage === "alerts"}
                  onClick={() => navigate("/admin/alerts")}
                />

                <MenuItem
                  icon={BarChartIcon}
                  label="Insights"
                  open={sidebarOpen}
                  active={activePage === "insights"}
                  onClick={() => navigate("/admin/insights")}
                />

                <MenuItem
                  icon={WorkIcon}
                  label="Placement"
                  open={sidebarOpen}
                  active={activePage === "placement"}
                  onClick={() => navigate("/admin/placement")}
                />
              </SidebarSection>

              <SidebarSection title="System" open={sidebarOpen}>
                <MenuItem
                  icon={SettingsIcon}
                  label="Settings"
                  open={sidebarOpen}
                  active={activePage === "settings"}
                  onClick={() => navigate("/admin/settings")}
                />
              </SidebarSection>
            </div>

            <div className="flex-1" />
          </div>

          <div className="pt-4 border-t border-white/40">
            <button
              onClick={() => setShowLogout(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50"
            >
              <LogoutIcon fontSize="small" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
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
