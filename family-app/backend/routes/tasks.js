const router = require('express').Router();
const ctrl = require('../controllers/tasksController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.getAll);
router.get('/assignments', ctrl.getAssignments);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/assign', ctrl.assign);
router.put('/assignments/:assignmentId', ctrl.updateAssignment);

module.exports = router;
