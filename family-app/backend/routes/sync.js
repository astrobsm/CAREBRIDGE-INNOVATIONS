const router = require('express').Router();
const ctrl = require('../controllers/syncController');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/push', ctrl.push);
router.get('/pull', ctrl.pull);

module.exports = router;
