# AstroHEALTH Application Architecture

## 🏗️ System Overview

AstroHEALTH is an **offline-first Progressive Web Application (PWA)** for surgical EMR and patient management. It uses a dual-database architecture for seamless offline/online operation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASTROHEALTH PWA                                  │
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │   Browser   │────▶│   React     │────▶│   Dexie     │────▶│ IndexedDB │ │
│  │   (User)    │◀────│   Frontend  │◀────│   ORM       │◀────│  (Local)  │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘ │
│                              │                   │                          │
│                              │                   ▼                          │
│                              │         ┌─────────────────┐                  │
│                              │         │  Cloud Sync     │                  │
│                              │         │  Service        │                  │
│                              │         └────────┬────────┘                  │
│                              │                  │                           │
└──────────────────────────────┼──────────────────┼───────────────────────────┘
                               │                  │
                               ▼                  ▼
                     ┌─────────────────────────────────────┐
                     │            SUPABASE CLOUD            │
                     │  ┌─────────────┐   ┌─────────────┐  │
                     │  │  PostgreSQL │   │  Real-time  │  │
                     │  │  Database   │◀─▶│  Channels   │  │
                     │  │  (33 Tables)│   │             │  │
                     │  └─────────────┘   └─────────────┘  │
                     │                                     │
                     │  ┌─────────────┐   ┌─────────────┐  │
                     │  │    Auth     │   │   Storage   │  │
                     │  │  (Optional) │   │  (Optional) │  │
                     │  └─────────────┘   └─────────────┘  │
                     └─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
src/
├── App.tsx                    # Main routing configuration
├── main.tsx                   # Application entry point
├── index.css                  # Global styles (TailwindCSS)
│
├── components/                # Shared UI Components
│   ├── common/               # Common components (LoadingScreen, etc.)
│   ├── layouts/              # Layout wrappers
│   │   ├── MainLayout.tsx    # Authenticated layout with sidebar
│   │   └── AuthLayout.tsx    # Login/Register layout
│   ├── navigation/           # Navigation components
│   │   ├── Sidebar.tsx       # Main navigation sidebar
│   │   └── Header.tsx        # Top header with user menu
│   ├── pwa/                  # PWA-specific components
│   │   ├── InstallPrompt.tsx # PWA install prompt
│   │   └── SyncIndicator.tsx # Sync status indicator
│   └── clinical/            # Clinical UI components
│       └── TreatmentPlanCard.tsx
│
├── contexts/                  # React Contexts
│   └── AuthContext.tsx       # Authentication state management
│
├── database/                  # IndexedDB Layer
│   ├── db.ts                 # Dexie database schema (33 tables)
│   ├── operations.ts         # CRUD operations for all entities
│   └── index.ts              # Database exports
│
├── domains/                   # Feature Modules (Domain-Driven)
│   ├── auth/                 # Authentication
│   ├── dashboard/            # Dashboard
│   ├── patients/             # Patient management
│   ├── clinical/             # Clinical encounters
│   ├── surgery/              # Surgery planning
│   ├── admissions/           # Admission management
│   ├── discharge/            # Discharge management
│   ├── ward-rounds/          # Ward rounds
│   ├── investigations/       # Lab & Radiology
│   ├── laboratory/           # Laboratory
│   ├── pharmacy/             # Pharmacy
│   ├── nutrition/            # Nutrition
│   ├── wounds/               # Wound care
│   ├── burns/                # Burns care
│   ├── billing/              # Billing
│   ├── communication/        # Chat & Video
│   ├── hospitals/            # Hospital registry
│   ├── calculators/          # Clinical calculators
│   └── settings/             # Settings
│
├── hooks/                     # Custom React Hooks
│   ├── useDatabase.ts        # Database hooks with live updates
│   └── index.ts              # Hooks exports
│
├── services/                  # Business Logic & External Services
│   ├── supabaseClient.ts     # Supabase connection
│   ├── cloudSyncService.ts   # Bidirectional sync
│   ├── syncService.ts        # Local sync utilities
│   ├── pwaService.ts         # PWA utilities
│   ├── offlineHooks.ts       # Offline data hooks
│   ├── woundCareService.ts   # Wound care logic
│   ├── burnCareService.ts    # Burn care protocols
│   ├── investigationLabService.ts # Lab test definitions
│   ├── preoperativeService.ts    # Preoperative assessment
│   ├── bloodTransfusionService.ts # Blood transfusion
│   ├── mdtService.ts         # MDT meetings
│   ├── nutritionPlannerService.ts # Nutrition planning
│   └── index.ts              # Services exports
│
├── types/                     # TypeScript Type Definitions
│   └── index.ts              # All type definitions
│
├── utils/                     # Utility Functions
│   ├── pdfUtils.ts           # PDF utilities
│   ├── billingPdfGenerator.ts
│   ├── clinicalPdfGenerators.ts
│   ├── dischargePdfGenerator.ts
│   ├── prescriptionPdfGenerator.ts
│   └── counselingPdfGenerator.ts
│
├── data/                      # Static Data
│   ├── surgicalFees.ts       # Surgical fee schedules
│   ├── nonTheaterServices.ts # Non-theater service fees
│   └── patientEducation.ts   # Education materials
│
└── pages/                     # Standalone Pages
    ├── NotFoundPage.tsx      # 404 page
    └── OfflinePage.tsx       # Offline page
```

---

## 🔄 Data Flow Architecture

### 1. Frontend to Database Connection

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                │
│                                                                          │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐  │
│  │   UI Component  │─────▶│   React Hook    │─────▶│  Database Ops   │  │
│  │   (Page.tsx)    │◀─────│  (usePatients)  │◀─────│ (PatientOps)    │  │
│  └─────────────────┘      └─────────────────┘      └─────────────────┘  │
│                                   │                         │            │
│                                   │ useLiveQuery            │            │
│                                   ▼                         ▼            │
│                           ┌─────────────────────────────────────┐        │
│                           │     Dexie (IndexedDB Wrapper)       │        │
│                           │                                     │        │
│                           │  db.patients.where(...).toArray()   │        │
│                           └─────────────────────────────────────┘        │
│                                           │                              │
└───────────────────────────────────────────┼──────────────────────────────┘
                                            │
                                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         BROWSER STORAGE                                    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         IndexedDB                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │   patients   │  │   surgeries  │  │  admissions  │  ... (33)    │  │
│  │  │   table      │  │   table      │  │   table      │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2. Cloud Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC PROCESS                                       │
│                                                                             │
│  ┌──────────────────┐                              ┌──────────────────┐    │
│  │    IndexedDB     │                              │    Supabase      │    │
│  │    (Local)       │                              │    (Cloud)       │    │
│  └────────┬─────────┘                              └────────┬─────────┘    │
│           │                                                  │              │
│           │  ┌─────────────────────────────────────────┐    │              │
│           │  │        cloudSyncService.ts              │    │              │
│           │  │                                         │    │              │
│           ├──┤  1. pullAllFromCloud()                 ├────┤              │
│           │  │     - Fetches all records from Supabase│    │              │
│           │  │     - Updates local IndexedDB          │    │              │
│           │  │                                         │    │              │
│           ├──┤  2. pushAllToCloud()                   ├────┤              │
│           │  │     - Reads all local records          │    │              │
│           │  │     - Upserts to Supabase              │    │              │
│           │  │                                         │    │              │
│           │  │  3. Real-time Subscriptions            │    │              │
│           │◀─┤     - Listens for changes              │◀───┤              │
│           │  │     - Auto-updates local DB            │    │              │
│           │  └─────────────────────────────────────────┘    │              │
│           │                                                  │              │
│           ▼                                                  ▼              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    BIDIRECTIONAL SYNC                                 │  │
│  │                                                                       │  │
│  │  • Sync triggered on: App start, Coming online, Manual trigger       │  │
│  │  • Conflict resolution: Cloud data takes precedence                  │  │
│  │  • Real-time updates via Supabase Realtime channels                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (33 Tables)

### Core Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `hospitals` | Hospital registry | name, address, bed_capacity |
| `users` | System users | email, role, hospital_id |
| `patients` | Patient records | hospital_number, name, blood_group |

### Clinical Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `vital_signs` | Patient vitals | patient_id, BP, temp, pulse |
| `clinical_encounters` | Consultations | patient_id, diagnosis, treatment |
| `surgeries` | Surgical procedures | patient_id, procedure, team |
| `wounds` | Wound assessments | patient_id, type, measurements |
| `burn_assessments` | Burn care | patient_id, TBSA%, depth |

### Admission & Ward Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `admissions` | Patient admissions | patient_id, ward, status |
| `admission_notes` | Progress notes | admission_id, content |
| `bed_assignments` | Bed tracking | admission_id, ward, bed |
| `ward_rounds` | Round records | ward_name, patients |
| `discharge_summaries` | Discharge docs | admission_id, medications |

### Lab & Pharmacy Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `lab_requests` | Lab orders | patient_id, tests, status |
| `investigations` | Unified investigations | patient_id, type, results |
| `prescriptions` | Medication orders | patient_id, medications |
| `histopathology_requests` | Pathology requests | patient_id, specimen |

### Treatment & Nutrition Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `treatment_plans` | Treatment planning | patient_id, orders |
| `treatment_progress` | Progress tracking | plan_id, observations |
| `nutrition_assessments` | MUST screening | patient_id, score |
| `nutrition_plans` | Meal planning | patient_id, meals |

### Communication Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `chat_rooms` | Chat channels | participants |
| `chat_messages` | Messages | room_id, content |
| `video_conferences` | Video calls | host_id, participants |

### Specialized Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| `blood_transfusions` | Blood products | patient_id, product_type |
| `mdt_meetings` | MDT discussions | patient_id, attendees |
| `consumable_boms` | Materials used | patient_id, consumables |
| `invoices` | Billing | patient_id, items, total |

---

## 🔗 Module Connections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MODULE RELATIONSHIPS                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │    PATIENTS     │
                              │   (Core Hub)    │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │   CLINICAL    │          │   ADMISSIONS  │          │    SURGERY    │
   │  Encounters   │          │   & Discharge │          │   Planning    │
   └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
           │                          │                          │
    ┌──────┴──────┐            ┌──────┴──────┐            ┌──────┴──────┐
    │             │            │             │            │             │
    ▼             ▼            ▼             ▼            ▼             ▼
┌───────┐   ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐
│Vitals │   │ Labs  │    │ Ward  │    │Nursing│    │Anest- │    │ OR    │
│       │   │       │    │Rounds │    │Notes  │    │hesia  │    │Notes  │
└───────┘   └───────┘    └───────┘    └───────┘    └───────┘    └───────┘
                │                           │
                ▼                           ▼
         ┌───────────┐              ┌───────────┐
         │PHARMACY   │              │ BILLING   │
         │Rx Orders  │              │ Invoices  │
         └───────────┘              └───────────┘
                │
                ▼
         ┌───────────┐
         │NUTRITION  │
         │Meal Plans │
         └───────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING MODULES                                   │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   WOUNDS    │  │   BURNS     │  │    MDT      │  │   BLOOD     │       │
│  │   Care      │  │   Care      │  │  Meetings   │  │ Transfusion │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │    CHAT     │  │   VIDEO     │  │   HISTO-    │                        │
│  │Communication│  │  Conference │  │  PATHOLOGY  │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛣️ Application Routes

### Authentication Routes
| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/agreement` | UserAgreementPage | Auth (no agreement) |

### Main Application Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | DashboardPage | Main dashboard |
| `/patients` | PatientsListPage | Patient list |
| `/patients/new` | NewPatientPage | Register patient |
| `/patients/:id` | PatientDetailsPage | Patient details |
| `/patients/:id/encounter` | ClinicalEncounterPage | Clinical encounter |
| `/patients/:id/vitals` | VitalsPage | Record vitals |

### Clinical Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/surgery` | SurgeryListPage | Surgery schedule |
| `/surgery/planning/:id` | SurgeryPlanningPage | Plan surgery |
| `/surgery/preoperative` | PreoperativeAssessmentPage | Preop assessment |
| `/admissions` | AdmissionsPage | Admission management |
| `/discharge` | DischargePage | Discharge management |
| `/ward-rounds` | WardRoundsPage | Ward rounds |
| `/investigations` | UnifiedLabPage | All investigations |
| `/laboratory` | LaboratoryPage | Lab only |
| `/pharmacy` | PharmacyPage | Prescriptions |
| `/nutrition` | NutritionPlannerPage | Nutrition |
| `/wounds` | WoundsPage | Wound care |
| `/burns` | BurnsAssessmentPage | Burns care |
| `/mdt` | MDTPage | MDT meetings |
| `/blood-transfusion` | BloodTransfusionPage | Blood transfusion |

### Other Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/billing` | BillingPage | Invoices |
| `/calculators` | ClinicalCalculatorsPage | Clinical tools |
| `/hospitals` | HospitalsPage | Hospital registry |
| `/settings` | SettingsPage | User settings |
| `/communication/chat` | ChatPage | Team chat |
| `/communication/video` | VideoConferencePage | Video calls |

---

## 🔌 Connecting Frontend to Backend

### Step 1: Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: Database Connection Flow
```typescript
// 1. Entry point (main.tsx)
import { initCloudSync } from './services/cloudSyncService';
initCloudSync(); // Starts sync process

// 2. Using in components (via hooks)
import { usePatients, usePatientWithDetails } from './hooks';

function MyComponent() {
  const { patients, loading } = usePatients(); // Live data from IndexedDB
  // ... render
}

// 3. Using operations (for mutations)
import { PatientOps } from './database';

async function savePatient(data) {
  await PatientOps.create(data); // Saves to IndexedDB
  // CloudSync auto-pushes to Supabase when online
}
```

### Step 3: Sync Verification
```javascript
// In browser console
testSupabaseConnection(); // Check connection
triggerSync();            // Manual sync
```

---

## 📊 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI Framework |
| **Styling** | TailwindCSS | CSS Utility Framework |
| **Routing** | React Router v6 | Client-side routing |
| **State** | React Context + Zustand | State management |
| **Forms** | React Hook Form + Zod | Form validation |
| **Local DB** | Dexie (IndexedDB) | Offline-first storage |
| **Cloud DB** | Supabase (PostgreSQL) | Cloud database |
| **Sync** | Custom + Supabase Realtime | Bidirectional sync |
| **PWA** | Vite PWA Plugin | Service worker |
| **PDF** | jsPDF, @react-pdf/renderer | Document generation |
| **Charts** | Recharts | Data visualization |
| **Icons** | Lucide React | Icon library |
| **Build** | Vite | Build tool |
| **Deploy** | Vercel | Hosting |

---

## 🚀 Deployment URLs

- **Production:** https://carebridge-innovations.vercel.app
- **Supabase Dashboard:** https://supabase.com/dashboard

---

## ✅ Connection Checklist

- [x] IndexedDB schema (33 tables) - `src/database/db.ts`
- [x] Database operations - `src/database/operations.ts`
- [x] React hooks for data - `src/hooks/useDatabase.ts`
- [x] Supabase client - `src/services/supabaseClient.ts`
- [x] Cloud sync service - `src/services/cloudSyncService.ts`
- [x] Supabase schema (33 tables) - `supabase-schema-v2.sql`
- [x] Environment variables configured
- [x] Real-time subscriptions enabled
- [x] PWA service worker active
