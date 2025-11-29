import { formatCurrency } from '../utils/currency';

function CurrentPeriodCard({ currentPeriod, currency = 'USD' }) {

  const formatDate = (dateString) => {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!currentPeriod) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md">
        <p className="text-gray-500 dark:text-gray-400">No active budget period</p>
      </div>
    );
  }

  const availableBalance = parseFloat(currentPeriod.brought_forward) +
                          parseFloat(currentPeriod.actual_income) -
                          parseFloat(currentPeriod.total_expenses);

  return (
    <div className="overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 shadow-md">
      <div className="bg-gray-100 dark:bg-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{currentPeriod.period_name}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatDate(currentPeriod.started_at)} - {formatDate(currentPeriod.ended_at)}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentPeriod.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-200 text-gray-800'
          }`}>
            {currentPeriod.status}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Brought Forward</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(currentPeriod.brought_forward, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Expected Income</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(currentPeriod.expected_income, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Actual Income</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              +{formatCurrency(currentPeriod.actual_income, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Total Expenses</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              -{formatCurrency(currentPeriod.total_expenses, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Total Savings</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(currentPeriod.total_savings, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Total Investments</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(currentPeriod.total_investments, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 mt-3 border border-gray-300 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Available Balance</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(availableBalance, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrentPeriodCard;
