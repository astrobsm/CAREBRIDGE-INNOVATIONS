const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/choreLibraryController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', ctrl.listLibrary);
router.get('/categories', ctrl.categories);
router.post('/seed', ctrl.seedLibrary);
router.post('/assign', ctrl.assignToChild);

module.exports = router;
