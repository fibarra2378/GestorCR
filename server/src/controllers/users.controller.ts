import { Request, Response } from 'express';
import { prisma } from '../db';
import crypto from 'crypto';
import { AuditService } from '../services/audit.service';
import { UserRole } from '@prisma/client';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class UsersController {
  /**
   * GET /api/users
   * List all operators/admin users
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: users });
    } catch (error) {
      console.error('[GET USERS ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al consultar operadores' });
    }
  }

  /**
   * POST /api/users
   * Create a new operator or admin user
   */
  static async createUser(req: Request, res: Response) {
    try {
      const { username, name, password, role } = req.body;
      const currentUserId = (req as any).user?.id;

      if (!username || !name || !password) {
        return res.status(400).json({ success: false, error: 'Nombre de usuario, Nombre y Contraseña son obligatorios' });
      }

      const existing = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() }
      });

      if (existing) {
        return res.status(400).json({ success: false, error: 'El nombre de usuario ya existe en el sistema' });
      }

      const user = await prisma.user.create({
        data: {
          username: username.trim().toLowerCase(),
          name: name.trim(),
          passwordHash: hashPassword(password),
          role: role === 'ADMIN' ? UserRole.ADMIN : UserRole.OPERADOR
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      await AuditService.log({
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        userId: currentUserId,
        details: `Nuevo usuario creado: ${user.username} (${user.role})`
      });

      return res.json({ success: true, data: user });
    } catch (error) {
      console.error('[CREATE USER ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al registrar operador' });
    }
  }

  /**
   * DELETE /api/users/:id
   * Delete an operator user
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = (req as any).user?.id;

      if (id === currentUserId) {
        return res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta activa' });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      await prisma.user.delete({ where: { id } });

      await AuditService.log({
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
        userId: currentUserId,
        details: `Usuario eliminado: ${user.username}`
      });

      return res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
      console.error('[DELETE USER ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
    }
  }
}
