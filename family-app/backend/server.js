require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const tasksRoutes = require('./routes/tasks');
const payrollRoutes = require('./routes/payroll');
const plansRoutes = require('./routes/plans');
const educationRoutes = require('./routes/education');
const prayerRoutes = require('./routes/prayer');
const eventsRoutes = require('./routes/events');
const growthRoutes = require('./routes/growth');
const healthRoutes = require('./routes/health');
const syncRoutes = require('./routes/sync');
const notificationRoutes = require('./routes/notifications');
const choresRoutes = require('./routes/chores');
const boardingRoutes = require('./routes/boarding');
const bucketsRoutes = require('./routes/buckets');
const performanceRoutes = require('./routes/performance');
const needsRoutes = require('./routes/needs');
const familyEventsRoutes = require('./routes/familyEvents');
const choreLibraryRoutes = require('./routes/choreLibrary');

const app = express();

// Security middleware — relax frame-ancestors so AstroHEALTH (Part C) iframe can embed
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false,
}));
const corsOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/prayer', prayerRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chores', choresRoutes);
app.use('/api/boarding', boardingRoutes);
app.use('/api/buckets', bucketsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/needs', needsRoutes);
app.use('/api/family-events', familyEventsRoutes);
app.use('/api/chore-library', choreLibraryRoutes);

// Health check (unauthenticated)
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Family App server running on port ${PORT}`);
});

module.exports = app;
