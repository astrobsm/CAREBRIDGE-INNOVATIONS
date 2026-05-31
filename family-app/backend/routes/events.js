const router = require('express').Router();
const ctrl = require('../controllers/eventsController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getAll);
router.get('/upcoming', ctrl.getUpcoming);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
