import { formatCurrency } from '../utils/currency';

function NetWorthCard({ netWorth, currency = 'USD' }) {
  return (
    <div className="overflow-hidden rounded-xl bg-gray-100 shadow-md">
      <div className="bg-gray-100 p-6">
        <div className="flex items-center justify-center flex-col h-full">
          <div className="rounded-full bg-indigo-500 p-3 mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Worth</h3>

          <p className="text-5xl font-bold text-indigo-600">
            {formatCurrency(netWorth, currency)}
          </p>

          <p className="mt-3 text-sm text-gray-700">Total assets value</p>
        </div>
      </div>
    </div>
  );
}

export default NetWorthCard;
