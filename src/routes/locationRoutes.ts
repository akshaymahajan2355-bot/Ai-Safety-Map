import { Router } from 'express';
import { LocationController } from '../controllers/locationController';

const router = Router();

router.get('/search', LocationController.search);
router.post('/save', LocationController.saveLocationRecord);
router.get('/recent', LocationController.getRecentLocations);
router.get('/details', LocationController.details);
router.get('/current', LocationController.current);
router.post('/current', LocationController.current);
router.post('/reverse', LocationController.reverse);
router.post('/update', LocationController.updateLocationAndCheckHazards);

export default router;
