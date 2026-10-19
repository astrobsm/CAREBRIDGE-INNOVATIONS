import { Clock } from 'lucide-react';

/**
 * Shown after a self-registration, and when someone whose registration has
 * not been approved yet tries to sign in. Accounts start inactive; a hospital
 * or super administrator activates them in User Management.
 */
export default function AwaitingApprovalNotice({
  title = 'Awaiting approval',
  message = 'Your account has been created and is waiting for an administrator to approve it. You can sign in once it has been activated.',
  onDismiss,
}: {
  title?: string;
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">{title}</h3>
          <p className="mt-1 text-sm text-amber-800">{message}</p>
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="mt-2 text-sm font-medium text-amber-900 underline">
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
