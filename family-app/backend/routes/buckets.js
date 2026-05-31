const router = require('express').Router();
const ctrl = require('../controllers/bucketsController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/debit', ctrl.debit);
router.post('/credit', ctrl.credit);
router.get('/transactions', ctrl.transactions);

module.exports = router;
