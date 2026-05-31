const router = require('express').Router();
const ctrl = require('../controllers/prayerController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/schedules', ctrl.getSchedules);
router.post('/schedules', ctrl.createSchedule);
router.put('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);
router.post('/logs', ctrl.logPrayer);
router.get('/logs', ctrl.getPrayerLogs);

module.exports = router;
