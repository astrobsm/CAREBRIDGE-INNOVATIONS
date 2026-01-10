import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  X,
  Check,
  AlertCircle,
  Stethoscope,
  Heart,
} from 'lucide-react';
import { db } from '../../database';
import { format } from 'date-fns';
import { assignStaffToPatient, releaseStaffAssignment } from '../../services/activityBillingService';
import type { User, StaffPatientAssignment } from '../../types';

interface StaffAssignmentModalProps {
  admissionId: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffAssignmentModal({
  admissionId,
  patientId,
  patientName,
  hospitalId,
  isOpen,
  onClose,
}: StaffAssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'nurse' | 'all'>('all');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get current assignments for this admission
  const currentAssignments = useLiveQuery(async () => {
    return db.staffPatientAssignments
      .where('admissionId')
      .equals(admissionId)
      .filter(a => a.isActive)
      .toArray();
  }, [admissionId]);

  // Get all available staff (doctors and nurses from same hospital)
  const availableStaff = useLiveQuery(async () => {
    const staff = await db.users
      .filter(u => 
        u.hospitalId === hospitalId &&
        ['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist', 'nurse', 'home_care_giver'].includes(u.role) &&
        u.isActive !== false
      )
      .toArray();
    
    return staff.filter(s => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        if (!fullName.includes(query)) return false;
      }
      
      // Filter by role
      if (selectedRole === 'doctor') {
        return ['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist'].includes(s.role);
      } else if (selectedRole === 'nurse') {
        return ['nurse', 'home_care_giver'].includes(s.role);
      }
      
      return true;
    });
  }, [hospitalId, searchQuery, selectedRole]);

  // Get user details for current assignments
  const assignmentUsers = useLiveQuery(async () => {
    if (!currentAssignments || currentAssignments.length === 0) return [];
    const userIds = currentAssignments.map(a => a.staffId);
    return db.users.where('id').anyOf(userIds).toArray();
  }, [currentAssignments]);

  const handleAssign = async (staffId: string, staffName: string, staffRole: string) => {
    setIsAssigning(true);
    setError(null);
    setSuccess(null);
    
    try {
      const assignmentRole = ['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist'].includes(staffRole)
        ? 'primary_doctor' as const
        : 'primary_nurse' as const;
      
      await assignStaffToPatient({
        patientId,
        admissionId,
        staffId,
        staffName,
        role: assignmentRole,
        hospitalId,
        assignedBy: 'current_user', // This should come from auth context
        notes: `Assigned to patient ${patientName}`,
      });
      
      setSuccess(`${staffName} has been assigned to ${patientName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRelease = async (assignmentId: string, staffName: string) => {
    setIsAssigning(true);
    setError(null);
    
    try {
      await releaseStaffAssignment(assignmentId);
      setSuccess(`${staffName} has been released from this patient`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release staff');
    } finally {
      setIsAssigning(false);
    }
  };

  const isStaffAssigned = (staffId: string) => {
    return currentAssignments?.some(a => a.staffId === staffId) ?? false;
  };

  const getRoleColor = (role: string) => {
    if (['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist'].includes(role)) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-pink-100 text-pink-700';
  };

  const getRoleIcon = (role: string) => {
    if (['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist'].includes(role)) {
      return <Stethoscope size={14} />;
    }
    return <Heart size={14} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Staff</h2>
            <p className="text-sm text-gray-500">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <Check size={16} />
            {success}
          </div>
        )}

        {/* Current Assignments */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Assignments</h3>
          {currentAssignments && currentAssignments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentAssignments.map((assignment) => {
                const user = assignmentUsers?.find(u => u.id === assignment.staffId);
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {assignment.staffName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {assignment.role.replace('_', ' ')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRelease(assignment.id!, assignment.staffName)}
                      disabled={isAssigning}
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No staff currently assigned</p>
          )}
        </div>

        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(['all', 'doctor', 'nurse'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedRole === role
                      ? 'bg-white text-sky-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {role === 'all' ? 'All' : role === 'doctor' ? 'Doctors' : 'Nurses'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Available Staff List */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Staff</h3>
          {availableStaff && availableStaff.length > 0 ? (
            <div className="space-y-2">
              {availableStaff.map((staff) => {
                const assigned = isStaffAssigned(staff.id!);
                return (
                  <div
                    key={staff.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      assigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {staff.firstName[0]}{staff.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {staff.firstName} {staff.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${getRoleColor(staff.role)}`}>
                          {getRoleIcon(staff.role)}
                          {staff.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {assigned ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <Check size={16} />
                        Assigned
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssign(staff.id!, `${staff.firstName} ${staff.lastName}`, staff.role)}
                        disabled={isAssigning}
                        className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
                      >
                        <UserPlus size={14} />
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 text-gray-400" />
              <p>No staff found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
