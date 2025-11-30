import { useEffect, useState } from 'react';
import { financialGoalService } from '../services/financialGoalService';
import { formatCurrency } from '../utils/currency';

function FinancialGoals({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    target_date: '',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const userCurrency = user?.currency || 'USD';

  useEffect(() => {
    fetchGoals();
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
        setFormData({ name: '', target_amount: '', target_date: '', category: '' });
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showCreateModal]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await financialGoalService.list(true);
      setGoals(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Failed to load financial goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const goalData = {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        target_date: formData.target_date || null,
        category: formData.category || null,
      };
      await financialGoalService.create(goalData);
      await fetchGoals();
      setShowCreateModal(false);
      setFormData({ name: '', target_amount: '', target_date: '', category: '' });
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await financialGoalService.delete(goalId);
      await fetchGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const handleContribute = async (goalId) => {
    const amount = window.prompt('Enter contribution amount:');
    if (!amount || isNaN(amount)) return;
    try {
      await financialGoalService.contribute(goalId, parseFloat(amount));
      await fetchGoals();
    } catch (err) {
      console.error('Error adding contribution:', err);
      alert('Failed to add contribution. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-3 w-3 animate-ping rounded-full bg-purple-500" />
          <span>Loading goals…</span>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">Financial Goals</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Track and achieve your financial milestones.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12">
            <div className="rounded-full bg-purple-100 p-4">
              <svg className="h-12 w-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No financial goals yet</h3>
            <p className="mt-2 text-sm text-gray-600">Get started by creating your first financial goal.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {goals.map((goal) => {
              const daysText = goal.days_remaining !== null
                ? goal.days_remaining > 0
                  ? `${goal.days_remaining} days left`
                  : goal.days_remaining === 0
                  ? 'Due today'
                  : `${Math.abs(goal.days_remaining)} days overdue`
                : 'No deadline';

              const isOverdue = goal.days_remaining !== null && goal.days_remaining < 0;
              const isDueSoon = goal.days_remaining !== null && goal.days_remaining > 0 && goal.days_remaining <= 7;

              return (
                <div key={goal.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-purple-900 sm:text-lg">{goal.name}</h3>
                        {goal.category && (
                          <span className="mt-1 inline-block rounded-full bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-800">
                            {goal.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="rounded-lg p-2 text-purple-700 transition hover:bg-purple-200"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-lg font-bold text-purple-600">
                        {goal.progress_percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Current</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(goal.current_amount, userCurrency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(goal.target_amount, userCurrency)}
                        </p>
                      </div>
                    </div>

                    {goal.target_date && (
                      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                        <span className="text-xs text-gray-500">Deadline</span>
                        <span className={`text-xs font-medium ${
                          isOverdue ? 'text-red-600' :
                          isDueSoon ? 'text-orange-600' :
                          'text-gray-700'
                        }`}>
                          {daysText}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleContribute(goal.id)}
                      className="w-full rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                    >
                      Add Contribution
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-300"
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ name: '', target_amount: '', target_date: '', category: '' });
              }}
              aria-hidden="true"
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-300 rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between" id="modal-title">
                <h2 className="text-xl font-bold text-gray-900">Create Financial Goal</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', target_amount: '', target_date: '', category: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label htmlFor="goal-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    id="goal-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="e.g., Emergency Fund, New Car"
                  />
                </div>

                <div>
                  <label htmlFor="target-amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Amount *
                  </label>
                  <input
                    type="number"
                    id="target-amount"
                    step="0.01"
                    required
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="10000.00"
                  />
                </div>

                <div>
                  <label htmlFor="target-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="target-date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="e.g., Savings, Investment"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', target_amount: '', target_date: '', category: '' });
                    }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialGoals;
