// DifficultyChart.jsx — donut chart showing easy/medium/hard split.

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null; // skip label for tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export default function DifficultyChart({ difficulty }) {
  const data = [
    { name: 'Easy', value: difficulty.easy },
    { name: 'Medium', value: difficulty.medium },
    { name: 'Hard', value: difficulty.hard },
  ].filter((d) => d.value > 0); // hide 0-count slices

  if (data.length === 0) {
    return (
      <div className="chart-card">
        <p className="chart-title">Difficulty Split</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '30px 0' }}>No problems solved yet</p>
      </div>
    );
  }

  return (
    <div className="chart-card fade-in">
      <p className="chart-title">Difficulty Split</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, name]}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-secondary)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
