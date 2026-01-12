# AstroHEALTH - Interactive Surgical EMR & Patient Management PWA

A comprehensive Progressive Web Application for surgical EMR and patient management, designed for African (Nigerian) clinical contexts with WHO-adapted protocols.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment to Vercel

### Step 1: Create Supabase Database (Free)

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Enter project details:
   - **Name:** AstroHEALTH
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
4. Wait for project to be created (~2 minutes)
5. Go to **Project Settings** → **API**
6. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

### Step 2: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `supabase-schema.sql` from this project
4. Paste and click **"Run"**
5. All tables will be created automatically

### Step 3: Deploy to Vercel

#### Option A: One-Click Deploy from GitHub

1. Push your code to GitHub:
   ```bash
   git add -A
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. Go to [https://vercel.com](https://vercel.com) and sign up/login
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Configure Environment Variables:
   - `VITE_SUPABASE_URL` = Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
6. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy with env vars
vercel --prod
```

## 📁 Project Structure

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
│   └── communication/  # Chat, video conferencing
├── database/           # IndexedDB schemas (offline storage)
├── services/           # API & sync services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## 🔧 Tech Stack

- **Frontend:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **Offline Storage:** Dexie.js (IndexedDB)
- **Cloud Database:** Supabase (PostgreSQL)
- **AI/ML:** TensorFlow.js
- **PDF Generation:** jsPDF, @react-pdf/renderer
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod validation

## 🔐 Demo Login

After deployment, use these credentials:
- **Email:** `admin@astrohealth.ng`
- **Password:** (any password for demo)

## 📱 Features

- ✅ Offline-first PWA with Service Workers
- ✅ Role-based access control (RBAC)
- ✅ Patient management & registration
- ✅ Clinical encounters & documentation
- ✅ Surgical planning with fee estimation
- ✅ Wound care management with AI measurement
- ✅ Burns assessment (TBSA, Parkland formula)
- ✅ Laboratory requests & results
- ✅ Pharmacy & prescriptions (BNF-adapted)
- ✅ Nutrition assessment (MUST, meal planning)
- ✅ Billing & invoicing
- ✅ Clinical calculators (Caprini, ASA, etc.)
- ✅ Real-time chat & video conferencing
- ✅ PDF report generation
- ✅ Cloud sync with Supabase

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

Built with ❤️ for healthcare in Africa
