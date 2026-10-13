import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { User } from './types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function getUserFromRequest(req: Request): User | null {
  const authHeader = req.headers.authorization;
  let userId = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7).trim();
  } else if (req.headers['x-user-id']) {
    userId = String(req.headers['x-user-id']).trim();
  }

  if (!userId) {
    return null;
  }

  const user = db.getUsers().find(u => u.id === userId);
  if (!user) {
    return null;
  }

  // Deactivated user check (RF03, AC14)
  if ((user.clientId && db.getClients().find(c => c.id === user.clientId)?.status !== 'active') || user.status !== 'active') {
    return null;
  }

  return user;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Sessão inválida, expirada ou usuário desativado.'
    });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Proibido',
      message: 'Recurso administrativo restrito a administradores do ecossistema Commet.'
    });
  }
  next();
}

export function requireStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
    return res.status(403).json({
      error: 'Acesso Proibido',
      message: 'Acesso restrito à equipe interna da Commet.'
    });
  }
  next();
}

export function validateClientIsolation(user: User, resourceClientId: string): boolean {
  // Staff (admin and employees) can access all clients
  if (user.role === 'admin' || user.role === 'employee') {
    return true;
  }
  // Client can only access their own clientId (AC01)
  return user.clientId === resourceClientId;
}
