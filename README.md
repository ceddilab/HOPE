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

## Tech Stack

### Frontend (`frontend/`)

- Node.js
- Express `5`
- EJS (server-side templating)
- HTML/CSS/Vanilla JavaScript
- SweetAlert2 (alerts in login/register pages, via CDN)
- Leaflet (map rendering, via CDN)
- PapaParse (CSV parsing in browser, via CDN)
- Turf.js (K-means clustering in browser, via CDN)

### Backend (`backend/`)

- Node.js (ES modules)
- Express `5`
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) for auth cookie
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

- Node.js (recommended: `18+`)
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
```

Note:

- The backend currently reads `backend/.env`.
- The Express frontend reads `frontend/.env` at server start.
- `BACKEND_URL` is exposed to browser-side auth scripts through `/config.js`.

Why `PORT=5000`?

- The backend defaults to `5000`.
- The frontend defaults `BACKEND_URL` to `http://localhost:5000`.

If you want to use a different backend port, update `BACKEND_URL` in `frontend/.env` and restart the frontend server.

## Run Locally

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

### Backend API

- `POST /api/auth/signup`
- `POST /api/auth/login`
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

