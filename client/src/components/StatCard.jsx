function StatCard({ title, value, subtitle, icon, colorClass = 'blue' }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      text: 'text-blue-900 dark:text-blue-200',
      valueText: 'text-blue-600 dark:text-blue-400',
      subtitleText: 'text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-500 dark:bg-blue-600',
    },
    green: {
      bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      text: 'text-green-900 dark:text-green-200',
      valueText: 'text-green-600 dark:text-green-400',
      subtitleText: 'text-green-700 dark:text-green-300',
      iconBg: 'bg-green-500 dark:bg-green-600',
    },
    red: {
      bg: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      text: 'text-red-900 dark:text-red-200',
      valueText: 'text-red-600 dark:text-red-400',
      subtitleText: 'text-red-700 dark:text-red-300',
      iconBg: 'bg-red-500 dark:bg-red-600',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      text: 'text-purple-900 dark:text-purple-200',
      valueText: 'text-purple-600 dark:text-purple-400',
      subtitleText: 'text-purple-700 dark:text-purple-300',
      iconBg: 'bg-purple-500 dark:bg-purple-600',
    },
    indigo: {
      bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
      text: 'text-indigo-900 dark:text-indigo-200',
      valueText: 'text-indigo-600 dark:text-indigo-400',
      subtitleText: 'text-indigo-700 dark:text-indigo-300',
      iconBg: 'bg-indigo-500 dark:bg-indigo-600',
    },
    amber: {
      bg: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
      text: 'text-amber-900 dark:text-amber-200',
      valueText: 'text-amber-600 dark:text-amber-400',
      subtitleText: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-500 dark:bg-amber-600',
    },
  };

  const colors = colorClasses[colorClass] || colorClasses.blue;

  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md transition-transform hover:scale-105">
      <div className={`bg-gradient-to-br ${colors.bg} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${colors.text}`}>{title}</p>
            <p className={`mt-2 text-3xl font-bold ${colors.valueText}`}>{value}</p>
            <p className={`mt-1 text-xs ${colors.subtitleText}`}>{subtitle}</p>
          </div>
          <div className={`rounded-full ${colors.iconBg} p-3`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatCard;
