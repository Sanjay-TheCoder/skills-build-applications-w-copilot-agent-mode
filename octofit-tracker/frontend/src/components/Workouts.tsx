import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Suggestion = { title: string; reason: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<{ suggestions: Suggestion[] }>('/api/workouts/suggestions/mona@example.com')
      .then(({ suggestions: results }) => {
        if (!cancelled) setSuggestions(results);
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
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    {error ? <p role="alert">Unable to load workout suggestions: {error}</p>
      : suggestions === null ? <p role="status">Loading workout suggestions...</p>
        : suggestions.length === 0 ? <p>No workout suggestions yet.</p>
          : <ul>{suggestions.map((suggestion, index) =>
            <li key={index}>{suggestion.title} - {suggestion.reason}</li>)}</ul>}
  </div></section>;
}
