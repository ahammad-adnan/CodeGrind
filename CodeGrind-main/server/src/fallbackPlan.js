// fallbackPlan.js — deterministic 7-day plan used when the LLM is unavailable.
// Produces a valid report object matching the same schema as llm.js.

/**
 * Build a study plan by spreading weak topics across 7 days.
 * Day 7 is always a revision day.
 * @param {object} analysis — output from runAnalysis()
 * @returns {object} report matching the LLM output schema, with source:'fallback'
 */
export function buildFallbackPlan(analysis) {
  const { level, difficulty, weakTopics, recent } = analysis;

  const summary =
    `${level} level coder with ${difficulty.total} problems solved ` +
    `(${difficulty.easy} easy, ${difficulty.medium} medium, ${difficulty.hard} hard). ` +
    `Focus on bridging the gaps identified in your weak topics.`;

  const strengths = [];
  if (difficulty.easy > 20) strengths.push('Comfortable with easy problems');
  if (difficulty.medium > 10) strengths.push('Has tackled medium difficulty problems');
  if (recent.activeDaysLast7 >= 4) strengths.push('Consistent daily practice habit');
  if (strengths.length === 0) strengths.push('Getting started — every expert was once a beginner');

  // Cycle through weak topics for days 1-6, put revision on day 7.
  const topicsToUse = weakTopics.length > 0
    ? weakTopics
    : [{ name: 'Array', weaknessScore: 0 }]; // safe fallback if all topics are covered

  const plan = [];
  for (let day = 1; day <= 7; day++) {
    if (day === 7) {
      plan.push({
        day: 7,
        topic: 'Revision',
        task: "Review the week's problems. Re-attempt any you found difficult. Read editorial solutions to understand alternative approaches.",
        problemCount: 2,
        difficultyMix: 'Easy + Medium',
      });
    } else {
      const topic = topicsToUse[(day - 1) % topicsToUse.length];
      const isUntouched = topic.untouched ?? topic.solved === 0;
      plan.push({
        day,
        topic: topic.name,
        task: isUntouched
          ? `Start ${topic.name} from scratch. Solve easy problems to build intuition before attempting medium difficulty.`
          : `Continue building ${topic.name} skills. Focus on the patterns you have not yet seen.`,
        problemCount: 2,
        difficultyMix: isUntouched ? '2 Easy' : '1 Easy, 1 Medium',
      });
    }
  }

  const weakTopicNotes = weakTopics.map((t) => ({
    topic: t.name,
    why: t.untouched
      ? `You have not solved any ${t.name} problems yet.`
      : `You have solved ${t.solved} of ${t.target} target problems (${t.coveragePct}% coverage).`,
    focus: t.solved >= t.target
      ? `Target reached! Keep practicing ${t.name} to maintain mastery.`
      : `Aim for ${t.target - t.solved} more ${t.name} problems to reach the target.`,
  }));

  return {
    summary,
    strengths,
    weakTopics: weakTopicNotes,
    plan,
    tip: 'Consistency beats intensity. Two problems every day adds up faster than a weekend marathon.',
    source: 'fallback', // tells the UI to show the "Basic plan (AI unavailable)" label
  };
}
