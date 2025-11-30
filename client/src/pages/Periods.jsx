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
    <div className="h-full bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">Budget Periods</h1>
          <p className="text-xs text-gray-600 sm:text-sm">Track your historical and active periods at a glance.</p>
        </div>

        <div className="space-y-3 sm:space-y-0 sm:overflow-hidden sm:rounded-lg sm:border sm:border-gray-200 sm:bg-white sm:shadow-sm">
          {sortedPeriods.map((period) => (
            <div
              key={period.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 sm:rounded-none sm:border-0 sm:border-b sm:shadow-none last:sm:border-b-0"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900 sm:text-base">
                      {formatDate(period.started_at)} → {formatDate(period.ended_at)}
                    </div>
                    <StatusBadge status={period.status} />
                  </div>
                </div>
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
                >
                  {completingId === period.id ? 'Closing…' : 'Close'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">B/F</span>
                  <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                    {formatCurrency(period.brought_forward || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">C/F</span>
                  <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                    {formatCurrency(period.carried_forward || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">Income</span>
                  <span className="text-xs font-semibold text-green-600 sm:text-sm">
                    {formatCurrency(period.actual_income || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">Expenses</span>
                  <span className="text-xs font-semibold text-red-600 sm:text-sm">
                    {formatCurrency(period.total_expenses || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">Savings</span>
                  <span className="text-xs font-semibold text-indigo-600 sm:text-sm">
                    {formatCurrency(period.total_savings || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-gray-500 sm:text-[11px]">Investments</span>
                  <span className="text-xs font-semibold text-gray-900 sm:text-sm">
                    {formatCurrency(period.total_investments || 0, userCurrency)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {sortedPeriods.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-500 sm:text-sm">No periods found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Periods;
