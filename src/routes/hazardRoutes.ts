import { Router } from 'express';
import { HazardController } from '../controllers/hazardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/route', HazardController.getHazardsOnRoute);
router.post('/verify-removal', HazardController.verifyRemoval);
router.get('/removal-history', HazardController.getRemovalHistory);
router.get('/nearby-candidate', HazardController.getNearbyCandidate);
router.get('/', HazardController.getAll);
router.get('/:id', HazardController.getById);
router.post('/', authMiddleware, HazardController.report);
router.put('/:id', HazardController.update);

export default router;
