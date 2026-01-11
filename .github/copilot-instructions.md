# AstroHEALTH - Interactive Surgical EMR & Patient Management PWA

## Project Overview
AstroHEALTH is a comprehensive Progressive Web Application for surgical EMR and patient management, designed for African (Nigerian) clinical contexts with WHO-adapted protocols.

## Tech Stack
- **Frontend:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **Offline Storage:** Dexie.js (IndexedDB wrapper)
- **AI/ML:** TensorFlow.js
- **PDF Generation:** @react-pdf/renderer
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Charts:** Recharts

## Architecture Principles
- Offline-first PWA with Service Workers
- Modular micro-domain architecture
- Role-based clinical governance (RBAC)
- AI-assisted but clinician-controlled
- Protocol-driven, guideline-anchored
- Multi-hospital, single patient longitudinal record
- PDF-first medico-legal documentation

## Directory Structure
```
src/
├── components/          # Shared UI components
├── domains/            # Feature modules
│   ├── auth/           # Authentication & RBAC
│   ├── patients/       # Patient management
│   ├── hospitals/      # Hospital registry
│   ├── clinical/       # Clinical workflows
│   ├── surgery/        # Surgical planning & operations
│   ├── wounds/         # Wound care module
│   ├── burns/          # Burns care module
│   ├── laboratory/     # Lab requests & results
│   ├── pharmacy/       # Medication management
│   ├── nutrition/      # Nutritional assessment
│   ├── billing/        # Finance & payroll
│   ├── homecare/       # Home care services
│   └── communication/  # Chat, video conferencing
├── database/           # IndexedDB schemas & operations
├── services/           # API & AI services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

## User Roles
- SuperAdmin, Hospital Admin, Surgeons, Anaesthetists
- Nurses, Pharmacists, Laboratory Scientists
- Dieticians, Physiotherapists, Accountants
- Home Care Givers, Drivers

## Key Features
- Risk assessment calculators (Caprini, ASA, MUST, etc.)
- AI-powered wound measurement with TensorFlow.js
- BNF-adapted medication dosing
- African Food Composition Table meal planning
- TBSA & Parkland formula for burns
- Comprehensive billing with revenue sharing

## Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
```
