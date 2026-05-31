const router = require('express').Router();
const ctrl = require('../controllers/performanceController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/activity', ctrl.listActivity);
router.post('/activity', ctrl.createActivity);

router.get('/summary', ctrl.summary);
router.get('/leaderboard', ctrl.leaderboard);

router.get('/awards', ctrl.listAwards);
router.post('/awards', ctrl.createAward);
router.delete('/awards/:id', ctrl.deleteAward);

module.exports = router;
