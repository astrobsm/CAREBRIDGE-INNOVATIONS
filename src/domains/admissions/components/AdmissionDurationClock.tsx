// Admission Duration Clock Component
// Shows real-time duration for admitted patients

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

interface AdmissionDurationClockProps {
  admissionDate: Date;
  estimatedStayDays?: number;
  size?: 'sm' | 'md' | 'lg';
  showEstimate?: boolean;
  className?: string;
}

interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function AdmissionDurationClock({
  admissionDate,
  estimatedStayDays,
  size = 'md',
  showEstimate = true,
  className = '',
}: AdmissionDurationClockProps) {
  const [duration, setDuration] = useState<DurationParts>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isOverStay, setIsOverStay] = useState(false);

  useEffect(() => {
    const calculateDuration = () => {
      const now = new Date();
      const admDate = new Date(admissionDate);
      
      const totalDays = differenceInDays(now, admDate);
      const totalHours = differenceInHours(now, admDate) % 24;
      const totalMinutes = differenceInMinutes(now, admDate) % 60;
      const totalSeconds = differenceInSeconds(now, admDate) % 60;

      setDuration({
        days: totalDays,
        hours: totalHours,
        minutes: totalMinutes,
        seconds: totalSeconds,
      });

      // Check if patient is over estimated stay
      if (estimatedStayDays && totalDays > estimatedStayDays) {
        setIsOverStay(true);
      } else {
        setIsOverStay(false);
      }
    };

    // Calculate immediately
    calculateDuration();

    // Update every second
    const interval = setInterval(calculateDuration, 1000);

    return () => clearInterval(interval);
  }, [admissionDate, estimatedStayDays]);

  const sizeClasses = {
    sm: {
      container: 'p-2 text-xs',
      icon: 'w-4 h-4',
      time: 'text-lg font-bold',
      label: 'text-[10px]',
    },
    md: {
      container: 'p-3 text-sm',
      icon: 'w-5 h-5',
      time: 'text-xl font-bold',
      label: 'text-xs',
    },
    lg: {
      container: 'p-4 text-base',
      icon: 'w-6 h-6',
      time: 'text-3xl font-bold',
      label: 'text-sm',
    },
  };

  const styles = sizeClasses[size];
  const progressPercent = estimatedStayDays 
    ? Math.min((duration.days / estimatedStayDays) * 100, 100) 
    : 0;

  return (
    <div
      className={`rounded-xl border ${
        isOverStay 
          ? 'bg-red-50 border-red-200' 
          : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
      } ${styles.container} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`${styles.icon} ${isOverStay ? 'text-red-500' : 'text-emerald-600'}`} />
        <span className={`font-medium ${isOverStay ? 'text-red-700' : 'text-emerald-700'}`}>
          Admission Duration
        </span>
        {isOverStay && (
          <AlertTriangle className="w-4 h-4 text-red-500 ml-auto" />
        )}
      </div>

      {/* Duration Display */}
      <div className="flex items-center justify-center gap-1 my-2">
        {/* Days */}
        <div className="text-center">
          <div className={`${styles.time} ${isOverStay ? 'text-red-600' : 'text-emerald-600'} tabular-nums`}>
            {String(duration.days).padStart(2, '0')}
          </div>
          <div className={`${styles.label} text-gray-500 uppercase`}>Days</div>
        </div>
        <span className={`${styles.time} ${isOverStay ? 'text-red-400' : 'text-emerald-400'}`}>:</span>
        
        {/* Hours */}
        <div className="text-center">
          <div className={`${styles.time} ${isOverStay ? 'text-red-600' : 'text-emerald-600'} tabular-nums`}>
            {String(duration.hours).padStart(2, '0')}
          </div>
          <div className={`${styles.label} text-gray-500 uppercase`}>Hrs</div>
        </div>
        <span className={`${styles.time} ${isOverStay ? 'text-red-400' : 'text-emerald-400'}`}>:</span>
        
        {/* Minutes */}
        <div className="text-center">
          <div className={`${styles.time} ${isOverStay ? 'text-red-600' : 'text-emerald-600'} tabular-nums`}>
            {String(duration.minutes).padStart(2, '0')}
          </div>
          <div className={`${styles.label} text-gray-500 uppercase`}>Min</div>
        </div>
        <span className={`${styles.time} ${isOverStay ? 'text-red-400' : 'text-emerald-400'}`}>:</span>
        
        {/* Seconds */}
        <div className="text-center">
          <div className={`${styles.time} ${isOverStay ? 'text-red-600' : 'text-emerald-600'} tabular-nums animate-pulse`}>
            {String(duration.seconds).padStart(2, '0')}
          </div>
          <div className={`${styles.label} text-gray-500 uppercase`}>Sec</div>
        </div>
      </div>

      {/* Estimated Stay Progress */}
      {showEstimate && estimatedStayDays && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`${styles.label} text-gray-600`}>
              Estimated Stay: {estimatedStayDays} days
            </span>
            {!isOverStay && duration.days <= estimatedStayDays && (
              <span className={`${styles.label} text-emerald-600 flex items-center gap-1`}>
                <CheckCircle className="w-3 h-3" />
                On track
              </span>
            )}
            {isOverStay && (
              <span className={`${styles.label} text-red-600 flex items-center gap-1`}>
                <AlertTriangle className="w-3 h-3" />
                +{duration.days - estimatedStayDays} days over
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isOverStay ? 'bg-red-500' : progressPercent > 75 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for lists
export function AdmissionDurationBadge({ admissionDate }: { admissionDate: Date }) {
  const [duration, setDuration] = useState({ days: 0, hours: 0 });

  useEffect(() => {
    const calculateDuration = () => {
      const now = new Date();
      const admDate = new Date(admissionDate);
      
      setDuration({
        days: differenceInDays(now, admDate),
        hours: differenceInHours(now, admDate) % 24,
      });
    };

    calculateDuration();
    const interval = setInterval(calculateDuration, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [admissionDate]);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
      <Clock className="w-3 h-3" />
      {duration.days}d {duration.hours}h
    </span>
  );
}
