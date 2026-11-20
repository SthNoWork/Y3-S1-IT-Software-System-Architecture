# FoodHub Project Setup & Run Guide

Because dependencies (`node_modules/`), build outputs (`dist/`), and caches are intentionally omitted from version control via `.gitignore`, follow these instructions to restore and run each lab from a fresh clone.

---

## 1. Prerequisites
- **Node.js:** v20+ or v22+ (LTS recommended)
- **npm:** v10+
- **Docker & Docker Compose:** Required for `lab-03` reverse proxy setup

---

## 2. Quick Restore (All Projects at Once)

Run this one-liner from the repository root to reinstall dependencies for all sub-projects:

### PowerShell (Windows)
```powershell
Get-ChildItem -Directory -Recurse -Filter "package.json" -Exclude "node_modules" | ForEach-Object {
    Write-Host "Installing dependencies in $($_.Directory.FullName)..." -ForegroundColor Cyan
    Push-Location $_.Directory.FullName
    npm install
    Pop-Location
}
```

### Bash (macOS / Linux / Git Bash)
```bash
find . -name "package.json" -not -path "*/node_modules/*" -execdir npm install \;
```

---

## 3. Per-Lab Run Instructions

### Lab 03: Reverse Proxy, DNS, and HTTP/TLS
Runs an Nginx reverse proxy routing port `8080` to an in-container Node.js upstream server.

```bash
cd lab-03
docker compose up -d
```
- **Access App via Proxy:** Open [http://localhost:8080](http://localhost:8080)
- **Stop Containers:** `docker compose down`

---

### Lab 04: REST API & Vue Client (CORS & Cookie Auth)

#### Backend (NestJS Monolith API)
```bash
cd lab-04/foodhub-api
npm install
npm run build
npm run start:dev
```
- **Server URL:** [http://localhost:3000](http://localhost:3000)
- **Health Check:**
  ```bash
  curl http://localhost:3000/v1/restaurants
  ```

#### Frontend (Vue 3 + Vite Client)
In a separate terminal:
```bash
cd lab-04/foodhub-web
npm install
npm run dev
```
- **Web UI:** Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the API, test CORS handling, and authenticate via cookies.

---

### Lab 05: Modular Monolith with Ports & Adapters

Encapsulated domain modules (`catalog`, `ordering`, `auth`) with decoupled repository ports.

```bash
cd lab-05/foodhub-api
npm install
npm run build
npm run start:dev
```
- **Server URL:** [http://localhost:3000](http://localhost:3000)
- **Verify Endpoints:**
  ```bash
  # 1. Catalog
  curl http://localhost:3000/v1/restaurants?limit=2

  # 2. Ordering
  curl -X POST http://localhost:3000/v1/orders \
    -H "Content-Type: application/json" \
    -d '{"restaurantId": 1, "items": ["amok"]}'

  # 3. Idempotency Key
  curl -X POST http://localhost:3000/v1/orders \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-key-1" \
    -d '{"restaurantId": 2, "items": ["lok lak"]}'
  ```

---

### Lab 07: Extended FoodHub API

```bash
cd lab-07/foodhub-api
npm install
npm run build
npm run start:dev
```
- **Server URL:** [http://localhost:3000](http://localhost:3000)

---

## 4. Common Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| `Cannot find module .../dist/...` | Build output is ignored by Git and has not been compiled yet. | Run `npm run build` in the project directory before starting. |
| `EADDRINUSE: address already in use :::3000` | Another lab server or process is currently holding port 3000. | Stop the previous process (`Ctrl+C`) or terminate processes listening on 3000 (`npx kill-port 3000`). |
| `Failed to fetch` / CORS error in browser | API server not running or CORS origin not configured. | Ensure API is running on port 3000 and has `enableCors({ origin: 'http://localhost:5173', credentials: true })`. |
| `401 Unauthorized` on `/v1/me` after restart | Session store is in-memory (`Map`) and clears when process restarts. | Log in again via `POST /v1/login?username=dara` to establish a new `sid` cookie. |
