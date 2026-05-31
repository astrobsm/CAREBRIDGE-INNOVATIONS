const router = require('express').Router();
const ctrl = require('../controllers/needsController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/fulfill', ctrl.fulfill);
router.delete('/:id', ctrl.remove);

module.exports = router;
