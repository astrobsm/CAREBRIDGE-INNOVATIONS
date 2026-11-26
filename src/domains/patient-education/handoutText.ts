/** "Prepared for" line on a handout personalised for a patient (?patientId=). */
export function preparedForLine(patientName: string, hospitalNumber?: string | null): string {
  const name = patientName.trim();
  const hn = (hospitalNumber || '').trim();
  return hn ? `Prepared for: ${name} (Hospital No: ${hn})` : `Prepared for: ${name}`;
}
