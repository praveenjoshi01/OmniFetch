# OmniFetch (WebCapture Module)

**OmniFetch** is a premium, lightweight, and embeddable Web Automation and Point-and-Click Selector Data Capture Module. It features a complete browser-automation engine (powered by **Playwright**) combined with a highly visual, glassmorphic React management workspace.

## 🚀 Key Features

- **Point-and-Click Automation Studio**: Load any site inside the proxy viewer, hover, and click elements to automatically generate Playwright step sequences.
- **Embedded Proxy Sandbox**: Fetches target pages on the backend, cleans insecure headers, rewrites URLs, and injects custom highlight scripts.
- **Visual Recipe Builder**: Sequence and execute navigation steps (`navigate`, `click`, `type`, `wait`, `extract`, `scroll`) in real-time.
- **Playwright Headless Execution**: A backend scheduling engine executes recipes with intelligent fallbacks (stripping dynamic numeric IDs, handling relative links, and nth-of-type fallbacks).
- **Tabular Data Views**: Inspect extracted columns, search captures, and export to CSV or JSON formats.
- **Modern HSL Teal UI Theme**: Stunning glassmorphic cards, custom scrollbars, animated transitions, status badges, and interactive feedback.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Lucide React, CSS Custom Variables (HSL Teal Dark theme).
- **Backend**: Node.js, Express, better-sqlite3, Playwright (Chromium headless), Cheerio.
- **Database**: SQLite database (`webcapture.db`) for CRUD persistence.

## 🏃‍♂️ Getting Started

1. **Install Dependencies**:
   ```bash
   npm run setup
   ```
2. **Launch Dev Servers**:
   ```bash
   npm run dev
   ```
   * Access UI: [http://localhost:3000](http://localhost:3000)
   * API endpoints: [http://localhost:5001](http://localhost:5001)

## 📌 Scraper Demo in Action
Click the **Run List-Maker Demo** button in the top header. It will run a pre-defined Playwright recipe to headlessly navigate to `https://memonotepad.github.io/list-maker`, wait for the tiles to load, extract their text titles (`.tile h3`), and automatically display the results in the tabular viewer.
