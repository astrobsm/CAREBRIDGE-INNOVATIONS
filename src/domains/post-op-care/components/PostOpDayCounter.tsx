/**
 * Post-Op Day Counter Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Displays the number of days and hours post-surgery
 * with visual indicators for different post-op phases
 */

import { Timer, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface PostOpDayCounterProps {
  dayPostOp: number;
  hoursPostOp: number;
  size?: 'sm' | 'md' | 'lg';
  showHours?: boolean;
}

export default function PostOpDayCounter({
  dayPostOp,
  hoursPostOp,
  size = 'md',
  showHours = true,
}: PostOpDayCounterProps) {
  // Determine phase and color
  const getPhaseInfo = () => {
    if (dayPostOp === 0) {
      return {
        label: 'POD 0',
        subLabel: 'Day of Surgery',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-300',
        iconColor: 'text-purple-500',
      };
    } else if (dayPostOp <= 2) {
      return {
        label: `POD ${dayPostOp}`,
        subLabel: 'Immediate Post-Op',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
      };
    } else if (dayPostOp <= 5) {
      return {
        label: `POD ${dayPostOp}`,
        subLabel: 'Early Recovery',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        iconColor: 'text-amber-500',
      };
    } else if (dayPostOp <= 14) {
      return {
        label: `POD ${dayPostOp}`,
        subLabel: 'Recovery Phase',
        bgColor: 'bg-sky-50',
        textColor: 'text-sky-700',
        borderColor: 'border-sky-200',
        iconColor: 'text-sky-500',
      };
    } else {
      return {
        label: `POD ${dayPostOp}`,
        subLabel: 'Late Recovery',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500',
      };
    }
  };

  const phaseInfo = getPhaseInfo();

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      label: 'text-xs font-bold',
      subLabel: 'text-[10px]',
      hours: 'text-[10px]',
      icon: 12,
    },
    md: {
      container: 'px-3 py-1.5',
      label: 'text-sm font-bold',
      subLabel: 'text-xs',
      hours: 'text-xs',
      icon: 14,
    },
    lg: {
      container: 'px-4 py-2',
      label: 'text-base font-bold',
      subLabel: 'text-sm',
      hours: 'text-sm',
      icon: 16,
    },
  };

  const classes = sizeClasses[size];

  // Calculate hours within the day
  const hoursInDay = hoursPostOp % 24;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        ${phaseInfo.bgColor} ${phaseInfo.borderColor}
        border rounded-lg ${classes.container}
        flex flex-col items-center min-w-[60px]
      `}
    >
      <div className="flex items-center gap-1">
        <Timer size={classes.icon} className={phaseInfo.iconColor} />
        <span className={`${classes.label} ${phaseInfo.textColor}`}>
          {phaseInfo.label}
        </span>
      </div>
      
      {showHours && dayPostOp <= 2 && (
        <div className="flex items-center gap-1 mt-0.5">
          <Clock size={10} className="text-gray-400" />
          <span className={`${classes.hours} text-gray-500`}>
            +{hoursInDay}h
          </span>
        </div>
      )}
      
      <span className={`${classes.subLabel} text-gray-500 mt-0.5`}>
        {phaseInfo.subLabel}
      </span>
    </motion.div>
  );
}
