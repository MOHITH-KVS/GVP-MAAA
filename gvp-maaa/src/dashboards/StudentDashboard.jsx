import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";



/* ================= STUDENT PAGES ================= */
import StudentOverview from "../pages/Student/Overview";
import Attendance from "../pages/Student/Attendance";
import Marks from "../pages/Student/Marks";
import Timetable from "../pages/Student/Timetable";
import Assignments from "../pages/Student/Assignments";
import Events from "../pages/Student/Events";
import Resources from "../pages/Student/Resources";
import Placement from "../pages/Student/Placement";
import Insights from "../pages/Student/Insights";
import Alerts from "../pages/Student/Alerts";
import Submissions from "../pages/Student/Submissions";
import ViewProfile from "../pages/Student/ViewProfile";
import Logout from "../pages/Logout";

/* ===== Material UI Icons ===== */
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import BarChartIcon from "@mui/icons-material/BarChart";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import InsightsIcon from "@mui/icons-material/Insights";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";

import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("overview");
  const [showProfile, setShowProfile] = useState(true);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();


  // Fetch student profile on mount
    const fetchProfile = async () => {
  try {
    const token = localStorage.getItem("access_token");
    const res = await fetch("http://127.0.0.1:8000/student/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setProfile(data);
  } catch (err) {
    console.error(err);
  }
 };

  useEffect(() => {
  fetchProfile();
 }, []);


  // Prevent back navigation
  useEffect(() => {
  window.history.pushState(null, "", window.location.href);

  const handleBack = () => {
    window.history.pushState(null, "", window.location.href);
  };

  window.addEventListener("popstate", handleBack);

  return () => window.removeEventListener("popstate", handleBack);
 }, []);




  if (showFullProfile) {
      return (
    <ViewProfile
      profile={profile}
      onClose={() => {
        setShowFullProfile(false);
        fetchProfile(); // 🔥 refresh sidebar profile
      }}
    />

  );
  }

  if (showLogout) {
    return <Logout onBack={() => setShowLogout(false)} />;
  }

  if (!profile) {
  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-slate-500">Loading profile...</p>
    </div>
  );
 }


  return (
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="flex h-full">

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`transition-all duration-300 flex flex-col ${
            sidebarOpen ? "w-72" : "w-20"
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
              <MenuItem icon={DashboardIcon} label="Overview" open={sidebarOpen}
                active={activePage === "overview"} onClick={() => setActivePage("overview")} />
              <MenuItem icon={EventAvailableIcon} label="Attendance" open={sidebarOpen}
                active={activePage === "attendance"} onClick={() => setActivePage("attendance")} />
              <MenuItem icon={BarChartIcon} label="Marks" open={sidebarOpen}
                active={activePage === "marks"} onClick={() => setActivePage("marks")} />
              <MenuItem icon={AssignmentIcon} label="Assignments" open={sidebarOpen}
                active={activePage === "assignments"} onClick={() => setActivePage("assignments")} />
              <MenuItem icon={ScheduleIcon} label="Timetable" open={sidebarOpen}
                active={activePage === "timetable"} onClick={() => setActivePage("timetable")} />
            </SidebarSection>

            <SidebarSection title="Career & Growth" open={sidebarOpen}>
              <MenuItem icon={WorkIcon} label="Placement" open={sidebarOpen}
                active={activePage === "placement"} onClick={() => setActivePage("placement")} />
              <MenuItem icon={EventIcon} label="Events" open={sidebarOpen}
                active={activePage === "events"} onClick={() => setActivePage("events")} />
              <MenuItem icon={InsightsIcon} label="Insights" open={sidebarOpen}
                active={activePage === "insights"} onClick={() => setActivePage("insights")} />
              <MenuItem icon={MenuBookIcon} label="Resources" open={sidebarOpen}
                active={activePage === "resources"} onClick={() => setActivePage("resources")} />
            </SidebarSection>

            <SidebarSection title="System" open={sidebarOpen}>
              <MenuItem icon={NotificationsIcon} label="Alerts" open={sidebarOpen}
                active={activePage === "alerts"} onClick={() => setActivePage("alerts")} />
              <MenuItem icon={NotificationsIcon} label="Submissions" open={sidebarOpen}
                active={activePage === "submissions"} onClick={() => setActivePage("submissions")} />
            </SidebarSection>
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
        <main className="flex-1 p-8 flex gap-6 overflow-hidden">

          <div className="flex-1 overflow-y-auto pr-2">
            {activePage === "overview" && <StudentOverview profile={profile} />}
            {activePage === "attendance" && <Attendance />}
            {activePage === "marks" && <Marks />}
            {activePage === "assignments" && <Assignments />}
            {activePage === "timetable" && <Timetable />}
            {activePage === "events" && <Events />}
            {activePage === "resources" && <Resources />}
            {activePage === "placement" && <Placement />}
            {activePage === "insights" && <Insights />}
            {activePage === "alerts" && <Alerts />}
            {activePage === "submissions" && <Submissions />}
          </div>

          <div
            className={`transition-all duration-300 ${
              showProfile ? "w-80" : "w-14"
            } overflow-hidden`}
          >
            {showProfile ? (
              <StudentProfile
                profile={profile}
                onClose={() => setShowProfile(false)}
                onViewProfile={() => {
                  setShowFullProfile(true);
                  setShowProfile(false);
                }}
              />

            ) : (
              <CollapsedProfile onOpen={() => setShowProfile(true)} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= SMALL HELPERS ================= */

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

function MenuItem({ icon: Icon, label, open, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
        ${active ? "bg-indigo-500/10 text-indigo-700" : "hover:bg-white/60"}
        ${!open && "justify-center"}`}
    >
      <Icon fontSize="small" />
      {open && <span>{label}</span>}
    </div>
  );
}

function StudentProfile({ profile, onClose, onViewProfile }) {
  return (
    <div className="h-full glass rounded-2xl p-6 flex flex-col justify-between">
      <button onClick={onClose} className="self-end p-2 hover:bg-white/60 rounded-full">
        <CloseIcon fontSize="small" />
      </button>

      <div className="text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-indigo-500 text-white flex items-center justify-center text-3xl font-semibold">
          {profile.name?.charAt(0).toUpperCase()}
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {profile.name}
        </h3>
        <p className="text-sm text-gray-500">
          {profile.roll_no}
        </p>


        <div className="mt-6 space-y-3 text-sm text-gray-600 text-left">
          <ProfileRow label="Roll No" value={profile.roll_no} />
          <ProfileRow label="Year" value={profile.year} />
          <ProfileRow label="Semester" value={profile.semester} />
          <ProfileRow label="Certificates" value={profile.certificates} />
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <IconLink
            icon={LinkedInIcon}
            color="bg-blue-600"
            link={profile.linkedin}
          />

          <IconLink
            icon={GitHubIcon}
            color="bg-gray-800"
            link={profile.github}
          />

          <IconLink
            icon={PersonIcon}
            color="bg-indigo-600"
            link={profile.portfolio}
          />

          

        </div>
      </div>

      <button
        onClick={onViewProfile}
        className="w-full py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
      >
        View Full Profile
      </button>
    </div>
  );
}

function CollapsedProfile({ onOpen }) {
  return (
    <div className="h-full glass flex items-center justify-center">
      <button
        onClick={onOpen}
        className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center"
      >
        <PersonIcon fontSize="small" />
      </button>
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

function IconButton({ icon: Icon, color, url }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-10 h-10 flex items-center justify-center rounded-full ${color} text-white shadow hover:scale-110 transition`}
    >
      <Icon fontSize="small" />
    </a>
  );
}


function IconLink({ icon: Icon, color, link }) {
  if (!link) {
    // No link → disabled icon
    return (
      <div
        className={`w-10 h-10 flex items-center justify-center rounded-full 
        bg-gray-300 text-white cursor-not-allowed`}
        title="Link not added"
      >
        <Icon fontSize="small" />
      </div>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className={`w-10 h-10 flex items-center justify-center rounded-full 
      ${color} text-white shadow hover:scale-110 transition`}
      title={link}
    >
      <Icon fontSize="small" />
    </a>
  );
}
