import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  ReceiptText,
  Briefcase,
  PiggyBank,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const TABS = [
  { to: '/finance', label: 'Dashboard', icon: <LayoutDashboard size={16} />, end: true },
  { to: '/finance/income', label: 'Income', icon: <TrendingUp size={16} /> },
  { to: '/finance/buckets', label: 'Buckets', icon: <Wallet size={16} /> },
  { to: '/finance/expenses', label: 'Expenses', icon: <ReceiptText size={16} /> },
  { to: '/finance/projects', label: 'Projects', icon: <Briefcase size={16} /> },
  { to: '/finance/investments', label: 'Investments', icon: <PiggyBank size={16} /> },
  { to: '/finance/settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
];

export default function FinanceLayout() {
  const { user } = useAuth();

  // Role guard: super_admin & hospital_admin only
  if (!user || (user.role !== 'super_admin' && user.role !== 'hospital_admin')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance · Part B</h1>
          <p className="text-sm text-gray-500">
            Treasury management & income distribution (ZIGMA BOND module)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <nav className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {t.icon}
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
