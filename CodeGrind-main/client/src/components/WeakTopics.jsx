// WeakTopics.jsx — chip list of the 5 weakest topics.
// Untouched topics (0 solved) are highlighted in red.

export default function WeakTopics({ weakTopics }) {
  return (
    <div className="weak-topics-section fade-in">
      <p className="section-heading">Weakest Topics</p>
      <div className="weak-chips">
        {weakTopics.map((topic) => (
          <div key={topic.name} className={`weak-chip ${topic.untouched ? 'untouched' : ''}`}>
            <span className="weak-chip-dot" />
            <span className="weak-chip-name">{topic.name}</span>
            <span className="weak-chip-pct">
              {topic.untouched ? 'Untouched' : `${topic.coveragePct}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
