// config.js — central place to tweak thresholds.
// Changing a number here automatically affects analysis and tests.

// Solved-count thresholds for skill level classification.
export const LEVEL_THRESHOLDS = {
  beginner: 50,      // < 50  → Beginner
  intermediate: 200, // 50-199 → Intermediate, >=200 → Advanced
};

// Target problems-solved per topic.
// tagName must match LeetCode's API response (case-insensitive match in analysis).
export const TOPIC_TARGETS = {
  'Array': 40,
  'String': 25,
  'Hash Table': 25,
  'Two Pointers': 15,
  'Sliding Window': 10,
  'Stack': 12,
  'Binary Search': 15,
  'Linked List': 12,
  'Tree': 25,
  'Depth-First Search': 15,
  'Breadth-First Search': 12,
  'Graph': 12,
  'Dynamic Programming': 25,
  'Greedy': 12,
  'Backtracking': 10,
  'Heap (Priority Queue)': 10,
  'Sorting': 10,
  'Bit Manipulation': 6,
};

// How long a cached result is considered fresh (milliseconds).
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// LeetCode GraphQL API endpoint.
export const LEETCODE_API = 'https://leetcode.com/graphql';

// Request timeout for LeetCode calls (ms).
export const LEETCODE_TIMEOUT_MS = 10_000;
