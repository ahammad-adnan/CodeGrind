# CodeGrind — AI DSA Coach

> Enter a LeetCode username → get real stats, deterministic topic analysis, and an AI-generated 7-day study plan.



## Architecture (in 5 lines)

```
Client (React/Vite) → POST /api/analyze → LeetCode GraphQL (real stats)
                                         → MongoDB Atlas  (6-hour cache)
                                         → Gemini API     (7-day plan)
                    ← full result (analysis + report) ←
```

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), plain CSS, Recharts, axios |
| Backend | Node.js 20+, Express, Mongoose |
| Database | MongoDB Atlas (free tier) |
| LLM | Gemini 1.5 Flash via `@google/generative-ai` |
| Validation | zod |
| Tests | Vitest |
| Rate limiting | `express-rate-limit` |

## Local Setup

```bash
# 1. Clone
git clone <repo-url>
cd codegrind

# 2. Server
cd server
cp .env.example .env
# Fill in MONGODB_URI and LLM_API_KEY in .env
npm install
npm run dev

# 3. Client (new terminal)
cd client
cp .env.example .env
# VITE_API_URL=http://localhost:5000 (already set)
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

**server/.env**

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `LLM_API_KEY` | Gemini API key (free at aistudio.google.com) |
| `LLM_MODEL` | Gemini model name (default: gemini-1.5-flash) |
| `CLIENT_ORIGIN` | Frontend URL for CORS (default: http://localhost:5173) |

**client/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (default: http://localhost:5000) |

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Body `{ username }`. Query `?refresh=true` bypasses cache |
| `GET` | `/api/report/:username` | Returns latest cached result or 404 |
| `GET` | `/api/health` | `{ status: "ok" }` |

## Running Tests

```bash
cd server
npm test
```

## Design Decisions

- **Code analyzes, LLM narrates**: All statistics are computed deterministically in `analysis.js`. The LLM only writes the narrative and plan from numbers we give it — it never invents statistics.
- **Fallback plan**: If the LLM API is unavailable or returns invalid JSON (after one retry), `fallbackPlan.js` generates a deterministic plan from the same analysis data. The UI labels it "Basic plan (AI unavailable)".
- **6-hour caching**: A second request for the same username within 6 hours returns the cached result and skips both LeetCode and LLM calls. Forces a fresh fetch with `?refresh=true`.
- **No specific problem names from the LLM**: The system prompt explicitly forbids the LLM from naming problems. LLMs hallucinate problem names, so the plan specifies topic + difficulty mix + count only.
- **zod validation on LLM output**: The LLM response is parsed and validated against a strict schema. If it fails, we retry once before falling back.

## Known Limitations

- LeetCode's GraphQL API is unofficial and undocumented — a schema change could break data fetching. All calls are isolated in `server/src/leetcode.js` so fixes are localised.
- Render free tier sleeps after 15 minutes of inactivity, causing ~30s cold starts. The UI warns users about this.
- Free LLM tier has rate limits; the cache and fallback make the app usable even when the quota is exhausted.

## Live Demo

*(Add deployed URL here)*
