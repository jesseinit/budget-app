import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency, formatPercentage } from '../utils/currency';
import StatCard from '../components/StatCard';
import NetWorthCard from '../components/NetWorthCard';
import CurrentPeriodCard from '../components/CurrentPeriodCard';
import RecentTransactions from '../components/RecentTransactions';
import YearlyAnalytics from '../components/YearlyAnalytics';
import PeriodTrendsChart from '../components/PeriodTrendsChart';

function Dashboard({ user, profileStats }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userCurrency = user?.currency || 'USD';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardService.getDashboardAnalytics();
        setDashboardData(response.result);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        const response = await dashboardService.getYearlyAnalytics(selectedYear);
        setYearlyData(response.result);
      } catch (err) {
        console.error('Error fetching yearly data:', err);
      }
    };

    if (selectedYear) {
      fetchYearlyData();
    }
  }, [selectedYear]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-7xl pb-1">
        {/* Welcome Section */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold">
            Welcome back, {user.name?.split(' ')[0]}!
          </h2>
          <p className="mt-2 text-blue-100">
            Here's an overview of your financial health
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-blue-400 border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl bg-red-50 dark:bg-red-900/20 p-6 text-red-800 dark:text-red-300 shadow-md">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && dashboardData && (
          <>
            {/* Stats Grid */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Net Worth Card with Savings Rate Badge */}
              <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md transition-transform hover:scale-105">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Net Worth</p>
                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">
                          {formatPercentage(dashboardData.savings_rate)} saved
                        </span>
                      </div>
                      <p className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(dashboardData.net_worth, userCurrency)}
                      </p>
                      <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">All-time total assets</p>
                    </div>
                    <div className="rounded-full bg-indigo-500 dark:bg-indigo-600 p-3">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <StatCard
                title="All-Time Income"
                value={formatCurrency(dashboardData.all_time_income, userCurrency)}
                subtitle="Total income earned"
                colorClass="green"
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                }
              />

              <StatCard
                title="All-Time Expenses"
                value={formatCurrency(dashboardData.all_time_expenses, userCurrency)}
                subtitle="Total expenses spent"
                colorClass="red"
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                }
              />

              <StatCard
                title="Investments"
                value={formatCurrency(dashboardData.investment_performance?.current_value || 0, userCurrency)}
                subtitle={
                  dashboardData.investment_performance?.profit_loss_percentage >= 0
                    ? `+${formatPercentage(dashboardData.investment_performance?.profit_loss_percentage || 0)} return`
                    : `${formatPercentage(dashboardData.investment_performance?.profit_loss_percentage || 0)} return`
                }
                colorClass={dashboardData.investment_performance?.profit_loss_percentage >= 0 ? 'green' : 'red'}
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
            </div>

            {/* Three Column Layout */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <NetWorthCard netWorth={dashboardData.net_worth} currency={userCurrency} />
              <CurrentPeriodCard currentPeriod={dashboardData.current_period} currency={userCurrency} />
              {yearlyData && (
                <YearlyAnalytics
                  yearlyData={yearlyData}
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  currency={userCurrency}
                  savingSince={profileStats?.saving_since}
                />
              )}
            </div>

            {/* Period Trends Chart */}
            {yearlyData && yearlyData.monthly_trends && (
              <div className="mb-8">
                <PeriodTrendsChart monthlyTrends={yearlyData.monthly_trends} currency={userCurrency} />
              </div>
            )}

            {/* Recent Transactions */}
            <div className="mb-8">
              <RecentTransactions transactions={dashboardData.recent_transactions} currency={userCurrency} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
