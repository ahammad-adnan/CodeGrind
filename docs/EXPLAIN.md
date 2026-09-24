# CodeGrind — File-by-File Walkthrough and Interview Q&A

This document is for **you, the developer**. Read it before your internship interview.

---

## How Data Flows

```
1. User types a username → client/src/App.jsx calls POST /api/analyze
2. server/src/index.js receives the request
3. Checks MongoDB for a cached result < 6 hours old → returns it if found
4. Otherwise: calls fetchLeetCodeData() in leetcode.js
   → Two GraphQL queries to leetcode.com/graphql (profile + recent submissions)
   → Merges three tag groups into one flat list
5. Passes raw data to runAnalysis() in analysis.js
   → Pure functions: parseDifficulty, computeLevel, computeTopicCoverage, getWeakTopics, computeRecentActivity
   → Returns a clean { level, difficulty, topics, weakTopics, recent } object
6. Passes analysis to generateReport() in llm.js
   → Builds a prompt with only the analysis numbers (no raw LeetCode data)
   → Calls Gemini API, parses JSON, validates with zod
   → On failure: retries once, then builds a deterministic fallback plan
7. Saves the result to MongoDB (Snapshot collection)
8. Returns the full result to the client
9. React renders: StatCards, DifficultyChart, TopicChart, WeakTopics, PlanCards
```

---

## File-by-File

### `server/src/config.js`
Holds all tunable numbers: level thresholds, topic targets, cache TTL. Edit here to change analysis behaviour — no other file needs changing.

### `server/src/leetcode.js`
All LeetCode API calls live here. If LeetCode changes their GraphQL schema, this is the only file to fix. Uses axios with a 10-second timeout. Returns 404 if `matchedUser` is null, 502 for network errors.

### `server/src/analysis.js`
Pure functions — no network, no side effects. Fully unit-tested. This is intentional: the analysis must be deterministic (same input → same output every time). The LLM only receives the output of `runAnalysis()`.

### `server/src/fallbackPlan.js`
Generates a valid 7-day plan using only the analysis object, no LLM. Used when the LLM API key is missing, the API errors, or the JSON validation fails twice. Ensures the app is always useful.

### `server/src/llm.js`
The only file that talks to the LLM. System prompt explicitly says: "use only the numbers provided, do not name specific problems, return valid JSON only." Output is validated with zod before being used. Retries once on failure.

### `server/src/models/Snapshot.js`
Mongoose schema for the cached result. Has a TTL index (7 days) so old data auto-deletes. Username is stored lowercased so "NealWu" and "nealwu" hit the same cache.

### `server/src/index.js`
Express app: CORS, JSON parsing, rate limiting, three routes. Implements the 6-hour cache check before hitting LeetCode. Fails fast on startup if `MONGODB_URI` is missing.

### `client/src/api.js`
Thin axios wrapper. One function: `analyzeUser(username, refresh)`. All HTTP config (base URL) lives here.

### `client/src/App.jsx`
Single-page app with four states: home, loading, dashboard, error. No router — the PRD doesn't require navigation. All error codes (404, 429, 502) have friendly messages.

### `client/src/components/`
- **StatCards**: Five number cards — total, easy, medium, hard, last-7-days.
- **DifficultyChart**: Recharts donut chart for easy/medium/hard split.
- **TopicChart**: Recharts horizontal bar chart, all 18 topics sorted by weakness. Target shown as grey background bar.
- **WeakTopics**: Chip list for the 5 weakest topics; untouched ones highlighted red.
- **PlanCards**: 7 cards, one per day. Revision day gets a special style.

---

## 10 Likely Interview Questions

**Q1: Why cache results for 6 hours?**
Two reasons: (1) LeetCode's API is unofficial and rate-limiting requests protects us from being blocked. (2) Calling the LLM for every request would exhaust free-tier quotas quickly. The user's stats don't change minute-by-minute, so 6 hours is a good balance.

**Q2: Why validate the LLM output with zod?**
LLMs don't guarantee JSON structure even when asked. Without validation we might get missing fields, wrong types (e.g. `day` as a string), or an array of 6 instead of 7. Zod catches these at the boundary so the rest of the code can trust the data shape.

**Q3: What happens if LeetCode changes its GraphQL API?**
All LeetCode calls are in `leetcode.js`. A schema change is a one-file fix. The test script `scripts/testLeetcode.js` can be run anytime to verify the fields are still present. We also handle the case where `matchedUser` is null (404) and where the API is unreachable (502).

**Q4: How does the weakness score work?**
`weaknessScore = max(0, 1 - solved / target)`. At 0 solved → score is 1.0 (worst). At target or above → score is 0.0 (fully covered). It's a simple linear measure of how far below target you are, capped to avoid negative scores for over-covered topics.

**Q5: Why do code analysis instead of asking the LLM to compute the stats?**
LLMs can hallucinate numbers. If we asked the LLM to compute "what are your weak topics?", it might make up statistics. By doing the analysis in pure JS functions (which are unit-tested), the numbers are guaranteed correct. The LLM only narrates — it can't lie about the numbers because we don't ask it to compute them.

**Q6: How would you scale this if traffic grew?**
(1) Move the cache check to Redis for sub-millisecond lookups. (2) Queue LLM calls with a job system (BullMQ) to avoid blocking the event loop on slow API calls. (3) Add a CDN layer for the static React build. (4) Use a connection pool for MongoDB instead of one connection per process.

**Q7: Why not name specific LeetCode problems in the plan?**
LLMs frequently hallucinate problem names — they confidently name problems that don't exist, or mis-attribute difficulty. Since we can't verify the names at runtime, it's safer to recommend topic + difficulty mix + count. This is stated explicitly in the system prompt.

**Q8: What does the fallback plan guarantee?**
It always returns a valid 7-day plan (exactly 7 items, day 1–7) with realistic problem counts (2/day), a revision day (day 7), and specific reasoning for each weak topic. The UI labels it "Basic plan (AI unavailable)" so the user knows it's deterministic, not AI-generated.

**Q9: Why use Mongoose TTL instead of manual cleanup?**
A TTL index on `createdAt` tells MongoDB to automatically delete documents older than 7 days. It's one line of schema config, it runs at the database level (no cron job to maintain), and it works even if the server is down.

**Q10: What would you do if you had more time?**
(1) Add proper auth so users can track their progress over time. (2) Fetch submission history over weeks to detect improvement trends. (3) Support Codeforces profiles alongside LeetCode. (4) Add a PWA manifest so it installs on mobile. (5) Expand TOPIC_TARGETS with more granular sub-topics.
