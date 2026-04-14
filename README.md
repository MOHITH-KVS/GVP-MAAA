
# GVP-MAAA

GVP-MAAA is a full-stack college ERP and analytics platform with student, faculty, admin, alerts, and placement intelligence workflows.

## Tech Stack

- Frontend: React 19 + Vite
- Backend: FastAPI + SQLAlchemy
- Database driver: psycopg2 (PostgreSQL compatible)
- Data/analytics: NumPy, Pandas, custom ML service modules

## Repository Layout

- gvp-maaa: Frontend application root
- gvp-maaa/Backend: FastAPI backend root
- SMART_TASK_*.md: Smart Task feature documentation
- PROJECT_FULL_TECHNICAL_REPORT.md: End-to-end technical report

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (recommended 3.10 or 3.11)
- A running database compatible with backend settings in gvp-maaa/Backend/.env

## Quick Start (Windows)

### 1) Clone and open project

- Open terminal in the workspace root folder GVP-MAAA.

### 2) Start backend

- Go to backend folder:

	cd gvp-maaa/Backend

- Create virtual environment (first time only):

	python -m venv venv

- Activate environment:

	venv\Scripts\activate

- Install dependencies:

	pip install -r requirements.txt

- Run backend server:

	uvicorn main:app --reload

- Backend URLs:
	- API base: http://127.0.0.1:8000
	- Swagger docs: http://127.0.0.1:8000/docs

### 3) Start frontend

- Open a new terminal and go to frontend root:

	cd gvp-maaa

- Install dependencies (first time only):

	npm install

- Run frontend:

	npm run dev

- Frontend URL (default Vite):
	- http://127.0.0.1:5173

## Running Both Services Together

- Keep backend running in one terminal.
- Keep frontend running in a second terminal.
- Stop either service with Ctrl + C.

## Backend Dependency List

Main packages from requirements.txt:

- fastapi
- uvicorn
- sqlalchemy
- psycopg2-binary
- python-jose[cryptography]
- python-multipart
- pandas
- numpy
- openpyxl
- python-docx
- reportlab
- apscheduler
- python-dotenv
- passlib
- bcrypt

## Frontend Scripts

From gvp-maaa/package.json:

- npm run dev: Start local development server
- npm run build: Create production build
- npm run preview: Preview production build locally
- npm run lint: Run ESLint checks

## Common Troubleshooting

- Port 8000 already in use:
	- Stop existing process using the port, then run backend again.
- Port 5173 already in use:
	- Vite usually picks the next free port automatically.
- Python packages fail to install:
	- Confirm venv is activated before running pip install.
- Module import or DB connection errors:
	- Verify gvp-maaa/Backend/.env values and database availability.

## Related Docs

- SMART_TASK_SYSTEM_DOCUMENTATION.md
- SMART_TASK_IMPLEMENTATION_GUIDE.md
- SMART_TASK_QUICK_REFERENCE.md
- PROJECT_FULL_TECHNICAL_REPORT.md


##HOW TO RUN THE PROJECT 


path:
/*frontend*/
cd "C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa"
/*backend*/
cd "C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa\Backend" 
/*virtual env*/
venv\Scripts\activate
localhost
http://127.0.0.1:8000/
uvicorn main:app --reload
uvicorn main:app

http://127.0.0.1:8000/docs

npm run dev 

CTRL + C
uvicorn main:app --reload
