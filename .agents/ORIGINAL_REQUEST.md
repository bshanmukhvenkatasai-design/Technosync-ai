# Original User Request

## Initial Request — 2026-07-06T19:39:24+05:30

TechnoSync AI is an AI-powered constituency development planning platform that transforms citizen feedback into actionable insights, enabling Members of Parliament (MPs) to prioritize projects, optimize budgets, and improve governance through intelligent, data-driven decision-making. It is built as a highly polished hackathon demo with Vite, React, and Vanilla CSS.

Working directory: /Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration/technosync-dashboard
Integrity mode: demo

## Requirements

### R1. Frontend client (Vite + React)
- **Interactive Dashboard**: A highly polished, premium dark-mode dashboard tailored for MPs.
- **Citizen Issues Hub**: Visualizes complaints (text, audio, photo, location data) with AI-determined metrics (category, sentiment, urgency).
- **Complaint Submission Simulator**: A form allowing users/judges to submit new complaints (type text, drop a map pin, or trigger simulated voice/photo inputs) and watch them update live on the dashboard.
- **Constituency Map**: A custom, zero-dependency SVG or Canvas-based interactive map displaying constituency regions, project pins, and urgency heatmaps.
- **AI Recommendation Engine UI**: Displays recommended development projects (repairing roads, adding water filters, etc.) with estimated cost, timeline, and beneficiary metrics.
- **Project Progress Tracker**: A visual tracker for active development projects.

### R2. Local Backend Server (Node.js/Express)
- **API Endpoints**: Serve APIs for listing complaints, submitting a complaint, listing recommended projects, and updating project statuses.
- **Data Persistence**: Use a simple local file-based database (JSON files) to persist data so edits remain after reloading.
- **AI Simulation Engine**: A backend service that processes incoming complaints and uses a rule-based or simple text heuristic parser (or actual Gemini API integration if a key is present) to automatically categorize, extract location, and determine urgency.

### R3. Visual Design & Micro-Animations
- **Premium Aesthetics**: High-end styling with vibrant neon accents (e.g., emerald green, electric blue, soft purples), glassmorphism effects, clean typography, and a modern layout.
- **Interactive States**: Hover effects, loading states, and smooth transition animations (e.g. when a new complaint is added or filter is clicked).

## Acceptance Criteria

### Functionality & Integration
- [ ] The Vite React client successfully builds without TypeScript/JS errors.
- [ ] The Node.js/Express backend server starts successfully and exposes APIs for complaints and projects.
- [ ] Submitting a complaint via the Simulator form successfully sends a request to the backend, persists in the local JSON data, and updates the frontend dashboard and map dynamically.
- [ ] Clicking a region on the SVG map filters the displayed complaints and project recommendations for that region.

### UI & Aesthetics
- [ ] The UI has a dark-mode theme with modern typography, micro-animations, and glassmorphic panels.
- [ ] No default browser inputs or tables; all interactive elements have styled custom designs.

## Verification Plan

### Automated Tests
- `npm run build` runs successfully in the client directory.
- A health check script or server start test confirms the backend API endpoints return `200 OK`.

### Manual Verification
- Run both frontend and backend local servers, submit a mock complaint, and verify that it updates the map and statistics in real-time.

## Follow-up — 2026-07-06T14:28:59Z

IMPORTANT SCOPE UPDATE: The user and their friends have decided that the friends will build the frontend client on their laptops. The AI team must focus strictly on the Node.js/Express backend server.

Please update your plans and skip Milestones M2, M3, and M4. Focus exclusively on completing the backend server (M1) and its E2E verification/stress testing (M5). I have updated the global PROJECT.md to reflect this change. Verify all backend endpoints and ensure database concurrency works perfectly.
