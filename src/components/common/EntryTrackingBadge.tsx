/**
 * EntryTrackingBadge Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Displays who made an entry, when, and optionally where.
 * Used across all clinical modules to show entry attribution.
 */

import { format } from 'date-fns';
import { User, Clock, MapPin, Monitor } from 'lucide-react';

export interface EntryTrackingInfo {
  userId?: string;
  userName?: string;
  userRole?: string;
  timestamp?: Date | string;
  location?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };
  deviceInfo?: string;
}

export interface EntryTrackingBadgeProps {
  /** The tracking information to display */
  tracking?: EntryTrackingInfo;
  /** Fallback user name if tracking is not available */
  fallbackUserName?: string;
  /** Fallback timestamp if tracking is not available */
  fallbackTimestamp?: Date | string;
  /** Display mode: 'inline' for compact, 'full' for detailed */
  mode?: 'inline' | 'full' | 'compact';
  /** Additional CSS classes */
  className?: string;
  /** Show location if available */
  showLocation?: boolean;
  /** Show device info if available */
  showDevice?: boolean;
  /** Show timestamp (default: true) */
  showTimestamp?: boolean;
}

export default function EntryTrackingBadge({
  tracking,
  fallbackUserName,
  fallbackTimestamp,
  mode = 'inline',
  className = '',
  showLocation = false,
  showDevice = false,
  showTimestamp = true,
}: EntryTrackingBadgeProps) {
  // Get display values
  const userName = tracking?.userName || fallbackUserName || 'Unknown User';
  const userRole = tracking?.userRole;
  const timestamp = tracking?.timestamp || fallbackTimestamp;
  const location = tracking?.location;
  const deviceInfo = tracking?.deviceInfo;

  // Format timestamp
  const formattedTime = timestamp 
    ? format(new Date(timestamp), 'MMM d, yyyy h:mm a')
    : null;

  const formattedDate = timestamp
    ? format(new Date(timestamp), 'MMM d, yyyy')
    : null;

  const formattedTimeOnly = timestamp
    ? format(new Date(timestamp), 'h:mm a')
    : null;

  // Compact mode - just shows icon and name
  if (mode === 'compact') {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}
        title={`Entered by ${userName}${formattedTime ? ` on ${formattedTime}` : ''}`}
      >
        <User size={12} className="text-gray-400" />
        <span className="truncate max-w-[100px]">{userName}</span>
        {showTimestamp && formattedTimeOnly && (
          <>
            <span className="text-gray-300">•</span>
            <span>{formattedTimeOnly}</span>
          </>
        )}
      </span>
    );
  }

  // Inline mode - single line with essential info
  if (mode === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 ${className}`}>
        <span className="inline-flex items-center gap-1">
          <User size={12} className="text-gray-400" />
          <span className="font-medium text-gray-700">{userName}</span>
          {userRole && (
            <span className="text-gray-400">({userRole})</span>
          )}
        </span>
        {showTimestamp && formattedTime && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} className="text-gray-400" />
            <span>{formattedTime}</span>
          </span>
        )}
        {showLocation && location?.city && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" />
            <span>{location.city}{location.country ? `, ${location.country}` : ''}</span>
          </span>
        )}
      </div>
    );
  }

  // Full mode - detailed card-style display
  return (
    <div className={`bg-gray-50 rounded-lg p-3 border border-gray-100 ${className}`}>
      <div className="flex items-start gap-3">
        {/* User avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* User name and role */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{userName}</span>
            {userRole && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary capitalize">
                {userRole.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          
          {/* Timestamp */}
          {formattedTime && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Clock size={14} />
              <span>{formattedDate}</span>
              <span className="text-gray-300">•</span>
              <span>{formattedTimeOnly}</span>
            </div>
          )}
          
          {/* Location */}
          {showLocation && location && (location.city || (location.latitude && location.longitude)) && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin size={14} />
              {location.city ? (
                <span>{location.city}{location.country ? `, ${location.country}` : ''}</span>
              ) : (
                <span>
                  {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                </span>
              )}
            </div>
          )}
          
          {/* Device info */}
          {showDevice && deviceInfo && (
            <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
              <Monitor size={14} />
              <span className="truncate">{deviceInfo}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper component for displaying entry info in a table cell
 */
export function EntryTrackingCell({
  userName,
  timestamp,
  className = '',
}: {
  userName?: string;
  timestamp?: Date | string;
  className?: string;
}) {
  const formattedTime = timestamp 
    ? format(new Date(timestamp), 'MMM d, h:mm a')
    : null;

  return (
    <div className={`text-xs ${className}`}>
      <div className="font-medium text-gray-700">{userName || 'Unknown'}</div>
      {formattedTime && (
        <div className="text-gray-400">{formattedTime}</div>
      )}
    </div>
  );
}
