# TechnoSync AI — Backend Server

A production-grade Node.js/Express REST API backend for the TechnoSync AI constituency development planning platform.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- npm

### Installation & Run

```bash
# Navigate to the server directory
cd technosync-dashboard/server

# Install dependencies
npm install

# Start the server
npm start
```

The server will be available at: **`http://localhost:5000`**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/complaints` | Fetch all citizen complaints (sorted newest first) |
| `POST` | `/api/complaints` | Submit a new complaint (auto-categorized by AI engine) |
| `GET` | `/api/projects` | Fetch all development project recommendations |
| `PATCH` | `/api/projects/:id/status` | Update a project's status |

### POST /api/complaints — Request Body
```json
{
  "text": "There is a large pothole on the main road",
  "type": "text",
  "region": "Downtown",
  "coordinates": { "x": 150, "y": 200 },
  "mediaUrl": null
}
```

**Auto-generated response fields** (from the AI engine):
- `category` — `Roads | Water | Sanitation | Power | Security | Infrastructure`
- `sentiment` — `Positive | Neutral | Negative`
- `urgency` — `Low | Medium | High | Critical`

### PATCH /api/projects/:id/status — Request Body
```json
{ "status": "In Progress" }
```
Valid status flow: `Recommended → Planned → In Progress → Completed`

---

## 🧠 AI Simulation Engine

The backend includes a heuristic AI engine (`src/ai-engine.js`) that automatically processes each incoming complaint and:
- **Categorizes** it based on keyword patterns (Roads, Water, Power, Sanitation, Security, Infrastructure)
- **Detects the region** from text or fallback to the `region` field provided
- **Analyzes sentiment** (Positive, Neutral, Negative)
- **Assigns urgency** (Low, Medium, High, Critical) based on weighted keywords

---

## 🗄️ Database

Data is stored in local JSON files inside `server/data/`:
- `complaints.json` — All submitted citizen complaints
- `projects.json` — Development project recommendations with status

The database is initialized automatically on server startup with seed project data. A **FileMutex** concurrency lock ensures thread-safe read-modify-write operations under concurrent requests.

---

## ✅ Testing

```bash
# Health check: tests all API endpoints
node test-health.js

# Concurrency stress test: 20 parallel requests
node test-concurrency.js
```

Expected output:
```
🎉 ALL HEALTH CHECK TESTS PASSED SUCCESSFULLY! 🎉
✔ Concurrency test passed with no data loss!
```

---

## 🌐 CORS

The server is configured with CORS enabled — your frontend running on any localhost port can connect without issues.
