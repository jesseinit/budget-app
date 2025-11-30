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
      <div className="rounded-xl bg-white p-6 shadow-md">
        <p className="text-gray-500">No active budget period</p>
      </div>
    );
  }

  const availableBalance = parseFloat(currentPeriod.brought_forward) +
                          parseFloat(currentPeriod.actual_income) -
                          parseFloat(currentPeriod.total_expenses);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange-900">Current Period</p>
            <p className="text-lg font-bold text-orange-900 sm:text-xl">
              {formatDate(currentPeriod.started_at)}
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Ongoing
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-2 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Brought Forward</span>
            <span className="text-sm font-semibold text-gray-900 sm:text-base">
              {formatCurrency(currentPeriod.brought_forward, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Expected Income</span>
            <span className="text-sm font-semibold text-gray-900 sm:text-base">
              {formatCurrency(currentPeriod.expected_income, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Actual Income</span>
            <span className="text-sm font-semibold text-green-600 sm:text-base">
              +{formatCurrency(currentPeriod.actual_income, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Total Expenses</span>
            <span className="text-sm font-semibold text-red-600 sm:text-base">
              -{formatCurrency(currentPeriod.total_expenses, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Total Savings</span>
            <span className="text-sm font-semibold text-gray-900 sm:text-base">
              {formatCurrency(currentPeriod.total_savings, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 py-2">
            <span className="text-xs text-gray-600 sm:text-sm">Total Investments</span>
            <span className="text-sm font-semibold text-gray-900 sm:text-base">
              {formatCurrency(currentPeriod.total_investments, currency)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 sm:px-4">
          <span className="text-xs font-medium text-indigo-900 sm:text-sm">Available Balance</span>
          <span className="text-lg font-bold text-indigo-600 sm:text-xl">
            {formatCurrency(availableBalance, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CurrentPeriodCard;
