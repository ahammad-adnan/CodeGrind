// leetcode.js — ONLY file that talks to LeetCode's GraphQL API.
// Keeping all calls here means a LeetCode API change touches one file.

import axios from 'axios';
import { LEETCODE_API, LEETCODE_TIMEOUT_MS } from './config.js';

// GraphQL query for profile stats and topic tag counts.
const PROFILE_QUERY = `
query userProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    tagProblemCounts {
      fundamental { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      advanced { tagName tagSlug problemsSolved }
    }
  }
}
`;

// GraphQL query for recent accepted submissions (last 20 is plenty for 7-day calc).
const RECENT_QUERY = `
query recent($username: String!, $limit: Int) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title
    titleSlug
    timestamp
  }
}
`;

// Shared headers — Referer and User-Agent help the unofficial API not reject us.
const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (compatible; CodeGrind/1.0)',
};

/**
 * Fetch a user's profile stats and topic tag counts from LeetCode.
 * Returns the normalised payload or throws with a descriptive error.
 */
async function fetchProfile(username) {
  const res = await axios.post(
    LEETCODE_API,
    { query: PROFILE_QUERY, variables: { username } },
    { headers: HEADERS, timeout: LEETCODE_TIMEOUT_MS }
  );

  const user = res.data?.data?.matchedUser;
  if (!user) {
    // LeetCode returns 200 with matchedUser = null for unknown users.
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

/**
 * Fetch the last `limit` accepted submissions for a user.
 */
async function fetchRecentSubmissions(username, limit = 20) {
  const res = await axios.post(
    LEETCODE_API,
    { query: RECENT_QUERY, variables: { username, limit } },
    { headers: HEADERS, timeout: LEETCODE_TIMEOUT_MS }
  );
  return res.data?.data?.recentAcSubmissionList ?? [];
}

/**
 * Merge three tag arrays (fundamental / intermediate / advanced) into one.
 * If a tag appears in multiple groups, sum the problemsSolved counts.
 */
function mergeTagGroups(tagProblemCounts) {
  const { fundamental = [], intermediate = [], advanced = [] } = tagProblemCounts;
  const allTags = [...fundamental, ...intermediate, ...advanced];

  const merged = new Map();
  for (const tag of allTags) {
    const key = tag.tagName; // keep original casing; analysis does case-insensitive match
    const existing = merged.get(key);
    if (existing) {
      existing.problemsSolved += tag.problemsSolved;
    } else {
      merged.set(key, { tagName: tag.tagName, tagSlug: tag.tagSlug, problemsSolved: tag.problemsSolved });
    }
  }
  return Array.from(merged.values());
}

/**
 * Main export — fetch everything we need and return a clean, normalised object.
 * Throws { status: 404 } for unknown users, { status: 502 } for network errors.
 */
export async function fetchLeetCodeData(username) {
  let profile, recentSubs;

  try {
    [profile, recentSubs] = await Promise.all([
      fetchProfile(username),
      fetchRecentSubmissions(username),
    ]);
  } catch (err) {
    if (err.status === 404) throw err; // re-throw user-not-found

    // Network / timeout errors become a 502 so the route handler can send the right HTTP code.
    const netErr = new Error('LeetCode API is unreachable. Please try again later.');
    netErr.status = 502;
    throw netErr;
  }

  const submissionStats = profile.submitStatsGlobal?.acSubmissionNum ?? [];
  const tags = mergeTagGroups(profile.tagProblemCounts ?? {});

  return {
    username: profile.username,
    ranking: profile.profile?.ranking ?? null,
    submissionStats, // [{ difficulty: 'All'|'Easy'|'Medium'|'Hard', count: N }]
    tags,            // [{ tagName, tagSlug, problemsSolved }]
    recentSubmissions: recentSubs, // [{ title, titleSlug, timestamp }]
  };
}
