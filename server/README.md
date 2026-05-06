# 🚀  API Backend Server

This Express.js server protects your intellectual property by moving all business logic **off the browser** and onto a server.

## What it does

| Previously (frontend) | Now (backend) |
|---|---|
| Dashboard calculations in React | `/api/dashboard/analytics` computes everything |
| Auth credentials in browser code | `/api/auth/login` checks credentials server-side |
| Shift validation in browser | `/api/shifts/validate` enforces timing server-side |
| Submissions logic in browser | `/api/submissions` handles write + support creation |

## Setup Instructions

### Step 1 — Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **my-digichecklist**
3. Go to **Project Settings → Service Accounts**
4. Click **"Generate new private key"**
5. Save the downloaded JSON as:
   ```
   server/service-account.json
   ```
   > ⚠️ Never commit this file to git! It's already in `.gitignore`.

### Step 2 — Start the server

```bash
cd server
npm install
npm run dev     # development (auto-restart)
# OR
npm start       # production
```

Server starts at: **http://localhost:3001**

### Step 3 — Connect frontend (optional)

Create `c:\Users\Anurag Shukla\Desktop\Checklist\.env.local`:
```
VITE_API_URL=http://localhost:3001
```

When this is set, the frontend will route calculations through the API server.
When NOT set, the frontend uses direct Firebase (current behavior — always works).

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/auth/login` | Authenticate user |
| `GET` | `/api/dashboard/analytics` | All dashboard metrics |
| `POST` | `/api/shifts/validate` | Check shift timing |
| `GET` | `/api/submissions` | Get all submissions |
| `POST` | `/api/submissions` | Submit checklist records |

## Dashboard Analytics Query Params

```
GET /api/dashboard/analytics
  ?dateStart=2024-01-01
  &dateEnd=2024-12-31
  &shift=A
  &type=Safety
  &line=Line-1
  &frequency=Daily
  &revisionNo=R2
  &docType=SOP
  &drillPath=["Line-1","Sub-A"]
```
