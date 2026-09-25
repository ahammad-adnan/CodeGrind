// analysis.js — pure functions, no network calls.
// The LLM never runs this; it just receives the output object.

import { TOPIC_TARGETS, LEVEL_THRESHOLDS } from './config.js';

/**
 * Build the difficulty breakdown from LeetCode's acSubmissionNum array.
 * Returns { total, easy, medium, hard }.
 */
export function parseDifficulty(submissionStats) {
  const find = (label) =>
    submissionStats.find((s) => s.difficulty === label)?.count ?? 0;

  return {
    total: find('All'),
    easy: find('Easy'),
    medium: find('Medium'),
    hard: find('Hard'),
  };
}

/**
 * Determine user's skill level based on total solved and hard count.
 * Rule: <50 → Beginner, 50-199 → Intermediate, >=200 → Advanced.
 *       If Advanced but hard < 5, downgrade to Intermediate.
 */
export function computeLevel(difficulty) {
  const { total, hard } = difficulty;

  if (total < LEVEL_THRESHOLDS.beginner) return 'Beginner';
  if (total < LEVEL_THRESHOLDS.intermediate) return 'Intermediate';

  // Hard count guard — too few hard problems means not truly Advanced.
  if (hard < 5) return 'Intermediate';
  return 'Advanced';
}

/**
 * Compute coverage metrics for every topic in TOPIC_TARGETS.
 * Uses a case-insensitive lookup so "array" and "Array" both match.
 * Returns an array sorted by weaknessScore descending (worst first).
 */
export function computeTopicCoverage(tags) {
  // Build a lowercase → problemsSolved map from the LeetCode tags.
  const tagMap = new Map(
    tags.map((t) => [t.tagName.toLowerCase(), t.problemsSolved])
  );

  const topics = Object.entries(TOPIC_TARGETS).map(([name, target]) => {
    const solved = tagMap.get(name.toLowerCase()) ?? 0;
    const coveragePct = Math.min(100, Math.round((solved / target) * 100));
    // weaknessScore: 1 = never touched, 0 = fully covered.
    const weaknessScore = Math.max(0, parseFloat((1 - solved / target).toFixed(4)));

    return { name, solved, target, coveragePct, weaknessScore };
  });

  // Sort worst topics first (higher weaknessScore = weaker).
  return topics.sort((a, b) => b.weaknessScore - a.weaknessScore);
}

/**
 * Pick the top 5 weakest topics.
 * Tie-breaking: larger target wins (more impactful topic).
 */
export function getWeakTopics(topics) {
  return topics
    .slice() // don't mutate the sorted array
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      return b.target - a.target; // bigger target → higher priority
    })
    .slice(0, 5)
    .map((t) => ({
      ...t,
      untouched: t.solved === 0, // flag never-attempted topics
    }));
}

/**
 * Compute activity metrics from recent accepted submissions.
 * timestamp is Unix seconds (LeetCode convention).
 */
export function computeRecentActivity(recentSubmissions) {
  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;

  const last7 = recentSubmissions.filter(
    (s) => Number(s.timestamp) * 1000 >= sevenDaysAgoMs
  );

  const solvedLast7Days = last7.length;

  // Count distinct calendar days (UTC) with at least one submission.
  const daySet = new Set(
    last7.map((s) => {
      const d = new Date(Number(s.timestamp) * 1000);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    })
  );
  const activeDaysLast7 = daySet.size;

  return { solvedLast7Days, activeDaysLast7 };
}

/**
 * Master function — takes raw LeetCode data and returns the full analysis object.
 * This is the only function the route handler calls.
 */
export function runAnalysis(leetcodeData) {
  const difficulty = parseDifficulty(leetcodeData.submissionStats);
  const level = computeLevel(difficulty);
  const topics = computeTopicCoverage(leetcodeData.tags);
  const weakTopics = getWeakTopics(topics);
  const recent = computeRecentActivity(leetcodeData.recentSubmissions);

  return { level, difficulty, topics, weakTopics, recent };
}
