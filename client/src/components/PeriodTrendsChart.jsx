import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatCurrencyShort } from '../utils/currency';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function PeriodTrendsChart({ periodTrends, currency = 'USD' }) {

  const getPeriodLabel = (periodStr) => {
    // Period format is "Month, Year" (e.g., "January, 2025")
    // Extract just the month abbreviation
    const monthName = periodStr.split(',')[0];
    const date = new Date(monthName + ' 1, 2000');
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  if (!periodTrends || periodTrends.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <p className="text-gray-500">No period trends available</p>
      </div>
    );
  }

  // Filter out periods with no data
  const filteredPeriods = periodTrends.filter(period => {
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
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(16, 185, 129)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
      {
        label: 'Expenses',
        data: filteredPeriods.map(period => Math.abs(parseFloat(period.expenses))),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(239, 68, 68)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
      {
        label: 'Savings',
        data: filteredPeriods.map(period => Math.abs(parseFloat(period.savings))),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(99, 102, 241)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
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
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 13,
            family: "'Inter', 'system-ui', 'sans-serif'",
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        bodySpacing: 8,
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
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          color: '#6b7280',
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          callback: function(value) {
            return formatCurrencyShort(value, currency);
          },
          font: {
            size: 12,
          },
          color: '#6b7280',
          padding: 8,
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
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
}

export default PeriodTrendsChart;
