# RishFits — AI Form Analyzer

Real-time exercise form analysis in the browser. Open a session, start moving, and receive AI-powered coaching after each set — no account, no uploads, no data stored.

**Client:** [Rishane Oak](https://www.rishfits.com/) · [@rishfits](https://www.instagram.com/rishfits/)  
**Built by:** Ohm Kumblekere

---

## How it works

1. MediaPipe tracks 33 body landmarks from your webcam in real time
2. The app computes joint angles (knees, hips, elbows, shoulders) on every frame
3. Rep detection fires when joint angles cross configured thresholds
4. At the end of each set, averaged joint angles are sent to the backend
5. Google Gemini 2.0 Flash generates 2–3 sentences of specific form feedback
6. Feedback appears in the AI panel — your video never leaves your device

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS 4 |
| Pose detection | MediaPipe Tasks Vision (`PoseLandmarker`, VIDEO mode) |
| AI coaching | Google Gemini 2.0 Flash via `@google/generative-ai` |
| Backend | Express.js (Node) |
| Routing | React Router 7 |
| UI components | shadcn/ui (Radix UI) |

---

## Local setup

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/Omnom90/form-analyzer-WIP.git
cd form-analyzer-WIP
```

### 2. Install dependencies

```bash
# Root (concurrently)
npm install

# Frontend
cd "Landing page frontend"
npm install
cd ..

# Backend
cd my-server
npm install
cd ..
```

### 3. Configure the backend

```bash
cp my-server/.env.example my-server/.env
```

Open `my-server/.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
PORT=3000
```

Get a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — it's free.

> **WIP — AI backend is changing:** Gemini 2.0 Flash is the current integration and works well for general coaching feedback. The plan is to migrate to an LLM better suited for fitness and biomechanics — one that can be fine-tuned on exercise-specific angle data and give more precise, domain-aware cues. The `/api/pose` endpoint in `my-server/index.js` is the only file that needs to change when that happens.

### 4. Run

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** Camera access requires HTTPS in most production environments. Locally, `localhost` is treated as secure by all major browsers.

---

## Project structure

```
├── Landing page frontend/   # React + Vite frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx              # Router (/, /workout, /next-steps)
│   │   │   ├── usePoseDetection.ts  # MediaPipe hook — landmarks, angles, skeleton draw
│   │   │   └── pages/
│   │   │       ├── HomePage.tsx      # Landing page
│   │   │       ├── WorkoutPage.tsx   # Live training session
│   │   │       └── NextStepsPage.tsx # Roadmap and credits
│   │   └── styles/
│   └── public/
│       ├── pose_landmarker_lite.task  # MediaPipe model (bundled locally)
│       └── logo.svg
│
└── my-server/               # Express backend
    ├── index.js             # /api/pose endpoint → Gemini feedback
    └── .env.example
```

### `.github/workflows/` — early prototype files

The files in `.github/workflows/` (`backend.js`, `index.html`, `script.js`) are **not** GitHub Actions configs — they're an early browser-only prototype built with the raw MediaPipe FaceMesh API before the project moved to the current React/Vite architecture. They're kept here for reference and left in place intentionally.

---

## Exercises supported (v1)

| Exercise | Tracked joints | Rep detection |
|----------|---------------|---------------|
| Bodyweight squat | Knees, hips | Knee angle < 100° (bottom) → > 140° (top) |
| Push-up | Elbows | Elbow angle < 90° (bottom) → > 155° (top) |

---

## Supported scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run client` | Frontend only |
| `npm run server` | Backend only |

---

## Privacy

Video is processed entirely in the browser via WebAssembly. Only aggregated joint angle numbers (not video) are sent to the backend for AI coaching. No user data is stored anywhere.
