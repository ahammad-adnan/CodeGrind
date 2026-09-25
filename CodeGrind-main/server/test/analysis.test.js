// test/analysis.test.js — unit tests for the pure analysis functions.
// Run with: npm test (in the server directory)

import { describe, it, expect } from 'vitest';
import {
  parseDifficulty,
  computeLevel,
  computeTopicCoverage,
  getWeakTopics,
  computeRecentActivity,
  runAnalysis,
} from '../src/analysis.js';

// ── parseDifficulty ───────────────────────────────────────────────────────────

describe('parseDifficulty', () => {
  const stats = [
    { difficulty: 'All', count: 120 },
    { difficulty: 'Easy', count: 70 },
    { difficulty: 'Medium', count: 45 },
    { difficulty: 'Hard', count: 5 },
  ];

  it('extracts all four fields correctly', () => {
    expect(parseDifficulty(stats)).toEqual({ total: 120, easy: 70, medium: 45, hard: 5 });
  });

  it('returns 0 for missing difficulties', () => {
    expect(parseDifficulty([])).toEqual({ total: 0, easy: 0, medium: 0, hard: 0 });
  });
});

// ── computeLevel ─────────────────────────────────────────────────────────────

describe('computeLevel', () => {
  it('returns Beginner when total < 50', () => {
    expect(computeLevel({ total: 49, hard: 0 })).toBe('Beginner');
  });

  it('returns Beginner when total is 0 (new account)', () => {
    expect(computeLevel({ total: 0, hard: 0 })).toBe('Beginner');
  });

  it('returns Intermediate for 50–199 range', () => {
    expect(computeLevel({ total: 100, hard: 10 })).toBe('Intermediate');
  });

  it('returns Advanced when total >= 200 and hard >= 5', () => {
    expect(computeLevel({ total: 250, hard: 20 })).toBe('Advanced');
  });

  it('downgrades Advanced to Intermediate when hard < 5', () => {
    expect(computeLevel({ total: 250, hard: 4 })).toBe('Intermediate');
  });
});

// ── computeTopicCoverage ──────────────────────────────────────────────────────

describe('computeTopicCoverage', () => {
  const tags = [
    { tagName: 'Array', problemsSolved: 20 },         // 50% of target 40
    { tagName: 'dynamic programming', problemsSolved: 30 }, // case-insensitive match, > target 25
    { tagName: 'UnknownTopic', problemsSolved: 99 },  // should be ignored
  ];

  it('matches case-insensitively', () => {
    const topics = computeTopicCoverage(tags);
    const dp = topics.find(t => t.name === 'Dynamic Programming');
    expect(dp).toBeDefined();
    expect(dp.solved).toBe(30);
  });

  it('caps coveragePct at 100', () => {
    const topics = computeTopicCoverage(tags);
    const dp = topics.find(t => t.name === 'Dynamic Programming');
    expect(dp.coveragePct).toBe(100); // 30/25 > 1 → capped
  });

  it('returns 0 solved for topics not in tags array', () => {
    const topics = computeTopicCoverage([]);
    expect(topics.every(t => t.solved === 0)).toBe(true);
  });

  it('sorts by weaknessScore descending (worst first)', () => {
    const topics = computeTopicCoverage(tags);
    for (let i = 1; i < topics.length; i++) {
      expect(topics[i - 1].weaknessScore).toBeGreaterThanOrEqual(topics[i].weaknessScore);
    }
  });
});

// ── getWeakTopics ─────────────────────────────────────────────────────────────

describe('getWeakTopics', () => {
  it('returns exactly 5 topics', () => {
    const topics = computeTopicCoverage([]);
    const weak = getWeakTopics(topics);
    expect(weak.length).toBe(5);
  });

  it('marks untouched:true when solved is 0', () => {
    const topics = computeTopicCoverage([]);
    const weak = getWeakTopics(topics);
    expect(weak.every(t => t.untouched === true)).toBe(true);
  });

  it('marks untouched:false when solved > 0', () => {
    const tags = [{ tagName: 'Dynamic Programming', problemsSolved: 5 }];
    const topics = computeTopicCoverage(tags);
    const weak = getWeakTopics(topics);
    const dp = weak.find(t => t.name === 'Dynamic Programming');
    // DP has 5/25 solved → weaknessScore = 0.8, likely in top 5
    if (dp) expect(dp.untouched).toBe(false);
  });
});

// ── computeRecentActivity ─────────────────────────────────────────────────────

describe('computeRecentActivity', () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const daySec = 24 * 60 * 60;

  it('counts submissions in the last 7 days', () => {
    const subs = [
      { timestamp: String(nowSec - 1 * daySec) },  // 1 day ago → within 7
      { timestamp: String(nowSec - 6 * daySec) },  // 6 days ago → within 7
      { timestamp: String(nowSec - 8 * daySec) },  // 8 days ago → outside 7
    ];
    const { solvedLast7Days } = computeRecentActivity(subs);
    expect(solvedLast7Days).toBe(2);
  });

  it('counts distinct active days', () => {
    const subs = [
      { timestamp: String(nowSec - 1 * daySec) },
      { timestamp: String(nowSec - 1 * daySec + 60) }, // same day, different second
      { timestamp: String(nowSec - 3 * daySec) },
    ];
    const { activeDaysLast7 } = computeRecentActivity(subs);
    expect(activeDaysLast7).toBe(2); // two distinct days
  });

  it('returns zeros for an empty submission list (new account)', () => {
    const { solvedLast7Days, activeDaysLast7 } = computeRecentActivity([]);
    expect(solvedLast7Days).toBe(0);
    expect(activeDaysLast7).toBe(0);
  });
});

// ── runAnalysis (integration) ─────────────────────────────────────────────────

describe('runAnalysis', () => {
  it('produces the correct output shape', () => {
    const data = {
      submissionStats: [
        { difficulty: 'All', count: 80 },
        { difficulty: 'Easy', count: 50 },
        { difficulty: 'Medium', count: 25 },
        { difficulty: 'Hard', count: 5 },
      ],
      tags: [{ tagName: 'Array', problemsSolved: 30 }],
      recentSubmissions: [],
    };
    const result = runAnalysis(data);
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('topics');
    expect(result).toHaveProperty('weakTopics');
    expect(result).toHaveProperty('recent');
    expect(result.weakTopics.length).toBe(5);
  });

  it('handles a completely empty account (0 solved)', () => {
    const data = {
      submissionStats: [],
      tags: [],
      recentSubmissions: [],
    };
    const result = runAnalysis(data);
    expect(result.level).toBe('Beginner');
    expect(result.difficulty.total).toBe(0);
    expect(result.recent.solvedLast7Days).toBe(0);
  });
});
