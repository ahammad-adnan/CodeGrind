// scripts/testLeetcode.js — M1 verification script.
// Run with: node scripts/testLeetcode.js <username>
// Confirms the LeetCode API is reachable and prints the normalised data shape.

import 'dotenv/config';
import { fetchLeetCodeData } from '../src/leetcode.js';

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/testLeetcode.js <leetcode-username>');
  process.exit(1);
}

console.log(`Fetching LeetCode data for: ${username} ...\n`);

try {
  const data = await fetchLeetCodeData(username);

  console.log('✅ Username:', data.username);
  console.log('📊 Ranking:', data.ranking);
  console.log('📈 Submission stats (acSubmissionNum):');
  console.table(data.submissionStats);

  console.log(`\n🏷️  Merged tag counts (${data.tags.length} topics):`);
  // Show top 10 by solved count for brevity
  const top10 = [...data.tags]
    .sort((a, b) => b.problemsSolved - a.problemsSolved)
    .slice(0, 10);
  console.table(top10.map(t => ({ tagName: t.tagName, solved: t.problemsSolved })));

  console.log(`\n⏱️  Recent submissions (${data.recentSubmissions.length} fetched):`);
  const recent = data.recentSubmissions.slice(0, 5);
  console.table(recent.map(s => ({
    title: s.title,
    date: new Date(Number(s.timestamp) * 1000).toLocaleDateString(),
  })));

  console.log('\n✅ All fields confirmed. LeetCode API is working.');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
