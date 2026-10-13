import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { User, UserRole } from '../types.js';

const router = Router();

// List users (Staff can view team/contacts; Client only sees their own contact)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const allUsers = db.getUsers();

  if (currentUser.role === 'admin' || currentUser.role === 'employee') {
    return res.json({ users: allUsers });
  }

  // Client user can only see contacts from their own client
  const clientUsers = allUsers.filter(u => u.clientId === currentUser.clientId);
  return res.json({ users: clientUsers });
});

// Admin only: Create/Invite new user (AC02 blocks employee)
router.post('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, role, clientId, title, avatarUrl } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({
      error: 'Dados incompletos',
      message: 'Nome, e-mail e papel são obrigatórios.'
    });
  }

  const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({
      error: 'E-mail em uso',
      message: 'Já existe um usuário cadastrado com este e-mail.'
    });
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name,
    email,
    role: role as UserRole,
    clientId: (role === 'client_approver' || role === 'client_viewer') ? clientId : undefined,
    title: title || '',
    avatarUrl,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  db.getUsers().push(newUser);
  db.save();

  return res.status(201).json({
    user: newUser,
    message: 'Usuário cadastrado com sucesso.'
  });
});

// Admin only: Change user role (AC02 blocks employee)
router.patch('/:id/role', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const targetUser = db.getUsers().find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  targetUser.role = role as UserRole;
  db.save();

  return res.json({
    user: targetUser,
    message: `Papel atualizado para ${role}.`
  });
});

// Admin only: Deactivate user (RF03, AC14)
router.patch('/:id/deactivate', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetUser = db.getUsers().find(u => u.id === id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  targetUser.status = 'inactive';

  // RF03, AC14: Open tasks assigned to this user enter the unassigned reallocation queue
  const tasks = db.getTasks().filter(t => t.assigneeId === id && !t.completed);
  for (const t of tasks) {
    t.assigneeId = undefined;
    t.assigneeName = undefined;
    t.version += 1;
  }

  // Also check open deliveries where primaryAssignee is this user
  const openDeliveries = db.getDeliveries().filter(d => 
    d.primaryAssigneeId === id && 
    d.productionStatus !== 'publicado' && 
    d.productionStatus !== 'cancelado'
  );

  db.save();

  return res.json({
    user: targetUser,
    reallocatedTasksCount: tasks.length,
    openDeliveriesCount: openDeliveries.length,
    message: `Usuário ${targetUser.name} desativado. ${tasks.length} tarefa(s) foram movidas para a fila de reatribuição.`
  });
});

// Admin only: Reactivate user
router.patch('/:id/activate', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetUser = db.getUsers().find(u => u.id === id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  targetUser.status = 'active';
  db.save();

  return res.json({
    user: targetUser,
    message: `Usuário ${targetUser.name} reativado com sucesso.`
  });
});

export default router;
