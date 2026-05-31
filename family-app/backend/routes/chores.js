const router = require('express').Router();
const ctrl = require('../controllers/choresController');
const auth = require('../middleware/auth');

router.use(auth);

// Schedules
router.get('/schedules', ctrl.getSchedules);
router.get('/schedules/:id', ctrl.getScheduleById);
router.post('/schedules', ctrl.createSchedule);
router.put('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

// Chore items
router.post('/schedules/:id/items', ctrl.addItem);
router.put('/items/:id', ctrl.updateItem);
router.delete('/items/:id', ctrl.deleteItem);

// Assignments
router.post('/items/:id/assign', ctrl.assignChore);
router.delete('/assignments/:id', ctrl.removeAssignment);

// Daily logs
router.get('/daily', ctrl.getDailyLogs);
router.put('/daily/:id', ctrl.assessDaily);
router.post('/daily/generate', ctrl.generateDailyLogs);

module.exports = router;
