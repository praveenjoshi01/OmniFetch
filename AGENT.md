# AGENT Instructions - OmniFetch Customizations

This file outlines the rules, guidelines, and instructions for future AI Agents pairs coding in this repository.

## Rules & Design Guidelines

### 1. Architecture Restrictions
- Maintain strict separation between `frontend/` and `backend/`. Do not import server utilities or Node.js primitives into React source files.
- Persistent states must be kept inside SQLite (`backend/data/webcapture.db`). Do not rely on ephemeral global variables inside the automation runner for run history.

### 2. Modern UI Rules (Tail HSL Theme)
- Every layout element must follow the CSS custom variables defined inside [index.css](file:///Users/praveenjoshi/Code/Code2026/webScrapperModule/frontend/src/index.css).
- Accent styles must use `--accent-gradient` or `--accent-primary` (Teal color scheme) instead of hardcoded hex colors.
- Interactive controls must include hover transitions and standard glass class containers (`.glass-panel`, `.glass-card`).

### 3. Playwright Customizations & Fallbacks
- Headless execution uses `sanitizeSelector` inside [automationEngine.ts](file:///Users/praveenjoshi/Code/Code2026/webScrapperModule/backend/src/services/automationEngine.ts) to clean dynamic hashes/IDs. If adding selectors, ensure templates verify using this normalizer.
- For pagination or multi-page crawling, add steps to the recipe sequence list instead of writing hardcoded custom scrapers.
