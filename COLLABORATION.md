# TechnoSync AI Complete Team Onboarding & Collaboration Guide

This document provides a step-by-step guide on how your teammates can access the GitHub repository, understand what backend components are already built, run them on their own laptops, and integrate their frontend work using the Antigravity IDE.

---

## 🔑 Part 1: How Teammates Access the GitHub Repository

The project is hosted on GitHub at:
`https://github.com/bshanmukhvenkatasai-design/Technosync-ai`

### Step 1: Invite your teammates (Owner action)
1. Go to the URL above on **GitHub.com**.
2. Click on the **Settings** tab in the top navigation bar.
3. In the left sidebar, click on **Collaborators**.
4. Click the green **Add people** button.
5. Enter your teammates' GitHub usernames or email addresses, select them, and click **Add to this repository**.

### Step 2: Accept the invitation (Teammate action)
1. Your teammates will receive an email invitation. They can also accept it directly by visiting:
   `https://github.com/bshanmukhvenkatasai-design/Technosync-ai/invitations`
2. They must click **Accept invitation** to gain push/pull rights to the repository.

---

## ⚙️ Part 2: What You Are Doing (The Project Backend)

To save time, we have built a **fully functional, production-grade local backend server** for the project. 

The backend files are located inside:
`file:///Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration/technosync-dashboard/server`

### What is already implemented:
* **Node.js + Express API**: Ready-to-use endpoints to handle complaints and recommendations.
* **JSON File Database**: A database in `server/data/` that automatically reads and writes complaints/projects, persisting them locally on the disk.
* **Concurrency Lock**: Built-in mutex locking to prevent database corruption when multiple API requests hit the server at once.
* **AI Simulation Engine**: A heuristic parser that automatically categorizes incoming complaints, tags their urgency, and recommends constituency projects (with cost, timeline, and beneficiary estimations).
* **71 Automated Tests**: Multi-tier test suites (`e2e-tests/`) and stress-testers (`test-concurrency.js`) that verify the backend handles all errors and edge cases cleanly.

Teammates **do not need to build any backend or databases**. They just run this server locally on their laptops and connect their frontend user interface to it.

---

## 💻 Part 3: How Teammates Add These Files to Their Laptops

Once you push the current code to GitHub, your teammates can set it up on their laptops using their **Antigravity IDE terminal** or standard terminal:

### Scenario A: If they are cloning the project for the first time
```bash
# Clone the repository
git clone https://github.com/bshanmukhvenkatasai-design/Technosync-ai.git
cd Technosync-ai

# Switch to the setup branch to access the latest backend files
git checkout setup-technosync-repo-collaboration
```

### Scenario B: If they have already cloned the repository previously
```bash
# Fetch latest changes from GitHub
git fetch origin

# Switch to the collaboration branch
git checkout setup-technosync-repo-collaboration

# Pull the latest backend files
git pull origin setup-technosync-repo-collaboration
```

---

## 🏃‍♂️ Part 4: How Teammates Run the Backend Locally

To run the backend server locally on their laptops:
1. Open the **Antigravity IDE Terminal** (or standard shell).
2. Navigate to the server folder:
   ```bash
   cd technosync-dashboard/server
   ```
3. Install the required Node.js packages:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. The server is now running at **`http://localhost:5000`**. 

---

## 🔄 Part 5: How Teammates Add and Merge Their Frontend Work

Your teammates will build the frontend client inside the `technosync-dashboard` folder. Here is the workflow they should follow:

### Step 1: Create their Feature Branch
Before they write any code, they should create a branch for their work:
```bash
git checkout -b feature/frontend-client
```

### Step 2: Set up the Frontend (Vite + React)
They will create a `client` folder next to the `server` folder:
```bash
# Navigate to the dashboard directory
cd technosync-dashboard

# Initialize a new React project in the client folder
npx -y create-vite@latest client --template react

# Go to client, install packages and start frontend dev server
cd client
npm install
npm run dev
```

### Step 3: Connect Frontend to Backend APIs
In their React code, when they want to get or submit data, they will fetch from the local API endpoints:
* **Get all complaints**: `fetch('http://localhost:5000/api/complaints')`
* **Submit a complaint**: `fetch('http://localhost:5000/api/complaints', { method: 'POST', body: ... })`
* **Get all projects**: `fetch('http://localhost:5000/api/projects')`
* **Update a project status**: `fetch('http://localhost:5000/api/projects/:id/status', { method: 'PATCH', body: ... })`

### Step 4: Push and Merge on GitHub
Once they are satisfied with their frontend:
```bash
# Stage all files
git add .

# Commit changes
git commit -m "feat: add React frontend client dashboard"

# Push the branch to GitHub
git push -u origin feature/frontend-client
```
1. Go to the [TechnoSync AI GitHub repository](https://github.com/bshanmukhvenkatasai-design/Technosync-ai).
2. Click **New Pull Request** to merge `feature/frontend-client` into `setup-technosync-repo-collaboration`.
3. Once you review and merge the PR, anyone who runs `git pull` will get the fully integrated website containing both the backend and the frontend!
