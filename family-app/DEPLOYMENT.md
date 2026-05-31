# Family App 2026 - Deployment Guide

## Prerequisites
- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** >= 9.x

---

## 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE family_app;"

# Run schema
psql -U postgres -d family_app -f backend/models/schema.sql
```

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values:
#   DB_HOST=localhost
#   DB_PORT=5432
#   DB_NAME=family_app
#   DB_USER=postgres
#   DB_PASSWORD=your_password
#   JWT_SECRET=your_secure_random_string_min_32_chars
#   PORT=5000
#   CLIENT_URL=http://localhost:3000

# Initialize database (creates tables if not exists)
node scripts/initDb.js

# Start server
npm start        # production
npm run dev       # development (with nodemon)
```

Backend runs on `http://localhost:5000`

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL (optional - defaults to localhost:5000)
# Create .env file:
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
```

Frontend runs on `http://localhost:3000`

---

## 4. Production Build

```bash
cd frontend
npm run build
```

The `build/` folder contains the optimized PWA-ready app.

### Serving the Production Build

**Option A: Serve from Express backend**
Copy `frontend/build/` to `backend/public/` and add to `server.js`:
```js
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
```

**Option B: Use a static server**
```bash
npm install -g serve
serve -s frontend/build -l 3000
```

---

## 5. Environment Variables

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | family_app |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | your_password |
| JWT_SECRET | JWT signing secret (min 32 chars) | random_secure_string |
| PORT | Backend port | 5000 |
| CLIENT_URL | Frontend URL (CORS) | http://localhost:3000 |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:5000/api |

---

## 6. PWA Installation

1. Open the app in Chrome/Edge on mobile
2. Tap "Add to Home Screen" when prompted
3. The app will install as a standalone PWA
4. Works offline after first load

---

## 7. Project Structure

```
FAMILY APP2026/
├── backend/
│   ├── config/db.js          # PostgreSQL connection
│   ├── controllers/          # Business logic (10 controllers)
│   ├── middleware/            # Auth & upload middleware
│   ├── models/schema.sql     # Database schema (16 tables)
│   ├── routes/               # API routes (12 route files)
│   ├── scripts/initDb.js     # DB initialization
│   └── server.js             # Express entry point
├── frontend/
│   ├── public/
│   │   ├── index.html        # HTML shell
│   │   ├── manifest.json     # PWA manifest
│   │   └── service-worker.js # Offline caching
│   └── src/
│       ├── components/       # Layout, shared components
│       ├── context/          # AuthContext, AppContext
│       ├── pages/            # 13 page components
│       ├── services/         # API, offline storage, sync engine
│       └── styles/           # CSS
└── DEPLOYMENT.md
```

---

## 8. Core Modules

| Module | Features |
|--------|----------|
| **Children** | Profiles, photos, blood group, genotype |
| **Tasks** | CRUD, assign to children, priority, recurrence, rewards/penalties |
| **Payroll** | Wallet per child, stipend, task rewards, penalties, transfers, monthly processing |
| **Plans** | Goal-driven plans with categories, progress tracking |
| **Education** | School assignments, subjects, grading |
| **Prayer** | 5 daily prayers, attendance logging, reminders |
| **Events** | Family calendar, recurring events, countdowns |
| **Growth** | Height/weight tracking, BMI auto-calc, charts |
| **Health** | Medical records, vaccinations, appointments, medications |

---

## 9. API Endpoints

All endpoints require authentication (`Authorization: Bearer <token>`) except auth routes.

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/children` - List children
- `GET/POST/PUT/DELETE /api/tasks` - Task management
- `POST /api/payroll/stipend/process` - Process monthly stipend
- `GET /api/events/upcoming` - Upcoming events
- `POST /api/sync/push` - Push offline changes
- `GET /api/sync/pull` - Pull remote changes

Full API documented in route files under `backend/routes/`.
