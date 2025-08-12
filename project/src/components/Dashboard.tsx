import React from 'react';
import { Mail, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { getEmailStats } from '../utils/emailService';

export function DashboardStats() {
  const [stats, setStats] = React.useState(getEmailStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = getEmailStats();
      setStats(currentStats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: 'Emails Sent', value: stats.sent, icon: Mail },
    { label: 'Failed', value: stats.failed, icon: AlertTriangle },
    { label: 'Opened', value: stats.opened, icon: CheckCircle },
    { label: 'Total', value: stats.total, icon: FileSpreadsheet },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {statItems.map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{label}</p>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
            <Icon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      ))}
    </div>
  );
}