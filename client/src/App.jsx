// App.jsx — single-page app with two states: home (search) and dashboard.
// No router needed (PRD §10).

import { useState } from 'react';
import { analyzeUser } from './api.js';
import StatCards from './components/StatCards.jsx';
import DifficultyChart from './components/DifficultyChart.jsx';
import TopicChart from './components/TopicChart.jsx';
import WeakTopics from './components/WeakTopics.jsx';
import PlanCards from './components/PlanCards.jsx';

// ── HOME STATE ────────────────────────────────────────────────────────────────

function HomePage({ onAnalyze }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const username = input.trim();
    if (!username) return;
    onAnalyze(username, false, setLoading);
  };

  return (
    <div className="home">
      <h1 className="home-logo">
        <span>⚡</span> CodeGrind
      </h1>
      <p className="home-tagline">
        Enter your LeetCode username and get a personalised AI-powered 7-day study plan.
      </p>

      <form className="search-card" onSubmit={handleSubmit}>
        <label className="search-label" htmlFor="username-input">LeetCode Username</label>
        <div className="search-input-row">
          <input
            id="username-input"
            className="search-input"
            type="text"
            placeholder="e.g. neal_wu"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button id="analyze-btn" className="btn-primary" type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Analyzing…' : 'Analyze →'}
          </button>
        </div>
        <p className="search-hint">First request may take ~30s if the server just woke up.</p>
      </form>
    </div>
  );
}

// ── LOADING STATE ─────────────────────────────────────────────────────────────

function LoadingPage({ username }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p className="loading-title">Analyzing {username}…</p>
      <p className="loading-hint">
        Fetching real stats from LeetCode, computing coverage, and generating your study plan.
        <br />
        First request may take ~30 seconds if the server just woke up.
      </p>
    </div>
  );
}

// ── ERROR STATE ───────────────────────────────────────────────────────────────

function ErrorPage({ error, onBack }) {
  // Map HTTP status to a friendly message + icon.
  const config = {
    404: { icon: '🔍', title: 'User Not Found', message: `The username "${error.username}" doesn't exist on LeetCode. Double-check the spelling.` },
    429: { icon: '🚦', title: 'Rate Limited', message: 'Too many requests in one minute. Wait 60 seconds and try again.' },
    502: { icon: '🌐', title: 'LeetCode Unreachable', message: 'LeetCode\'s API is currently unreachable. Please try again in a moment.' },
  };

  const { icon, title, message } = config[error.status] ?? {
    icon: '⚠️',
    title: 'Something Went Wrong',
    message: error.message || 'An unexpected error occurred. Please try again.',
  };

  return (
    <div className="error-container">
      <span className="error-icon">{icon}</span>
      <h2 className="error-title">{title}</h2>
      <p className="error-message">{message}</p>
      <button id="back-btn" className="btn-secondary" onClick={onBack}>← Try Another Username</button>
    </div>
  );
}

// ── DASHBOARD STATE ───────────────────────────────────────────────────────────

function Dashboard({ data, onRefresh, onBack, refreshing }) {
  const { username, fetchedAt, cached, analysis, report, reportSource } = data;
  const { level, difficulty, topics, weakTopics, recent } = analysis;

  const levelClass = level.toLowerCase();

  const formattedTime = new Date(fetchedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-username">{username}</h1>
          <span className={`level-badge ${levelClass}`}>{level}</span>
        </div>

        <div className="dashboard-meta">
          Last updated {formattedTime}
          {cached && <span className="cached-badge">Cached</span>}
        </div>

        <div className="dashboard-header-right">
          <button
            id="refresh-btn"
            className="btn-refresh"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button
            id="analyze-another-btn"
            className="link-analyze-another"
            onClick={onBack}
          >
            Analyze another →
          </button>
        </div>
      </header>

      {/* Empty-account friendly message */}
      {difficulty.total === 0 && (
        <div className="report-summary" style={{ marginBottom: 24 }}>
          🌱 It looks like this account hasn't solved any problems yet. The plan below will help you get started!
        </div>
      )}

      {/* Stat Cards */}
      <StatCards difficulty={difficulty} recent={recent} />

      {/* Charts */}
      <div className="charts-row">
        <DifficultyChart difficulty={difficulty} />
        <TopicChart topics={topics} />
      </div>

      {/* Weak Topics */}
      <WeakTopics weakTopics={weakTopics} />

      {/* AI Report */}
      <section className="report-section fade-in">
        <div className="report-header">
          <p className="section-heading" style={{ marginBottom: 0 }}>AI Coach Summary</p>
          <span className={`ai-badge ${reportSource === 'fallback' ? 'fallback-badge' : ''}`}>
            {reportSource === 'fallback' ? '⚡ Basic plan (AI unavailable)' : '✨ AI powered'}
          </span>
        </div>

        <div className="report-summary">{report.summary}</div>

        {report.strengths?.length > 0 && (
          <>
            <p className="section-heading">Your Strengths</p>
            <ul className="strengths-list">
              {report.strengths.map((s, i) => (
                <li key={i} className="strength-item">✓ {s}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 7-Day Plan */}
      <PlanCards plan={report.plan} />

      {/* Daily Tip */}
      <div className="tip-section fade-in">
        <span className="tip-icon">💡</span>
        <div>
          <p className="tip-label">Pro Tip</p>
          <p className="tip-text">{report.tip}</p>
        </div>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState('home'); // 'home' | 'loading' | 'dashboard' | 'error'
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Shared analyze function used by both the home form and the Refresh button.
  async function analyze(username, refresh, setExternalLoading) {
    setCurrentUsername(username);

    if (setExternalLoading) {
      setExternalLoading(true);
      setState('loading');
    } else {
      setRefreshing(true);
    }

    try {
      const result = await analyzeUser(username, refresh);
      setData(result);
      setState('dashboard');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message;
      setError({ status, message, username });
      setState('error');
    } finally {
      if (setExternalLoading) setExternalLoading(false);
      setRefreshing(false);
    }
  }

  if (state === 'loading') return <LoadingPage username={currentUsername} />;

  if (state === 'error') return (
    <ErrorPage error={error} onBack={() => setState('home')} />
  );

  if (state === 'dashboard') return (
    <Dashboard
      data={data}
      refreshing={refreshing}
      onRefresh={() => analyze(currentUsername, true, null)}
      onBack={() => setState('home')}
    />
  );

  // Default: home state
  return <HomePage onAnalyze={analyze} />;
}
