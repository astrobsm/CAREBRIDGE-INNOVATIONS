/**
 * Assignment Notification Banner Component
 * Displays pending patient assignment notifications with acknowledgment button
 * Shows when a patient is assigned to the current user
 */

import React, { useEffect, useState } from 'react';
import { Bell, Check, User, Building, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  VoiceNotification,
  acknowledgeNotification,
  stopAllAnnouncements,
  getPendingNotifications
} from '../../services/voiceNotificationService';

interface AssignmentNotificationBannerProps {
  className?: string;
}

export const AssignmentNotificationBanner: React.FC<AssignmentNotificationBannerProps> = ({ 
  className = '' 
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<VoiceNotification[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load and refresh notifications
  useEffect(() => {
    if (!user?.id) return;

    const refreshNotifications = () => {
      const pending = getPendingNotifications(user.id);
      setNotifications(pending);
    };

    // Initial load
    refreshNotifications();

    // Refresh every 5 seconds
    const interval = setInterval(refreshNotifications, 5000);

    // Listen for custom notification events
    const handleNewNotification = (event: CustomEvent) => {
      if (event.detail?.userId === user.id) {
        refreshNotifications();
      }
    };

    window.addEventListener('assignment-notification' as any, handleNewNotification);

    return () => {
      clearInterval(interval);
      window.removeEventListener('assignment-notification' as any, handleNewNotification);
    };
  }, [user?.id]);

  // Handle acknowledge
  const handleAcknowledge = async (notificationId: string) => {
    const success = await acknowledgeNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  // Handle acknowledge all
  const handleAcknowledgeAll = async () => {
    if (!user?.id) return;
    
    for (const notification of notifications) {
      await acknowledgeNotification(notification.id);
    }
    setNotifications([]);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!isMuted) {
      stopAllAnnouncements();
    }
    setIsMuted(!isMuted);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full ${className}`}>
      {/* Header with count */}
      <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 animate-pulse" />
          <span className="font-semibold">
            {notifications.length} Pending Assignment{notifications.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-red-700 rounded transition-colors"
            title={isMuted ? 'Unmute announcements' : 'Mute announcements'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-red-700 rounded transition-colors"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Notification list */}
      {isExpanded && (
        <div className="bg-white border border-red-300 rounded-b-lg shadow-xl max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className="p-4 border-b border-gray-200 last:border-b-0 animate-pulse-slow"
            >
              {/* Patient info */}
              <div className="flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <User className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{notification.patientName}</h4>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <Building className="h-4 w-4" />
                    <span>{notification.hospitalName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {notification.wardName} • Bed {notification.bedNumber}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      notification.assignmentType === 'primary_doctor' 
                        ? 'bg-blue-100 text-blue-800' 
                        : notification.assignmentType === 'primary_nurse'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                    }`}>
                      {notification.assignmentType === 'primary_doctor' 
                        ? 'Primary Doctor' 
                        : notification.assignmentType === 'primary_nurse'
                          ? 'Primary Nurse'
                          : 'Staff Assignment'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Announced {notification.repeatCount} time{notification.repeatCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Acknowledge button */}
              <button
                onClick={() => handleAcknowledge(notification.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                <Check className="h-5 w-5" />
                Acknowledge Assignment
              </button>
            </div>
          ))}

          {/* Acknowledge all button */}
          {notifications.length > 1 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleAcknowledgeAll}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <Check className="h-4 w-4" />
                Acknowledge All ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pulsing indicator when collapsed */}
      {!isExpanded && (
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default AssignmentNotificationBanner;
