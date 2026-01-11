// Bulk Import Modal Component
// Reusable component for importing hospitals and users from CSV/Excel

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { syncRecord } from '../../services/cloudSyncService';
import type { Hospital, User, UserRole } from '../../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'hospitals' | 'users';
  onImportComplete?: (count: number) => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// Nigerian states for validation
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const validRoles: UserRole[] = [
  'super_admin', 'hospital_admin', 'surgeon', 'anaesthetist', 'nurse',
  'pharmacist', 'lab_scientist', 'dietician', 'physiotherapist',
  'accountant', 'home_care_giver', 'driver',
];

const hospitalTypes = ['primary', 'secondary', 'tertiary'];

// CSV Templates
const hospitalTemplate = `name,type,address,city,state,phone,email,website,bedCapacity,icuBeds,operatingTheatres,is24Hours,hasEmergency,hasLaboratory,hasPharmacy,hasRadiology,specialties
"Example General Hospital",secondary,"123 Hospital Road","Lagos","Lagos","08012345678","info@example.com","www.example.com",100,10,4,true,true,true,true,true,"General Surgery,Orthopaedics,Internal Medicine"
"Sample Primary Health Centre",primary,"45 Health Street","Abuja","FCT","08098765432","contact@sample.com","",20,2,1,false,true,true,true,false,"General Practice"`;

const userTemplate = `email,firstName,lastName,role,phone,specialization,licenseNumber,hospitalId
"surgeon@example.com","John","Doe","surgeon","08012345678","General Surgery","MDCN/12345","hospital-id-here"
"nurse@example.com","Jane","Smith","nurse","08098765432","Critical Care","NMC/67890","hospital-id-here"
"admin@example.com","Admin","User","hospital_admin","08011112222","","","hospital-id-here"`;

export default function BulkImportModal({ isOpen, onClose, type, onImportComplete }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const template = type === 'hospitals' ? hospitalTemplate : userTemplate;
    const filename = type === 'hospitals' ? 'hospital_import_template.csv' : 'user_import_template.csv';
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${type === 'hospitals' ? 'Hospital' : 'User'} template downloaded!`);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const data: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index].trim();
        });
        data.push(row);
      }
    }
    
    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    // Read and preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setPreviewData(data.slice(0, 5)); // Preview first 5 rows
    };
    reader.readAsText(selectedFile);
  };

  // Helper to normalize state name (case-insensitive matching)
  const normalizeState = (state: string): string | null => {
    const normalized = state.trim().toLowerCase();
    const match = nigerianStates.find(s => s.toLowerCase() === normalized);
    return match || null;
  };

  const validateHospital = (row: Record<string, string>, index: number): { valid: boolean; error?: string } => {
    if (!row.name?.trim()) return { valid: false, error: `Row ${index + 1}: Hospital name is required` };
    if (!row.address?.trim()) return { valid: false, error: `Row ${index + 1}: Address is required` };
    if (!row.city?.trim()) return { valid: false, error: `Row ${index + 1}: City is required` };
    if (!row.state?.trim()) return { valid: false, error: `Row ${index + 1}: State is required` };
    const normalizedState = normalizeState(row.state);
    if (!normalizedState) return { valid: false, error: `Row ${index + 1}: Invalid state "${row.state}". Valid states are: ${nigerianStates.join(', ')}` };
    // Update row.state to proper case for storage
    row.state = normalizedState;
    if (!row.phone?.trim()) return { valid: false, error: `Row ${index + 1}: Phone is required` };
    if (row.type) {
      const normalizedType = row.type.trim().toLowerCase();
      if (!hospitalTypes.includes(normalizedType)) return { valid: false, error: `Row ${index + 1}: Invalid hospital type "${row.type}". Valid types are: ${hospitalTypes.join(', ')}` };
      row.type = normalizedType;
    }
    return { valid: true };
  };

  const validateUser = (row: Record<string, string>, index: number): { valid: boolean; error?: string } => {
    if (!row.email?.trim()) return { valid: false, error: `Row ${index + 1}: Email is required` };
    if (!row.email.includes('@')) return { valid: false, error: `Row ${index + 1}: Invalid email format` };
    if (!row.firstName?.trim()) return { valid: false, error: `Row ${index + 1}: First name is required` };
    if (!row.lastName?.trim()) return { valid: false, error: `Row ${index + 1}: Last name is required` };
    if (!row.role?.trim()) return { valid: false, error: `Row ${index + 1}: Role is required` };
    if (!validRoles.includes(row.role as UserRole)) return { valid: false, error: `Row ${index + 1}: Invalid role "${row.role}"` };
    return { valid: true };
  };

  const parseBoolean = (value: string): boolean => {
    return ['true', '1', 'yes', 'y'].includes(value?.toLowerCase() || '');
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        toast.error('No valid data found in the file');
        setIsProcessing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      if (type === 'hospitals') {
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const validation = validateHospital(row, i);
          
          if (!validation.valid) {
            errors.push(validation.error!);
            failCount++;
            continue;
          }

          try {
            const hospital: Hospital = {
              id: uuidv4(),
              name: row.name,
              type: (row.type as Hospital['type']) || 'secondary',
              address: row.address,
              city: row.city,
              state: row.state,
              phone: row.phone,
              email: row.email || `info@${row.name.toLowerCase().replace(/\s+/g, '')}.com`,
              website: row.website || undefined,
              bedCapacity: parseInt(row.bedCapacity) || 0,
              icuBeds: parseInt(row.icuBeds) || 0,
              operatingTheatres: parseInt(row.operatingTheatres) || 0,
              is24Hours: parseBoolean(row.is24Hours),
              hasEmergency: parseBoolean(row.hasEmergency),
              hasLaboratory: parseBoolean(row.hasLaboratory),
              hasPharmacy: parseBoolean(row.hasPharmacy),
              hasRadiology: parseBoolean(row.hasRadiology),
              specialties: row.specialties ? row.specialties.split(',').map(s => s.trim()) : [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await db.hospitals.add(hospital);
            syncRecord('hospitals', hospital as unknown as Record<string, unknown>);
            successCount++;
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            failCount++;
          }
        }
      } else {
        // Users import
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const validation = validateUser(row, i);
          
          if (!validation.valid) {
            errors.push(validation.error!);
            failCount++;
            continue;
          }

          try {
            // Check for duplicate email
            const existingUser = await db.users.where('email').equals(row.email).first();
            if (existingUser) {
              errors.push(`Row ${i + 1}: Email "${row.email}" already exists`);
              failCount++;
              continue;
            }

            const user: User = {
              id: uuidv4(),
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
              role: row.role as UserRole,
              phone: row.phone || undefined,
              specialization: row.specialization || undefined,
              licenseNumber: row.licenseNumber || undefined,
              hospitalId: row.hospitalId || undefined,
              isActive: true,
              hasAcceptedAgreement: false,
              mustChangePassword: true, // Force password change on first login
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await db.users.add(user);
            syncRecord('users', user as unknown as Record<string, unknown>);
            successCount++;
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            failCount++;
          }
        }
      }

      setResult({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // Show first 10 errors
      });

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} ${type}!`);
        onImportComplete?.(successCount);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process the file');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {type === 'hospitals' ? (
                  <Building2 className="w-6 h-6 text-white" />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Bulk Import {type === 'hospitals' ? 'Hospitals' : 'Users'}
                  </h2>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    Upload a CSV file to import multiple records
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Step 1: Download Template */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">Step 1: Download Template</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Download the CSV template and fill it with your {type} data.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-800 mb-2 text-sm">Required Fields:</h4>
              {type === 'hospitals' ? (
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>name</strong> - Hospital name</li>
                  <li><strong>type</strong> - primary, secondary, or tertiary</li>
                  <li><strong>address</strong> - Full address</li>
                  <li><strong>city</strong> - City name</li>
                  <li><strong>state</strong> - Nigerian state (e.g., Lagos, FCT)</li>
                  <li><strong>phone</strong> - Contact phone number</li>
                </ul>
              ) : (
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>email</strong> - User's email address</li>
                  <li><strong>firstName</strong> - First name</li>
                  <li><strong>lastName</strong> - Last name</li>
                  <li><strong>role</strong> - surgeon, nurse, pharmacist, etc.</li>
                  <li><strong>phone</strong> - Contact number (optional)</li>
                  <li><strong>hospitalId</strong> - Associated hospital ID (optional)</li>
                </ul>
              )}
            </div>

            {/* Step 2: Upload File */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">CSV files only</p>
              </label>
            </div>

            {/* Preview */}
            {previewData && previewData.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Preview (First {previewData.length} rows)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-200">
                        {Object.keys(previewData[0]).slice(0, 5).map((header) => (
                          <th key={header} className="px-2 py-1 text-left font-medium text-gray-700">
                            {header}
                          </th>
                        ))}
                        {Object.keys(previewData[0]).length > 5 && (
                          <th className="px-2 py-1 text-left font-medium text-gray-500">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t border-gray-200">
                          {Object.values(row).slice(0, 5).map((value, j) => (
                            <td key={j} className="px-2 py-1 text-gray-600 truncate max-w-[100px]">
                              {value || '-'}
                            </td>
                          ))}
                          {Object.keys(row).length > 5 && (
                            <td className="px-2 py-1 text-gray-400">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-xl p-4 ${result.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-start gap-3">
                  {result.failed > 0 ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Import Complete</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="text-green-600 font-medium">{result.success} successful</span>
                      {result.failed > 0 && (
                        <>, <span className="text-red-600 font-medium">{result.failed} failed</span></>
                      )}
                    </p>
                    {result.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="text-xs font-medium text-red-600 mb-1">Errors:</p>
                        <ul className="text-xs text-red-600 space-y-0.5">
                          {result.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || isProcessing}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {type === 'hospitals' ? 'Hospitals' : 'Users'}
                  </>
                )}
              </button>
            )}
            {result && result.success > 0 && (
              <button
                onClick={resetForm}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Import More
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
