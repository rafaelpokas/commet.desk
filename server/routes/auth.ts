import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Login
router.post('/login', (req: Request, res: Response) => {
  const { email, userId } = req.body;
  const users = db.getUsers();

  let targetUser = users.find(u => u.id === userId);
  if (!targetUser && email) {
    targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  if (!targetUser) {
    return res.status(401).json({
      error: 'Credenciais inválidas',
      message: 'Usuário não encontrado no sistema Commet.'
    });
  }

  if (targetUser.status !== 'active') {
    return res.status(403).json({
      error: 'Acesso revogado',
      message: 'Este usuário está desativado no sistema.'
    });
  }

  return res.json({
    token: targetUser.id,
    user: targetUser
  });
});

// Current user
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    user: req.user
  });
});

// Users list for switching profiles in demo/evaluation mode
router.get('/demo-users', (req: Request, res: Response) => {
  const users = db.getUsers();
  return res.json({ users });
});

// Reset database to initial seed for automated or manual test runs
router.post('/reset-db', (req: Request, res: Response) => {
  const freshData = db.resetToDefault();
  return res.json({
    success: true,
    message: 'Banco de dados reinicializado para o estado padrão de demonstração e homologação.',
    counts: {
      users: freshData.users.length,
      clients: freshData.clients.length,
      deliveries: freshData.deliveries.length,
      tasks: freshData.tasks.length
    }
  });
});

export default router;
