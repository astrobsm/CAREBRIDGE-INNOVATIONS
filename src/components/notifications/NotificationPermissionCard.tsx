import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  shouldOfferNotificationPrompt,
  requestNotificationsFromGesture,
  rememberNotificationPromptAnswer,
} from '../../services/notificationBootstrap';

/**
 * A small, dismissible card (shown on the dashboard after sign-in) offering
 * reminder notifications. The browser prompt opens only when the person taps
 * "Turn on"; the answer or the dismissal is remembered on this device.
 */
export default function NotificationPermissionCard() {
  const [visible, setVisible] = useState(() => shouldOfferNotificationPrompt());
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    try {
      await requestNotificationsFromGesture();
    } finally {
      setBusy(false);
      setVisible(false);
    }
  };

  const dismiss = () => {
    rememberNotificationPromptAnswer('dismissed');
    setVisible(false);
  };

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
      role="region"
      aria-label="Reminder notifications"
    >
      <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Get reminders for surgeries and appointments?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={enable} disabled={busy} className="btn btn-primary px-3 py-1.5 text-sm">
            {busy ? 'Asking…' : 'Turn on'}
          </button>
          <button type="button" onClick={dismiss} className="btn btn-secondary px-3 py-1.5 text-sm">
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} className="p-1 text-indigo-700" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
