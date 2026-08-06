import { Router } from 'express';
import {
  createCase,
  updateCaseStatus,
  getCaseById,
  getAllCases,
  addInteraction,
  addFollowup,
} from '../controllers/sponsorshipController.js';
import { authenticate } from '../middleware/authenticate.js'; 

const router = Router();

router.use(authenticate);

router.post('/cases', createCase);
router.get('/cases', getAllCases);
router.get('/cases/:id', getCaseById);
router.patch('/cases/:id/status', updateCaseStatus);

router.post('/cases/:id/interactions', addInteraction);
router.post('/cases/:id/followups', addFollowup);

export default router; // <-- التصدير الصحيح يكون هنا فقط في ملف الـ Routes