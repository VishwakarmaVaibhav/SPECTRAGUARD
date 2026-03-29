# Spectra Guard — Forest Intrusion Detection System

A production-ready MERN stack application with a Python FastAPI microservice for running YOLOv8 object detection on images and video streams.

## Architecture

1. **Frontend (`/client`)**: React + Vite + Tailwind CSS dashboard with a high-security surveillance aesthetic.
2. **Backend Engine (`/server`)**: Node.js + Express API handling file uploads, API brokering, and MongoDB aggregation for analytics.
3. **ML Microservice (`/ml-service`)**: Python FastAPI wrapper around Ultralytics YOLOv8 for running lightweight, real-time bounding box processing.

## Prerequisites

Required installed software:
- **Node.js** (v18+)
- **Python** (v3.9+)
- **MongoDB** (running locally on `mongodb://localhost:27017` or configured via `.env`)

## Installation & Setup

You must run all three services concurrently for the system to interface properly.

### 1. Start the MongoDB Instance
Ensure your MongoDB daemon is running locally:
```bash
# Example (Mac Homebrew)
brew services start mongodb-community
```

### 2. Start the ML Microservice
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
> Note: The first time this runs, it will auto-download the ~6MB `yolov8n.pt` weights file. Runs on `http://localhost:8000`.

### 3. Start the Express Backend
```bash
cd server
npm install
npm run dev
```
> Runs on `http://localhost:5000`. Expects MongoDB to be accessible at `mongodb://localhost:27017/spectraguard` by default.

### 4. Start the React Frontend
```bash
cd client
npm install
npm run dev
```
> Runs on `http://localhost:5173`. Open this URL in your browser.

## Features & Roles

The system uses JWT-based **Role-Based Access Control (RBAC)** to serve specialized dashboards:

### Police Mode (Field Units)
- **Mobile-Optimized Interface**: Large tap targets for on-the-go interaction.
- **Image Upload Zone**: Directly process imagery through YOLO.
- **Activity Feed**: Shows only activities uploaded by the specific officer or global admins, strictly limited to the last 24 hours for operational relevance.

### Admin Mode (Command Center)
- **Desktop Command Interface**: High-density data view.
- **Global System Logs**: Unrestricted access to all detection events system-wide.
- **Employee Tracking**: Monitors field units, showing total scan counts and last active timestamps.
- **Global Analytics**: KPI metrics, intrusion breakdown graphs, and source aggregated data.

### 5. Running the Application
Ensure all three services (MongoDB, Python ML Service, and Node/Express Server) are running.
Start the frontend:
```bash
cd client
npm start
```
> Open `http://localhost:5173`. 
> **First-time setup:** Click `[ RUN DB SETUP SCRIPT ]` on the login screen to generate test accounts:
> - **Admin:** User: `admin` | Pass: `password`
> - **Police:** User: `officer_1` | Pass: `password`

## Aesthetic / Design System

The system enforces a strict "Classic Military/Surveillance Control Panel" design:
- `#0a0a0a` dominant background
- Boxy geometry (0px border radius across all UI)
- Monospaced typography for logs/data (`Roboto Mono`)
- Blinking CSS status indicators, tracking scan-lines, and data-grid overlays.
