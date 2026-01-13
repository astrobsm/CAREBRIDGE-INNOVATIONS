# AstroHEALTH - Interactive Surgical EMR & Patient Management PWA

## Project Overview
AstroHEALTH is a comprehensive Progressive Web Application for surgical EMR and patient management, designed for African (Nigerian) clinical contexts with WHO-adapted protocols. It's an **offline-first PWA** with dual-database architecture (IndexedDB + Supabase).

## Tech Stack
- **Frontend:** React 18+ with TypeScript
- **Build Tool:** Vite (with path aliases: `@`, `@components`, `@domains`, `@database`, `@services`, `@hooks`)
- **Styling:** TailwindCSS (custom theme with `primary`, `secondary`, `success` colors; breakpoint: `xs` at 375px)
- **Routing:** React Router v6
- **Offline Storage:** Dexie.js (IndexedDB) - 62 tables, version controlled schema
- **Cloud Sync:** Supabase (PostgreSQL) with real-time subscriptions
- **AI/ML:** TensorFlow.js (wound planimetry, AI-assisted measurements)
- **PDF Generation:** @react-pdf/renderer + jsPDF (medico-legal documents)
- **State Management:** Zustand + AuthContext
- **Form Handling:** React Hook Form + Zod validation
- **Notifications:** react-hot-toast
- **Icons:** Lucide React
- **Charts:** Recharts

## Architecture Principles

### Domain-Driven Design
- **26 feature domains** in `src/domains/` (e.g., `patients`, `surgery`, `wounds`, `burns`, `billing`)
- Each domain has: `pages/`, `components/`, `types/`, sometimes `utils/`
- Cross-domain data access via centralized `database/operations.ts` and `services/`

### Dual-Database Strategy
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Dexie     │────▶│ IndexedDB   │
│   (UI)      │◀────│   (ORM)     │◀────│  (Local)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  CloudSync   │
                    │  Service     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │ (PostgreSQL) │
                    └──────────────┘
```

**Critical:** All writes go to IndexedDB first (offline-first), then sync to Supabase when online.

## Data Access Patterns

### Use Database Operations (NOT Direct Dexie Queries)
```typescript
// ✅ Correct - Use centralized operations
import { PatientOps, SurgeryOps, dbOps } from '../database/operations';
// or
import { PatientOps, dbOps } from '../services';

const patient = await PatientOps.getById('patient-123');
const patientDetails = await PatientOps.getWithDetails('patient-123'); // Returns patient + vitals + encounters + surgeries + admissions
const todaySurgeries = await SurgeryOps.getScheduledToday();

// ❌ Avoid - Don't bypass operations layer
import { db } from '../database';
const patient = await db.patients.get('patient-123'); // Bypasses business logic
```

### React Live Queries (Reactive Data)
```typescript
// ✅ Use useLiveQuery from dexie-react-hooks for reactive updates
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';

const patient = useLiveQuery(() => db.patients.get(patientId), [patientId]);
const vitals = useLiveQuery(
  () => db.vitalSigns.where('patientId').equals(patientId).reverse().limit(5).toArray(),
  [patientId]
);
```

**Pattern:** Use `useLiveQuery` in components for real-time updates; use `*Ops` for actions/mutations.

### Available Operations Objects
All in `src/database/operations.ts`:
- `PatientOps`, `VitalSignsOps`, `EncounterOps`, `SurgeryOps`, `AdmissionOps`
- `WoundOps`, `BurnOps`, `LabRequestOps`, `InvestigationOps`, `PrescriptionOps`
- `NutritionOps`, `TreatmentPlanOps`, `InvoiceOps`, `WardRoundOps`, `DischargeSummaryOps`
- `BloodTransfusionOps`, `MDTMeetingOps`, `HistopathologyOps`, `ConsumableBOMOps`
- `HospitalOps`, `UserOps`, `ChatOps`, `VideoConferenceOps`, `AssignmentOps`, `DashboardOps`
- **Unified:** `dbOps` (object with all operations)

See `docs/DATABASE_OPERATIONS_GUIDE.md` for full reference.

## Form Handling Pattern

### React Hook Form + Zod Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  age: z.number().min(0).max(120),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

const onSubmit = async (data: FormData) => {
  await PatientOps.create({ ...data, id: generateId() });
  toast.success('Saved!');
};
```

**Convention:** Define Zod schemas inline or in domain `types/`. Always use `zodResolver`.

## Authentication & RBAC

### AuthContext Pattern
```typescript
import { useAuth } from '../../../contexts/AuthContext';

const { user, isAuthenticated, needsAgreement, logout } = useAuth();

// user.role: 'super_admin' | 'hospital_admin' | 'surgeon' | 'doctor' | 'nurse' | etc.
// user.hospitalId: Hospital affiliation
```

**Agreement Guard:** All authenticated routes check `needsAgreement()` → redirect to `/agreement` if user hasn't accepted terms.

### Role-Based Access
- User roles in `src/types/index.ts`: `UserRole` (15 roles)
- Check `user.role` for feature gating
- Nurses see shift assignments, surgeons see surgical planning, etc.

## Key Development Patterns

### Navigation
```typescript
import { useNavigate, useParams, Link } from 'react-router-dom';

const { patientId } = useParams<{ patientId: string }>();
const navigate = useNavigate();

navigate('/patients/123');
<Link to={`/patients/${patient.id}`}>View Patient</Link>
```

### Toast Notifications
```typescript
import toast from 'react-hot-toast';

toast.success('Operation successful!');
toast.error('Failed to save');
toast.loading('Saving...');
```

### ID Generation
```typescript
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // Use for all new entities
```

### Date Handling
```typescript
import { format, differenceInYears, addDays } from 'date-fns';

const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
const formattedDate = format(new Date(), 'PPP'); // "Jan 13, 2026"
```

### TypeScript Types
- **All types** in `src/types/index.ts` (4086 lines - comprehensive)
- Import specific types: `import type { Patient, Surgery, Wound } from '../../../types';`
- Dexie table types auto-inferred from `src/database/db.ts`

## Cloud Sync Service

### Real-Time Bidirectional Sync
- **Service:** `src/services/cloudSyncService.ts`
- **Initialization:** Called in `main.tsx` via `initCloudSync()`
- **Pattern:** Local-first writes → background sync to Supabase → real-time subscriptions for incoming changes

```typescript
// Check sync state
import { subscribeSyncState } from '../services/cloudSyncService';

subscribeSyncState((state) => {
  console.log('Sync status:', state.isSyncing, state.lastSyncAt);
});
```

**Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional - app works offline without them)

## Development Workflow

### Running the App
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
```

### Vite Configuration
- **Path aliases** in `vite.config.ts`: `@`, `@components`, `@domains`, etc.
- **PWA:** `vite-plugin-pwa` with custom service worker (`public/sw.js`)
- **Code splitting:** Vendor, database, AI, PDF chunks

### Database Version Management
- **Schema version:** Currently `v62` in `src/database/db.ts`
- **Migration:** Increment version, add new `.stores()` definition
- **Never delete tables** - only add/modify indexes

### Supabase Schema
- **Migration files:** `supabase-*.sql` in project root
- **Apply:** Copy to Supabase SQL Editor → Run
- **Table naming:** Snake_case in Supabase, camelCase in TypeScript

## Domain-Specific Notes

### Wounds Domain (`src/domains/wounds/`)
- AI-powered wound planimetry with TensorFlow.js
- Two-step calibration: ruler reference → wound boundary marking
- Manual + AI modes (AI may fail, fallback to manual)

### Burns Domain (`src/domains/burns/`)
- TBSA (Total Body Surface Area) calculation
- Parkland formula for fluid resuscitation
- Rule of Nines for burn extent

### Surgery Domain (`src/domains/surgery/`)
- Preoperative assessment flow (ASA class, risk calculators)
- Intraoperative notes
- Post-operative notes (structured + free text)

### Billing Domain (`src/domains/billing/`)
- Activity-based billing with staff revenue sharing
- Payroll generation per period
- Reference data: `src/data/billingActivities.ts`, `surgicalFees.ts`, `surgicalConsumables.ts`

### Medication Chart (`src/domains/medication-chart/`)
- Nurse shift-based medication administration records (MAR)
- Three shifts: Morning (6-14h), Afternoon (14-22h), Night (22-6h)

## Common Pitfalls

### 1. Don't Import from `src/database/db.ts` Directly for CRUD
❌ `import { db } from '../database/db';` then `db.patients.add(...)`  
✅ `import { PatientOps } from '../database/operations';` then `PatientOps.create(...)`

### 2. Use Absolute Imports with Path Aliases
❌ `import { Button } from '../../../components/common/Button';`  
✅ `import { Button } from '@components/common/Button';`

### 3. Forms Need Zod Validation
All forms use `react-hook-form` + `zodResolver` for consistency.

### 4. IndexedDB is Async
Always `await` database calls. Use `useLiveQuery` for reactive queries in components.

### 5. Test Offline Functionality
Use Chrome DevTools → Network → Offline mode to test PWA behavior.

## Clinical Context Awareness

- **Nigerian healthcare:** WHO-adapted protocols, BNF medication dosing
- **Multi-hospital:** Single patient record across facilities (`registeredHospitalId` + treatment at any `hospitalId`)
- **Medico-legal:** PDF generation mandatory for all clinical encounters
- **Risk assessments at registration:** DVT (Caprini), Pressure Sores (Waterlow), Malnutrition (MUST)

## Quick Reference

### File Locations
- **Database schema:** `src/database/db.ts`
- **Operations:** `src/database/operations.ts`
- **Types:** `src/types/index.ts`
- **Routing:** `src/App.tsx`
- **Auth:** `src/contexts/AuthContext.tsx`
- **Sync:** `src/services/cloudSyncService.ts`
- **Docs:** `docs/ARCHITECTURE.md`, `docs/DATABASE_OPERATIONS_GUIDE.md`

### Key Commands
```bash
npm run dev           # Dev server
npm run build         # Production build
npm run preview       # Preview build
```

### Supabase Setup
1. Create project at https://supabase.com
2. Copy `supabase-schema.sql` → SQL Editor → Run
3. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy (app works offline without Supabase)

---

**Next Steps:** When implementing new features, check `docs/DATABASE_OPERATIONS_GUIDE.md` for data access patterns, and follow existing domain structures in `src/domains/` for consistency.
