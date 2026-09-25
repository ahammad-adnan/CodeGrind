// StatCards.jsx — shows total/easy/medium/hard/recent stats as number cards.

export default function StatCards({ difficulty, recent }) {
  const cards = [
    { key: 'total', label: 'Total Solved', value: difficulty.total, sub: 'problems' },
    { key: 'easy', label: 'Easy', value: difficulty.easy, sub: 'solved' },
    { key: 'medium', label: 'Medium', value: difficulty.medium, sub: 'solved' },
    { key: 'hard', label: 'Hard', value: difficulty.hard, sub: 'solved' },
    { key: 'recent', label: 'Last 7 Days', value: recent.solvedLast7Days, sub: `${recent.activeDaysLast7} active day${recent.activeDaysLast7 !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div key={c.key} className={`stat-card ${c.key} fade-in`}>
          <span className="stat-card-label">{c.label}</span>
          <span className="stat-card-value">{c.value}</span>
          <span className="stat-card-sub">{c.sub}</span>
        </div>
      ))}
    </div>
  );
}
