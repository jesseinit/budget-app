import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-indigo-100 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Welcome back
            </p>
            <h2 className="text-xl font-bold text-gray-900">
              {user.name?.split(' ')[0]}, stay on top of your money today.
            </h2>
            <p className="text-sm text-gray-600">
              Quick snapshot below — add a transaction to keep it fresh.
            </p>
          </div>

          <button
            onClick={() => navigate('/transactions', { state: { openCreate: true } })}
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            + Create transaction
          </button>
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
              {/* Net Worth Card with Savings Rate Badge */}
              <div className="overflow-hidden rounded-xl bg-white shadow-md transition-transform hover:scale-105">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-indigo-900">Net Worth</p>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {formatPercentage(dashboardData.savings_rate)} saved
                        </span>
                      </div>
                      <p className="mt-2 text-3xl font-bold text-indigo-600">
                        {formatCurrency(dashboardData.net_worth, userCurrency)}
                      </p>
                      <p className="mt-1 text-xs text-indigo-700">All-time total assets</p>
                    </div>
                    <div className="rounded-full bg-indigo-500 p-3">
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
            {yearlyData && yearlyData.period_trends && (
              <div className="mb-8">
                <PeriodTrendsChart periodTrends={yearlyData.period_trends} currency={userCurrency} />
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
