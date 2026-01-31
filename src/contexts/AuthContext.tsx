import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { syncRecord } from '../services/cloudSyncService';
import type { User, UserRole } from '../types';
import Dexie from 'dexie';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  needsAgreement: () => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions mapping
const rolePermissions: Record<UserRole, string[]> = {
  super_admin: ['*'],
  hospital_admin: [
    'manage_users', 'manage_hospital', 'view_reports', 'manage_billing',
    'view_patients', 'manage_settings'
  ],
  surgeon: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  doctor: [
    'view_patients', 'manage_patients', 'create_encounters', 
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_admissions'
  ],
  plastic_surgeon: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds', 
    'manage_burns', 'manage_reconstructive'
  ],
  anaesthetist: [
    'view_patients', 'create_encounters', 'manage_anaesthesia',
    'view_labs', 'view_vitals', 'prescribe'
  ],
  nurse: [
    'view_patients', 'record_vitals', 'view_labs', 'manage_wounds',
    'view_prescriptions', 'administer_medications', 'create_notes'
  ],
  pharmacist: [
    'view_patients', 'view_prescriptions', 'dispense_medications',
    'manage_inventory'
  ],
  lab_scientist: [
    'view_patients', 'view_lab_requests', 'process_labs', 'enter_results'
  ],
  dietician: [
    'view_patients', 'manage_nutrition', 'create_meal_plans'
  ],
  physiotherapist: [
    'view_patients', 'manage_rehabilitation', 'create_therapy_plans'
  ],
  accountant: [
    'manage_billing', 'view_invoices', 'process_payments', 'view_reports'
  ],
  home_care_giver: [
    'view_assigned_patients', 'record_vitals', 'create_notes', 'manage_wounds'
  ],
  driver: [
    'view_schedules', 'update_transport_status'
  ],
  consultant: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds',
    'supervise_residents', 'approve_discharges'
  ],
  resident: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  registrar: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  senior_registrar: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds',
    'supervise_residents'
  ],
  medical_officer: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  house_officer: [
    'view_patients', 'create_encounters', 'view_labs', 'request_labs',
    'view_vitals', 'create_notes'
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and check for existing session on mount
  useEffect(() => {
    const initAndCheckAuth = async () => {
      try {
        // Try to open the database - this will trigger version upgrade if needed
        await db.open();
      } catch (error) {
        console.warn('[Auth] Database open failed, attempting recovery...', error);
        // If database fails to open (version conflict), delete and recreate
        if (error instanceof Dexie.VersionError || error instanceof Dexie.UpgradeError) {
          console.log('[Auth] Deleting old database due to version conflict...');
          await Dexie.delete('AstroHEALTHDB');
          // Reload the page to reinitialize with fresh database
          window.location.reload();
          return;
        }
      }

      try {
        const storedUserId = localStorage.getItem('AstroHEALTH_user_id');
        if (storedUserId) {
          const storedUser = await db.users.get(storedUserId);
          if (storedUser && storedUser.isActive) {
            setUser(storedUser);
          } else {
            localStorage.removeItem('AstroHEALTH_user_id');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('AstroHEALTH_user_id');
      } finally {
        setIsLoading(false);
      }
    };

    initAndCheckAuth();
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    try {
      // Ensure database is open
      if (!db.isOpen()) {
        await db.open();
      }

      // In a real app, you'd validate the password against a hash
      const foundUser = await db.users
        .where('email')
        .equals(email.toLowerCase())
        .first();

      if (foundUser && foundUser.isActive) {
        setUser(foundUser);
        localStorage.setItem('AstroHEALTH_user_id', foundUser.id);
        return true;
      }

      // For demo: create a default admin user if none exists
      const userCount = await db.users.count();
      if (userCount === 0 && email.toLowerCase() === 'admin@astrohealth.ng') {
        const newUser: User = {
          id: uuidv4(),
          email: 'admin@astrohealth.ng',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'super_admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.users.add(newUser);
        // Sync new user to cloud immediately
        syncRecord('users', newUser as unknown as Record<string, unknown>);
        setUser(newUser);
        localStorage.setItem('AstroHEALTH_user_id', newUser.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      // If it's a database error, try to recover
      if (error instanceof Dexie.DexieError) {
        console.warn('[Auth] Database error during login, attempting recovery...');
        try {
          await Dexie.delete('AstroHEALTHDB');
          window.location.reload();
        } catch {
          // Ignore deletion errors
        }
      }
      return false;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      // Check if email already exists
      const existingUser = await db.users
        .where('email')
        .equals(userData.email.toLowerCase())
        .first();

      if (existingUser) {
        return false;
      }

      const newUser: User = {
        id: uuidv4(),
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        hospitalId: userData.hospitalId,
        phone: userData.phone,
        specialization: userData.specialization,
        licenseNumber: userData.licenseNumber,
        isActive: true,
        hasAcceptedAgreement: false,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.users.add(newUser);
      // Sync new user to cloud immediately
      syncRecord('users', newUser as unknown as Record<string, unknown>);
      setUser(newUser);
      localStorage.setItem('AstroHEALTH_user_id', newUser.id);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('AstroHEALTH_user_id');
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    await db.users.put(updatedUser);
    // Sync updated user to cloud immediately
    syncRecord('users', updatedUser as unknown as Record<string, unknown>);
    setUser(updatedUser);
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    
    const permissions = rolePermissions[user.role];
    return permissions.includes('*') || permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      const freshUser = await db.users.get(user.id);
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [user]);

  const needsAgreement = useCallback((): boolean => {
    if (!user) return false;
    return !user.hasAcceptedAgreement;
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    hasPermission,
    hasRole,
    needsAgreement,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
