function StatCard({ title, value, subtitle, icon, colorClass = 'blue' }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100',
      text: 'text-blue-900',
      valueText: 'text-blue-600',
      subtitleText: 'text-blue-700',
      iconBg: 'bg-blue-500',
    },
    green: {
      bg: 'from-green-50 to-green-100',
      text: 'text-green-900',
      valueText: 'text-green-600',
      subtitleText: 'text-green-700',
      iconBg: 'bg-green-500',
    },
    red: {
      bg: 'from-red-50 to-red-100',
      text: 'text-red-900',
      valueText: 'text-red-600',
      subtitleText: 'text-red-700',
      iconBg: 'bg-red-500',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      text: 'text-purple-900',
      valueText: 'text-purple-600',
      subtitleText: 'text-purple-700',
      iconBg: 'bg-purple-500',
    },
    indigo: {
      bg: 'from-indigo-50 to-indigo-100',
      text: 'text-indigo-900',
      valueText: 'text-indigo-600',
      subtitleText: 'text-indigo-700',
      iconBg: 'bg-indigo-500',
    },
    amber: {
      bg: 'from-amber-50 to-amber-100',
      text: 'text-amber-900',
      valueText: 'text-amber-600',
      subtitleText: 'text-amber-700',
      iconBg: 'bg-amber-500',
    },
  };

  const colors = colorClasses[colorClass] || colorClasses.blue;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md transition-transform hover:scale-105">
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
