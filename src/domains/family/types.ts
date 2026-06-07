// Family domain types — matches columns in supabase-family-app-migration.sql

export interface FamilyParent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  timezone?: string | null;
  astrohealth_user_id?: string | null;
  created_at?: string;
}

export interface Child {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | null;
  photo_url?: string | null;
  notes?: string | null;
  is_active?: boolean;
  // Self-service login
  username?: string | null;
  pin_hash?: string | null;
  can_login?: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

export interface Wallet {
  id: string;
  child_id: string;
  balance: number | string;
  base_stipend: number | string;
  savings_balance?: number | string;
  personal_balance?: number | string;
  charity_balance?: number | string;
  split_savings_pct?: number;
  split_personal_pct?: number;
  split_charity_pct?: number;
}

export type TaskCategory = 'chore'|'responsibility'|'academic'|'spiritual'|'health'|'other';
export type TaskPriority = 'low'|'medium'|'high'|'critical';
export type TaskFrequency = 'once'|'daily'|'weekdays'|'weekends'|'weekly'|'monthly'|'custom';

export interface Task {
  id: string;
  parent_id: string;
  title: string;
  description?: string | null;
  category?: TaskCategory | null;
  priority?: TaskPriority | null;
  reward_amount?: number | string | null;
  penalty_amount?: number | string | null;
  is_recurring?: boolean;
  is_active?: boolean;
  // Library + scheduling
  is_template?: boolean;
  scheduled_time?: string | null;       // 'HH:MM' or 'HH:MM:SS'
  duration_minutes?: number | null;
  frequency?: TaskFrequency | null;
  days_of_week?: number[] | null;       // 0=Sun .. 6=Sat
  created_at?: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  child_id: string;
  assigned_by: string;
  status: 'pending'|'in_progress'|'completed'|'failed'|'reassigned';
  due_date?: string | null;
  completed_at?: string | null;
  parent_notes?: string | null;
}

export interface Transaction {
  id: string;
  child_id: string;
  wallet_id: string;
  type: 'stipend'|'bonus'|'penalty'|'transfer_in'|'transfer_out'|'adjustment'|'charity_donation'|'savings_withdrawal';
  amount: number | string;
  balance_after: number | string;
  bucket?: 'savings'|'personal'|'charity'|'total' | null;
  description?: string | null;
  created_at?: string;
}

// --- Homework + Readiness compliance ---
export interface Homework {
  id: string;
  child_id: string;
  recorded_by?: string | null;
  subject?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: 'pending'|'in_progress'|'done';
  completed_at?: string | null;
  source: 'child'|'parent';
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  id: string;
  child_id: string;
  parent_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistLog {
  id: string;
  child_id: string;
  item_id: string;
  log_date: string;     // YYYY-MM-DD
  checked_at?: string;
}

export type DayCode = 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';

export interface ComplianceConfig {
  id: string;
  child_id: string;
  parent_id: string;
  deadline_time: string;        // 'HH:MM' or 'HH:MM:SS'
  reward_amount: number | string;
  penalty_amount: number | string;
  active_days: DayCode[];
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceEvent {
  id: string;
  child_id: string;
  event_date: string;
  kind: 'day_passed'|'day_failed';
  amount: number | string;
  transaction_id?: string | null;
  note?: string | null;
  created_at?: string;
}

export type EventType = 'birthday'|'baptism'|'anniversary'|'holiday'|'medical'|'school'|'other';

export interface FamilyEvent {
  id: string;
  parent_id: string;
  child_id?: string | null;
  title: string;
  description?: string | null;
  event_type?: EventType | null;
  event_date: string;
  is_recurring?: boolean;
  reminder_days_before?: number;
}

export interface PrayerSchedule {
  id: string;
  parent_id: string;
  name: string;
  scheduled_time: string;
  days_of_week?: number[];
  is_active?: boolean;
}

export interface PrayerLog {
  id: string;
  prayer_schedule_id: string;
  child_id: string;
  prayer_date: string;
  participated: boolean;
  notes?: string | null;
}

export interface GrowthRecord {
  id: string;
  child_id: string;
  recorded_by: string;
  record_date: string;
  weight_kg?: number | string | null;
  height_cm?: number | string | null;
  bmi?: number | string | null;
  notes?: string | null;
}

export interface HealthRecord {
  id: string;
  child_id?: string | null;
  subject_parent_id?: string | null;
  recorded_by: string;
  record_date: string;
  illness?: string | null;
  symptoms?: string | null;
  treatment?: string | null;
  doctor_name?: string | null;
  hospital?: string | null;
  follow_up_date?: string | null;
  is_resolved?: boolean;
  notes?: string | null;
  // Vitals
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate?: number | null;
  fasting_blood_sugar?: number | string | null;
  temperature_c?: number | string | null;
}

export interface FamilyNotification {
  id: string;
  user_id: string;
  title?: string | null;
  body?: string | null;
  is_read?: boolean;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Routines (bedtime / morning / school-readiness / church / weekend chores)
// ---------------------------------------------------------------------------
export type RoutineCategory =
  | 'bedtime'
  | 'morning'
  | 'school_readiness'
  | 'church_readiness'
  | 'weekend_chores'
  | 'homework'
  | 'general';

export type RoutineStatus =
  | 'pending'
  | 'in_progress'
  | 'completed_on_time'
  | 'completed_late'
  | 'missed';

export interface Routine {
  id: string;
  parent_id: string;
  child_id?: string | null;          // null = applies to all children
  name: string;
  category: RoutineCategory;
  description?: string | null;
  days_of_week: number[];            // 0=Sun .. 6=Sat
  deadline_time?: string | null;     // 'HH:MM' or 'HH:MM:SS'
  reward_amount?: number | string | null;
  penalty_amount?: number | string | null;
  partial_reward_pct?: number;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  label: string;
  sort_order: number;
  is_required?: boolean;
  created_at?: string;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  child_id: string;
  log_date: string;                  // YYYY-MM-DD
  deadline_at?: string | null;       // ISO
  status: RoutineStatus;
  started_at?: string | null;
  completed_at?: string | null;
  score_pct?: number | null;
  reward_paid?: number | string | null;
  penalty_paid?: number | string | null;
  settled?: boolean;
  created_at?: string;
}

export interface RoutineItemLog {
  id: string;
  log_id: string;
  item_id: string;
  done: boolean;
  done_at?: string | null;
}

export interface SchoolPerformance {
  id: string;
  child_id: string;
  recorded_by: string;
  school_name?: string | null;
  class_or_grade?: string | null;
  term?: string | null;
  academic_year?: string | null;
  report_date: string;
  average_score?: number | string | null;
  position_in_class?: number | null;
  class_size?: number | null;
  attendance_pct?: number | string | null;
  conduct_grade?: string | null;
  teacher_remark?: string | null;
  parent_remark?: string | null;
  next_term_begins?: string | null;
  created_at?: string;
}

export type AwardCategory = 'academic' | 'sports' | 'spiritual' | 'character' | 'leadership' | 'other';
export type AwardIssuerType = 'school' | 'church' | 'community' | 'competition' | 'other';

export interface Award {
  id: string;
  child_id: string;
  recorded_by: string;
  title: string;
  category?: AwardCategory | null;
  issuer?: string | null;
  issuer_type?: AwardIssuerType | null;
  date_awarded: string;
  description?: string | null;
  certificate_url?: string | null;
  created_at?: string;
}
