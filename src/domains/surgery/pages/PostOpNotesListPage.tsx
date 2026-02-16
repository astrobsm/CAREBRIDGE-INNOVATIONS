import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  Search,
  ChevronRight,
  Calendar,
  User,
  Scissors,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database/db';
import { EntryTrackingBadge } from '../../../components/common';
import type { EntryTrackingInfo } from '../../../components/common';
import type { Surgery, Patient, PostOperativeNote, User as UserType } from '../../../types';

interface SurgeryWithPatient extends Surgery {
  patient?: Patient;
  postOpNote?: PostOperativeNote;
}

export default function PostOpNotesListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surgeries, setSurgeries] = useState<SurgeryWithPatient[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-notes' | 'pending'>('all');

  useEffect(() => {
    loadSurgeries();
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  // Create a map for quick user lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, UserType>();
    users.forEach(u => map.set(u.id!, u));
    return map;
  }, [users]);

  // Helper to get entry tracking info for a post-op note
  const getPostOpNoteTracking = (note: PostOperativeNote): EntryTrackingInfo | undefined => {
    // Use surgeon info from the note
    const surgeonUser = usersMap.get(note.surgeonId);
    if (surgeonUser) {
      return {
        userId: surgeonUser.id!,
        userName: `${surgeonUser.firstName} ${surgeonUser.lastName}`,
        userRole: surgeonUser.role,
        timestamp: note.createdAt,
      };
    }
    // Fallback to note.surgeon name if user not found
    if (note.surgeon) {
      return {
        userId: note.surgeonId,
        userName: note.surgeon,
        userRole: 'surgeon',
        timestamp: note.createdAt,
      };
    }
    return undefined;
  };

  async function loadSurgeries() {
    try {
      // Get all completed surgeries
      const allSurgeries = await db.surgeries
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('scheduledDate');

      // Get all post-op notes
      const allNotes = await db.postOperativeNotes.toArray();
      const notesMap = new Map(allNotes.map(n => [n.surgeryId, n]));

      // Get patient info for each surgery
      const surgeriesWithData = await Promise.all(
        allSurgeries.map(async (surgery) => {
          const patient = await db.patients.get(surgery.patientId);
          const postOpNote = notesMap.get(surgery.id);
          return { ...surgery, patient, postOpNote };
        })
      );

      setSurgeries(surgeriesWithData);
    } catch (error) {
      console.error('Error loading surgeries:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSurgeries = surgeries.filter(surgery => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      surgery.procedureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surgery.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surgery.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surgery.patient?.hospitalNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by note status
    if (filter === 'with-notes') {
      return matchesSearch && surgery.postOpNote;
    } else if (filter === 'pending') {
      return matchesSearch && !surgery.postOpNote;
    }
    return matchesSearch;
  });

  const getStatusBadge = (surgery: SurgeryWithPatient) => {
    if (surgery.postOpNote) {
      if (surgery.postOpNote.educationDelivered) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
            <CheckCircle size={12} />
            Complete
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
          <FileText size={12} />
          Note Created
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
        <Clock size={12} />
        Pending Note
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post-Operative Notes</h1>
          <p className="text-gray-600 mt-1">
            Manage post-operative documentation, patient education, and specimen tracking
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Scissors className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{surgeries.length}</p>
              <p className="text-sm text-gray-500">Total Surgeries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {surgeries.filter(s => s.postOpNote).length}
              </p>
              <p className="text-sm text-gray-500">With Notes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {surgeries.filter(s => !s.postOpNote).length}
              </p>
              <p className="text-sm text-gray-500">Pending Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, hospital number, or procedure..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('with-notes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'with-notes'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              With Notes
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Surgery List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredSurgeries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No surgeries found</h3>
            <p className="text-gray-500">
              {filter === 'pending' 
                ? 'All completed surgeries have post-operative notes'
                : searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'No completed surgeries available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSurgeries.map((surgery) => (
              <div
                key={surgery.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Scissors className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{surgery.procedureName}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {surgery.patient 
                            ? `${surgery.patient.firstName} ${surgery.patient.lastName}`
                            : 'Unknown Patient'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(surgery.scheduledDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(surgery)}
                    
                    {/* Action Buttons */}
                    {!surgery.postOpNote && (user?.role === 'surgeon' || user?.role === 'super_admin' || user?.role === 'hospital_admin' || user?.role === 'consultant' || user?.role === 'plastic_surgeon') && (
                      <button
                        onClick={() => navigate(`/surgery/post-op-note/create/${surgery.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        <Edit size={14} />
                        Write Note
                      </button>
                    )}
                    
                    {surgery.postOpNote && (
                      <button
                        onClick={() => navigate(`/surgery/post-op-note/${surgery.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        {(user?.role === 'surgeon' || user?.role === 'super_admin' || user?.role === 'hospital_admin' || user?.role === 'consultant' || user?.role === 'plastic_surgeon') ? (
                          <>
                            <Edit size={14} />
                            Edit Note
                          </>
                        ) : (
                          <>
                            <Eye size={14} />
                            View Note
                          </>
                        )}
                      </button>
                    )}
                    
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {surgery.postOpNote && (
                  <div className="mt-3 ml-12">
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span>
                        {surgery.postOpNote.specimens?.length || 0} specimen(s)
                      </span>
                      <span>•</span>
                      <span>
                        {surgery.postOpNote.patientEducation ? 'Education provided' : 'No education'}
                      </span>
                      {surgery.postOpNote.educationDeliveredAt && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">
                            Education delivered {format(new Date(surgery.postOpNote.educationDeliveredAt), 'dd MMM')}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Entry Tracking Badge */}
                    {getPostOpNoteTracking(surgery.postOpNote) && (
                      <EntryTrackingBadge 
                        tracking={getPostOpNoteTracking(surgery.postOpNote)!} 
                        mode="compact"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
