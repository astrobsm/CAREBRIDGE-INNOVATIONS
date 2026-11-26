// Where a push notification opens. Kept free of the notification service's
// IndexedDB set-up so it can be unit-tested (dashboardRoutes.test.ts).

export interface NotificationTarget {
  type: 'surgery' | 'appointment' | 'treatment_plan';
  id: string;
  patientId?: string;
}

/**
 * Where tapping a reminder opens. Each target is a real route in App.tsx:
 * a surgery opens in the Surgical Workflow (which loads ?edit=<surgeryId>);
 * the appointment diary has no per-appointment route; a treatment-plan
 * activity id is `${planId}-${activityId}`, so it opens the patient.
 */
export function scheduledEventUrl(event: NotificationTarget): string {
  switch (event.type) {
    case 'surgery': return `/surgery/workflow?edit=${encodeURIComponent(event.id)}`;
    case 'appointment': return '/appointments';
    default: return event.patientId ? `/patients/${event.patientId}` : '/treatment-planning';
  }
}
