# LiveCode ⚡ — AI-Powered Technical Interview Platform

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

> **LiveCode** is an enterprise-grade technical interview platform enabling real-time collaborative coding, WebRTC peer-to-peer audio/video streaming, streaming AI assistance, and automated post-interview performance evaluation reports.

---

## ✨ Flagship Capabilities

- **💻 Collaborative Code Editor**: Real-time code synchronization using Monaco Editor and Socket.IO with cursor tracking and multi-language support (JavaScript, Python, C++, Java).
- **⚙️ Multi-Language Execution**: Code execution engine integrated with Judge0 supporting custom STDIN inputs and compilation outputs.
- **🎥 WebRTC Video & Audio**: Direct peer-to-peer video streaming with mixed audio recording for interview transcription.
- **🤖 AI Practice Mode (Mock Interview)**: Practice technical interviews solo with Groq-powered AI question generation (`llama-3.1-8b-instant`) across EASY, MEDIUM, and HARD difficulties.
- **💡 Real-time Streaming AI Hints**: Intelligent hint generation streaming via SSE (Server-Sent Events) with automatic client disconnect abort detection.
- **📊 Comprehensive AI Evaluation**: Audio speech transcription using Groq Whisper (`whisper-large-v3`), speech articulation analysis (filler word detection), coding logic scoring, and interactive radar chart breakdown.
- **🔐 Enterprise Authentication**: OAuth 2.0 with short-lived single-use authorization code exchange, JWT access/refresh token rotation, httpOnly secure cookies, and SHA-256 hashed refresh token storage.
- **🛡️ Clean Architecture & Security**: Layered Service pattern, Zod environment validation on startup, centralized operational error handling hierarchy, structured JSON logging with `X-Request-ID` correlation IDs, role-based authorization (RBAC), and 25MB Multer upload caps.

---

## 🏗️ Architecture

```mermaid
graph TD
    User([User Browser]) -->|HTTPS / REST v1| Express[Express API Server]
    User -->|WebSockets| SocketIO[Socket.IO Gateway]
    User -->|WebRTC Media Stream| PeerConnection[Peer-to-Peer Video/Audio]
    
    subgraph Server Infrastructure
        Express --> EnvVal[Zod Startup Env Validation]
        Express --> RequestId[Request Correlation Middleware]
        Express --> ServiceLayer[Layered Service Architecture]
        ServiceLayer --> Prisma[(Prisma ORM)]
        Prisma --> Postgres[(PostgreSQL DB)]
        ServiceLayer --> Judge0[Judge0 Sandbox Engine]
        ServiceLayer --> Groq[Groq AI Platform]
    end
    
    subgraph Groq AI Services
        Groq --> Llama[Llama-3.1-8B Instant]
        Groq --> Whisper[Whisper Large v3 Audio Transcribe]
    end
```

---

## 📂 Project Structure

```
livecode/
├── client/                 # Vite + React 19 Frontend
│   ├── src/
│   │   ├── __tests__/      # Vitest client unit test suite
│   │   ├── app/            # Redux store config
│   │   ├── components/     # Room, Navbar, ErrorBoundary, ProtectedRoute, etc.
│   │   ├── features/       # Redux slices (authSlice)
│   │   ├── hooks/          # Custom hooks (useTimer, useResizablePanels, useCodeExecution)
│   │   ├── pages/          # Lazy-loaded pages (Landing, Dashboard, Room, Mock, Report)
│   │   ├── routes/         # AppRoutes with React.lazy + Suspense code splitting
│   │   ├── types/          # TypeScript interface definitions
│   │   └── utils/          # Axios instance, Socket client, Helper utilities
│   └── package.json
│
├── server/                 # Express + Node.js Backend
│   ├── prisma/             # Schema, enums, indexes & database migrations
│   ├── src/
│   │   ├── __tests__/      # Vitest backend unit test suite
│   │   ├── config/         # Zod env validation & Passport Google Strategy
│   │   ├── controllers/    # Express route controllers
│   │   ├── docs/           # OpenAPI 3.0 API Specification
│   │   ├── errors/         # AppError custom exception hierarchy
│   │   ├── middleware/     # Auth, RBAC, request ID, error handler & Zod validation
│   │   ├── routes/         # Express API v1 routes
│   │   ├── services/       # Service Layer business logic
│   │   ├── socket/         # Socket.IO handlers with room membership authorization
│   │   └── utils/          # Tokens, structured logger, seed script
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Groq API Key
- Google OAuth Credentials

### 1. Clone the repository
```bash
git clone https://github.com/vishwajeetsali/livecode.git
cd livecode
```

### 2. Configure Server Environment
Navigate to `server/` and create `.env`:
```bash
cd server
cp .env.example .env
```
Fill in your database URL, Groq API key, Google OAuth secrets, and JWT secrets in `server/.env`.

### 3. Install Server Dependencies & Run
```bash
npm install
npx prisma generate
npm run dev
```

### 4. Configure Client Environment & Run
In a new terminal window:
```bash
cd client
npm install
npm run dev
```

The application will be running at `http://localhost:5173`.
OpenAPI 3.0 API documentation is available at `http://localhost:5000/api/v1/docs`.

---

## 🧪 Testing

The repository features 193 automated unit tests across frontend and backend powered by Vitest.

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

---

## 🔌 API Endpoints Summary (v1)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | System health check endpoint | No |
| `GET` | `/api/v1/docs` | OpenAPI 3.0 JSON API Specification | No |
| `POST` | `/api/v1/auth/exchange` | Exchange OAuth code for access token | No |
| `POST` | `/api/v1/rooms/create` | Create a new live room session | Yes |
| `POST` | `/api/v1/rooms/join` | Join an existing room by ID | Yes |
| `POST` | `/api/v1/code/execute` | Execute code with optional STDIN | Yes |
| `POST` | `/api/v1/ai/hint` | Stream AI hints via SSE | Yes |
| `POST` | `/api/v1/mock/question` | Generate AI mock interview question | Yes |
| `POST` | `/api/v1/transcribe` | Transcribe recorded audio with Whisper | Yes |
| `POST` | `/api/v1/reports/generate` | Generate comprehensive performance report | Yes |
| `GET` | `/api/v1/reports/:id` | Fetch performance report with ownership check | Yes |
| `GET` | `/api/v1/problems` | List custom problem bank | Yes |
| `POST` | `/api/v1/problems/create` | Add problem to bank (INTERVIEWER only) | Yes (RBAC) |
| `DELETE` | `/api/v1/problems/:id` | Delete problem from bank (INTERVIEWER only) | Yes (RBAC) |

---

## 🌐 Production Deployment Guide (Free Tier)

This project is optimized for 100% free deployment across **Vercel** (Frontend), **Render** (Backend), and **Neon** (PostgreSQL).

### Step 1: Database (Neon PostgreSQL)
1. Sign up for a free PostgreSQL database on [Neon.tech](https://neon.tech).
2. Copy your pooled connection string:
   ```
   postgresql://user:password@ep-xyz-pooler.neon.tech/neondb?sslmode=require
   ```
3. Run migrations directly to the cloud database:
   ```bash
   DATABASE_URL="<your-neon-database-url>" npx prisma migrate deploy
   ```

### Step 2: Backend Deployment (Render)
1. Push your repository to GitHub.
2. In Render Dashboard, click **New +** -> **Web Service** and connect your GitHub repo.
3. Configure the service settings:
   - **Root Directory:** `server` (or leave blank if repository root with `cd server` in commands)
   - **Environment:** `Node`
   - **Build Command:** `cd server && npm install && npm run build`
   - **Start Command:** `cd server && npm start`
4. Add Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DATABASE_URL`: `<your-neon-database-url>`
   - `CLIENT_URL`: `https://<your-client-subdomain>.vercel.app`
   - `SERVER_URL`: `https://<your-backend-subdomain>.onrender.com`
   - `JWT_ACCESS_SECRET`: `<generated-random-32-char-string>`
   - `JWT_REFRESH_SECRET`: `<generated-random-32-char-string>`
   - `GOOGLE_CLIENT_ID`: `<your-google-oauth-client-id>`
   - `GOOGLE_CLIENT_SECRET`: `<your-google-oauth-client-secret>`
   - `GROQ_API_KEY`: `<your-groq-api-key>`
   - `JUDGE0_URL`: `https://judge0-ce.p.rapidapi.com` (or self-hosted Judge0 instance)

### Step 3: Google Cloud OAuth 2.0 Credentials
1. In the [Google Cloud Console](https://console.cloud.google.com/), navigate to **APIs & Services > Credentials**.
2. Under **Authorized JavaScript Origins**, add:
   - `https://<your-client-subdomain>.vercel.app`
3. Under **Authorized Redirect URIs**, add:
   - `https://<your-backend-subdomain>.onrender.com/api/v1/auth/google/callback`
   - `https://<your-backend-subdomain>.onrender.com/api/auth/google/callback`

### Step 4: Frontend Deployment (Vercel)
1. In Vercel Dashboard, click **Add New...** -> **Project** and import your GitHub repo.
2. Set **Root Directory** to `client`.
3. Add Environment Variables in Vercel:
   - `VITE_API_URL`: `https://<your-backend-subdomain>.onrender.com`
   - `VITE_SOCKET_URL`: `https://<your-backend-subdomain>.onrender.com`
   - *(Optional TURN)*: `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (from Metered.ca free tier)
4. Click **Deploy**.

