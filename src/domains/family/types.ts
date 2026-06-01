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
  created_at?: string;
}

export interface Wallet {
  id: string;
  child_id: string;
  balance: number | string;
  base_stipend: number | string;
}

export type TaskCategory = 'chore'|'responsibility'|'academic'|'spiritual'|'health'|'other';
export type TaskPriority = 'low'|'medium'|'high'|'critical';

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
  type: 'stipend'|'bonus'|'penalty'|'transfer_in'|'transfer_out'|'adjustment';
  amount: number | string;
  balance_after: number | string;
  description?: string | null;
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
  child_id: string;
  recorded_by: string;
  record_date: string;
  illness: string;
  symptoms?: string | null;
  treatment?: string | null;
  doctor_name?: string | null;
  hospital?: string | null;
  follow_up_date?: string | null;
  is_resolved?: boolean;
  notes?: string | null;
}

export interface FamilyNotification {
  id: string;
  user_id: string;
  title?: string | null;
  body?: string | null;
  is_read?: boolean;
  created_at?: string;
}
