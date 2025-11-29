import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatCurrencyShort } from '../utils/currency';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function PeriodTrendsChart({ monthlyTrends, currency = 'USD' }) {

  const getPeriodLabel = (periodStr) => {
    // Period format is "Month, Year" (e.g., "January, 2025")
    // Extract just the month abbreviation
    const monthName = periodStr.split(',')[0];
    const date = new Date(monthName + ' 1, 2000');
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  if (!monthlyTrends || monthlyTrends.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <p className="text-gray-500">No period trends available</p>
      </div>
    );
  }

  // Filter out periods with no data
  const filteredPeriods = monthlyTrends.filter(period => {
    const income = parseFloat(period.income);
    const expenses = parseFloat(period.expenses);
    const savings = parseFloat(period.savings);
    return income > 0 || expenses > 0 || savings > 0;
  });

  if (filteredPeriods.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <p className="text-gray-500">No period trends available</p>
      </div>
    );
  }

  // Prepare data for Chart.js
  const labels = filteredPeriods.map(period => getPeriodLabel(period.month));

  const data = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: filteredPeriods.map(period => Math.abs(parseFloat(period.income))),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
      {
        label: 'Expenses',
        data: filteredPeriods.map(period => Math.abs(parseFloat(period.expenses))),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
      {
        label: 'Savings',
        data: filteredPeriods.map(period => Math.abs(parseFloat(period.savings))),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', 'system-ui', 'sans-serif'",
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrencyShort(context.parsed.y, currency);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          callback: function(value) {
            return formatCurrencyShort(value, currency);
          },
          font: {
            size: 11,
          },
          color: '#6b7280',
        },
      },
    },
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md border border-gray-200">
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Budget Period Trends</h3>
        </div>
      </div>

      <div className="p-6">
        <div style={{ height: '400px' }}>
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}

export default PeriodTrendsChart;
