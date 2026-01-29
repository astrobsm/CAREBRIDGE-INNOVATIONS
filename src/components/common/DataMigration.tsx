/**
 * Data Migration Component
 * 
 * Allows users to migrate data from local IndexedDB to DigitalOcean MySQL
 */

import React, { useState, useEffect } from 'react';
import { Upload, Database, CheckCircle, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import { migrateToDigitalOcean, getLocalDataSummary, MigrationProgress, MigrationError } from '../../services/migrationService';
import toast from 'react-hot-toast';

// Error Details Panel Component - Shows all errors with full debugging info
interface ErrorDetailsPanelProps {
  errors: MigrationError[];
  showAll: boolean;
  setShowAll: (show: boolean) => void;
  expandedErrors: Set<number>;
  setExpandedErrors: (set: Set<number>) => void;
}

const ErrorDetailsPanel: React.FC<ErrorDetailsPanelProps> = ({
  errors,
  showAll,
  setShowAll,
  expandedErrors,
  setExpandedErrors,
}) => {
  // Group errors by table for summary
  const errorsByTable = errors.reduce((acc, err) => {
    acc[err.table] = (acc[err.table] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleError = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const copyAllErrors = () => {
    const errorText = errors.map((err, i) => 
      `Error ${i + 1}:\n` +
      `  Table: ${err.table}\n` +
      `  Record ID: ${err.recordId}\n` +
      `  Error: ${err.error}\n` +
      `  Details: ${err.details || 'N/A'}\n` +
      `  Time: ${err.timestamp.toISOString()}\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(errorText);
    toast.success('All errors copied to clipboard!');
  };

  const downloadErrorLog = () => {
    const errorLog = {
      generatedAt: new Date().toISOString(),
      totalErrors: errors.length,
      errorsByTable,
      errors: errors.map((err, i) => ({
        index: i + 1,
        table: err.table,
        recordId: err.recordId,
        error: err.error,
        details: err.details,
        timestamp: err.timestamp.toISOString(),
      })),
    };
    
    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Error log downloaded!');
  };

  const displayErrors = showAll ? errors : errors.slice(0, 10);

  return (
    <div className="mt-3 border border-red-200 rounded-lg bg-red-50">
      {/* Header with summary */}
      <div className="p-3 border-b border-red-200 bg-red-100 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Migration Errors ({errors.length} total)
            </p>
            <div className="text-xs text-red-600 mt-1 flex flex-wrap gap-2">
              {Object.entries(errorsByTable).map(([table, count]) => (
                <span key={table} className="bg-red-200 px-2 py-0.5 rounded">
                  {table}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAllErrors}
              className="p-1.5 text-red-600 hover:bg-red-200 rounded transition-colors"
              title="Copy all errors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadErrorLog}
              className="p-1.5 text-red-600 hover:bg-red-200 rounded transition-colors"
              title="Download error log"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error list */}
      <div className="max-h-96 overflow-y-auto">
        {displayErrors.map((err, i) => (
          <div key={i} className="border-b border-red-100 last:border-b-0">
            <button
              onClick={() => toggleError(i)}
              className="w-full p-2 text-left hover:bg-red-100 transition-colors flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-red-500">#{i + 1}</span>
                <span className="ml-2 font-medium text-red-700">{err.table}</span>
                <span className="ml-2 text-xs text-red-500">ID: {err.recordId}</span>
                <p className="text-sm text-red-600 truncate mt-0.5">{err.error}</p>
              </div>
              {expandedErrors.has(i) ? (
                <ChevronUp className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </button>
            
            {expandedErrors.has(i) && (
              <div className="px-3 pb-3 bg-red-50">
                <div className="bg-white border border-red-200 rounded p-3 text-xs font-mono overflow-x-auto">
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <span className="font-bold text-red-700">Table:</span>
                    <span className="text-gray-800">{err.table}</span>
                    
                    <span className="font-bold text-red-700">Record ID:</span>
                    <span className="text-gray-800">{err.recordId}</span>
                    
                    <span className="font-bold text-red-700">Error:</span>
                    <span className="text-red-600">{err.error}</span>
                    
                    <span className="font-bold text-red-700">Timestamp:</span>
                    <span className="text-gray-600">{err.timestamp.toLocaleString()}</span>
                  </div>
                  
                  {err.details && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <span className="font-bold text-red-700 block mb-1">Details / Stack Trace:</span>
                      <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-2 rounded max-h-48 overflow-auto">
                        {err.details}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more/less toggle */}
      {errors.length > 10 && (
        <div className="p-2 border-t border-red-200 bg-red-100 rounded-b-lg">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center text-sm text-red-700 hover:text-red-800 font-medium flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less (first 10)
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show all {errors.length} errors
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export const DataMigration: React.FC = () => {
  const [localData, setLocalData] = useState<{ tableName: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    setIsLoading(true);
    try {
      const summary = await getLocalDataSummary();
      setLocalData(summary);
    } catch (error) {
      console.error('Error loading local data:', error);
    }
    setIsLoading(false);
  };

  const handleMigrate = async () => {
    if (isMigrating) return;
    
    const confirmed = window.confirm(
      'This will upload all your local data to the cloud database.\n\n' +
      'This may take a few minutes depending on the amount of data.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    setIsMigrating(true);
    setProgress(null);
    setResult(null);
    
    try {
      const migrationResult = await migrateToDigitalOcean((p) => {
        setProgress({ ...p });
      });
      
      setResult({
        success: migrationResult.success,
        message: migrationResult.message,
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    setIsMigrating(false);
  };

  const totalRecords = localData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Data Migration</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Migrate your local data to the DigitalOcean cloud database.
        This ensures your data is backed up and accessible from any device.
      </p>
      
      {/* Local Data Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-700">Local Data Summary</h3>
          <button
            onClick={loadLocalData}
            disabled={isLoading}
            className="text-primary hover:text-primary/80 p-1"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : localData.length === 0 ? (
          <p className="text-gray-500">No local data found.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {localData.map(({ tableName, count }) => (
                <div key={tableName} className="flex justify-between text-sm">
                  <span className="text-gray-600">{tableName}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-medium">
              <span>Total Records</span>
              <span className="text-primary">{totalRecords.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Migration Progress */}
      {progress && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-700 mb-2">Migration Progress</h3>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm text-blue-600 mb-1">
              <span>Processing: {progress.currentTable || 'Preparing...'}</span>
              <span>
                {progress.recordsProcessed} / {progress.recordsTotal} records
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.recordsTotal > 0 ? (progress.recordsProcessed / progress.recordsTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          
          <div className="text-sm text-blue-600">
            Tables: {progress.tablesProcessed} / {progress.totalTables}
          </div>
          
          {progress.errors.length > 0 && (
            <ErrorDetailsPanel
              errors={progress.errors}
              showAll={showAllErrors}
              setShowAll={setShowAllErrors}
              expandedErrors={expandedErrors}
              setExpandedErrors={setExpandedErrors}
            />
          )}
        </div>
      )}
      
      {/* Result */}
      {result && (
        <div
          className={`rounded-lg p-4 mb-4 ${
            result.success ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.message}
            </span>
          </div>
        </div>
      )}
      
      {/* Migrate Button */}
      <button
        onClick={handleMigrate}
        disabled={isMigrating || totalRecords === 0}
        className={`
          w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors
          ${
            isMigrating || totalRecords === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700 cursor-pointer'
          }
        `}
        type="button"
      >
        {isMigrating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Migrating...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span>Migrate to Cloud ({totalRecords.toLocaleString()} records)</span>
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        Your data will be securely uploaded to DigitalOcean MySQL database.
      </p>
    </div>
  );
};

export default DataMigration;
