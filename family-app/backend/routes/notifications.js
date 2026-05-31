const router = require('express').Router();
const ctrl = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);

module.exports = router;
