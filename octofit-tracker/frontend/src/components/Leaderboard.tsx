import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (!cancelled) setEntries(leaderboard);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Leaderboard</h2>
    <p>Compare team point totals.</p>
    {error ? <p role="alert">Unable to load leaderboard: {error}</p>
      : entries === null ? <p role="status">Loading leaderboard...</p>
        : entries.length === 0 ? <p>No rankings yet.</p>
          : <ul>{entries.map((entry, index) =>
            <li key={index}>#{entry.rank} {entry.teamName} - {entry.totalPoints} points</li>)}</ul>}
  </div></section>;
}
