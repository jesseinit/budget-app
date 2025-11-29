import { formatCurrency, formatPercentage } from '../utils/currency';

function YearlyAnalytics({ yearlyData, onYearChange, selectedYear, currency = 'USD' }) {

  // Generate year options from 2020 to current year
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = 2020; year <= currentYear; year++) {
    yearOptions.push(year);
  }

  if (!yearlyData) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md">
        <p className="text-gray-500 dark:text-gray-400">No yearly data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Yearly Overview</h3>
          </div>

          <div className="relative">
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-3 pr-10 py-1.5 text-sm font-medium text-gray-900 dark:text-white shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 4 Quadrants */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-200 dark:divide-gray-700">
        {/* Top Left - Income */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
          <div className="flex items-start justify-between mb-2">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(yearlyData.total_income, currency)}
          </p>
        </div>

        {/* Top Right - Expenses */}
        <div className="p-6 bg-gradient-to-bl from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10">
          <div className="flex items-start justify-between mb-2">
            <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(yearlyData.total_expenses, currency)}
          </p>
        </div>

        {/* Bottom Left - Savings */}
        <div className="p-6 bg-gradient-to-tr from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
          <div className="flex items-start justify-between mb-2">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Savings</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(yearlyData.total_savings, currency)}
          </p>
        </div>

        {/* Bottom Right - Investments */}
        <div className="p-6 bg-gradient-to-tl from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10">
          <div className="flex items-start justify-between mb-2">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Total Investments</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(yearlyData.total_investments, currency)}
          </p>
        </div>
      </div>

      {/* Center Content - Net Savings & Rate */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-pink-900/10 p-6">
        <div className="grid grid-cols-2 gap-6 mb-3">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Net Savings</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(yearlyData.net_savings, currency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Savings Rate</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatPercentage(yearlyData.savings_rate)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{yearlyData.periods_count} budget {yearlyData.periods_count === 1 ? 'period' : 'periods'} tracked</span>
        </div>
      </div>
    </div>
  );
}

export default YearlyAnalytics;
