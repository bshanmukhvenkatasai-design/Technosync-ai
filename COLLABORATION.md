# TechnoSync AI Collaboration Guide

Welcome to the team! This guide explains how we collaborate on the **TechnoSync AI** project from our individual laptops using Git and GitHub. Following these guidelines ensures that our development is smooth, we avoid overwriting each other's work, and we can easily merge our changes.

---

## 🚀 Quick Start for Team Members

### 1. One-Time Setup (On your laptop)

Before you start, make sure you have:
* **Git** installed on your system.
* A **GitHub account** (provide your username to the repository owner to be added as a collaborator).
* **SSH keys** or a **Personal Access Token (PAT)** set up on your GitHub account for authentication.

#### Clone the Repository:
Open your terminal and run:
```bash
git clone https://github.com/bshanmukhvenkatasai-design/Technosync-ai.git
cd Technosync-ai
```

---

## 🔄 The Collaborative Workflow

We use a **Feature Branch Workflow**. This means the `main` branch always contains stable, working code, and all new development happens on separate branch copies.

### Step 1: Get the Latest Changes
Always start by pulling the latest code from the remote repository so you are building on top of the most up-to-date codebase:
```bash
# Switch to main branch
git checkout main

# Pull the latest changes
git pull origin main
```

### Step 2: Create a Feature Branch
Create a new branch for the specific task you are working on. Name your branch descriptive of the task (e.g., `feature/login-page`, `bugfix/sidebar-alignment`):
```bash
git checkout -b feature/your-feature-name
```

### Step 3: Write Code & Commit
Work on your code. When you reach a logical checkpoint, save your progress:
```bash
# Check what files changed
git status

# Stage the files you want to commit
git add file1.js file2.css

# Commit with a clear, descriptive message
git commit -m "feat: add user authentication form UI"
```

### Step 4: Push to GitHub
Upload your local feature branch to GitHub so others can see it:
```bash
git push -u origin feature/your-feature-name
```
*(The `-u origin ...` flag is only needed the first time you push this branch. For subsequent pushes, you can just run `git push`.)*

### Step 5: Open a Pull Request (PR)
1. Go to the [TechnoSync AI GitHub repository](https://github.com/bshanmukhvenkatasai-design/Technosync-ai).
2. You will see a banner saying *"Your branch was recently pushed. Compare & pull request"*. Click it!
3. Add a description of what you built and request a code review from a teammate.
4. Once reviewed and approved, merge the PR into the `main` branch.

---

## 🛠️ Keeping Your Branch Up to Date

If someone else merges their PR while you are still working on your branch, your branch will become out of date. To bring their updates into your branch:
```bash
# 1. Fetch latest changes from GitHub
git checkout main
git pull origin main

# 2. Go back to your feature branch
git checkout feature/your-feature-name

# 3. Merge main into your feature branch
git merge main
```

---

## ⚡ Handling Merge Conflicts

Sometimes, two people modify the same line of the same file. When you try to merge `main` into your branch (or merge your PR), Git will flag a **Merge Conflict**.

**Don't panic!** Here is how to fix it:
1. Open the conflicted files in your code editor (like VS Code).
2. You will see markers indicating your changes vs. their changes:
   ```text
   <<<<<<< HEAD (Your Changes)
   const primaryColor = '#1a73e8';
   =======
   const primaryColor = '#6200ee';
   >>>>>>> main (Their Changes)
   ```
3. Choose which version to keep (or combine them), and delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Save the file.
5. In your terminal, stage the resolved file and commit:
   ```bash
   git add filename.js
   git commit -m "chore: resolve merge conflicts with main"
   git push
   ```

---

## 📋 Team Best Practices

* 🚫 **Never push directly to `main`**: All changes must go through a Feature Branch and a Pull Request.
* 📦 **Commit small and often**: Large commits are harder to review and more prone to conflicts.
* 💬 **Write descriptive commit messages**: Start with prefixes like `feat:`, `fix:`, `docs:`, or `chore:`.
* 🧪 **Test before committing**: Make sure your code runs and doesn't break existing features before pushing.
