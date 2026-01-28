import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db } from '../../../database';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

export default function PatientsListPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGender, setSelectedGender] = useState<string>('all');

  const patients = useLiveQuery(() => db.patients.orderBy('createdAt').reverse().toArray(), []);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    return patients.filter((patient) => {
      const matchesSearch = searchQuery === '' ||
        (patient.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.hospitalNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.phone || '').includes(searchQuery);

      const matchesGender = selectedGender === 'all' || patient.gender === selectedGender;

      return matchesSearch && matchesGender;
    });
  }, [patients, searchQuery, selectedGender]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      await db.patients.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">
            Manage and view all registered patients
          </p>
        </div>
        <Link to="/patients/new" className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Patient
        </Link>
      </div>

      {/* Filters */}
      <div className="card card-compact p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, hospital number, or phone..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setCurrentPage(1);
              }}
              className="input w-auto"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Table - Desktop */}
      <div className="card card-compact overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hospital No.
                </th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gender
                </th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient, index) => (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                          {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {patient.dateOfBirth ? calculateAge(new Date(patient.dateOfBirth)) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">
                        {patient.hospitalNumber}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{patient.phone}</p>
                      {patient.email && (
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{patient.email}</p>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        patient.gender === 'male' ? 'badge-info' : 'badge-primary'
                      }`}>
                        {patient.gender}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="btn-icon text-gray-400 hover:text-sky-600 hover:bg-sky-50"
                          title="View"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          to={`/patients/${patient.id}/encounter`}
                          className="btn-icon text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Start Encounter"
                        >
                          <Stethoscope size={18} />
                        </Link>
                        <Link
                          to={`/patients/${patient.id}?edit=true`}
                          className="btn-icon text-gray-400 hover:text-amber-600 hover:bg-amber-50 hidden sm:flex"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="btn-icon text-gray-400 hover:text-red-600 hover:bg-red-50 hidden md:flex"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="empty-state">
                      <Search className="empty-state-icon" />
                      <p className="empty-state-title">No patients found</p>
                      <p className="empty-state-description">
                        {searchQuery
                          ? 'Try adjusting your search criteria'
                          : 'Get started by registering your first patient'}
                      </p>
                      {!searchQuery && (
                        <Link to="/patients/new" className="btn btn-primary">
                          <Plus size={18} />
                          Register Patient
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 text-center sm:text-left">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} of{' '}
              {filteredPatients.length} patients
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary py-2 px-3"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary py-2 px-3"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patients List - Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {paginatedPatients.length > 0 ? (
          paginatedPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="card card-compact"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                    {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-sm text-gray-500 font-mono">{patient.hospitalNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge ${patient.gender === 'male' ? 'badge-info' : 'badge-primary'}`}>
                        {patient.gender}
                      </span>
                      <span className="text-sm text-gray-500">
                        {patient.dateOfBirth ? calculateAge(new Date(patient.dateOfBirth)) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <p>{patient.phone}</p>
                    <p className="text-xs">{format(new Date(patient.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="btn-icon text-gray-400 hover:text-sky-600 hover:bg-sky-50"
                    >
                      <Eye size={20} />
                    </Link>
                    <Link
                      to={`/patients/${patient.id}/encounter`}
                      className="btn-icon text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      <Stethoscope size={20} />
                    </Link>
                    <Link
                      to={`/patients/${patient.id}?edit=true`}
                      className="btn-icon text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    >
                      <Edit size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="card card-compact">
            <div className="empty-state">
              <Search className="empty-state-icon" />
              <p className="empty-state-title">No patients found</p>
              <p className="empty-state-description">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Get started by registering your first patient'}
              </p>
              {!searchQuery && (
                <Link to="/patients/new" className="btn btn-primary">
                  <Plus size={18} />
                  Register Patient
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary py-2 px-4"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary py-2 px-4"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateAge(birthDate: Date): string {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} years`;
}
