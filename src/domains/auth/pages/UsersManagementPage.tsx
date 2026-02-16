import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Edit2,
  Trash2,
  MoreVertical,
  Shield,
  Mail,
  Phone,
  Building2,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Key,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import BulkImportModal from '../../../components/common/BulkImportModal';
import type { User, UserRole, Hospital } from '../../../types';

const roles: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'hospital_admin', label: 'Hospital Admin' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'senior_registrar', label: 'Senior Registrar' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'resident', label: 'Resident' },
  { value: 'medical_officer', label: 'Medical Officer' },
  { value: 'house_officer', label: 'House Officer' },
  { value: 'surgeon', label: 'Surgeon' },
  { value: 'plastic_surgeon', label: 'Plastic Surgeon' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'anaesthetist', label: 'Anaesthetist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_scientist', label: 'Laboratory Scientist' },
  { value: 'dietician', label: 'Dietician' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'home_care_giver', label: 'Home Care Giver' },
  { value: 'driver', label: 'Driver' },
  { value: 'endocrinologist', label: 'Endocrinologist' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'nephrologist', label: 'Nephrologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'gastroenterologist', label: 'Gastroenterologist' },
  { value: 'obstetrician', label: 'Obstetrician' },
  { value: 'radio_oncologist', label: 'Radio Oncologist' },
  { value: 'pathologist', label: 'Pathologist' },
];

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  hospital_admin: 'bg-indigo-100 text-indigo-800',
  consultant: 'bg-blue-100 text-blue-800',
  senior_registrar: 'bg-blue-100 text-blue-700',
  registrar: 'bg-blue-100 text-blue-600',
  resident: 'bg-cyan-100 text-cyan-700',
  medical_officer: 'bg-teal-100 text-teal-700',
  house_officer: 'bg-sky-100 text-sky-700',
  surgeon: 'bg-blue-100 text-blue-800',
  plastic_surgeon: 'bg-indigo-100 text-indigo-700',
  doctor: 'bg-cyan-100 text-cyan-800',
  anaesthetist: 'bg-cyan-100 text-cyan-800',
  nurse: 'bg-pink-100 text-pink-800',
  pharmacist: 'bg-green-100 text-green-800',
  lab_scientist: 'bg-yellow-100 text-yellow-800',
  dietician: 'bg-orange-100 text-orange-800',
  physiotherapist: 'bg-teal-100 text-teal-800',
  accountant: 'bg-gray-100 text-gray-800',
  home_care_giver: 'bg-rose-100 text-rose-800',
  driver: 'bg-slate-100 text-slate-800',
  endocrinologist: 'bg-amber-100 text-amber-800',
  cardiologist: 'bg-red-100 text-red-800',
  nephrologist: 'bg-sky-100 text-sky-800',
  neurologist: 'bg-violet-100 text-violet-800',
  gastroenterologist: 'bg-lime-100 text-lime-800',
  obstetrician: 'bg-fuchsia-100 text-fuchsia-800',
  radio_oncologist: 'bg-emerald-100 text-emerald-800',
  pathologist: 'bg-stone-100 text-stone-800',
};

interface EditUserModalProps {
  user: User;
  hospitals: Hospital[];
  onClose: () => void;
  onSave: (updates: Partial<User>) => Promise<void>;
}

function EditUserModal({ user, hospitals, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    hospitalId: user.hospitalId || '',
    specialization: user.specialization || '',
    licenseNumber: user.licenseNumber || '',
    isActive: user.isActive,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        isActive: formData.isActive ? 1 : 0,
      } as unknown as Partial<User>);
      toast.success('User updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold">Edit User</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
                title="First name"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
                title="Last name"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
              title="Email address"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              title="Phone number"
              placeholder="+234 xxx xxx xxxx"
            />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="input"
              required
              title="Select user role"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Hospital</label>
            <select
              value={formData.hospitalId}
              onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
              className="input"
              title="Select hospital"
            >
              <option value="">Not assigned</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Specialization</label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="input"
              title="Specialization"
              placeholder="e.g., General Surgery, Orthopedics"
            />
          </div>

          <div>
            <label className="label">License Number</label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="input"
              placeholder="Medical license number"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={!!formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active User
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [credentialsUser, setCredentialsUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Fetch users and hospitals
  const users = useLiveQuery(() => db.users.toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);

  // Filter users
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      (user.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  }) || [];

  // Get hospital name by ID
  const getHospitalName = (hospitalId?: string) => {
    if (!hospitalId || !hospitals) return 'Not assigned';
    const hospital = hospitals.find((h) => h.id === hospitalId);
    return hospital?.name || 'Unknown';
  };

  // Handle user update
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    await db.users.update(userId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    // Sync updated user to cloud
    const updatedUser = await db.users.get(userId);
    if (updatedUser) {
      syncRecord('users', updatedUser as unknown as Record<string, unknown>);
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      await db.users.update(userId, {
        isActive: 0,
        updatedAt: new Date().toISOString(),
      });
      // Sync deactivated user to cloud
      const deactivatedUser = await db.users.get(userId);
      if (deactivatedUser) {
        syncRecord('users', deactivatedUser as unknown as Record<string, unknown>);
      }
      toast.success('User deactivated successfully');
    } catch (error) {
      toast.error('Failed to deactivate user');
    }
  };

  // Generate a random temporary password
  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const specials = '!@#$%&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += specials.charAt(Math.floor(Math.random() * specials.length));
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Handle password reset
  const handleResetPassword = async (userId: string) => {
    try {
      const tempPassword = generateTempPassword();
      await db.users.update(userId, {
        password: tempPassword,
        mustChangePassword: true,
        updatedAt: new Date().toISOString(),
      });
      // Sync to cloud
      const updatedUser = await db.users.get(userId);
      if (updatedUser) {
        syncRecord('users', updatedUser as unknown as Record<string, unknown>);
      }
      return tempPassword;
    } catch (error) {
      toast.error('Failed to reset password');
      return null;
    }
  };

  // Handle new user creation
  const handleAddUser = async (formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    hospitalId?: string;
    specialization?: string;
    licenseNumber?: string;
    password: string;
  }) => {
    // Check if email already exists
    const existingUser = await db.users.where('email').equals(formData.email).first();
    if (existingUser) {
      toast.error('A user with this email already exists');
      return false;
    }

    const now = new Date();
    const newUser: User = {
      id: crypto.randomUUID(),
      email: formData.email,
      password: formData.password, // Store password (should be hashed in production)
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      phone: formData.phone,
      hospitalId: formData.hospitalId,
      specialization: formData.specialization,
      licenseNumber: formData.licenseNumber,
      isActive: true,
      mustChangePassword: true,
      hasAcceptedAgreement: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.users.add(newUser);
    // Sync new user to cloud immediately
    syncRecord('users', newUser as unknown as Record<string, unknown>);
    toast.success('User added successfully');
    return true;
  };

  // Stats
  const stats = {
    total: users?.length || 0,
    active: users?.filter((u) => u.isActive).length || 0,
    inactive: users?.filter((u) => !u.isActive).length || 0,
    byRole: roles.reduce((acc, role) => {
      acc[role.value] = users?.filter((u) => u.role === role.value).length || 0;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Import</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
              <p className="text-xs text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(stats.byRole.surgeon || 0) + (stats.byRole.anaesthetist || 0)}
              </p>
              <p className="text-xs text-gray-500">Clinicians</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input min-w-[150px]"
            title="Filter by role"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label} ({stats.byRole[role.value] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="card divide-y">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No users found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || selectedRole !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Add users to get started'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm sm:text-base">
                      {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          roleColors[user.role] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {roles.find((r) => r.value === user.role)?.label || user.role}
                      </span>
                      {!user.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="truncate">{getHospitalName(user.hospitalId)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="User actions"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  <AnimatePresence>
                    {activeMenu === user.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border z-10"
                      >
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setActiveMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit User
                        </button>
                        <button
                          onClick={() => {
                            setCredentialsUser(user);
                            setActiveMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                        >
                          <Key className="w-4 h-4" />
                          Get Login Details
                        </button>
                        <button
                          onClick={() => {
                            setResetPasswordUser(user);
                            setActiveMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-amber-600"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reset Password
                        </button>
                        <button
                          onClick={() => {
                            handleDeactivateUser(user.id);
                            setActiveMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Deactivate
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Info */}
      {filteredUsers.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredUsers.length} of {stats.total} users
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        type="users"
        onImportComplete={(count) => {
          toast.success(`${count} users imported successfully!`);
        }}
      />

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <AddUserModal
            hospitals={hospitals || []}
            onClose={() => setShowAddUser(false)}
            onSave={handleAddUser}
          />
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            hospitals={hospitals || []}
            onClose={() => setEditingUser(null)}
            onSave={(updates) => handleUpdateUser(editingUser.id, updates)}
          />
        )}
      </AnimatePresence>

      {/* Get Login Details Modal */}
      <AnimatePresence>
        {credentialsUser && (
          <UserCredentialsModal
            user={credentialsUser}
            onClose={() => setCredentialsUser(null)}
          />
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordUser && (
          <ResetPasswordModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onReset={handleResetPassword}
          />
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}

// Add User Modal Component
interface AddUserModalProps {
  hospitals: Hospital[];
  onClose: () => void;
  onSave: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    hospitalId?: string;
    specialization?: string;
    licenseNumber?: string;
    password: string;
  }) => Promise<boolean>;
}

function AddUserModal({ hospitals, onClose, onSave }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'nurse' as UserRole,
    hospitalId: '',
    specialization: '',
    licenseNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        hospitalId: formData.hospitalId || undefined,
        specialization: formData.specialization || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        password: formData.password,
      });
      
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold">Add New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
                title="First name"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
                title="Last name"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
              title="Email address"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              title="Phone number"
              placeholder="+234 xxx xxx xxxx"
            />
          </div>

          <div>
            <label className="label">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="input"
              required
              title="Select user role"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Hospital</label>
            <select
              value={formData.hospitalId}
              onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
              className="input"
              title="Select hospital"
            >
              <option value="">Not assigned</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Specialization</label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="input"
              title="Specialization"
              placeholder="e.g., General Surgery, Orthopedics"
            />
          </div>

          <div>
            <label className="label">License Number</label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="input"
              title="License number"
              placeholder="Medical license number"
            />
          </div>

          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input pr-10"
                required
                minLength={8}
                title="Password"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                title="Toggle password visibility"
              >
                {showPassword ? <X className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="input"
              required
              title="Confirm password"
              placeholder="Re-enter password"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create User
                </span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// User Credentials Modal - Shows current login details
function UserCredentialsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const copyAllDetails = () => {
    const details = `Login Details for ${user.firstName} ${user.lastName}\n` +
      `Email: ${user.email}\n` +
      `Password: ${user.password || '(not available)'}\n` +
      `Role: ${user.role}\n` +
      `\nPlease change your password after first login.`;
    copyToClipboard(details, 'All details');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl"
      >
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Login Details</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* User identity */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email (Username)</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg font-mono text-sm text-gray-900">
                {user.email}
              </div>
              <button
                onClick={() => copyToClipboard(user.email, 'Email')}
                className={`p-2 rounded-lg transition-colors ${copied === 'Email' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'}`}
                title="Copy email"
              >
                {copied === 'Email' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg font-mono text-sm text-gray-900">
                {user.password ? (showPassword ? user.password : '••••••••••') : '(not available)'}
              </div>
              {user.password && (
                <>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(user.password!, 'Password')}
                    className={`p-2 rounded-lg transition-colors ${copied === 'Password' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'}`}
                    title="Copy password"
                  >
                    {copied === 'Password' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Must change password notice */}
          {user.mustChangePassword && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                This user will be required to change their password on next login.
              </p>
            </div>
          )}

          {/* Copy all button */}
          <button
            onClick={copyAllDetails}
            className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
              copied === 'All details'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {copied === 'All details' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied All Details!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy All Login Details
              </>
            )}
          </button>
        </div>

        <div className="border-t p-4">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Reset Password Modal
function ResetPasswordModal({
  user,
  onClose,
  onReset,
}: {
  user: User;
  onClose: () => void;
  onReset: (userId: string) => Promise<string | null>;
}) {
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    if (!window.confirm(`Are you sure you want to reset the password for ${user.firstName} ${user.lastName}? They will need to use the new temporary password to log in.`)) {
      return;
    }

    setIsResetting(true);
    try {
      const tempPwd = await onReset(user.id);
      if (tempPwd) {
        setNewPassword(tempPwd);
        toast.success('Password reset successfully!');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const copyCredentials = () => {
    const details = `Password Reset for ${user.firstName} ${user.lastName}\n` +
      `Email: ${user.email}\n` +
      `New Temporary Password: ${newPassword}\n` +
      `\nPlease change your password after logging in.`;
    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      toast.success('Credentials copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl"
      >
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Reset Password</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* User identity */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {!newPassword ? (
            <>
              {/* Pre-reset warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">This will:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li>Generate a new temporary password</li>
                    <li>Invalidate the user's current password immediately</li>
                    <li>Require them to change password on next login</li>
                  </ul>
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reset Password Now
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success - show new password */}
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  Password has been reset. Share the new temporary password with the user securely.
                </p>
              </div>

              {/* New password display */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Temporary Password</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 bg-gray-50 border-2 border-green-200 rounded-lg font-mono text-base text-gray-900 font-bold">
                    {showPassword ? newPassword : '••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword!);
                      toast.success('Password copied');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    title="Copy password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Copy all credentials */}
              <button
                onClick={copyCredentials}
                className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy All Login Details
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <div className="border-t p-4">
          <button onClick={onClose} className="btn btn-secondary w-full">
            {newPassword ? 'Done' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
