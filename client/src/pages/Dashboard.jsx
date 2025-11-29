import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency, formatPercentage } from '../utils/currency';
import StatCard from '../components/StatCard';
import NetWorthCard from '../components/NetWorthCard';
import CurrentPeriodCard from '../components/CurrentPeriodCard';
import RecentTransactions from '../components/RecentTransactions';
import YearlyAnalytics from '../components/YearlyAnalytics';
import PeriodTrendsChart from '../components/PeriodTrendsChart';

function Dashboard({ user }) {
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
    <div className="h-full bg-gray-50 p-6">
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
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl bg-red-50 p-6 text-red-800 shadow-md">
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
              <StatCard
                title="Net Worth"
                value={formatCurrency(dashboardData.net_worth, userCurrency)}
                subtitle="Total assets"
                colorClass="indigo"
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />

              <StatCard
                title="Investment Return"
                value={
                  dashboardData.investment_performance?.profit_loss_percentage >= 0
                    ? `+${formatPercentage(dashboardData.investment_performance?.profit_loss_percentage || 0)}`
                    : formatPercentage(dashboardData.investment_performance?.profit_loss_percentage || 0)
                }
                subtitle={`${formatCurrency(dashboardData.investment_performance?.current_value || 0, userCurrency)} current value`}
                colorClass={dashboardData.investment_performance?.profit_loss_percentage >= 0 ? 'green' : 'red'}
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />

              <StatCard
                title="This Month Expenses"
                value={formatCurrency(dashboardData.this_month_expenses, userCurrency)}
                subtitle="Expenses this period"
                colorClass="red"
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                }
              />

              <StatCard
                title="Savings Rate"
                value={formatPercentage(dashboardData.savings_rate)}
                subtitle={`${formatCurrency(dashboardData.this_month_savings, userCurrency)} saved`}
                colorClass="amber"
                icon={
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
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
