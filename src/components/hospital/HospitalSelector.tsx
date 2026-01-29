// ============================================================
// AstroHEALTH Hospital Selector Component
// Reusable hospital search and selection for all forms
// With Quick-Add functionality for new hospitals
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Building2, 
  Loader2, 
  AlertCircle,
  MapPin,
  Phone,
  CheckCircle,
  Plus,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';
import { fullSync } from '../../services/cloudSyncService';
import type { Hospital } from '../../types';

// ============================================================
// TYPES
// ============================================================

export interface HospitalSelectorProps {
  value?: string;
  onChange: (hospitalId: string | undefined, hospital?: Hospital) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  showAddNew?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface HospitalDisplayProps {
  hospital: Hospital | undefined;
  loading?: boolean;
  showDetails?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================
// QUICK ADD HOSPITAL FORM
// ============================================================

interface QuickAddHospitalFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  type: 'primary' | 'secondary' | 'tertiary';
}

function QuickAddHospitalForm({
  onSave,
  onCancel,
  initialName,
}: {
  onSave: (hospital: Hospital) => void;
  onCancel: () => void;
  initialName?: string;
}) {
  const [formData, setFormData] = useState<QuickAddHospitalFormData>({
    name: initialName || '',
    address: '',
    city: '',
    state: '',
    phone: '',
    type: 'secondary',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Hospital name is required');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Hospital address is required');
      return;
    }

    setSaving(true);
    try {
      const newHospital: Hospital = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim() || 'Not specified',
        state: formData.state.trim() || 'Not specified',
        phone: formData.phone.trim() || '',
        email: '',
        type: formData.type,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to local IndexedDB
      await db.hospitals.add(newHospital);

      // Trigger cloud sync
      fullSync().catch(err => console.warn('Sync failed:', err));

      toast.success(`Hospital "${newHospital.name}" added successfully`);
      onSave(newHospital);
    } catch (error) {
      console.error('Failed to add hospital:', error);
      toast.error('Failed to add hospital');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-gray-200"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-emerald-50/50">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} className="text-emerald-600" />
          <span className="font-medium text-gray-900">Quick Add Hospital</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hospital Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Hospital name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Full address"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="State"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'primary' | 'secondary' | 'tertiary' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              title="Select hospital type"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="tertiary">Tertiary</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} className="inline mr-1" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={14} className="inline mr-1 animate-spin" />
            ) : (
              <Save size={14} className="inline mr-1" />
            )}
            Save Hospital
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Full details can be added later from Hospital Settings
        </p>
      </form>
    </motion.div>
  );
}

// ============================================================
// HOSPITAL SELECTOR COMPONENT
// ============================================================

export function HospitalSelector({
  value,
  onChange,
  placeholder = 'Search hospital by name...',
  disabled = false,
  required = false,
  error,
  className = '',
  showAddNew = true,
  label,
  size = 'md',
}: HospitalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all hospitals from IndexedDB
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);

  // Get selected hospital
  const selectedHospital = useMemo(() => {
    if (!value || !hospitals) return undefined;
    return hospitals.find(h => h.id === value);
  }, [value, hospitals]);

  // Filter hospitals based on search query
  const searchResults = useMemo(() => {
    if (!hospitals) return [];
    if (searchQuery.length < 1) return hospitals.slice(0, 10);
    
    const query = searchQuery.toLowerCase();
    return hospitals.filter(h => 
      (h.name || '').toLowerCase().includes(query) ||
      (h.address || '').toLowerCase().includes(query) ||
      (h.city || '').toLowerCase().includes(query)
    ).slice(0, 10);
  }, [hospitals, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setShowQuickAdd(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((hospital: Hospital) => {
    onChange(hospital.id, hospital);
    setIsOpen(false);
    setSearchQuery('');
    setShowQuickAdd(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined, undefined);
    setSearchQuery('');
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

  const getHospitalTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-700';
      case 'secondary': return 'bg-amber-100 text-amber-700';
      case 'tertiary': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Hospital Display or Search Input */}
      {selectedHospital && !isOpen ? (
        <div 
          className={`
            flex items-center justify-between border rounded-lg px-3 py-2 bg-white
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-emerald-300'}
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${sizeClasses[size]}
          `}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {selectedHospital.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {selectedHospital.city}, {selectedHospital.state}
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
              title="Clear selection"
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
              ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'}
              ${sizeClasses[size]}
              focus:outline-none focus:ring-2
            `}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {searchResults.length > 0 ? (
              <ul className="py-1">
                {searchResults.map((hospital) => (
                  <li key={hospital.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(hospital)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {hospital.name}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${getHospitalTypeColor(hospital.type)}`}>
                            {hospital.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin size={10} />
                          <span className="truncate">{hospital.address}, {hospital.city}</span>
                        </div>
                        {hospital.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone size={10} />
                            {hospital.phone}
                          </div>
                        )}
                      </div>
                      <CheckCircle size={18} className={value === hospital.id ? 'text-emerald-500' : 'text-gray-200'} />
                    </button>
                  </li>
                ))}
                {/* Add New Hospital Option */}
                {showAddNew && !showQuickAdd && (
                  <li className="border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(true)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition-colors text-left text-emerald-700"
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <Plus size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Add New Hospital</p>
                        <p className="text-xs text-emerald-600">Quick register with name & address</p>
                      </div>
                    </button>
                  </li>
                )}
              </ul>
            ) : searchQuery.length >= 1 ? (
              <div className="p-4 text-center">
                <AlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">No hospitals found for "{searchQuery}"</p>
                {showAddNew && !showQuickAdd && (
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(true)}
                    className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Add "{searchQuery}" as New Hospital
                  </button>
                )}
              </div>
            ) : !showQuickAdd ? (
              <div className="p-4">
                <p className="text-center text-gray-500 text-sm mb-3">
                  {hospitals?.length ? `${hospitals.length} hospitals available` : 'No hospitals registered yet'}
                </p>
                {showAddNew && (
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(true)}
                    className="w-full flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-700"
                  >
                    <Plus size={20} />
                    <div>
                      <p className="font-medium text-sm">Add New Hospital</p>
                      <p className="text-xs text-emerald-600">Quick register with name & address</p>
                    </div>
                  </button>
                )}
              </div>
            ) : null}

            {/* Quick Add Form */}
            <AnimatePresence>
              {showQuickAdd && (
                <QuickAddHospitalForm
                  initialName={searchQuery}
                  onSave={(hospital) => {
                    setShowQuickAdd(false);
                    handleSelect(hospital);
                  }}
                  onCancel={() => setShowQuickAdd(false)}
                />
              )}
            </AnimatePresence>
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
// HOSPITAL DISPLAY COMPONENT
// Shows hospital info in read-only format
// ============================================================

export function HospitalDisplay({
  hospital,
  loading = false,
  showDetails = true,
  className = '',
  size = 'md',
}: HospitalDisplayProps) {
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

  if (!hospital) {
    return (
      <div className={`flex items-center gap-3 text-gray-400 ${className}`}>
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <Building2 size={20} />
        </div>
        <span className="text-sm">No hospital selected</span>
      </div>
    );
  }

  const sizeConfig = {
    sm: { avatar: 'w-8 h-8', icon: 14, text: 'text-sm', subtext: 'text-xs' },
    md: { avatar: 'w-10 h-10', icon: 18, text: 'text-base', subtext: 'text-xs' },
    lg: { avatar: 'w-12 h-12', icon: 22, text: 'text-lg', subtext: 'text-sm' },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${config.avatar} bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white`}>
        <Building2 size={config.icon} />
      </div>
      <div>
        <p className={`font-medium text-gray-900 ${config.text}`}>
          {hospital.name}
        </p>
        {showDetails && (
          <div className={`flex items-center gap-1 ${config.subtext} text-gray-500`}>
            <MapPin size={10} />
            <span>{hospital.address}, {hospital.city}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================

export default HospitalSelector;
