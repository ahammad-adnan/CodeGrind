// TopicChart.jsx — horizontal bar chart showing solved vs. target per topic.
// Sorted by weakness (worst first) to match the analysis output ordering.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

// Color each bar by how much is covered (green → yellow → red gradient by pct)
function barColor(coveragePct) {
  if (coveragePct >= 80) return '#10b981';
  if (coveragePct >= 50) return '#f59e0b';
  return '#f43f5e';
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{d.name}</p>
      <p style={{ color: 'var(--easy-color)' }}>Solved: {d.solved}</p>
      <p style={{ color: 'var(--text-muted)' }}>Target: {d.target}</p>
      <p style={{ color: 'var(--text-secondary)' }}>Coverage: {d.coveragePct}%</p>
    </div>
  );
}

export default function TopicChart({ topics }) {
  // Show all topics sorted by weakness (already sorted from the server).
  const data = topics.map((t) => ({
    ...t,
    // Recharts needs the displayed value; cap at target for visual clarity.
    displaySolved: Math.min(t.solved, t.target),
  }));

  return (
    <div className="chart-card fade-in">
      <p className="chart-title">Topic Coverage</p>
      <ResponsiveContainer width="100%" height={Math.max(320, data.length * 26)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          barSize={10}
        >
          <XAxis type="number" hide domain={[0, 'dataMax + 5']} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="target" fill="rgba(255,255,255,0.06)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="displaySolved" radius={[0, 4, 4, 0]} name="Solved">
            {data.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.coveragePct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
