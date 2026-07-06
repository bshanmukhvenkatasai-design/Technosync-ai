# Context - Project Orchestrator

## Environment
- **Workspace**: `/Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration`
- **Application Directory**: `/Users/shanmukh/.gemini/antigravity/worktrees/Technosync-ai/setup-technosync-repo-collaboration/technosync-dashboard`
- **Integrity Mode**: `demo`
- **Caller Parent**: Sentinel (`7e9a2df5-3579-4115-9c7f-144a1612f3cb`)
- **Developer OS**: mac
- **Shell**: zsh

## Hard Constraints
- **Zero Direct Work**: Orchestrator must not edit source files, compile code, run tests or run terminal commands itself.
- **Audit Gating**: Forensic Auditor audit is a binary veto. A milestone fails unconditionally if audit fails.
- **Permanent Retirement**: Subagents cannot be reused after handoff.
- **Liveness dead-line**: Subagents must report progress within 10 minutes (cron heartbeat checks) and have a hard limit of 20 minutes before replacement.
