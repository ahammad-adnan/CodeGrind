// index.js — Express app entry point.
// Wires together routes, CORS, rate limiting, and MongoDB connection with in-memory fallback.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { z } from 'zod';

import { fetchLeetCodeData } from './leetcode.js';
import { runAnalysis } from './analysis.js';
import { generateReport } from './llm.js';
import Snapshot from './models/Snapshot.js';
import { CACHE_TTL_MS } from './config.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Database Layer with In-Memory Fallback ──────────────────────────────────
// Allows the app to work out-of-the-box locally even if MONGODB_URI is empty.
const memoryStore = new Map();

async function findSnapshot(username) {
  if (process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      return await Snapshot.findOne({ username }).sort({ createdAt: -1 });
    } catch (err) {
      console.warn('[db] MongoDB query failed, checking memory store:', err.message);
    }
  }
  return memoryStore.get(username) || null;
}

async function createSnapshot(data) {
  const record = {
    ...data,
    createdAt: new Date(),
  };

  if (process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      await Snapshot.create(data);
    } catch (err) {
      console.warn('[db] MongoDB write failed, saved to memory store instead:', err.message);
    }
  }

  memoryStore.set(data.username, record);
  return record;
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());

// CORS: only allow the client origin (configured per environment).
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

// Rate limit: max 10 requests/minute/IP on the analyze endpoint.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Input validation schema ───────────────────────────────────────────────────

const UsernameSchema = z.object({
  username: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,40}$/, 'Invalid username format'),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — used by Render to confirm the server is up.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'mongodb' : 'memory' });
});

// GET /api/report/:username — return the latest cached result or 404.
app.get('/api/report/:username', async (req, res) => {
  const username = req.params.username.toLowerCase();
  const snapshot = await findSnapshot(username);
  if (!snapshot) return res.status(404).json({ error: 'No report found for this username.' });

  return res.json({
    username: snapshot.username,
    fetchedAt: snapshot.createdAt,
    cached: true,
    analysis: snapshot.analysis,
    report: snapshot.report,
    reportSource: snapshot.reportSource,
  });
});

// POST /api/analyze — main endpoint.
app.post('/api/analyze', analyzeLimiter, async (req, res) => {
  // 1. Validate input.
  const parsed = UsernameSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message || 'Invalid username format';
    return res.status(400).json({ error: msg });
  }

  const username = parsed.data.username.toLowerCase();
  const forceRefresh = req.query.refresh === 'true';

  // 2. Cache check — skip if ?refresh=true.
  if (!forceRefresh) {
    const cached = await findSnapshot(username);
    const cachedTime = cached?.createdAt ? new Date(cached.createdAt).getTime() : 0;
    if (cached && Date.now() - cachedTime < CACHE_TTL_MS) {
      // Return cached result without touching LeetCode or the LLM.
      return res.json({
        username: cached.username,
        fetchedAt: cached.createdAt,
        cached: true,
        analysis: cached.analysis,
        report: cached.report,
        reportSource: cached.reportSource,
      });
    }
  }

  // 3. Fetch fresh data from LeetCode.
  let leetcodeData;
  try {
    leetcodeData = await fetchLeetCodeData(username);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }

  // 4. Run deterministic analysis (pure functions, no LLM).
  const analysis = runAnalysis(leetcodeData);

  // 5. Generate LLM plan (falls back automatically if LLM fails).
  const { report, source } = await generateReport(analysis);

  // 6. Persist snapshot.
  const snapshot = await createSnapshot({
    username,
    analysis,
    report,
    reportSource: source,
  });

  // 7. Return fresh result.
  return res.json({
    username,
    fetchedAt: snapshot.createdAt,
    cached: false,
    analysis,
    report,
    reportSource: source,
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('[db] Connected to MongoDB Atlas'))
    .catch((err) => console.warn('[db] MongoDB connection error (using in-memory store):', err.message));
} else {
  console.log('[db] MONGODB_URI is not set in .env — using in-memory store for local testing.');
}

app.listen(PORT, () => console.log(`[server] CodeGrind server running on http://localhost:${PORT}`));

