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
      <div className="rounded-xl bg-white p-6 shadow-md">
        <p className="text-gray-500">No yearly data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-gray-100 shadow-md">
      <div className="bg-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-indigo-500 p-2">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Yearly Overview</h3>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-900">
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-700">Total Income</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {formatCurrency(yearlyData.total_income, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-700">Total Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-600">
              {formatCurrency(yearlyData.total_expenses, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-700">Total Savings</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(yearlyData.total_savings, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-700">Total Investments</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatCurrency(yearlyData.total_investments, currency)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-700">Net Savings</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {formatCurrency(yearlyData.net_savings, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Savings Rate</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {formatPercentage(yearlyData.savings_rate)}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-700">
            {yearlyData.periods_count} budget {yearlyData.periods_count === 1 ? 'period' : 'periods'} tracked
          </div>
        </div>

        {/* {yearlyData.category_breakdown && yearlyData.category_breakdown.length > 0 && (
          <div className="mt-6 border-t border-indigo-200 pt-4">
            <h4 className="text-sm font-medium text-indigo-900 mb-3">Top Expense Categories</h4>
            <div className="space-y-2">
              {yearlyData.category_breakdown.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-indigo-800">{category.name}</span>
                  <span className="text-sm font-semibold text-indigo-900">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}

export default YearlyAnalytics;
