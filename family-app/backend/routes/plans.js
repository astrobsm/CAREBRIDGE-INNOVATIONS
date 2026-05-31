const router = require('express').Router();
const ctrl = require('../controllers/plansController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/goals', ctrl.addGoal);
router.put('/:id/goals/:goalId', ctrl.updateGoal);

module.exports = router;
