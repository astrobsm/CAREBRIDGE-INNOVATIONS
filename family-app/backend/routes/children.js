const router = require('express').Router();
const ctrl = require('../controllers/childrenController');
const pdfCtrl = require('../controllers/pdfController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(auth);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:childId/pdf', pdfCtrl.downloadChildPdf);
router.post('/', upload.single('photo'), ctrl.create);
router.put('/:id', upload.single('photo'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
