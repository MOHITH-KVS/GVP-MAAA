GVP-MAAA - STEP-BY-STEP EXECUTION DOCUMENT

1. Objective
The objective of GVP-MAAA is to provide a full-stack academic analytics and management platform for students, faculty, and administrators, with integrated dashboards, alerts, placement intelligence, and a role-aware AI chatbot.

2. System Overview
GVP-MAAA combines:
- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL-compatible database
- AI/Analytics Layer: RAG chatbot pipeline, ML-based risk/insights modules, and usage analytics tracking

The platform supports three major user roles:
- Student
- Faculty (Teacher)
- Admin

Each role has a dedicated dashboard and chatbot context.

3. Step-by-Step Execution
Step 1: Environment Setup
- Open the project workspace.
- Ensure Node.js and Python are installed.
- Configure backend environment variables in Backend/.env.
- Ensure database service is running and reachable.

Step 2: Start Backend Service
- Open terminal in Backend folder.
- Activate virtual environment.
- Install requirements.
- Start FastAPI server using Uvicorn.
- Verify backend at:
  - API root: http://127.0.0.1:8000/
  - Swagger docs: http://127.0.0.1:8000/docs

Step 3: Start Frontend Service
- Open a second terminal in gvp-maaa folder.
- Install npm dependencies.
- Start Vite development server.
- Open frontend URL (typically http://127.0.0.1:5173).

Step 4: Application Boot Sequence
When backend starts, the application:
- Creates/updates DB metadata
- Runs startup migration helpers
- Initializes settings cache
- Configures CORS and static upload paths
- Starts scheduler jobs for reminders/threshold checks
- Attaches additional routers (chat, analytics, orchestrator, stream)

Step 5: Role Selection and Authentication
- User lands on Role Select page.
- User chooses Student, Teacher, or Admin sign-in.
- Credentials are validated via backend login endpoints.
- On success, token/session details are stored for protected routes.

Step 6: Route Protection and Dashboard Entry
- ProtectedRoute validates role before dashboard access.
- Student enters Student Dashboard.
- Faculty enters Teacher Dashboard.
- Admin enters Admin Dashboard with nested management pages.

Step 7: Student Dashboard Execution
Student dashboard modules execute in this flow:
- Overview loads profile summary and alert snapshot.
- Attendance page fetches attendance and trend endpoints.
- Marks page fetches marks and subject performance.
- Assignments page fetches pending/completed assignment status.
- Timetable page fetches timetable records.
- Placement page fetches open drives and eligibility-related data.
- Events page fetches event participation details.
- Insights page fetches risk/recommendation information.
- Resources page fetches faculty-uploaded materials.
- AI Assistant opens student-scoped chatbot.
- Alerts page shows admin/faculty/system alerts for the student.

Step 8: Faculty Dashboard Execution
Faculty dashboard modules execute in this flow:
- Overview loads faculty profile and class summary.
- Timetable, Attendance, Assignments, and Marks modules load teaching data.
- Resources module supports upload and student access tracking.
- Events module supports creation, attendance marking, and updates.
- Insights module shows academic and risk indicators for assigned classes.
- Placement module and Placement Coordinator module manage drive-related workflows.
- Quick actions support uploading resources and sending alerts.
- AI Assistant opens faculty-scoped chatbot.

Step 9: Admin Dashboard Execution
Admin dashboard modules execute in this flow:
- Overview loads institution-level academic and alert snapshots.
- Students module supports student management and promotions.
- Teachers module supports faculty administration.
- Academics module supports subjects and assignment mapping.
- Timetable module manages timetable uploads and records.
- Alerts module handles system and targeted alerts.
- Insights module shows intervention-focused analytics.
- Usage Analytics module visualizes platform activity.
- Placement module manages companies, drives, assignment, and outcomes.
- AI Assistant opens admin-scoped chatbot.
- Settings module manages system thresholds and preferences.

Step 10: Placement Intelligence Execution
Placement workflow executes as follows:
- Admin/faculty creates company and drive records.
- Eligibility criteria are applied by branch/year/cgpa/backlogs.
- Students view open and eligible drives.
- Students apply to drives.
- Faculty/admin update drive status and student progression.
- Drive notifications and filtered notifications are sent.
- Placement feedback and placement intelligence summaries are generated.

Step 11: Alerting and Notification Execution
Alert flow executes as follows:
- Alerts are created by admin/faculty/system events.
- Recipients are written to alert recipient mappings.
- Dashboards pull unread notifications.
- Mark-read and mark-all-read actions update alert status.
- Rule-based alerts can be created from chatbot natural language.

Step 12: Chatbot Execution (Core Flow)
The chatbot executes in layered order:
- Request arrives at chat endpoint with role and user context.
- Fast small-talk path handles greetings immediately.
- Fast standard data path answers common dashboard questions directly from DB.
- Access guard validates role-query compatibility.
- If needed, RAG pipeline runs with history and thread context.
- Provider routing selects response source (verified data or live AI).
- Daily AI usage limits are enforced for expensive AI responses.
- Streaming response is sent to frontend with response mode/source headers.

Step 13: Chatbot PDF Workflow
PDF workflow executes as follows:
- User uploads PDF in chatbot UI.
- Backend stores temporary PDF reference by user.
- User asks a document-related question.
- PDF processor extracts and answers from uploaded document content.
- Response is returned with source context.

Step 14: Scheduled Background Execution
Scheduler executes periodic jobs:
- Event reminders
- Attendance threshold checks
- CGPA threshold checks
- Monthly faculty attendance checks
- Assignment deadline checks

Step 15: Analytics Tracking Execution
Usage analytics flow:
- Frontend records route/page visits.
- Backend receives tracking payload.
- User analytics and activity logs are stored.
- Admin analytics dashboard aggregates by role, department, and feature usage.

Step 16: Data Export and Reports
System supports report-generation flows including:
- Attendance reports (including downloadable formats)
- Risk reports
- Marks templates/uploads
- Subject performance analytics

Step 17: Error Handling and Resilience
Execution resilience includes:
- Role-protected routing
- Database rollback safeguards on failures
- Fallback chatbot responses when AI is unavailable
- Import and model fallback guards in backend startup paths

4. Full Project Data Flow Execution
- User authenticates and enters role dashboard.
- Dashboard requests role-specific data from backend APIs.
- Backend queries SQLAlchemy models and service layers.
- Processed metrics/insights are returned to frontend.
- Frontend renders cards, charts, tables, and notifications.
- Chatbot accepts user query.
- Chatbot resolves via fast DB path or RAG + AI path.
- Response streams back to UI in real time.
- Alerts, analytics logs, and interactions are persisted.

5. Dashboard Coverage Summary
- Student: Overview, Attendance, Marks, Assignments, Timetable, Placement, Events, Insights, Resources, Alerts, AI Assistant
- Faculty: Overview, Timetable, Attendance, Assignments, Marks, Resources, Events, Insights, Placement, Placement Coordinator, Alerts, AI Assistant
- Admin: Overview, Students, Teachers, Academics, Timetable, Alerts, Insights, Usage Analytics, Placement, Settings, AI Assistant

6. Chatbot Coverage Summary
- Role-aware access control
- Fast verified-data responses for common academic queries
- RAG-driven responses for complex contextual queries
- AI provider fallback and response-mode tagging
- PDF upload and question-answer workflow
- Natural-language alert rule creation

7. Example End-to-End Execution Scenario
- Admin logs in and creates a placement drive.
- Faculty maps eligible classes and uploads related resources.
- Student logs in, checks eligibility, and applies to drive.
- Student asks chatbot: "Am I at risk and what should I improve?"
- Chatbot returns verified attendance/marks context and recommendation.
- Admin monitors risk and usage dashboards for intervention decisions.

8. Advantages of This Execution Architecture
- Unified role-based platform for complete academic lifecycle
- Real-time dashboards with actionable data
- Hybrid chatbot model (speed path + AI path)
- Placement intelligence integrated with academics
- Extensible alerting and analytics framework

9. Conclusion
GVP-MAAA executes as a complete, role-driven academic intelligence platform where dashboards, alerts, placement workflows, and chatbot intelligence work together. The architecture supports daily operational workflows for students, faculty, and admins while enabling data-driven decisions through analytics and AI-assisted interactions.
