# LeadStream CRM

[![CI](https://github.com/ematobi1/leadstream-crm-production/actions/workflows/ci.yml/badge.svg)](https://github.com/ematobi1/leadstream-crm-production/actions/workflows/ci.yml)

AI-Powered Sales Intelligence Platform with real-time collaboration.

## Features

- AI Chat Assistant
- Lead Management
- Sales Pipeline with Drag-and-Drop
- Task Management
- Real-time Notifications
- Analytics Dashboard

## Tech Stack

**Frontend:** React, Tailwind CSS, Socket.IO Client
**Backend:** Node.js, Express, MongoDB, Redis, Socket.IO

## Quick Start

### Local Development

```bash
# Start backend (needs MongoDB and Redis; see backend/.env.example)
cd backend
cp .env.example .env   # then fill in MONGODB_URI, REDIS_URL, JWT_SECRET
npm install
npm start

# Start frontend
cd frontend
npm install
npm start
```

Set `REACT_APP_API_URL` / `REACT_APP_SOCKET_URL` in the frontend environment when the API is not on `http://localhost:5001`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) builds the frontend and boots the backend against `/api/health` on every push and pull request.

## Deployment

- **Frontend:** Netlify (`netlify.toml` builds `frontend/` and serves `frontend/build` with SPA redirects and security headers).
- **Backend:** any Node 20 host with MongoDB and Redis; configure the variables from `backend/.env.example`.

---

Built with ❤️ by Kingdom (Emmanuel Tobi)
