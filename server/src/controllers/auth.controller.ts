import { Request, Response } from 'express';
import { prisma } from '../db';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
      }

      const user = await prisma.user.findUnique({
        where: { username: String(username).toLowerCase().trim() }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      // Basic simple password check (in dev seed password is admin123)
      if (user.passwordHash !== password && user.passwordHash !== `hashed_${password}`) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error: any) {
      console.error('[LOGIN ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error durante el inicio de sesión' });
    }
  }

  static async me(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      return res.json({ success: true, data: decoded });
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }
  }
}
