import { formatCurrency } from '../utils/currency';

function RecentTransactions({ transactions, currency = 'USD' }) {
  const formatTransactionCurrency = (value) => {
    const num = parseFloat(value);
    return formatCurrency(Math.abs(num), currency);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        );
      case 'expense':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        );
      case 'adjustment':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTransactionColorClass = (type) => {
    switch (type) {
      case 'income':
        return 'bg-green-500';
      case 'expense':
        return 'bg-red-500';
      case 'adjustment':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAmountColor = (amount) => {
    const num = parseFloat(amount);
    if (num > 0) return 'text-green-600 dark:text-green-400';
    if (num < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 p-8 shadow-md">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-8 w-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Transactions Yet</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Start tracking your financial activity by adding your first transaction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500 p-2">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{transactions.length} transactions</span>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 rounded-full ${getTransactionColorClass(transaction.type)} p-2`}>
                {getTransactionIcon(transaction.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {transaction.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(transaction.transacted_at)}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {transaction.payment_method?.replace(/_/g, ' ') || 'N/A'}
                  </p>
                  {transaction.is_recurring && (
                    <>
                      <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Recurring
                      </span>
                    </>
                  )}
                </div>
                {transaction.tags && transaction.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {transaction.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <p className={`text-lg font-semibold ${getAmountColor(transaction.amount)} dark:text-opacity-90`}>
                  {parseFloat(transaction.amount) > 0 ? '+' : '-'}
                  {formatTransactionCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {transaction.type}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentTransactions;
