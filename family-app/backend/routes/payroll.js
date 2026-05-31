const router = require('express').Router();
const ctrl = require('../controllers/payrollController');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/process-task', ctrl.processTaskCompletion);
router.post('/process-stipend', ctrl.processMonthlyStipend);
router.get('/wallet/:childId', ctrl.getWallet);
router.put('/wallet/:childId/stipend', ctrl.updateStipend);
router.get('/transactions', ctrl.getTransactions);
router.get('/summary', ctrl.getMonthlySummary);

module.exports = router;
