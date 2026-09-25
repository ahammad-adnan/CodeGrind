// PlanCards.jsx — 7-day study plan displayed as a grid of cards.

export default function PlanCards({ plan }) {
  return (
    <div className="plan-section fade-in">
      <p className="section-heading">7-Day Study Plan</p>
      <div className="plan-grid">
        {plan.map((day) => (
          <div
            key={day.day}
            className={`plan-card ${day.topic === 'Revision' ? 'revision' : ''}`}
          >
            <p className="plan-card-day">Day {day.day}</p>
            <p className="plan-card-topic">{day.topic}</p>
            <p className="plan-card-task">{day.task}</p>
            <div className="plan-card-meta">
              <span className="plan-meta-tag count">
                {day.problemCount} problem{day.problemCount !== 1 ? 's' : ''}
              </span>
              <span className="plan-meta-tag">{day.difficultyMix}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
