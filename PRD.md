# PRD: WebCapture — Lightweight Browser Automation & Data Capture Module

**Version**: 1.0  
**Status**: Draft  
**Date**: 2026-08-17  
**Owner**: Praveen Joshi  

---

## 1. Overview

**WebCapture** is an embeddable, browser-like UI module that allows users to navigate to any URL and define, record, or run automated data capture workflows — all without manual intervention. It is designed to be a lightweight, self-contained module that can be plugged into any existing web application.

Think of it as a **mini Studio in the browser** — visual, scriptable, and zero-install.

---

## 2. Problem Statement

Many internal tools and web apps need to pull data from third-party websites or automate repetitive click-and-extract workflows. Current solutions are either:

- **Too heavy** (Selenium, Playwright) — require local installs, DevOps setup, and are not embeddable.
- **Too narrow** (browser extensions) — locked to a single browser and hard to share across teams.
- **Too expensive** (enterprise RPA tools) — overkill for lightweight, single-purpose scraping needs.

**WebCapture** fills the gap: a reusable, lightweight UI module that lives inside your webapp and handles browser automation via a thin backend proxy.

---

## 3. Goals

| # | Goal |
|---|------|
| G1 | Allow a user to browse to any URL inside the module (like an iframe browser) |
| G2 | Let users visually select page elements to capture (point-and-click) |
| G3 | Record and replay automation sequences (navigate → interact → extract) |
| G4 | Run capture jobs on a schedule or on-demand without human involvement |
| G5 | Export captured data in JSON, CSV, or webhook format |
| G6 | Be embeddable as a React/Vue/Web Component module in any webapp |

---

## 4. Non-Goals

- Not a full browser replacement (no extension support, no downloads)
- Not a general-purpose RPA platform
- Not intended for scraping at massive scale (>10k pages/day) — use Playwright cluster for that
- No native mobile automation

---

## 5. Target Users

| Persona | Description |
|---------|-------------|
| **Power User / Analyst** | Wants to pull competitor pricing or market data without writing code |
| **Developer** | Wants to embed an automation UI in their internal tool with minimal config |
| **QA Engineer** | Wants lightweight browser-based test automation without spinning up Selenium |

---

## 6. Core Concepts

### 6.1 Session
A **Session** is one browser-like instance tied to a target URL. Sessions are stateful: cookies, form state, and navigation history are preserved within a session.

### 6.2 Recipe
A **Recipe** is a saved automation workflow: an ordered list of **Steps** that tell the engine what to do (navigate, click, wait, extract).

### 6.3 Step Types

| Step Type | Description |
|-----------|-------------|
| `navigate` | Go to a URL |
| `click` | Click a DOM element (by CSS selector or XPath) |
| `type` | Type text into an input field |
| `wait` | Wait for a selector to appear or a fixed duration |
| `extract` | Capture inner text / attribute from one or more matching elements |
| `scroll` | Scroll to the bottom or to a specific element |
| `paginate` | Click "Next Page" until end condition met |
| `screenshot` | Take a snapshot of the current page state |

### 6.4 Capture Run
A **Run** is one execution of a Recipe. Each Run produces a structured **Result** (rows of extracted data + metadata).

---

## 7. Functional Requirements

### 7.1 Browser Panel (UI)

| ID | Requirement |
|----|-------------|
| F-01 | Render a URL bar at the top — user types any URL and the module loads that page via a proxy |
| F-02 | The page renders in a sandboxed iframe or a headless-proxy-rendered HTML view |
| F-03 | An overlay mode activates "Pick Mode": hovering highlights DOM elements; clicking selects them |
| F-04 | Selected elements are shown with their CSS selector and sample value in a side panel |
| F-05 | The browser panel supports back / forward / reload controls |

### 7.2 Recipe Builder (UI)

| ID | Requirement |
|----|-------------|
| F-06 | Steps can be added manually or recorded by watching user interactions in Pick Mode |
| F-07 | Each step has editable fields: type, selector, value, timeout |
| F-08 | Steps can be reordered by drag-and-drop |
| F-09 | The Recipe can be saved, duplicated, and exported as JSON |
| F-10 | A "Test Step" button runs a single step and shows the output inline |

### 7.3 Automation Engine (Backend)

| ID | Requirement |
|----|-------------|
| F-11 | Runs Recipes using a headless Chromium instance (via Playwright or Puppeteer) |
| F-12 | Exposes a REST API: `POST /runs`, `GET /runs/:id`, `GET /runs/:id/results` |
| F-13 | Supports scheduled runs via cron expression per Recipe |
| F-14 | Handles basic auth, cookie injection, and custom HTTP headers |
| F-15 | Detects and retries on rate-limit / captcha pages (soft-fail with alert) |
| F-16 | Stores run history with status: `pending` / `running` / `success` / `failed` |

### 7.4 Data Output

| ID | Requirement |
|----|-------------|
| F-17 | Results viewable in a paginated table inside the module |
| F-18 | Export to CSV, JSON, or NDJSON |
| F-19 | Optional webhook: POST results to a URL on run completion |
| F-20 | Optional Zapier/Make.com integration via standard webhook output |

### 7.5 Embeddability

| ID | Requirement |
|----|-------------|
| F-21 | Module ships as a self-contained Web Component (`<webcapture-panel>`) |
| F-22 | Also available as a React component (`<WebCapturePanel />`) |
| F-23 | Props: `apiBaseUrl`, `initialUrl`, `readOnly`, `theme` |
| F-24 | Module communicates with parent app via standard DOM events and a JS SDK |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Recipe execution should start within 3 seconds of trigger |
| **Security** | URL allowlist / blocklist configurable by host app; no credentials stored in plaintext |
| **Isolation** | Each run executes in an isolated browser context (no cookie bleed between runs) |
| **Reliability** | Retry failed steps up to 3 times with exponential backoff |
| **Observability** | Logs for each step: timestamp, selector, status, duration |
| **Portability** | Backend runs in a Docker container; frontend is a pure ESM bundle |

---

## 9. Architecture Overview

```
+---------------------------------------------+
|               Host Web App                  |
|  +--------------------------------------+   |
|  |  <WebCapturePanel apiBaseUrl="..." />|   |
|  |                                      |   |
|  |  +------------+  +----------------+  |   |
|  |  | Browser    |  | Recipe Builder |  |   |
|  |  | Panel      |  | + Run History  |  |   |
|  |  | (iframe /  |  |                |  |   |
|  |  |  proxy)    |  |                |  |   |
|  |  +------------+  +----------------+  |   |
|  +--------------------------------------+   |
+------------------+---------------------------+
                   | REST API
+------------------v---------------------------+
|         WebCapture Backend Service          |
|                                             |
|  +--------------+   +---------------------+ |
|  | Proxy Layer  |   |  Automation Engine  | |
|  | (URL fetch / |   |  (Playwright /      | |
|  |  HTML relay) |   |   Puppeteer)        | |
|  +--------------+   +---------------------+ |
|                                             |
|  +--------------+   +---------------------+ |
|  | Recipe Store |   |  Run Scheduler      | |
|  | (SQLite /    |   |  (Cron / Queue)     | |
|  |  Postgres)   |   +---------------------+ |
|  +--------------+                           |
+---------------------------------------------+
```

---

## 10. Tech Stack (Recommended)

| Layer | Technology |
|-------|------------|
| **Frontend Module** | React 18 + TypeScript, shipped as Web Component via `react-to-webcomponent` |
| **Styling** | CSS Modules / Vanilla CSS — zero framework dependency |
| **Browser Proxy** | Node.js + Express — fetches URLs server-side and relays cleaned HTML |
| **Automation Engine** | Playwright (Node.js) running headless Chromium |
| **Job Queue** | Bull (Redis-backed) for async run execution |
| **Scheduler** | `node-cron` for time-based triggers |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| **API** | REST (OpenAPI 3.0 spec generated) |
| **Packaging** | Docker Compose — frontend dev server + backend + Redis |

---

## 11. Data Model (Simplified)

```
Recipe {
  id            UUID
  name          String
  startUrl      String
  steps         Step[]       -- ordered JSON array
  schedule      String?      -- cron expression
  webhookUrl    String?
  createdAt     DateTime
  updatedAt     DateTime
}

Step {
  id            UUID
  type          Enum(navigate|click|type|wait|extract|scroll|paginate|screenshot)
  selector      String?
  value         String?
  attribute     String?      -- for extract steps
  timeout       Int          -- ms
  label         String?      -- human-readable name
}

Run {
  id            UUID
  recipeId      UUID
  status        Enum(pending|running|success|failed)
  startedAt     DateTime
  finishedAt    DateTime?
  errorMessage  String?
  resultCount   Int
}

CapturedRow {
  id            UUID
  runId         UUID
  data          JSON         -- key-value pairs from extract steps
  capturedAt    DateTime
}
```

---

## 12. MVP Scope (Phase 1)

| Feature | In MVP? |
|---------|---------|
| URL bar + proxy browser view | Yes |
| Pick Mode (point-and-click selector) | Yes |
| Manual Recipe builder | Yes |
| Extract step + result table | Yes |
| On-demand run via API | Yes |
| CSV / JSON export | Yes |
| React component packaging | Yes |
| Scheduled runs | No — Phase 2 |
| Webhook output | No — Phase 2 |
| Pagination automation | No — Phase 2 |
| Screenshot step | No — Phase 2 |
| Web Component packaging | No — Phase 2 |

---

## 13. Open Questions

| # | Question | Owner |
|---|----------|-------|
| OQ-1 | Should the proxy run in the same process as the host app, or always as a sidecar? | Architect |
| OQ-2 | Do we need auth for the module itself (who can create/run Recipes)? | Product |
| OQ-3 | Which target sites are in scope — any public URL, or internal intranet URLs too? | Stakeholder |
| OQ-4 | Is JavaScript execution on the scraped page required (full headless browser for proxy, or is static HTML enough)? | Architect |
| OQ-5 | Should captured data be stored in the host app's DB or WebCapture's own DB? | Architect |

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first captured result (new user) | < 5 minutes |
| Recipe execution success rate | > 95% on non-JS-gated pages |
| Module bundle size (frontend) | < 500 KB gzipped |
| Backend cold start (Docker) | < 10 seconds |
| Integration effort for host app | < 1 day for a developer |

---

## 15. Out-of-Scope (Future Considerations)

- AI-assisted selector suggestion (LLM reads DOM and suggests what to extract)
- Visual diff alerts (detect page changes between runs)
- Multi-step login flows with 2FA
- Distributed scraping across multiple browser instances
- Browser extension companion for local page access (bypass CORS)

---

*End of PRD v1.0*
