import { Router } from 'express';
import { AIController } from '../controllers/aiController';

const router = Router();

router.post('/detect', AIController.detect);

export default router;
