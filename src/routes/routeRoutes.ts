import { Router } from 'express';
import { RouteController } from '../controllers/routeController';

const router = Router();

router.post('/', RouteController.getRoutes);
router.post('/safe', RouteController.compareSafe);

export default router;
