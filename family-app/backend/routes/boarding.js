const router = require('express').Router();
const ctrl = require('../controllers/boardingController');
const auth = require('../middleware/auth');

router.use(auth);

// Routines
router.get('/routines', ctrl.listRoutines);
router.post('/routines', ctrl.createRoutine);
router.put('/routines/:id', ctrl.updateRoutine);
router.delete('/routines/:id', ctrl.deleteRoutine);

// Events
router.get('/events', ctrl.listEvents);
router.post('/events', ctrl.createEvent);
router.put('/events/:id', ctrl.updateEvent);
router.delete('/events/:id', ctrl.deleteEvent);

// Daily schedule + actions
router.get('/schedule', ctrl.getTodaysSchedule);
router.post('/events/start', ctrl.startEvent);
router.post('/events/complete', ctrl.completeEvent);
router.post('/events/miss', ctrl.missEvent);
router.post('/scan-missed', ctrl.scanMissed);

// One-click seed of comprehensive templates
router.post('/seed-templates', ctrl.seedTemplates);

// Checklists
router.get('/checklists', ctrl.listChecklists);
router.get('/checklists/:id', ctrl.getChecklist);
router.post('/checklists', ctrl.createChecklist);
router.put('/checklists/:id', ctrl.updateChecklist);
router.delete('/checklists/:id', ctrl.deleteChecklist);

// Checklist items
router.post('/checklists/:id/items', ctrl.addChecklistItem);
router.delete('/checklist-items/:id', ctrl.deleteChecklistItem);

// Checklist logs
router.post('/checklist-logs/toggle', ctrl.toggleChecklistItem);
router.get('/checklist-logs/day', ctrl.getChecklistDayLogs);

module.exports = router;
