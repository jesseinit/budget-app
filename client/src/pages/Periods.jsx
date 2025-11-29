import { useEffect, useMemo, useState } from 'react';
import { periodService } from '../services/periodService';
import { formatCurrency } from '../utils/currency';

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function Periods({ user }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const userCurrency = user?.currency || 'USD';

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoading(true);
        const data = await periodService.list();
        setPeriods(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching periods:', err);
        setError('Failed to load periods. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, []);

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort((a, b) => new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at)),
    [periods],
  );

  const formatDate = (isoDate) =>
    isoDate ? new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-500" />
          <span>Loading periods…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Budget Periods</h1>
          <p className="text-sm text-gray-600">Track your historical and active periods at a glance.</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {sortedPeriods.map((period) => (
            <div
              key={period.id}
              className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-900">{period.period_name}</div>
                  <div className="text-xs text-gray-500">{formatDate(period.started_at)} → {formatDate(period.ended_at)}</div>
                  <div className="text-[11px] text-gray-400">ID: {period.id.slice(0, 8)}…</div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-800">
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                      B/F {formatCurrency(period.brought_forward || 0, userCurrency)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                      C/F {formatCurrency(period.carried_forward || 0, userCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] uppercase text-gray-500">Income</span>
                  <span className="font-semibold text-green-600">{formatCurrency(period.actual_income || 0, userCurrency)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] uppercase text-gray-500">Expenses</span>
                  <span className="font-semibold text-red-600">{formatCurrency(period.total_expenses || 0, userCurrency)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] uppercase text-gray-500">Savings</span>
                  <span className="font-semibold text-indigo-600">{formatCurrency(period.total_savings || 0, userCurrency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={period.status} />
                  <button
                    disabled={period.status === 'completed' || completingId === period.id}
                    onClick={async () => {
                      const endedAt = window.prompt(
                        'Enter period end datetime (ISO, e.g. 2025-07-25T12:00:00):',
                        period.ended_at ? period.ended_at.replace('Z', '') : '',
                      );
                      if (!endedAt) return;
                      try {
                        setCompletingId(period.id);
                        await periodService.complete(period.id, endedAt);
                        const refreshed = await periodService.list();
                        setPeriods(refreshed);
                      } catch (err) {
                        console.error('Error completing period:', err);
                        alert('Failed to close period. Please try again.');
                      } finally {
                        setCompletingId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {completingId === period.id ? 'Closing…' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {sortedPeriods.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No periods found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Periods;
