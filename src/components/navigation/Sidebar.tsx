import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Stethoscope,
  Scissors,
  CircleDot,
  Flame,
  FlaskConical,
  Pill,
  Apple,
  Receipt,
  Building2,
  Settings,
  X,
  ChevronDown,
  Calculator,
  BedDouble,
  MessageSquare,
  Video,
  Clipboard,
  TestTube2,
  LogOut,
  Droplets,
  Footprints,
  Wind,
  ClipboardList,
  BookOpen,
  CalendarDays,
  Wallet,
  FileText,
  Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: <Home size={20} /> },
  { 
    name: 'Appointments', 
    href: '/appointments', 
    icon: <CalendarDays size={20} />,
    permission: 'view_patients',
  },
  { 
    name: 'Patients', 
    href: '/patients', 
    icon: <Users size={20} />,
    permission: 'view_patients',
  },
  { 
    name: 'ADT', 
    href: '/adt', 
    icon: <BedDouble size={20} />,
    permission: 'manage_admissions',
  },
  { 
    name: 'Ward Rounds', 
    href: '/ward-rounds', 
    icon: <Clipboard size={20} />,
    permission: 'create_encounters',
  },
  { 
    name: 'MDT', 
    href: '/mdt', 
    icon: <Users size={20} />,
    permission: 'create_encounters',
  },
  { 
    name: 'Blood Bank', 
    href: '/blood-transfusion', 
    icon: <Droplets size={20} />,
    permission: 'create_encounters',
  },
  { 
    name: 'Referrals', 
    href: '/referrals', 
    icon: <Send size={20} />,
    permission: 'create_encounters',
  },
  { 
    name: 'Clinical', 
    href: '/clinical', 
    icon: <Stethoscope size={20} />,
    permission: 'create_encounters',
    children: [
      { name: 'Encounters', href: '/patients' },
      { name: 'Vital Signs', href: '/patients' },
    ],
  },
  { 
    name: 'Surgery', 
    href: '/surgery', 
    icon: <Scissors size={20} />,
    permission: 'manage_surgeries',
    children: [
      { name: 'Surgery List', href: '/surgery' },
      { name: 'Preoperative Review', href: '/surgery/preoperative' },
      { name: 'Post-Op Notes', href: '/surgery/post-op-notes' },
    ],
  },
  { 
    name: 'Wounds', 
    href: '/wounds', 
    icon: <CircleDot size={20} />,
    permission: 'manage_wounds',
  },
  { 
    name: 'Burns', 
    href: '/burns', 
    icon: <Flame size={20} />,
    permission: 'manage_wounds',
  },
  { 
    name: 'Limb Salvage', 
    href: '/limb-salvage', 
    icon: <Footprints size={20} />,
    permission: 'manage_wounds',
  },
  { 
    name: 'NPWT', 
    href: '/npwt', 
    icon: <Wind size={20} />,
    permission: 'manage_wounds',
  },
  { 
    name: 'Medication Chart', 
    href: '/medication-chart', 
    icon: <ClipboardList size={20} />,
    permission: 'view_prescriptions',
  },
  { 
    name: 'Investigations', 
    href: '/investigations', 
    icon: <TestTube2 size={20} />,
    permission: 'view_labs',
  },
  { 
    name: 'Pharmacy', 
    href: '/pharmacy', 
    icon: <Pill size={20} />,
    permission: 'view_prescriptions',
  },
  { 
    name: 'Nutrition', 
    href: '/nutrition', 
    icon: <Apple size={20} />,
    permission: 'manage_nutrition',
  },
  { 
    name: 'Billing', 
    href: '/billing', 
    icon: <Receipt size={20} />,
    permission: 'view_invoices',
  },
  { 
    name: 'Surgical Estimate', 
    href: '/billing/surgical-estimate', 
    icon: <Calculator size={20} />,
    permission: 'view_invoices',
  },
  { 
    name: 'Payroll', 
    href: '/billing/payroll', 
    icon: <Wallet size={20} />,
    permission: 'manage_hospital',
  },
  { 
    name: 'Communication', 
    href: '/communication/chat', 
    icon: <MessageSquare size={20} />,
    children: [
      { name: 'Chat', href: '/communication/chat' },
      { name: 'Video Conference', href: '/communication/video' },
    ],
  },
  { 
    name: 'Calculators', 
    href: '/calculators', 
    icon: <Calculator size={20} />,
    children: [
      { name: 'Electrolytes', href: '/calculators?tab=sodium' },
      { name: 'GFR & Renal', href: '/calculators?tab=gfr' },
      { name: 'Drug Dosing', href: '/calculators?tab=bnf' },
      { name: 'Burns & TBSA', href: '/calculators?tab=burns' },
      { name: 'Nutrition', href: '/calculators?tab=nutrition' },
      { name: 'DVT Risk', href: '/calculators?tab=dvt' },
    ],
  },
  { 
    name: 'Patient Education', 
    href: '/patient-education', 
    icon: <BookOpen size={20} />,
  },
  { 
    name: 'Dr. Reviews', 
    href: '/dr-reviews', 
    icon: <FileText size={20} />,
    permission: 'manage_hospital', // Admin only
  },
  { 
    name: 'External Review', 
    href: '/external-review', 
    icon: <FileText size={20} />,
    permission: 'manage_hospital', // Admin only
  },
  { 
    name: 'Hospitals', 
    href: '/hospitals', 
    icon: <Building2 size={20} />,
    permission: 'manage_hospital',
  },
  { 
    name: 'Users', 
    href: '/users', 
    icon: <Users size={20} />,
    permission: 'manage_hospital',
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: <Settings size={20} />,
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl blur-sm opacity-30" />
          <img 
            src="/icons/logo.png" 
            alt="AstroHEALTH" 
            className="relative w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-md ring-1 ring-indigo-100"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">AstroHEALTH</h1>
          <p className="text-xs text-indigo-600 font-medium">Innovations in Healthcare</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden p-2 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <X size={20} className="text-indigo-600" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const isExpanded = expandedItems.includes(item.name);

          if (item.children) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={`w-full sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-9 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.name}
                            to={child.href}
                            onClick={onClose}
                            className="block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900"
                          >
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
              {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName || ''} {user.lastName || ''}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {(user.role || '').replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:bg-white lg:border-r lg:border-gray-200 lg:flex lg:flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
