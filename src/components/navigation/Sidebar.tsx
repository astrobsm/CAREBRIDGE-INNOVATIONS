import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, UserPlus, CalendarDays, Scissors, TestTube2, BookOpen, Calculator,
  Receipt, Settings, MoreHorizontal, LayoutGrid, Network, Brain, AlertTriangle,
  CircleDot, Flame, Layers, ScanLine, Shield, Wind, Footprints, HeartPulse, Apple,
  ClipboardList, Activity, BedDouble, ShoppingCart, Wallet, Heart, GitMerge,
  Building2, MessageSquare, Send, Droplets, Microscope, Pill, FileText,
  Presentation, FlaskConical, Stethoscope, X, ChevronDown, Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMultiSiteEnabled } from '../../services/practiceSettings';
import {
  visibleMenu, filterMenu, activeHref, allMenuHrefs,
  type MenuGroup, type MenuItem, type MenuIconKey,
} from './menuModel';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICONS: Record<MenuIconKey, (size: number) => ReactNode> = {
  home: s => <Home size={s} />, users: s => <Users size={s} />, userPlus: s => <UserPlus size={s} />,
  calendar: s => <CalendarDays size={s} />, scissors: s => <Scissors size={s} />, testTube: s => <TestTube2 size={s} />,
  book: s => <BookOpen size={s} />, calculator: s => <Calculator size={s} />, receipt: s => <Receipt size={s} />,
  settings: s => <Settings size={s} />, more: s => <MoreHorizontal size={s} />, apps: s => <LayoutGrid size={s} />,
  network: s => <Network size={s} />, brain: s => <Brain size={s} />, alert: s => <AlertTriangle size={s} />,
  wound: s => <CircleDot size={s} />, flame: s => <Flame size={s} />, layers: s => <Layers size={s} />,
  scan: s => <ScanLine size={s} />, shield: s => <Shield size={s} />, wind: s => <Wind size={s} />,
  footprints: s => <Footprints size={s} />, heartPulse: s => <HeartPulse size={s} />, apple: s => <Apple size={s} />,
  clipboard: s => <ClipboardList size={s} />, activity: s => <Activity size={s} />, bed: s => <BedDouble size={s} />,
  cart: s => <ShoppingCart size={s} />, wallet: s => <Wallet size={s} />, heart: s => <Heart size={s} />,
  gitMerge: s => <GitMerge size={s} />, building: s => <Building2 size={s} />, message: s => <MessageSquare size={s} />,
  send: s => <Send size={s} />, droplets: s => <Droplets size={s} />, microscope: s => <Microscope size={s} />,
  pill: s => <Pill size={s} />, fileText: s => <FileText size={s} />, presentation: s => <Presentation size={s} />,
  flask: s => <FlaskConical size={s} />, stethoscope: s => <Stethoscope size={s} />,
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const multiSite = useMultiSiteEnabled();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  // Groups the user opened/closed against their default.
  const [toggledGroups, setToggledGroups] = useState<string[]>([]);

  const menu = useMemo(
    () => visibleMenu({ role: user?.role, hasPermission, multiSite }),
    [user?.role, hasPermission, multiSite],
  );
  const searching = query.trim().length > 0;
  const shown = useMemo(() => filterMenu(menu, query), [menu, query]);
  const current = activeHref(location.pathname, allMenuHrefs(menu));

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const groupOpen = (g: MenuGroup) => {
    if (searching) return true;
    const containsActive = g.items.some(i => i.href === current || i.children?.some(c => c.href === current));
    const base = g.defaultCollapsed ? containsActive : true;
    return toggledGroups.includes(g.id) ? !base : base;
  };

  const renderItem = (item: MenuItem) => {
    const childActive = item.children?.some(c => c.href.split('?')[0] === current) ?? false;
    const isActive = item.href === current || childActive;

    if (item.children) {
      const isExpanded = searching || childActive !== expandedItems.includes(item.name);
      return (
        <div key={item.name}>
          <button
            type="button"
            onClick={() => setExpandedItems(prev => toggle(prev, item.name))}
            aria-expanded={isExpanded}
            className={`w-full sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            {ICONS[item.icon](20)}
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="ml-9 mt-1 space-y-1">
              {item.children.map(child => (
                <NavLink
                  key={child.href + child.name}
                  to={child.href}
                  end
                  onClick={onClose}
                  className={`block px-4 py-2 text-sm rounded-lg hover:bg-gray-100 hover:text-gray-900 ${
                    child.href === current ? 'text-sky-700 font-medium bg-sky-50' : 'text-gray-600'
                  }`}
                >
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end
        onClick={onClose}
        className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
      >
        {ICONS[item.icon](20)}
        <span>{item.name}</span>
      </NavLink>
    );
  };

  const renderGroup = (g: MenuGroup) => {
    if (!g.label) {
      return <div key={g.id} className="space-y-1">{g.items.map(renderItem)}</div>;
    }
    const open = groupOpen(g);
    const collapsible = g.defaultCollapsed || g.bottom;
    return (
      <div key={g.id} className="pt-3 first:pt-0">
        <button
          type="button"
          onClick={() => setToggledGroups(prev => toggle(prev, g.id))}
          aria-expanded={open}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:text-gray-600 ${
            collapsible ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {g.icon && ICONS[g.icon](14)}
          <span className="flex-1 text-left">{g.label}</span>
          <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {open && <div className="space-y-1 mt-1">{g.items.map(renderItem)}</div>}
      </div>
    );
  };

  const mainGroups = shown.filter(g => !g.bottom);
  const bottomGroups = shown.filter(g => g.bottom);

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
          title="Close sidebar"
          aria-label="Close menu"
        >
          <X size={20} className="text-indigo-600" />
        </button>
      </div>

      {/* Menu filter */}
      <div className="px-4 pt-3">
        <label className="relative block">
          <span className="sr-only">Filter menu</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find in menu…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </label>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Main menu">
        {mainGroups.map(renderGroup)}
        {bottomGroups.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">{bottomGroups.map(renderGroup)}</div>
        )}
        {shown.length === 0 && (
          <p className="px-3 py-6 text-sm text-gray-500 text-center">Nothing in the menu matches “{query}”.</p>
        )}
      </nav>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
              {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName || ''} {user.lastName || ''}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {(user.role || '').replace(/_/g, ' ')}
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
