const router = require('express').Router();
const ctrl = require('../controllers/growthController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.get('/chart/:childId', ctrl.getChart);

module.exports = router;
