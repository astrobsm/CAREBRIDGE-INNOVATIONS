// ============================================================
// CareBridge Patient Selector Component
// Reusable patient search and selection for all forms
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  User, 
  ChevronDown, 
  Loader2, 
  AlertCircle,
  Phone,
  Calendar,
  Building2,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { usePatientSelector, usePatientById } from '../../services/patientHooks';
import type { Patient } from '../../types';

// ============================================================
// TYPES
// ============================================================

export interface PatientSelectorProps {
  value?: string;
  onChange: (patientId: string | undefined, patient?: Patient) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hospitalId?: string;
  className?: string;
  showAddNew?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
}

export interface PatientDisplayProps {
  patient: Patient | undefined;
  loading?: boolean;
  showDetails?: boolean;
  showVitals?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================
// PATIENT SELECTOR COMPONENT
// ============================================================

export function PatientSelector({
  value,
  onChange,
  placeholder = 'Search patient by name or hospital number...',
  disabled = false,
  required = false,
  error,
  hospitalId,
  className = '',
  showAddNew = true,
  label,
  size = 'md',
  variant = 'default',
}: PatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Get selected patient details
  const { patient: selectedPatient, loading: patientLoading } = usePatientById(value);

  // Handle search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await patientService.quickSearch(searchQuery, 10);
        const filtered = hospitalId 
          ? results.filter(p => p.registeredHospitalId === hospitalId)
          : results;
        setSearchResults(filtered);
      } catch (err) {
        console.error('Patient search error:', err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, hospitalId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((patient: Patient) => {
    onChange(patient.id, patient);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined, undefined);
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const sizeClasses = {
    sm: 'h-9 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg',
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Patient Display or Search Input */}
      {selectedPatient && !isOpen ? (
        <div 
          className={`
            flex items-center justify-between border rounded-lg px-3 py-2 bg-white
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-sky-300'}
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${sizeClasses[size]}
          `}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {selectedPatient.hospitalNumber} • {patientService.calculateAge(selectedPatient.dateOfBirth)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full pl-10 pr-10 border rounded-lg
              ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
              ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'}
              ${sizeClasses[size]}
              focus:outline-none focus:ring-2
            `}
          />
          {loading && (
            <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
          {!loading && searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (searchQuery.length >= 2 || (!value && searchQuery.length === 0)) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center p-4 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="py-1">
                {searchResults.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(patient)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-sky-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {patient.firstName?.[0]}{patient.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="font-mono">{patient.hospitalNumber}</span>
                          <span>•</span>
                          <span>{patientService.calculateAge(patient.dateOfBirth)}</span>
                          <span>•</span>
                          <span className="capitalize">{patient.gender}</span>
                        </div>
                        {patient.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone size={10} />
                            {patient.phone}
                          </div>
                        )}
                      </div>
                      <CheckCircle size={18} className={value === patient.id ? 'text-sky-500' : 'text-gray-200'} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery.length >= 2 ? (
              <div className="p-4 text-center">
                <AlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">No patients found for "{searchQuery}"</p>
                {showAddNew && (
                  <Link
                    to="/patients/new"
                    className="inline-flex items-center gap-1 mt-2 text-sky-600 hover:text-sky-700 text-sm font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    <UserPlus size={16} />
                    Register New Patient
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PATIENT DISPLAY COMPONENT
// Shows patient info in read-only format
// ============================================================

export function PatientDisplay({
  patient,
  loading = false,
  showDetails = true,
  className = '',
  size = 'md',
}: PatientDisplayProps) {
  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={`flex items-center gap-3 text-gray-400 ${className}`}>
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <User size={20} />
        </div>
        <span className="text-sm">No patient selected</span>
      </div>
    );
  }

  const sizeConfig = {
    sm: { avatar: 'w-8 h-8 text-xs', text: 'text-sm', subtext: 'text-xs' },
    md: { avatar: 'w-10 h-10 text-sm', text: 'text-base', subtext: 'text-xs' },
    lg: { avatar: 'w-12 h-12 text-base', text: 'text-lg', subtext: 'text-sm' },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${config.avatar} bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium`}>
        {patient.firstName?.[0]}{patient.lastName?.[0]}
      </div>
      <div>
        <p className={`font-medium text-gray-900 ${config.text}`}>
          {patient.firstName} {patient.lastName}
        </p>
        {showDetails && (
          <div className={`flex items-center gap-2 ${config.subtext} text-gray-500`}>
            <span className="font-mono">{patient.hospitalNumber}</span>
            <span>•</span>
            <span>{patientService.calculateAge(patient.dateOfBirth)}</span>
            <span>•</span>
            <span className="capitalize">{patient.gender}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PATIENT CARD COMPONENT
// Full patient info card for details display
// ============================================================

export interface PatientCardProps {
  patientId: string | undefined;
  showActions?: boolean;
  showVitals?: boolean;
  showAdmissionStatus?: boolean;
  className?: string;
  onViewDetails?: () => void;
}

export function PatientCard({
  patientId,
  showActions = true,
  showVitals = false,
  showAdmissionStatus = true,
  className = '',
  onViewDetails,
}: PatientCardProps) {
  const { patient, loading } = usePatientById(patientId);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 animate-pulse ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 text-center ${className}`}>
        <User size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No patient selected</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
          {patient.firstName?.[0]}{patient.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h3>
          <p className="text-sm text-gray-600 font-mono">{patient.hospitalNumber}</p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {patientService.calculateAge(patient.dateOfBirth)}
            </span>
            <span className="capitalize">{patient.gender}</span>
            {patient.bloodGroup && (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                {patient.bloodGroup}
              </span>
            )}
            {patient.phone && (
              <span className="flex items-center gap-1">
                <Phone size={14} />
                {patient.phone}
              </span>
            )}
          </div>

          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-amber-600 text-sm">
              <AlertCircle size={14} />
              <span>Allergies: {patient.allergies.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <Link
            to={`/patients/${patient.id}`}
            className="flex-1 text-center py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          >
            View Full Record
          </Link>
          <Link
            to={`/patients/${patient.id}/encounter`}
            className="flex-1 text-center py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            Start Encounter
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================

export default PatientSelector;
