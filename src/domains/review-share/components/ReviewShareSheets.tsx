/**
 * The two review-link sheets for one patient, switchable between each other.
 * Pages hold `mode` and render this once.
 */

import ShareForReviewSheet from './ShareForReviewSheet';
import ManageSharedLinksSheet from './ManageSharedLinksSheet';

export type ReviewShareMode = 'share' | 'manage' | null;

interface Props {
  mode: ReviewShareMode;
  onModeChange: (m: ReviewShareMode) => void;
  patient: { id: string; name: string; hospitalId?: string | null } | null;
}

export default function ReviewShareSheets({ mode, onModeChange, patient }: Props) {
  if (!patient) return null;
  return (
    <>
      <ShareForReviewSheet
        open={mode === 'share'}
        patientId={patient.id}
        patientName={patient.name}
        hospitalId={patient.hospitalId}
        onClose={() => onModeChange(null)}
        onManage={() => onModeChange('manage')}
      />
      <ManageSharedLinksSheet
        open={mode === 'manage'}
        patientId={patient.id}
        patientName={patient.name}
        onClose={() => onModeChange(null)}
        onNewLink={() => onModeChange('share')}
      />
    </>
  );
}
