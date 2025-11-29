import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency, formatPercentage } from '../utils/currency';
import StatCard from './StatCard';
import NetWorthCard from './NetWorthCard';
import CurrentPeriodCard from './CurrentPeriodCard';
import RecentTransactions from './RecentTransactions';
import YearlyAnalytics from './YearlyAnalytics';
import PeriodTrendsChart from './PeriodTrendsChart';

function UserProfile({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileStats, setProfileStats] = useState(null);

  // Get user's currency from profile, default to USD
  const userCurrency = user?.currency || 'USD';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch both dashboard data and profile stats in parallel
        const [dashboardResponse, profileResponse] = await Promise.all([
          dashboardService.getDashboardAnalytics(),
          authService.getUserProfile()
        ]);
        console.log(" profileResponse:", profileResponse);
        setDashboardData(dashboardResponse.result);
        setProfileStats(profileResponse.stats);
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

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:inline">Budget App</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-8 w-8 rounded-full ring-2 ring-white"
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 sm:px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
              {/* Net Worth Card */}
              <NetWorthCard netWorth={dashboardData.net_worth} currency={userCurrency} />

              {/* Current Budget Period */}
              <CurrentPeriodCard currentPeriod={dashboardData.current_period} currency={userCurrency} />

              {/* Yearly Analytics */}
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
      </main>
    </div>
  );
}

export default UserProfile;
