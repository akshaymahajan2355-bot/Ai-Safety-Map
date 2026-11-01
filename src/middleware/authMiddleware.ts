import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'road-safety-ai-secret-key-2025';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    vehicle_type?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Optional auth - if no token, proceed without user
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      vehicle_type?: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    // Invalid token, proceed without user or return 401 if route strictly requires it
    next();
  }
}
