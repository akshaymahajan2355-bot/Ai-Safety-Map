import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'road-safety-ai-secret-key-2025';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, vehicle_type = 'car' } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, error: 'Name, email and password required' });
        return;
      }

      const existing = db.findUserByEmail(email);
      if (existing) {
        res.status(400).json({ success: false, error: 'User with this email already exists' });
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);
      const user = db.createUser({
        name,
        email,
        password_hash,
        vehicle_type
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, vehicle_type: user.vehicle_type },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          vehicle_type: user.vehicle_type
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password required' });
        return;
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      // For seeded users or normal password check
      const valid = user.password_hash.startsWith('$2a$')
        ? await bcrypt.compare(password, user.password_hash)
        : password === 'password123';

      if (!valid) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, vehicle_type: user.vehicle_type },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          vehicle_type: user.vehicle_type
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = db.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          vehicle_type: user.vehicle_type,
          created_at: user.created_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
