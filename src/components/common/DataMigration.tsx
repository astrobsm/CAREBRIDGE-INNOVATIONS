/**
 * Data Migration Component
 * 
 * Allows users to migrate data from local IndexedDB to DigitalOcean MySQL
 */

import React, { useState, useEffect } from 'react';
import { Upload, Database, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { migrateToDigitalOcean, getLocalDataSummary, MigrationProgress } from '../../services/migrationService';

export const DataMigration: React.FC = () => {
  const [localData, setLocalData] = useState<{ tableName: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

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
            <div className="mt-2 text-sm text-red-600">
              <p className="font-medium">Errors ({progress.errors.length}):</p>
              <ul className="list-disc list-inside">
                {progress.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {progress.errors.length > 5 && (
                  <li>...and {progress.errors.length - 5} more</li>
                )}
              </ul>
            </div>
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
