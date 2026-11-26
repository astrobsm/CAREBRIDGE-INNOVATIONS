/**
 * The practice menu: what the drawer lists, in what groups, and who sees it.
 *
 * The app was built for many hospitals and its menu showed ~44 top-level
 * entries flat, with super_admin bypassing every filter. A private practice
 * needs a slim menu: ten groups, a collapsed "More", and the multi-hospital
 * modules hidden unless "Multi-site / hospital features" is switched on.
 *
 * Nothing here is a route guard. Every route still works by URL; this only
 * decides what the menu offers. Kept pure (no React) so the rules are tested.
 */

export type MenuIconKey =
  | 'home' | 'users' | 'userPlus' | 'calendar' | 'scissors' | 'testTube'
  | 'book' | 'calculator' | 'receipt' | 'settings' | 'more' | 'apps'
  | 'network' | 'brain' | 'alert' | 'wound' | 'flame' | 'layers' | 'scan'
  | 'shield' | 'wind' | 'footprints' | 'heartPulse' | 'apple' | 'clipboard'
  | 'activity' | 'bed' | 'cart' | 'wallet' | 'heart' | 'gitMerge'
  | 'building' | 'message' | 'send' | 'droplets' | 'microscope' | 'pill'
  | 'fileText' | 'presentation' | 'flask' | 'stethoscope';

export interface MenuLink {
  name: string;
  href: string;
  icon?: MenuIconKey;
  /** Permission required (other roles). super_admin passes every permission. */
  permission?: string;
  /** Only these roles see it. Applies to super_admin too. */
  roles?: string[];
  /** A multi-hospital module: hidden unless the multi-site setting is on. */
  multiSite?: boolean;
  /** Extra words the menu filter box matches. */
  keywords?: string;
}

export interface MenuItem extends MenuLink {
  icon: MenuIconKey;
  children?: MenuLink[];
}

export interface MenuGroup {
  id: string;
  /** No label = rendered without a header (the Today entry). */
  label?: string;
  icon?: MenuIconKey;
  /** Starts collapsed (More, Other apps). */
  defaultCollapsed?: boolean;
  /** Pinned at the bottom of the drawer. */
  bottom?: boolean;
  items: MenuItem[];
}

export interface MenuContext {
  role?: string | null;
  hasPermission: (permission: string) => boolean;
  multiSite: boolean;
}

const ADMINS = ['super_admin', 'hospital_admin'];

/** Roles allowed into the owner's Family workspace (menu and route). */
export const FAMILY_ROLES = ['super_admin'];

export const PRACTICE_MENU: MenuGroup[] = [
  {
    id: 'today',
    items: [{ name: 'Today', href: '/', icon: 'home', keywords: 'home dashboard clinic' }],
  },
  {
    id: 'patients',
    label: 'Patients',
    items: [
      { name: 'Patients', href: '/patients', icon: 'users', permission: 'view_patients', keywords: 'find search list' },
      { name: 'New patient', href: '/patients/new', icon: 'userPlus', permission: 'view_patients', keywords: 'register registration add' },
    ],
  },
  {
    id: 'clinic',
    label: 'Clinic',
    items: [
      {
        name: 'Appointments', href: '/appointments', icon: 'calendar', permission: 'view_patients',
        keywords: 'book booking schedule clinic',
        children: [
          { name: 'Appointments', href: '/appointments' },
          { name: 'Clinic bookings', href: '/appointments/clinic-bookings', keywords: 'online public requests' },
          { name: 'Booking link', href: '/appointments/share-booking', keywords: 'share public' },
        ],
      },
    ],
  },
  {
    id: 'theatre',
    label: 'Theatre',
    items: [
      { name: 'Surgical workflow', href: '/surgery/workflow', icon: 'scissors', permission: 'manage_surgeries', keywords: 'surgery operation preop planning' },
      { name: 'Surgery list', href: '/surgery', icon: 'clipboard', permission: 'manage_surgeries', keywords: 'theatre list operations' },
      { name: 'Post-op notes', href: '/surgery/post-op-notes', icon: 'fileText', permission: 'manage_surgeries', keywords: 'operation note' },
      { name: 'Post-op care', href: '/post-op-care', icon: 'activity', permission: 'create_encounters', keywords: 'postoperative monitoring' },
    ],
  },
  {
    id: 'results',
    label: 'Results',
    items: [
      { name: 'Investigations', href: '/investigations', icon: 'testTube', permission: 'view_labs', keywords: 'labs results radiology imaging' },
      // Not a duplicate of /investigations: it works on the labRequests table
      // (lab requests raised from encounters and approvals).
      { name: 'Lab requests', href: '/laboratory', icon: 'flask', permission: 'view_labs', keywords: 'laboratory samples' },
    ],
  },
  {
    id: 'education',
    label: 'Patient information',
    items: [
      { name: 'Patient education', href: '/patient-education', icon: 'book', keywords: 'handout leaflet information counselling' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { name: 'Calculators', href: '/calculators', icon: 'calculator', keywords: 'electrolytes sodium gfr renal drug dosing burns tbsa nutrition dvt caprini' },
      { name: 'Clinician assistant', href: '/clinician-assistant', icon: 'brain', permission: 'create_encounters', keywords: 'ai analysis' },
      { name: 'STI / NEC protocol', href: '/sti-protocol', icon: 'alert', permission: 'create_encounters', keywords: 'soft tissue infection necrotising fasciitis lrinec qsofa' },
      { name: 'Substance use', href: '/substance-use', icon: 'alert', permission: 'create_encounters', keywords: 'detox alcohol drugs' },
      {
        name: 'Wound & specialty monitors', href: '/wound-monitor', icon: 'wound', permission: 'manage_wounds',
        keywords: 'wounds specialty monitors',
        children: [
          { name: 'Wound monitor', href: '/wound-monitor', keywords: 'wounds photos measurement' },
          { name: 'Burns', href: '/burns', keywords: 'tbsa burn' },
          { name: 'Skin graft monitor', href: '/skin-graft', keywords: 'graft take' },
          { name: 'Scar & keloid monitor', href: '/scar-monitor', keywords: 'scar keloid vss posas' },
          { name: 'Keloid treatment plans', href: '/keloid-care', keywords: 'keloid triamcinolone care plan' },
          { name: 'NPWT', href: '/npwt', keywords: 'negative pressure vac' },
          { name: 'Limb salvage (diabetic foot)', href: '/limb-salvage', keywords: 'diabetic foot ulcer' },
          { name: 'PAD / limb ischaemia', href: '/vascular', keywords: 'vascular peripheral arterial abpi' },
          { name: 'Lymphoedema', href: '/lymphedema', keywords: 'lymphedema swelling' },
        ],
      },
      { name: 'Nutrition', href: '/nutrition', icon: 'apple', permission: 'manage_nutrition', keywords: 'diet meal plan feeding' },
      { name: 'Treatment plans', href: '/treatment-planning', icon: 'clipboard', permission: 'create_encounters', keywords: 'treatment planning orders' },
      { name: 'Medication chart', href: '/medication-chart', icon: 'pill', permission: 'view_prescriptions', keywords: 'drugs mar inpatient' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    items: [
      { name: 'Billing', href: '/billing', icon: 'receipt', permission: 'view_invoices', keywords: 'invoice payment receipt' },
      { name: 'Surgical estimate', href: '/billing/surgical-estimate', icon: 'calculator', permission: 'view_invoices', keywords: 'quote cost' },
      { name: 'Shopping checklist', href: '/shopping-checklist', icon: 'cart', keywords: 'consumables buy' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { name: 'Settings', href: '/settings', icon: 'settings', keywords: 'profile sync multi-site' },
      { name: 'Users', href: '/users', icon: 'users', permission: 'manage_hospital', keywords: 'staff accounts' },
      { name: 'Duplicate patients', href: '/patients/duplicates', icon: 'gitMerge', roles: ADMINS, keywords: 'merge' },
      { name: 'Practice admin', href: '/practice-admin', icon: 'building', roles: ADMINS, keywords: 'admin dashboard statistics' },
    ],
  },
  {
    // Shown only when "Multi-site / hospital features" is on.
    id: 'network',
    label: 'Hospital features',
    icon: 'network',
    items: [
      { name: 'Hospitals', href: '/hospitals', icon: 'building', permission: 'manage_hospital', multiSite: true },
      { name: 'Activity analytics', href: '/user-activity', icon: 'activity', roles: ['super_admin'], multiSite: true, keywords: 'user activity' },
      { name: 'External review', href: '/external-review', icon: 'fileText', permission: 'manage_hospital', multiSite: true },
      { name: 'Payroll', href: '/billing/payroll', icon: 'wallet', permission: 'manage_hospital', multiSite: true, keywords: 'payslip salary' },
      { name: 'MDT', href: '/mdt', icon: 'users', permission: 'create_encounters', multiSite: true, keywords: 'multidisciplinary' },
      { name: 'Tumour board', href: '/tumour-board', icon: 'microscope', permission: 'create_encounters', multiSite: true, keywords: 'tumor oncology' },
      { name: 'Pre-surgical conference', href: '/pre-surgical-conference', icon: 'presentation', permission: 'manage_surgeries', multiSite: true },
      { name: 'Blood bank', href: '/blood-transfusion', icon: 'droplets', permission: 'create_encounters', multiSite: true, keywords: 'transfusion' },
      { name: 'Referrals', href: '/referrals', icon: 'send', permission: 'create_encounters', multiSite: true },
      { name: 'Pharmacy', href: '/pharmacy', icon: 'pill', permission: 'view_prescriptions', multiSite: true, keywords: 'dispense' },
      {
        name: 'Communication', href: '/communication/chat', icon: 'message', multiSite: true, keywords: 'chat video conference',
        children: [
          { name: 'Chat', href: '/communication/chat' },
          { name: 'Video conference', href: '/communication/video' },
        ],
      },
    ],
  },
  {
    id: 'more',
    label: 'More',
    icon: 'more',
    defaultCollapsed: true,
    items: [
      { name: 'Patient flow (ADT)', href: '/adt', icon: 'bed', permission: 'manage_admissions', keywords: 'admission discharge transfer ward' },
      { name: 'Admissions', href: '/admissions', icon: 'bed', permission: 'manage_admissions', keywords: 'admit inpatient' },
      { name: 'Ward rounds', href: '/ward-rounds', icon: 'clipboard', permission: 'create_encounters' },
      { name: 'Doctor reviews', href: '/dr-reviews', icon: 'stethoscope', permission: 'create_encounters', keywords: 'review' },
    ],
  },
  {
    id: 'apps',
    label: 'Other apps',
    icon: 'apps',
    defaultCollapsed: true,
    bottom: true,
    items: [
      {
        name: 'Finance', href: '/finance', icon: 'wallet', roles: ADMINS, keywords: 'zigma treasury income expenses',
        children: [
          { name: 'Dashboard', href: '/finance' },
          { name: 'Income', href: '/finance/income' },
          { name: 'Buckets', href: '/finance/buckets' },
          { name: 'Expenses', href: '/finance/expenses' },
          { name: 'Projects', href: '/finance/projects' },
          { name: 'Investments', href: '/finance/investments' },
          { name: 'Settings', href: '/finance/settings' },
        ],
      },
      {
        // The owner's family workspace. Owner (super_admin) only.
        name: 'Family', href: '/family', icon: 'heart', roles: FAMILY_ROLES, keywords: 'children tasks prayer',
        children: [
          { name: 'Dashboard', href: '/family' },
          { name: 'Children', href: '/family/children' },
          { name: 'Tasks', href: '/family/tasks' },
          { name: 'Approvals', href: '/family/approvals' },
          { name: 'Radio', href: '/family/radio' },
          { name: 'Routines', href: '/family/routines' },
          { name: 'Compliance', href: '/family/compliance' },
          { name: 'Readiness', href: '/family/readiness' },
          { name: 'Wallets', href: '/family/wallets' },
          { name: 'Events', href: '/family/events' },
          { name: 'Prayer', href: '/family/prayer' },
          { name: 'Growth', href: '/family/growth' },
          { name: 'Health', href: '/family/health' },
          { name: 'School', href: '/family/school' },
          { name: 'Alerts', href: '/family/notifications' },
        ],
      },
    ],
  },
];

export function canSeeFamily(role?: string | null): boolean {
  return !!role && FAMILY_ROLES.includes(role);
}

function linkVisible(link: MenuLink, ctx: MenuContext): boolean {
  if (link.multiSite && !ctx.multiSite) return false;
  if (link.roles && link.roles.length > 0) {
    if (!ctx.role || !link.roles.includes(ctx.role)) return false;
  }
  if (!link.permission) return true;
  if (ctx.role === 'super_admin') return true;
  return ctx.hasPermission(link.permission);
}

/** The groups and items this user sees, empty groups dropped. */
export function visibleMenu(ctx: MenuContext, groups: MenuGroup[] = PRACTICE_MENU): MenuGroup[] {
  const out: MenuGroup[] = [];
  for (const g of groups) {
    const items: MenuItem[] = [];
    for (const item of g.items) {
      if (!linkVisible(item, ctx)) continue;
      if (item.children) {
        const children = item.children.filter(c => linkVisible(c, ctx));
        if (children.length === 0) continue;
        items.push({ ...item, children });
      } else {
        items.push(item);
      }
    }
    if (items.length > 0) out.push({ ...g, items });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function linkMatches(link: MenuLink, words: string[], groupLabel?: string): boolean {
  const hay = norm(`${link.name} ${link.keywords ?? ''} ${groupLabel ?? ''}`);
  return words.every(w => hay.includes(w));
}

/**
 * Filter by the drawer's search box. Every word must match an item's name,
 * keywords or group label. A parent stays if any child matches (keeping only
 * those children), or with all children if the parent itself matches.
 */
export function filterMenu(groups: MenuGroup[], query: string): MenuGroup[] {
  const words = norm(query).split(' ').filter(Boolean);
  if (words.length === 0) return groups;
  const out: MenuGroup[] = [];
  for (const g of groups) {
    const items: MenuItem[] = [];
    for (const item of g.items) {
      if (linkMatches(item, words, g.label)) { items.push(item); continue; }
      if (item.children) {
        const children = item.children.filter(c => linkMatches(c, words));
        if (children.length > 0) items.push({ ...item, children });
      }
    }
    if (items.length > 0) out.push({ ...g, items });
  }
  return out;
}

/** Every href the menu can show (for route tests). */
export function allMenuHrefs(groups: MenuGroup[] = PRACTICE_MENU): string[] {
  return groups.flatMap(g => g.items.flatMap(i => [i.href, ...(i.children ?? []).map(c => c.href)]));
}

/**
 * Which of `hrefs` is the active one for `pathname`: an exact match, else
 * the longest href the path sits under. So /patients/new lights up
 * "New patient" and not also "Patients".
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  let best: string | null = null;
  for (const raw of hrefs) {
    const h = raw.split(/[?#]/)[0];
    const ok = h === path || (h !== '/' && path.startsWith(h + '/'));
    if (ok && (!best || h.length > best.length)) best = h;
  }
  return best;
}
