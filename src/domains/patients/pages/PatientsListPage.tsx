import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Archive,
  ArchiveRestore,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { archivePatient, restorePatient, isArchivedPatient, listablePatients } from '../services/patientArchive';
import { matchesPatientSearch } from '../patientSearch';
import { consultationChooserHref } from '../patientHubLinks';
import { formatDate } from '../../../utils/formatDate';
import { ageInYears } from '../../../utils/safeDate';
import type { Patient } from '../../../types';

const ITEMS_PER_PAGE = 10;

export default function PatientsListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Today's "Find patient" opens the list with the search box focused.
  const focusSearch = searchParams.get('focus') === 'search';
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const patients = useLiveQuery(() => db.patients.orderBy('createdAt').reverse().toArray(), []);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    // A registration merged into another is kept only for the audit trail;
    // archived patients are hidden unless asked for.
    return listablePatients(patients, showArchived).filter((patient) => {
      // Every word must match a name, the hospital number or the phone.
      const matchesSearch = matchesPatientSearch(patient, searchQuery);

      const matchesGender = selectedGender === 'all' || patient.gender === selectedGender;

      return matchesSearch && matchesGender;
    });
  }, [patients, searchQuery, selectedGender, showArchived]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

  // Patients are archived, never deleted: a device-only delete came straight
  // back on the next cloud pull and orphaned the patient's clinical records.
  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this patient? They will be hidden from the patient list on every device. Their records are kept and they can be restored from "Show archived".')) return;
    try {
      await archivePatient(id);
      toast.success('Patient archived');
    } catch (err) {
      console.error('Archive failed:', err);
      toast.error('Could not archive the patient');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePatient(id);
      toast.success('Patient restored');
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error('Could not restore the patient');
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
              type="search"
              aria-label="Search patients"
              autoFocus={focusSearch}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Name, hospital number or phone"
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
              title="Filter by gender"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setCurrentPage(1);
              }}
            />
            Show archived
          </label>
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
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a,button,input')) return;
                      navigate(`/patients/${patient.id}`);
                    }}
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                          {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            <Link to={`/patients/${patient.id}`} className="hover:text-sky-700 focus:outline-none focus-visible:underline">
                              {displayName(patient)}
                            </Link>
                            {isArchivedPatient(patient) && (
                              <span className="ml-2 badge badge-warning">Archived</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{ageText(patient)}</p>
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
                      {formatDate(patient.createdAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="btn-icon text-gray-400 hover:text-sky-600 hover:bg-sky-50"
                          title="Open patient"
                          aria-label={`Open ${displayName(patient)}`}
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          to={consultationChooserHref(patient.id)}
                          className="btn-icon text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Start consultation"
                          aria-label={`Start consultation for ${displayName(patient)}`}
                        >
                          <Stethoscope size={18} />
                        </Link>
                        <Link
                          to={`/patients/${patient.id}?edit=true`}
                          className="btn-icon text-gray-400 hover:text-amber-600 hover:bg-amber-50 hidden sm:flex"
                          title="Edit"
                          aria-label={`Edit ${displayName(patient)}`}
                        >
                          <Edit size={18} />
                        </Link>
                        {isArchivedPatient(patient) ? (
                          <button
                            onClick={() => handleRestore(patient.id)}
                            className="btn-icon text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 hidden md:flex"
                            title="Restore"
                            aria-label={`Restore ${displayName(patient)}`}
                          >
                            <ArchiveRestore size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(patient.id)}
                            className="btn-icon text-gray-400 hover:text-red-600 hover:bg-red-50 hidden md:flex"
                            title="Archive"
                            aria-label={`Archive ${displayName(patient)}`}
                          >
                            <Archive size={18} />
                          </button>
                        )}
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
                title="Previous page"
                aria-label="Previous page"
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
                title="Next page"
                aria-label="Next page"
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
              className="card card-compact relative hover:border-sky-300 focus-within:ring-2 focus-within:ring-sky-300"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0" aria-hidden="true">
                    {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {/* The whole card is this link (its ::after covers the card);
                          the icon buttons sit above it and keep their own action. */}
                      <Link
                        to={`/patients/${patient.id}`}
                        className="after:absolute after:inset-0 after:content-[''] after:rounded-xl focus:outline-none"
                      >
                        {displayName(patient)}
                      </Link>
                      {isArchivedPatient(patient) && (
                        <span className="ml-2 badge badge-warning">Archived</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-mono">{patient.hospitalNumber}</span>
                      {' · '}{[ageText(patient), patient.gender].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-sm text-gray-500">{patient.phone}</p>
                  </div>
                  <div className="relative z-10 flex items-center gap-1 -mr-2">
                    <Link
                      to={consultationChooserHref(patient.id)}
                      className="btn-icon text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                      aria-label={`Start consultation for ${displayName(patient)}`}
                      title="Start consultation"
                    >
                      <Stethoscope size={20} />
                    </Link>
                    <Link
                      to={`/patients/${patient.id}?edit=true`}
                      className="btn-icon text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                      aria-label={`Edit ${displayName(patient)}`}
                      title="Edit"
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
              aria-label="Previous page"
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
              aria-label="Next page"
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

function displayName(p: Pick<Patient, 'firstName' | 'lastName'> & { middleName?: string }): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unnamed patient';
}

function ageText(p: Pick<Patient, 'dateOfBirth'> & { dobEstimated?: boolean }): string {
  const age = ageInYears(p.dateOfBirth);
  if (age === null) return 'Age not recorded';
  return p.dobEstimated ? `~${age} years` : `${age} years`;
}
