import { useState } from "react";
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

/* EXTRA ICONS */
import FolderIcon from "@mui/icons-material/Folder";
import EventIcon from "@mui/icons-material/Event";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CampaignIcon from "@mui/icons-material/Campaign";

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("overview");
  const [showProfile, setShowProfile] = useState(true);
  const [showLogout, setShowLogout] = useState(false);
  const [showUploadResource, setShowUploadResource] = useState(false);
  const [showGiveAlert, setShowGiveAlert] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);



  if (showLogout) {
  return <Logout onBack={() => setShowLogout(false)} role="teacher" />;
}
if (showFullProfile) {
  return (
    <TeacherProfilePage
      onBack={() => setShowFullProfile(false)}
    />
  );
}



  return (
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="flex h-full">

        {/* ================= SIDEBAR ================= */}
        <aside
          className={`transition-[width] duration-300 ease-out flex flex-col ${
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
              <MenuItem
                icon={DashboardIcon}
                label="Overview"
                open={sidebarOpen}
                active={activePage === "overview"}
                onClick={() => setActivePage("overview")}
              />
              <MenuItem
                icon={DashboardIcon}
                label="Timetable"
                open={sidebarOpen}
                active={activePage === "timetable"}
                onClick={() => setActivePage("timetable")}
              />
              <MenuItem
                icon={EventAvailableIcon}
                label="Attendance"
                open={sidebarOpen}
                active={activePage === "attendance"}
                onClick={() => setActivePage("attendance")}
              />
              <MenuItem
                icon={AssignmentIcon}
                label="Assignments"
                open={sidebarOpen}
                active={activePage === "assignments"}
                onClick={() => setActivePage("assignments")}
              />
              <MenuItem
                icon={BarChartIcon}
                label="Marks"
                open={sidebarOpen}
                active={activePage === "marks"}
                onClick={() => setActivePage("marks")}
              />
            </SidebarSection>

            <SidebarSection title="Teaching Hub" open={sidebarOpen}>
              <MenuItem
                icon={FolderIcon}
                label="Resources"
                open={sidebarOpen}
                active={activePage === "resources"}
                onClick={() => setActivePage("resources")}
              />
              <MenuItem
                icon={EventIcon}
                label="Events"
                open={sidebarOpen}
                active={activePage === "events"}
                onClick={() => setActivePage("events")}
              />
              <MenuItem
                icon={InsightsIcon}
                label="Insights"
                open={sidebarOpen}
                active={activePage === "insights"}
                onClick={() => setActivePage("insights")}
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
              <MenuItem
                icon={NotificationsIcon}
                label="Alerts"
                open={sidebarOpen}
                active={activePage === "alerts"}
                onClick={() => setActivePage("alerts")}
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
        <main className="flex-1 p-8 flex gap-6 overflow-y-auto">

          {/* ===== MAIN CONTENT (FIXED SAFE PADDING) ===== */}
          <div
            className={`flex-1 relative z-10 transition-all ${
              !showProfile ? "pr-16" : ""
            }`}
          >
            {activePage === "overview" && <Overview />}
            {activePage === "timetable" && <Timetable />}
            {activePage === "attendance" && <Attendance />}
            {activePage === "assignments" && <Assignment />}
            {activePage === "marks" && <Marks />}
            {activePage === "resources" && <Resources />}
            {activePage === "events" && <Events />}
            {activePage === "insights" && <Insights />}
            {activePage === "alerts" && <Alerts />}
          </div>

          {/* ================= PROFILE ================= */}
          <div
            className={`
              relative
              transition-all duration-300 ease-out
              ${showProfile ? "w-80" : "w-14"}
              overflow-visible
              pointer-events-none
            `}
          >
            <div className="absolute inset-y-0 right-0 w-80 overflow-hidden">
              <div
                className={`absolute inset-y-0 right-0 w-80 transition-transform duration-300 ease-out ${
                  showProfile ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <TeacherProfile
                  onClose={() => setShowProfile(false)}
                  onViewFullProfile={() => setShowFullProfile(true)}
                />

              </div>
            </div>
          </div>
        </main>
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

function TeacherProfile({ onClose, onViewFullProfile }) {
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
          <div className="w-24 h-24 mx-auto rounded-full bg-indigo-500 text-white flex items-center justify-center text-3xl font-semibold">
            B
          </div>
          <h3 className="mt-4 text-lg font-semibold">Bhanu Prasad</h3>
          <p className="text-sm text-gray-500">Associate Professor · CSE</p>

          <div className="mt-6 space-y-3 text-sm text-gray-600 text-left">
            <ProfileRow label="Qualification" value="Ph.D (Computer Science)" />
            <ProfileRow label="Experience" value="12 Years" />
            <ProfileRow label="Subjects Count" value="3" />
            <ProfileRow label="Subjects" value="DBMS, OS, CN" />
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <IconButton icon={LinkedInIcon} color="bg-blue-600" />
            <IconButton icon={LanguageIcon} color="bg-gray-800" />
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
