import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import Overview from "../pages/Teacher/Overview";
import Timetable from "../pages/Teacher/Timetable";
import Attendance from "../pages/Teacher/Attendance";
import Assignment from "../pages/Teacher/Assignment";
import Marks from "../pages/Teacher/Marks";
import Resources from "../pages/Teacher/Resources";
import Events from "../pages/Teacher/Events";
import Insights from "../pages/Teacher/Insights";
import UploadResourceModal from "../pages/Teacher/UploadResourceModal";
import GiveAlertModal from "../pages/Teacher/GiveAlertModal";
import Alerts from "../pages/Teacher/Alerts";
import Logout from "../pages/Logout";
import TeacherProfilePage from "../pages/Teacher/TeacherProfilePage";
import Placement from "../pages/Teacher/Placement";
import PlacementCoordinator from "../pages/Teacher/PlacementCoordinator";
import Smart404 from "../components/Smart404";
import TeacherChat from "../pages/Teacher/TeacherChat";
import Avatar from "../components/Avatar";
import { recordRouteVisit } from "../utils/navigationHistory";
import { useAlertSound } from "../hooks/useAlertSound";

/* ICONS */
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BarChartIcon from "@mui/icons-material/BarChart";
import InsightsIcon from "@mui/icons-material/Insights";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LanguageIcon from "@mui/icons-material/Language";
import PersonIcon from "@mui/icons-material/Person";
import GitHubIcon from "@mui/icons-material/GitHub";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SkeletonBox from "../components/skeletons/SkeletonBox";

/* EXTRA ICONS */
import FolderIcon from "@mui/icons-material/Folder";
import EventIcon from "@mui/icons-material/Event";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CampaignIcon from "@mui/icons-material/Campaign";
import WorkIcon from "@mui/icons-material/Work";

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("overview");
  const [showProfile, setShowProfile] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [showUploadResource, setShowUploadResource] = useState(false);
  const [showGiveAlert, setShowGiveAlert] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const unreadCount = alerts.filter(a => !a.is_read).length;

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useAlertSound(alerts);

  const availableTeacherPages = [
    "overview",
    "timetable",
    "attendance",
    "assignments",
    "marks",
    "resources",
    "events",
    "insights",
    "alerts",
    "placement",
    "placement-coordinator",
    "ai-assistant",
  ];

  const resolvePageFromPath = (pathname) => {
    const parts = pathname.split("/").filter(Boolean);
    const page = parts[1] || "overview";
    return availableTeacherPages.includes(page) ? page : "overview";
  };

  const isValidPage = availableTeacherPages.includes(resolvePageFromPath(location.pathname));

  const goToPage = (page) => {
    const targetPath = page === "overview" ? "/teacher" : `/teacher/${page}`;
    setActivePage(page);
    navigate(targetPath);
  };

  useEffect(() => {
    setActivePage(resolvePageFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (!isValidPage) {
      return;
    }

    const page = resolvePageFromPath(location.pathname);
    const path = page === "overview" ? "/teacher" : `/teacher/${page}`;
    const labelMap = {
      attendance: "Take Attendance",
      marks: "Upload Marks",
      overview: "View Classes",
    };

    recordRouteVisit({ label: labelMap[page] || "View Classes", path, role: "teacher" });
  }, [isValidPage, location.pathname]);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/faculty/profile");
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    fetchProfile();
  }, []);


  useEffect(() => {
    let isMounted = true;

    const sortAlertsByCreatedAtDesc = (list) => {
      return [...list].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    };

    const fetchAlerts = async () => {
      try {
        const res = await api.get("/faculty/alerts");
        const nextAlerts = Array.isArray(res.data) ? sortAlertsByCreatedAtDesc(res.data) : [];
        if (isMounted) {
          setAlerts(nextAlerts);
        }
      } catch (error) {
        console.error("Error fetching alerts", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (showLogout) {
    return <Logout onBack={() => setShowLogout(false)} role="teacher" />;
  }

  if (!isValidPage) {
    return <Smart404 />;
  }

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-full max-w-xl p-8">
          <SkeletonBox className="h-10 w-56" />
          <SkeletonBox className="h-4 w-80 mt-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <SkeletonBox className="h-28 w-full rounded-xl" />
            <SkeletonBox className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="flex h-full">

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`transition-[width] duration-300 ease-out flex flex-col ${sidebarOpen ? "w-72" : "w-20"
            } p-4 glass border-r border-white/40`}
        >
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <h2 className="text-xl font-semibold text-indigo-600">
                GVP-MAAA
              </h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/60"
            >
              <MenuIcon fontSize="small" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <SidebarSection title="Academics" open={sidebarOpen}>
              <MenuItem
                icon={DashboardIcon}
                label="Overview"
                open={sidebarOpen}
                active={activePage === "overview"}
                onClick={() => goToPage("overview")}
              />
              <MenuItem
                icon={DashboardIcon}
                label="Timetable"
                open={sidebarOpen}
                active={activePage === "timetable"}
                onClick={() => goToPage("timetable")}
              />
              <MenuItem
                icon={EventAvailableIcon}
                label="Attendance"
                open={sidebarOpen}
                active={activePage === "attendance"}
                onClick={() => goToPage("attendance")}
              />
              <MenuItem
                icon={AssignmentIcon}
                label="Assignments"
                open={sidebarOpen}
                active={activePage === "assignments"}
                onClick={() => goToPage("assignments")}
              />
              <MenuItem
                icon={BarChartIcon}
                label="Marks"
                open={sidebarOpen}
                active={activePage === "marks"}
                onClick={() => goToPage("marks")}
              />
            </SidebarSection>

            <SidebarSection title="Teaching Hub" open={sidebarOpen}>
              <MenuItem
                icon={FolderIcon}
                label="Resources"
                open={sidebarOpen}
                active={activePage === "resources"}
                onClick={() => goToPage("resources")}
              />
              <MenuItem
                icon={EventIcon}
                label="Events"
                open={sidebarOpen}
                active={activePage === "events"}
                onClick={() => goToPage("events")}
              />
              <MenuItem
                icon={InsightsIcon}
                label="Insights"
                open={sidebarOpen}
                active={activePage === "insights"}
                onClick={() => goToPage("insights")}
              />
              <MenuItem
                icon={WorkIcon}
                label="Placement"
                open={sidebarOpen}
                active={activePage === "placement"}
                onClick={() => goToPage("placement")}
              />
              <MenuItem
                icon={WorkIcon}
                label="Placement Coordinator"
                open={sidebarOpen}
                active={activePage === "placement-coordinator"}
                onClick={() => goToPage("placement-coordinator")}
              />
              <MenuItem
                icon={AutoAwesomeIcon}
                label="AI Assistant"
                open={sidebarOpen}
                active={activePage === "ai-assistant"}
                onClick={() => goToPage("ai-assistant")}
                isAI
              />
            </SidebarSection>

            <div className="mt-6 mb-6">
              {sidebarOpen && (
                <p className="text-xs uppercase text-gray-400 tracking-wider mb-3">
                  Quick Actions
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => setShowUploadResource(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  <UploadFileIcon fontSize="small" />
                  {sidebarOpen && <span>Upload Resource</span>}
                </button>


                <button
                  onClick={() => setShowGiveAlert(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl 
                            border border-amber-200 text-amber-700 
                            bg-amber-50 hover:bg-amber-100 transition"
                >
                  <CampaignIcon fontSize="small" />
                  {sidebarOpen && <span>Give Alert</span>}
                </button>

              </div>
            </div>

            <SidebarSection title="System" open={sidebarOpen}>
              <div className="relative">
                <MenuItem
                  icon={NotificationsIcon}
                  label="Alerts"
                  open={sidebarOpen}
                  active={activePage === "alerts"}
                  onClick={() => goToPage("alerts")}
                />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-4 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>


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
        <main className="flex-1 p-8 flex gap-6 overflow-y-auto">

          {/* ===== MAIN CONTENT (FIXED SAFE PADDING) ===== */}
          <div
            className={`flex-1 relative z-10 transition-all ${!showProfile ? "pr-16" : ""
              }`}
          >
            {activePage === "overview" && <Overview profile={profile} alerts={alerts} />}
            {activePage === "timetable" && <Timetable />}
            {activePage === "attendance" && <Attendance />}
            {activePage === "assignments" && <Assignment />}
            {activePage === "marks" && <Marks />}
            {activePage === "resources" && <Resources />}
            {activePage === "events" && <Events />}
            {activePage === "insights" && <Insights />}
            {activePage === "placement" && <Placement />}
            {activePage === "placement-coordinator" && <PlacementCoordinator />}
            {activePage === "alerts" && (
              <Alerts
                alerts={alerts}
                setAlerts={setAlerts}
                loading={loading}
              />
            )}
            {activePage === "ai-assistant" && <TeacherChat />}
          </div>

          {/* ================= PROFILE ================= */}
          <div
            className={`transition-all duration-300 ${showProfile ? "w-80" : "w-14"
              } overflow-hidden`}
          >
            {showProfile ? (
              <TeacherProfile
                profile={profile}
                onClose={() => setShowProfile(false)}
                onViewFullProfile={() => setShowFullProfile(true)}
              />
            ) : (
              <CollapsedTeacherProfile onOpen={() => setShowProfile(true)} />
            )}


          </div>

        </main>
        {/* ================= FULL PROFILE PAGE ================= */}
        {showFullProfile && (
          <TeacherProfilePage
            profile={profile}
            onBack={() => setShowFullProfile(false)}
          />
        )}
        {/* ================= UPLOAD RESOURCE MODAL ================= */}
        {showUploadResource && (
          <UploadResourceModal
            onClose={() => setShowUploadResource(false)}
          />
        )}
        {/* ================= GIVE ALERT MODAL ================= */}
        {showGiveAlert && (
          <GiveAlertModal
            onClose={() => setShowGiveAlert(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ================= PROFILE ================= */

function TeacherProfile({ profile, onClose, onViewFullProfile }) {
  return (
    <div className="h-full rounded-2xl overflow-hidden pointer-events-auto">
      <div className="h-full glass p-6 flex flex-col justify-between">
        <button
          onClick={onClose}
          className="self-end p-2 rounded-full hover:bg-white/60 transition"
        >
          <CloseIcon fontSize="small" />
        </button>

        <div className="text-center">
          <Avatar name={profile?.name || "Teacher"} sizeClass="w-24 h-24 text-3xl" dotClass="w-4 h-4" />
          <h3 className="mt-4 text-lg font-semibold">
            {profile?.name || "Faculty"}
          </h3>
          <p className="text-sm text-gray-500">
            {profile?.designation || "Faculty"}
          </p>


          <div className="mt-6 space-y-3 text-sm text-gray-600 text-left">
            <ProfileRow label="Email" value={profile?.email || "—"} />
            <ProfileRow label="Phone" value={profile?.phone || "—"} />
            <ProfileRow label="Expertise" value={profile?.expertise?.join(", ") || "—"} />
          </div>

          <div className="mt-6 flex justify-center gap-4">
            {profile?.linkedin && (
              <IconButton
                icon={LinkedInIcon}
                color="bg-blue-600"
                onClick={() => window.open(profile.linkedin, "_blank")}
              />
            )}

            {profile?.github && (
              <IconButton
                icon={GitHubIcon}
                color="bg-gray-800"
                onClick={() => window.open(profile.github, "_blank")}
              />
            )}

            {profile?.portfolio && (
              <IconButton
                icon={LanguageIcon}
                color="bg-indigo-600"
                onClick={() => window.open(profile.portfolio, "_blank")}
              />
            )}

          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onViewFullProfile}
            className="w-full py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            View Full Profile
          </button>


          <button className="w-full py-2 rounded-xl border border-gray-300 text-gray-600">
            View Resume
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function SidebarSection({ title, open, children }) {
  return (
    <div className="mb-6">
      {open && <p className="text-xs uppercase text-gray-400 mb-2">{title}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, open, active, onClick, danger, isAI }) {
  if (isAI) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 relative
          ${active 
            ? "border-l-4 border-indigo-600 bg-gradient-to-r from-indigo-50 to-white text-indigo-700 shadow-sm" 
            : "text-indigo-600 hover:bg-indigo-50/50 hover:shadow-sm"
          }
          ${!open && "justify-center border-l-0"}`}
      >
        <div className="relative">
          <Icon fontSize="small" className={active ? "text-indigo-600" : "text-indigo-500"} />
          {!active && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 rounded-full animate-pulse blur-[1px]"></span>
          )}
        </div>
        {open && <span className="font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">{label}</span>}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
      ${!open && "justify-center"}
      ${danger
          ? "text-red-500 hover:bg-red-50"
          : active
            ? "bg-indigo-500/10 text-indigo-700"
            : "hover:bg-gray-100"
        }`}
    >
      <Icon fontSize="small" />
      {open && <span>{label}</span>}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function IconButton({ icon: Icon, color }) {
  return (
    <button
      className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center`}
    >
      <Icon fontSize="small" />
    </button>
  );
}

function CollapsedTeacherProfile({ onOpen }) {
  return (
    <div className="h-full glass flex items-center justify-center pointer-events-auto">
      <button
        onClick={onOpen}
        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow"
      >
        <PersonIcon fontSize="small" />
      </button>
    </div>
  );
}