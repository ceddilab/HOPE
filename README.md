# H.O.P.E / D.D.C.A Project

Humanitarian Operations for People in Emergencies (H.O.P.E) is a Node.js-based web project with:

- a server-rendered frontend (EJS) for public/guest pages and auth UI
- a backend REST API for authentication and file uploads
- geospatial clustering visualization for depot allocation (client-side map + K-means clustering)

## What This Codebase Does

The project is a research/demo platform for emergency response planning and logistics.

- Landing/greeting page for the project
- Login and registration UI
- Guest dashboard with navigation cards
- Depot location allocation / clustering page (upload `.json` or `.csv`, choose cluster count, visualize on map)
- Placeholder pages for nearest routes, area information, and first aid
- Backend auth API with signup, login, logout, forgot password, reset password, and check-auth
- Backend file upload API with JSON preview support

## Architecture

This repo contains two separate Express apps:

- `frontend/` -> EJS web server (default port `3000`)
- `backend/` -> REST API server (default port `5000`)

The frontend also acts as a small **auth proxy** so the session cookie stays
first-party to the frontend — see [Authentication & Sessions](#authentication--sessions).

## Authentication & Sessions

The frontend and backend run on different origins (and on different domains in
production), so the session cookie is kept **first-party to the frontend** via a
small auth proxy (a "backend-for-frontend"). The browser only ever talks to the
frontend origin.

Flow:

1. The login/register page POSTs to the **frontend** (`/auth/login`, `/auth/signup`) — same origin.
2. The frontend forwards the credentials to the **backend** (`/api/auth/login`, `/api/auth/signup`) server-to-server.
3. The backend verifies and returns the signed JWT in the JSON body.
4. The frontend sets that JWT as a **first-party, `httpOnly` cookie** named `token` on its own domain, and returns only the user info to the browser (never the raw token).
5. On every page request the frontend verifies the cookie locally with the shared `JWT_SECRET` and renders the navbar accordingly (Login vs Logout).
6. `GET /logout` (frontend) clears the cookie and redirects to `/greeting`.

Key points:

- Sessions are stateless JWTs valid for **24 hours**; the cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- **`JWT_SECRET` must be identical in `backend/.env` and `frontend/.env`** — the backend signs tokens with it and the frontend verifies them with it. If they differ, users always appear logged out.
- Because the cookie is first-party, this works in all browsers with no third-party-cookie or `SameSite=None` workarounds.

## Tech Stack

### Frontend (`frontend/`)

- Node.js
- Express `5`
- EJS (server-side templating)
- `jsonwebtoken` (verifies the session cookie to render the logged-in/out navbar)
- `cookie-parser`
- `dotenv`
- HTML/CSS/Vanilla JavaScript
- SweetAlert2 (alerts in login/register pages, via CDN)
- Leaflet (map rendering, via CDN)
- PapaParse (CSV parsing in browser, via CDN)
- Turf.js (K-means clustering in browser, via CDN)

### Backend (`backend/`)

- Node.js (ES modules)
- Express `5`
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) for 24h sessions
- `bcryptjs` for password hashing
- `cookie-parser`
- `cors`
- `dotenv`
- `multer` for file uploads

### Data

- Hazard location sample datasets in `location files./` (`.csv` and `.json`)

## Project Structure (High Level)

- `frontend/app.js` -> main frontend Express server
- `frontend/Greeting_Page/` -> landing/about/contact-related pages and assets
- `frontend/login_page/` -> login/register pages, controllers, routes, client JS
- `frontend/guest_page/` -> guest dashboard, clustering page, placeholder tools
- `backend/index.js` -> main backend API server
- `backend/routes/auth.route.js` -> auth endpoints
- `backend/routes/upload.route.js` -> upload endpoint
- `backend/controllers/auth.controller.js` -> auth business logic
- `backend/models/user.model.js` -> MongoDB user schema

## Local Setup

### Prerequisites

- Node.js `18+` (LTS `20` or `22` recommended)
- npm
- MongoDB (local instance or MongoDB Atlas connection string)

### 1) Install dependencies

Install separately for frontend and backend:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Note: `node_modules` are already present in this repo, but reinstalling is still recommended for a clean local setup.

### 2) Create environment files

Copy the example environment files and adjust values as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend defaults in `backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hope_db
JWT_SECRET=replace_with_a_strong_secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Frontend defaults in `frontend/.env.example`:

```env
PORT=3000
BACKEND_URL=http://localhost:5000
JWT_SECRET=replace_with_a_strong_secret   # MUST be identical to backend/.env
NODE_ENV=development
```

Note:

- The backend reads `backend/.env`; the frontend reads `frontend/.env` at server start.
- **`JWT_SECRET` must be identical in both files** (see [Authentication & Sessions](#authentication--sessions)). If they differ, login appears to "work" but every page shows you as logged out.
- The frontend uses `BACKEND_URL` server-side to proxy auth requests to the backend. (It is also exposed to the browser via `/config.js` for non-auth scripts such as clustering.)
- Set `NODE_ENV=production` in production so the session cookie is sent over HTTPS only.

Why `PORT=5000`?

- The backend defaults to `5000`.
- The frontend defaults `BACKEND_URL` to `http://localhost:5000`.

If you want to use a different backend port, update `BACKEND_URL` in `frontend/.env` and restart the frontend server.

## Run Locally

### Start MongoDB (required before the backend)

The backend connects to `MONGO_URI` (from `backend/.env`) on startup, so a MongoDB
server must be running and reachable first. Pick one of:

Local install — Linux (systemd):

```bash
sudo systemctl start mongod      # start now
sudo systemctl enable mongod     # (optional) start on boot
systemctl status mongod          # verify it's running
```

Local install — macOS (Homebrew):

```bash
brew services start mongodb-community
```

Docker (no install needed):

```bash
docker run -d --name hope-mongo -p 27017:27017 mongo:7
```

Quick check that it's listening on the default port `27017`:

```bash
curl -s localhost:27017 && echo   # MongoDB replies with an HTTP notice on this port
```

Prefer not to run MongoDB locally? Create a free MongoDB Atlas cluster and put its
connection string in `MONGO_URI` (in `backend/.env`) instead — then skip this step.

### Terminal 1: Start backend API

```bash
cd backend
npm start
```

Optional dev mode (auto-restart):

```bash
cd backend
npx nodemon index.js
```

### Terminal 2: Start frontend server

```bash
cd frontend
npm start
```

Then open:

- `http://localhost:3000`

## Main Routes

### Frontend Pages

- `/` -> redirects to `/greeting`
- `/greeting` -> greeting/landing page
- `/home` -> greeting page
- `/login` -> login page
- `/register` -> registration page
- `/guest` -> guest dashboard
- `/clustering` -> depot location allocation page
- `/routes` -> nearest route placeholder
- `/area-info` -> area info placeholder
- `/first-aid` -> first-aid placeholder
- `/AboutUs` -> about page
- `/contact` -> contact page

### Frontend Auth Proxy

- `POST /auth/login` -> proxies to the backend, sets the first-party session cookie
- `POST /auth/signup` -> proxies to the backend, sets the first-party session cookie (auto-login)
- `GET /logout` -> clears the session cookie, redirects to `/greeting`

### Backend API

- `POST /api/auth/signup` (returns the signed JWT in the response body for the proxy)
- `POST /api/auth/login` (returns the signed JWT in the response body for the proxy)
- `POST /api/auth/logout`
- `GET /api/auth/check-auth` (requires auth cookie)
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `POST /api/upload` (multipart form field name: `file`)

## How Clustering Works (Current Implementation)

The depot allocation page (`/clustering`) works mostly in the browser:

- User uploads a `.json` or `.csv` file with coordinates (`latitude`, `longitude`)
- Browser parses file with PapaParse / JSON parsing
- Turf.js runs K-means clustering
- Leaflet renders points, cluster centers, and connecting lines on a map
- Browser geolocation is used to center the map on the user

