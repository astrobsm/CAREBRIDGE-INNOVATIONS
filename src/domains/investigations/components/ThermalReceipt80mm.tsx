/**
 * 80mm Thermal Receipt for Investigation Requests
 * Browser-printable via @page size 80mm auto.
 */

import type { InvestigationRequestBundle, Patient } from '../../../types';
import { INVESTIGATION_CATALOG } from '../../../services/investigationRequestService';

interface Props {
  bundle: InvestigationRequestBundle;
  patient: Patient;
}

const fmt = (d: Date | string) => new Date(d).toLocaleString();

const ThermalReceipt80mm = ({ bundle, patient }: Props) => {
  const tickedByCat: Record<string, typeof bundle.items> = {};
  bundle.items.forEach((it) => {
    if (!it.ticked) return;
    (tickedByCat[it.category] = tickedByCat[it.category] || []).push(it);
  });

  const catTitle = (id: string) => INVESTIGATION_CATALOG.find((c) => c.id === id)?.title || id;

  return (
    <div
      style={{
        width: '74mm',
        fontFamily: 'monospace',
        fontSize: '10pt',
        lineHeight: 1.25,
        color: '#000',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>
        INVESTIGATION REQUEST
      </div>
      <div style={{ textAlign: 'center', fontSize: '9pt', marginBottom: 4 }}>
        {patient.hospitalName || 'AstroHEALTH'}
      </div>
      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2px 0', marginBottom: 4 }}>
        <div><b>Pt:</b> {patient.firstName} {patient.lastName}</div>
        <div><b>HN:</b> {patient.hospitalNumber}</div>
        <div><b>Sex/Age:</b> {patient.gender} / {(() => {
          const dob = new Date(patient.dateOfBirth);
          return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
        })()}y</div>
        <div><b>Ward:</b> {patient.ward || '—'}</div>
      </div>

      <div style={{ marginBottom: 4 }}>
        <div><b>Date:</b> {fmt(bundle.requestDate)}</div>
        <div><b>Priority:</b> {bundle.priority.toUpperCase()}</div>
        {bundle.affectedSide && bundle.affectedSide !== 'na' && (
          <div><b>Side:</b> {bundle.affectedSide.toUpperCase()}</div>
        )}
        {bundle.diagnosis && <div><b>Dx:</b> {bundle.diagnosis}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: 2 }}>
        {Object.keys(tickedByCat).map((cat) => (
          <div key={cat} style={{ marginBottom: 3 }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{catTitle(cat)}</div>
            {tickedByCat[cat].map((it) => {
              const mods = it.modifiers || {};
              const modStr = Object.entries(mods)
                .filter(([, v]) => v !== '' && v !== undefined && v !== null)
                .map(([k, v]) => `${k}:${v}`)
                .join(' ');
              return (
                <div key={it.id}>
                  ■ {it.name}
                  {modStr && <span> [{modStr}]</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {bundle.clinicalNotes && (
        <div style={{ borderTop: '1px dashed #000', paddingTop: 2, marginTop: 2 }}>
          <b>Notes:</b> {bundle.clinicalNotes}
        </div>
      )}

      <div style={{ borderTop: '1px dashed #000', marginTop: 4, paddingTop: 4 }}>
        <div><b>Requested by:</b> {bundle.requestedByName || bundle.requestedBy}</div>
        {bundle.clinicianDesignation && <div>{bundle.clinicianDesignation}</div>}
        {bundle.clinicianBleep && <div>Bleep: {bundle.clinicianBleep}</div>}
        <div style={{ marginTop: 12 }}>Signature: ____________________</div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '8pt', marginTop: 6 }}>
        ID: {bundle.id.slice(0, 8)}
      </div>
    </div>
  );
};

export default ThermalReceipt80mm;
