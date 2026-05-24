/**
 * A4 Investigation Request Print Layout
 * Full WHO-aligned 9-category checkbox form.
 */

import type { InvestigationRequestBundle, Patient } from '../../../types';
import { INVESTIGATION_CATALOG } from '../../../services/investigationRequestService';

interface Props {
  bundle: InvestigationRequestBundle;
  patient: Patient;
}

const fmt = (d: Date | string) => new Date(d).toLocaleDateString();

const A4InvestigationRequestPrint = ({ bundle, patient }: Props) => {
  const tickedSet = new Set(bundle.items.filter((it) => it.ticked).map((it) => it.code));
  const itemByCode: Record<string, typeof bundle.items[number]> = {};
  bundle.items.forEach((it) => (itemByCode[it.code] = it));

  const dob = new Date(patient.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));

  const box = (checked: boolean) => (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        border: '1px solid #000',
        marginRight: 4,
        verticalAlign: 'middle',
        textAlign: 'center',
        lineHeight: '10px',
        fontSize: 9,
      }}
    >
      {checked ? '✓' : ''}
    </span>
  );

  return (
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '10pt',
        color: '#000',
        padding: '10mm',
        lineHeight: 1.3,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: '16pt' }}>INVESTIGATION REQUEST FORM</h1>
        <div style={{ fontSize: '10pt' }}>{patient.hospitalName || 'AstroHEALTH'}</div>
      </div>

      {/* Patient block */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: '9.5pt' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: 3, width: '50%' }}>
              <b>Name:</b> {patient.firstName} {patient.lastName}
            </td>
            <td style={{ border: '1px solid #000', padding: 3 }}>
              <b>Hospital No.:</b> {patient.hospitalNumber}
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: 3 }}>
              <b>Age:</b> {age}y &nbsp;&nbsp; <b>Sex:</b> {patient.gender}
            </td>
            <td style={{ border: '1px solid #000', padding: 3 }}>
              <b>Ward:</b> {patient.ward || '—'}
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: 3 }}>
              <b>Date:</b> {fmt(bundle.requestDate)}
            </td>
            <td style={{ border: '1px solid #000', padding: 3 }}>
              <b>Priority:</b> {bundle.priority.toUpperCase()}
              &nbsp;&nbsp; <b>Side:</b> {(bundle.affectedSide || 'na').toUpperCase()}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #000', padding: 3 }}>
              <b>Diagnosis:</b> {bundle.diagnosis || ''}
            </td>
          </tr>
          {bundle.clinicalNotes && (
            <tr>
              <td colSpan={2} style={{ border: '1px solid #000', padding: 3 }}>
                <b>Clinical Notes:</b> {bundle.clinicalNotes}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Categories */}
      {INVESTIGATION_CATALOG.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 6, breakInside: 'avoid' }}>
          <div
            style={{
              backgroundColor: '#eee',
              border: '1px solid #000',
              padding: '2px 4px',
              fontWeight: 'bold',
              fontSize: '10pt',
            }}
          >
            {cat.title}
          </div>
          {cat.groups.map((grp) => (
            <div key={grp.title} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '2px 6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9pt', marginTop: 2 }}>{grp.title}</div>
              <div style={{ columns: 2, columnGap: '8mm', fontSize: '9pt' }}>
                {grp.items.map((it) => {
                  const checked = tickedSet.has(it.code);
                  const mods = itemByCode[it.code]?.modifiers || {};
                  const modStr = Object.entries(mods)
                    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                  return (
                    <div key={it.code} style={{ breakInside: 'avoid' }}>
                      {box(checked)}
                      {it.name}
                      {checked && modStr && <span style={{ fontStyle: 'italic' }}> ({modStr})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ borderBottom: '1px solid #000' }} />
        </div>
      ))}

      {/* Signature */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: '9.5pt' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: 4, width: '50%' }}>
              <b>Requested by:</b> {bundle.requestedByName || bundle.requestedBy}
              <br />
              <b>Designation:</b> {bundle.clinicianDesignation || ''}
              <br />
              <b>Bleep/Contact:</b> {bundle.clinicianBleep || ''}
              <br />
              <br />
              Signature: ____________________
            </td>
            <td style={{ border: '1px solid #000', padding: 4 }}>
              <b>For Lab Use:</b>
              <br />
              Date received: ____________________
              <br />
              Received by: ____________________
              <br />
              Sample condition: ____________________
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontSize: '7pt', marginTop: 4 }}>
        Request ID: {bundle.id}
      </div>
    </div>
  );
};

export default A4InvestigationRequestPrint;
