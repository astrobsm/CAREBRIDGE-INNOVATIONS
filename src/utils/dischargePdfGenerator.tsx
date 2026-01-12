// Discharge Summary PDF Generator
// Generates professional PDF documents for patient discharge summaries
// CRITICAL: Uses white background (#ffffff) and Helvetica font for cross-platform compatibility

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { format, differenceInDays } from 'date-fns';
import type { DischargeSummary, Patient } from '../types';

// Styles for the PDF
// TYPOGRAPHY: Helvetica (safe embedded font), minimum 10pt
// COLORS: White background, black/near-black body text
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',  // CRITICAL: Always white
  },
  header: {
    borderBottom: '2px solid #4F46E5',
    paddingBottom: 15,
    marginBottom: 20,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
    marginBottom: 5,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',  // Pure black for maximum readability
    marginTop: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    color: '#4B5563',  // Dark gray for labels
  },
  value: {
    width: '65%',
    color: '#000000',  // Pure black for values
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoBox: {
    width: '50%',
    marginBottom: 8,
  },
  paragraph: {
    lineHeight: 1.5,
    color: '#000000',  // Pure black for body text
    marginBottom: 8,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
    padding: 6,
  },
  tableCell: {
    flex: 1,
  },
  tableCellSmall: {
    width: '15%',
  },
  tableCellMedium: {
    width: '20%',
  },
  tableCellLarge: {
    width: '25%',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  warningTitle: {
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 5,
  },
  warningItem: {
    color: '#92400E',
    marginLeft: 10,
  },
  contactBox: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 20,
  },
  contactItem: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 4,
  },
  contactLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 3,
  },
  contactValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  badge: {
    backgroundColor: '#10B981',
    color: '#ffffff',
    padding: '2 6',
    borderRadius: 2,
    fontSize: 8,
  },
  listItem: {
    marginLeft: 10,
    marginBottom: 3,
  },
  bullet: {
    marginRight: 5,
  },
  appointmentCard: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    marginBottom: 6,
    borderRadius: 4,
    borderLeft: '3px solid #4F46E5',
  },
});

// Discharge Summary PDF Document Component
const DischargeSummaryDocument = ({
  summary,
  patient,
}: {
  summary: DischargeSummary;
  patient: Patient;
}) => {
  const losDays = differenceInDays(new Date(summary.dischargeDate), new Date(summary.admissionDate)) + 1;

  const conditionLabels: Record<string, string> = {
    improved: 'Improved',
    stable: 'Stable',
    unchanged: 'Unchanged',
    deteriorated: 'Deteriorated',
  };

  const dispositionLabels: Record<string, string> = {
    home: 'Discharged Home',
    facility: 'To Skilled Nursing Facility',
    hospice: 'To Hospice',
    transfer: 'Transfer to Another Hospital',
    'against-advice': 'Against Medical Advice',
    deceased: 'Deceased',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.hospitalName}>AstroHEALTH Innovations in Healthcare</Text>
          <Text style={{ textAlign: 'center', fontSize: 9, color: '#6B7280' }}>
            123 Healthcare Avenue, Lagos, Nigeria • Tel: +234 XXX XXX XXXX
          </Text>
          <Text style={styles.documentTitle}>DISCHARGE SUMMARY</Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PATIENT INFORMATION</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Patient Name:</Text>
                <Text style={styles.value}>{patient.firstName} {patient.lastName}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Hospital Number:</Text>
                <Text style={styles.value}>{patient.hospitalNumber}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>
                  {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1) || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{patient.phone || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{patient.address || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Admission Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADMISSION DETAILS</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Admission Date:</Text>
                <Text style={styles.value}>{format(new Date(summary.admissionDate), 'dd MMM yyyy')}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Discharge Date:</Text>
                <Text style={styles.value}>{format(new Date(summary.dischargeDate), 'dd MMM yyyy')}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Length of Stay:</Text>
                <Text style={styles.value}>{losDays} day(s)</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text style={styles.label}>Condition:</Text>
                <Text style={styles.value}>{conditionLabels[summary.conditionAtDischarge]}</Text>
              </View>
            </View>
            <View style={[styles.infoBox, { width: '100%' }]}>
              <View style={styles.row}>
                <Text style={styles.label}>Disposition:</Text>
                <Text style={styles.value}>{dispositionLabels[summary.dischargeDisposition]}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DIAGNOSIS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Admitting Diagnosis:</Text>
            <Text style={styles.value}>{summary.admittingDiagnosis}</Text>
          </View>
          <View style={[styles.row, { marginTop: 5 }]}>
            <Text style={styles.label}>Final Diagnosis:</Text>
            <View style={styles.value}>
              {summary.finalDiagnosis.map((dx, i) => (
                <Text key={i} style={styles.listItem}>• {dx}</Text>
              ))}
            </View>
          </View>
          {summary.comorbidities.length > 0 && (
            <View style={[styles.row, { marginTop: 5 }]}>
              <Text style={styles.label}>Comorbidities:</Text>
              <Text style={styles.value}>{summary.comorbidities.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Hospital Course */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOSPITAL COURSE</Text>
          <Text style={styles.paragraph}>{summary.hospitalCourse}</Text>
          
          {summary.proceduresPerformed.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Procedures Performed:</Text>
              {summary.proceduresPerformed.map((proc, i) => (
                <Text key={i} style={styles.listItem}>
                  • {proc.name} - {format(new Date(proc.date), 'dd MMM yyyy')} ({proc.outcome})
                </Text>
              ))}
            </View>
          )}

          {summary.consultations.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Consultations:</Text>
              <Text>{summary.consultations.join(', ')}</Text>
            </View>
          )}
        </View>
      </Page>

      {/* Page 2 - Medications and Instructions */}
      <Page size="A4" style={styles.page}>
        {/* Discharge Medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISCHARGE MEDICATIONS</Text>
          {summary.dischargeMedications.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellLarge}>Medication</Text>
                <Text style={styles.tableCellSmall}>Dose</Text>
                <Text style={styles.tableCellSmall}>Route</Text>
                <Text style={styles.tableCellMedium}>Frequency</Text>
                <Text style={styles.tableCellSmall}>Duration</Text>
                <Text style={styles.tableCellMedium}>Purpose</Text>
              </View>
              {summary.dischargeMedications.map((med, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCellLarge}>
                    {med.name} {med.isNew && '(NEW)'}
                  </Text>
                  <Text style={styles.tableCellSmall}>{med.dose}</Text>
                  <Text style={styles.tableCellSmall}>{med.route}</Text>
                  <Text style={styles.tableCellMedium}>{med.frequency}</Text>
                  <Text style={styles.tableCellSmall}>{med.duration}</Text>
                  <Text style={styles.tableCellMedium}>{med.purpose}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>No discharge medications</Text>
          )}

          {summary.medicationsDiscontinued.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', color: '#DC2626' }}>Medications Discontinued:</Text>
              <Text>{summary.medicationsDiscontinued.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Discharge Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISCHARGE INSTRUCTIONS</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Dietary Instructions:</Text>
            <Text style={styles.value}>{summary.dietaryInstructions}</Text>
          </View>
          
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.label}>Activity Restrictions:</Text>
            <Text style={styles.value}>{summary.activityRestrictions}</Text>
          </View>

          {summary.woundCareInstructions && (
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.label}>Wound Care:</Text>
              <Text style={styles.value}>{summary.woundCareInstructions}</Text>
            </View>
          )}

          {/* Warning Signs */}
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ WARNING SIGNS - Seek Medical Attention If:</Text>
            {summary.warningSignsToWatch.map((sign, i) => (
              <Text key={i} style={styles.warningItem}>• {sign}</Text>
            ))}
          </View>
        </View>

        {/* Follow-up Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FOLLOW-UP APPOINTMENTS</Text>
          {summary.followUpAppointments.length > 0 ? (
            summary.followUpAppointments.map((appt, i) => (
              <View key={i} style={styles.appointmentCard}>
                <View style={styles.row}>
                  <Text style={{ fontWeight: 'bold' }}>{appt.type}</Text>
                  <Text> - {appt.department}</Text>
                </View>
                <Text style={{ color: '#4F46E5', marginTop: 3 }}>
                  📅 {format(new Date(appt.scheduledDate), 'EEEE, dd MMMM yyyy')}
                </Text>
                {appt.instructions && (
                  <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 3 }}>
                    {appt.instructions}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>No follow-up appointments scheduled</Text>
          )}

          {summary.pendingTests.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>Pending Tests:</Text>
              <Text>{summary.pendingTests.join(', ')}</Text>
            </View>
          )}

          {summary.pendingReferrals.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold' }}>Pending Referrals:</Text>
              <Text>{summary.pendingReferrals.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
          <View style={styles.contactBox}>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>EMERGENCY CONTACT</Text>
              <Text style={styles.contactValue}>{summary.emergencyContact}</Text>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>CLINIC CONTACT</Text>
              <Text style={styles.contactValue}>{summary.clinicContact}</Text>
            </View>
          </View>
        </View>

        {/* Signature Section */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '45%' }}>
              <View style={{ borderTop: '1px solid #1F2937', paddingTop: 5 }}>
                <Text style={{ fontWeight: 'bold' }}>{summary.preparedByName}</Text>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>Prepared By</Text>
              </View>
            </View>
            <View style={{ width: '45%' }}>
              <View style={{ borderTop: '1px solid #1F2937', paddingTop: 5 }}>
                <Text style={{ fontWeight: 'bold' }}>{summary.attendingPhysicianName}</Text>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>Attending Physician</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
            </Text>
            <Text style={styles.footerText}>
              AstroHEALTH Innovations in Healthcare
            </Text>
            <Text style={styles.footerText}>
              Page 2 of 2
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Function to generate and download the PDF
export async function generateDischargeSummaryPDF(
  summary: DischargeSummary,
  patient: Patient
): Promise<void> {
  const blob = await pdf(
    <DischargeSummaryDocument summary={summary} patient={patient} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Discharge_Summary_${patient.lastName}_${patient.firstName}_${format(new Date(summary.dischargeDate), 'yyyy-MM-dd')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default DischargeSummaryDocument;
