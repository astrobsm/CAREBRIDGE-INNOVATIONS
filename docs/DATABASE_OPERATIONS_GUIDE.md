# CareBridge Database Operations Guide

This guide explains how to use the comprehensive database operations and React hooks to freely fetch data across all modules.

## Overview

CareBridge provides two ways to access data:

1. **Database Operations** (`src/database/operations.ts`) - Direct async functions for CRUD operations
2. **React Hooks** (`src/hooks/useDatabase.ts`) - Reactive hooks with live updates for components

---

## Database Operations

Import from the database module:

```typescript
import { 
  PatientOps, 
  AdmissionOps, 
  SurgeryOps,
  dbOps // Contains all operations in one object
} from '../database';
```

Or from services:

```typescript
import { 
  PatientOps, 
  AdmissionOps, 
  dbOps 
} from '../services';
```

### Available Operations

| Module | Operations Object | Description |
|--------|------------------|-------------|
| Patients | `PatientOps` | Patient CRUD, search, full details |
| Vital Signs | `VitalSignsOps` | Record & retrieve vitals |
| Encounters | `EncounterOps` | Clinical encounters |
| Surgeries | `SurgeryOps` | Surgery scheduling & management |
| Admissions | `AdmissionOps` | Admission management |
| Admission Notes | `AdmissionNotesOps` | Progress notes |
| Wounds | `WoundOps` | Wound care tracking |
| Burns | `BurnOps` | Burn assessments |
| Lab Requests | `LabRequestOps` | Laboratory requests |
| Investigations | `InvestigationOps` | All investigations (radiology, etc.) |
| Prescriptions | `PrescriptionOps` | Medication prescriptions |
| Nutrition | `NutritionOps` | Nutrition assessments & plans |
| Treatment Plans | `TreatmentPlanOps` | Treatment planning |
| Invoices | `InvoiceOps` | Billing & invoices |
| Ward Rounds | `WardRoundOps` | Ward round records |
| Discharge | `DischargeSummaryOps` | Discharge summaries |
| Blood Transfusion | `BloodTransfusionOps` | Blood transfusion management |
| MDT Meetings | `MDTMeetingOps` | Multidisciplinary team meetings |
| Histopathology | `HistopathologyOps` | Histopathology requests |
| Consumables | `ConsumableBOMOps` | Consumable bill of materials |
| Hospitals | `HospitalOps` | Hospital registry |
| Users | `UserOps` | User management |
| Chat | `ChatOps` | Chat rooms & messages |
| Video | `VideoConferenceOps` | Video conferences |
| Assignments | `AssignmentOps` | Doctor/nurse assignments |
| Dashboard | `DashboardOps` | Dashboard statistics |

### Example Usage

```typescript
// Get all patients
const patients = await PatientOps.getAll();

// Get patient by ID
const patient = await PatientOps.getById('patient-123');

// Search patients by name
const results = await PatientOps.searchByName('John');

// Get patient with all related data
const patientDetails = await PatientOps.getWithDetails('patient-123');
// Returns: { patient, vitals, encounters, surgeries, admissions, prescriptions, labRequests, investigations }

// Using the unified dbOps object
const vitals = await dbOps.vitals.getByPatient('patient-123');
const surgeries = await dbOps.surgeries.getScheduledToday();
const stats = await dbOps.dashboard.getStats();
```

---

## React Hooks

Import from the hooks module:

```typescript
import { 
  usePatients, 
  usePatient, 
  usePatientWithDetails,
  useActiveAdmissions,
  dbOps 
} from '../hooks';
```

### Available Hooks

#### Patient Hooks
- `usePatients()` - All active patients with live updates
- `usePatient(patientId)` - Single patient by ID
- `usePatientSearch(query)` - Search patients
- `usePatientWithDetails(patientId)` - Patient with all related data

#### Clinical Hooks
- `usePatientVitals(patientId)` - Patient vital signs
- `useLatestVitals(patientId)` - Most recent vitals
- `useEncounters()` - All clinical encounters
- `usePatientEncounters(patientId)` - Patient encounters

#### Surgery Hooks
- `useSurgeries()` - All surgeries
- `usePatientSurgeries(patientId)` - Patient surgeries
- `useTodaySurgeries()` - Today's scheduled surgeries

#### Admission Hooks
- `useAdmissions()` - All admissions
- `useActiveAdmissions()` - Currently active admissions
- `usePatientAdmissions(patientId)` - Patient admissions
- `useActiveAdmission(patientId)` - Patient's current admission

#### Wound & Burns Hooks
- `useWounds()` - All wounds
- `usePatientWounds(patientId)` - Patient wounds
- `useBurnAssessments()` - All burn assessments
- `usePatientBurns(patientId)` - Patient burns

#### Lab & Investigation Hooks
- `useLabRequests()` - All lab requests
- `usePatientLabRequests(patientId)` - Patient lab requests
- `usePendingLabRequests()` - Pending lab requests
- `useInvestigations()` - All investigations
- `usePatientInvestigations(patientId)` - Patient investigations
- `usePendingInvestigations()` - Pending investigations

#### Prescription Hooks
- `usePrescriptions()` - All prescriptions
- `usePatientPrescriptions(patientId)` - Patient prescriptions
- `usePendingPrescriptions()` - Pending prescriptions

#### Other Hooks
- `usePatientNutritionAssessments(patientId)` - Nutrition assessments
- `usePatientNutritionPlans(patientId)` - Nutrition plans
- `useTreatmentPlans()` - Treatment plans
- `usePatientTreatmentPlans(patientId)` - Patient treatment plans
- `useInvoices()` - All invoices
- `usePatientInvoices(patientId)` - Patient invoices
- `usePendingInvoices()` - Unpaid invoices
- `useWardRounds()` - Ward rounds
- `useTodayWardRounds()` - Today's ward rounds
- `usePatientDischargeSummaries(patientId)` - Discharge summaries
- `usePatientBloodTransfusions(patientId)` - Blood transfusions
- `usePendingBloodTransfusions()` - Pending transfusions
- `usePatientMDTMeetings(patientId)` - MDT meetings
- `useUpcomingMDTMeetings()` - Upcoming MDT meetings
- `useHospitals()` - All hospitals
- `useHospital(hospitalId)` - Single hospital
- `useUsers()` - All users
- `useUsersByRole(role)` - Users by role
- `useDoctors()` - All doctors
- `useNurses()` - All nurses
- `useDashboardStats()` - Dashboard statistics

### Example Usage

```tsx
import { usePatients, usePatientWithDetails, useDashboardStats } from '../hooks';

function PatientList() {
  const { patients, loading } = usePatients();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <ul>
      {patients.map(p => (
        <li key={p.id}>{p.firstName} {p.lastName}</li>
      ))}
    </ul>
  );
}

function PatientDashboard({ patientId }: { patientId: string }) {
  const { patient, vitals, surgeries, admissions, loading, refresh } = 
    usePatientWithDetails(patientId);
  
  if (loading) return <LoadingSpinner />;
  if (!patient) return <NotFound />;
  
  return (
    <div>
      <h1>{patient.firstName} {patient.lastName}</h1>
      <p>Latest BP: {vitals[0]?.systolicBP}/{vitals[0]?.diastolicBP}</p>
      <p>Surgeries: {surgeries.length}</p>
      <p>Admissions: {admissions.length}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

function DashboardStats() {
  const { stats, loading, refresh } = useDashboardStats();
  
  return (
    <div>
      <p>Total Patients: {stats.totalPatients}</p>
      <p>Active Admissions: {stats.activeAdmissions}</p>
      <p>Today's Surgeries: {stats.todaySurgeries}</p>
    </div>
  );
}
```

---

## Generic Mutation Hook

For creating/updating data with loading states:

```typescript
import { useMutation } from '../hooks';
import { PatientOps } from '../database';

function CreatePatient() {
  const { mutate, loading, error } = useMutation(PatientOps.create);
  
  const handleSubmit = async (data: Patient) => {
    const id = await mutate(data);
    if (id) {
      console.log('Created patient:', id);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Patient'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

## Direct Database Access

For advanced queries, you can access the Dexie database directly:

```typescript
import { db } from '../database';

// Complex queries
const recentSurgeries = await db.surgeries
  .where('scheduledDate')
  .above(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .toArray();

// Bulk operations
await db.transaction('rw', db.patients, db.admissions, async () => {
  await db.patients.add(patientData);
  await db.admissions.add(admissionData);
});
```

---

## Summary

- Use **hooks** in React components for reactive UI updates
- Use **operations** in event handlers, services, or non-React code
- Use **dbOps** object for organized access to all operations
- All operations support offline-first with automatic cloud sync
