import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';

function FinancialGoalsCard({ goals = [], currency = 'USD' }) {
  const navigate = useNavigate();

  if (!goals || goals.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-purple-500 p-2">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-purple-900">Financial Goals</p>
              <p className="text-sm font-semibold text-purple-900">No active goals</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 p-4 sm:p-6">
          <p className="text-center text-xs text-gray-500 sm:text-sm">Set goals to track your financial progress</p>
          <button
            onClick={() => navigate('/goals')}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 sm:text-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Goal
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall progress
  const totalTarget = goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount), 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + parseFloat(goal.current_amount), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-purple-500 p-2">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-purple-900">Financial Goals</p>
            <p className="text-sm font-semibold text-purple-900">{goals.length} Active</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
        <div className="relative mb-4">
          <svg className="h-32 w-32 -rotate-90 transform sm:h-40 sm:w-40">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - overallProgress / 100)}`}
              className="text-purple-600 transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-purple-600 sm:text-4xl">{overallProgress.toFixed(0)}%</p>
            <p className="text-xs text-gray-600 sm:text-sm">Overall</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 sm:text-sm">
            {formatCurrency(totalCurrent, currency)} of {formatCurrency(totalTarget, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FinancialGoalsCard;
