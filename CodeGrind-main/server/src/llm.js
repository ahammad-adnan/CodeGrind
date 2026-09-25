// llm.js — ONLY file that talks to the LLM provider.
// Swap the provider by changing the env vars; no other file changes needed.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { buildFallbackPlan } from './fallbackPlan.js';

// ── Zod schema ──────────────────────────────────────────────────────────────
// Validates the raw JSON returned by the LLM before we trust it.

const DayPlanSchema = z.object({
  day: z.number().int().min(1).max(7),
  topic: z.string().min(1),
  task: z.string().min(1),
  problemCount: z.number().int().min(1).max(5),
  difficultyMix: z.string().min(1),
});

const ReportSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  weakTopics: z.array(
    z.object({
      topic: z.string(),
      why: z.string(),
      focus: z.string(),
    })
  ),
  plan: z.array(DayPlanSchema).length(7), // exactly 7 days
  tip: z.string().min(1),
});

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(analysis) {
  const { level, difficulty, weakTopics, recent } = analysis;

  // We pass only the compact analysis object, not raw LeetCode data.
  // The LLM must work only from these numbers — never invent statistics.
  const dataBlock = JSON.stringify({ level, difficulty, weakTopics, recent }, null, 2);

  return `You are a coding coach. A student's LeetCode analysis is provided below.
Write a personalised 7-day study plan based ONLY on the numbers given.

RULES (follow every one):
1. Use ONLY the numbers provided. Do NOT invent statistics or make assumptions.
2. Do NOT name specific LeetCode problems or problem numbers. Recommend topic + difficulty mix + count only.
3. Return valid JSON matching the schema exactly — nothing else (no markdown, no code fences).
4. The plan array must have exactly 7 items with day values 1 through 7.
5. Keep it realistic: 1–3 problems per day. Include one revision/review day (usually day 7).
6. problemCount must be an integer between 1 and 5.

ANALYSIS DATA:
${dataBlock}

JSON SCHEMA TO RETURN:
{
  "summary": "2-3 sentences on where the user stands",
  "strengths": ["string"],
  "weakTopics": [{ "topic": "string", "why": "string", "focus": "string" }],
  "plan": [{ "day": 1, "topic": "string", "task": "string", "problemCount": 2, "difficultyMix": "string" }],
  "tip": "one motivating, practical tip"
}`;
}

// ── Parse helper ──────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences (```json ... ```) if the model wraps its output.
 * Returns the inner JSON string.
 */
function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/**
 * Parse and validate the LLM text response with zod.
 * Throws if JSON is malformed or schema doesn't match.
 */
function parseAndValidate(text) {
  const cleaned = stripCodeFences(text);
  const parsed = JSON.parse(cleaned); // throws SyntaxError if not valid JSON
  return ReportSchema.parse(parsed);  // throws ZodError if schema mismatch
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a study plan from the analysis object.
 * Tries the LLM once, retries once on validation failure,
 * then falls back to the deterministic plan.
 *
 * @param {object} analysis — output from runAnalysis()
 * @returns {{ report: object, source: 'llm'|'fallback' }}
 */
export async function generateReport(analysis) {
  const apiKey = process.env.LLM_API_KEY;
  const modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';

  // No API key → skip to fallback immediately.
  if (!apiKey) {
    console.warn('[llm] No LLM_API_KEY set — using fallback plan.');
    const report = buildFallbackPlan(analysis);
    return { report, source: 'fallback' };
  }

  const prompt = buildPrompt(analysis);
  let attempt = 0;

  while (attempt < 2) {
    attempt++;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const report = parseAndValidate(text);
      return { report: { ...report, source: 'llm' }, source: 'llm' };
    } catch (err) {
      console.warn(`[llm] Attempt ${attempt} failed:`, err.message);
      if (attempt === 1) continue; // retry once
    }
  }

  // Both attempts failed → use fallback.
  console.warn('[llm] Both LLM attempts failed — using fallback plan.');
  const report = buildFallbackPlan(analysis);
  return { report, source: 'fallback' };
}
