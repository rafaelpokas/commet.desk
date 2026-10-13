import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireStaff, AuthenticatedRequest } from '../auth.js';
import { ClientChannelAssignee, Channel } from '../types.js';

const router = Router();

// List channel assignees
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const all = db.getChannelAssignees();

  if (currentUser.role === 'admin' || currentUser.role === 'employee') {
    return res.json({ assignees: all });
  }

  // Client user sees only their client's configuration
  const clientOnly = all.filter(a => a.clientId === currentUser.clientId);
  return res.json({ assignees: clientOnly });
});

// Update or set default assignee for (clientId, channel) (RF06, AC03)
router.post('/', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { clientId, channel, defaultAssigneeId } = req.body;

  if (!clientId || !channel || !defaultAssigneeId) {
    return res.status(400).json({
      error: 'Dados incompletos',
      message: 'clientId, channel e defaultAssigneeId são obrigatórios.'
    });
  }

  const assigneeUser = db.getUsers().find(u => u.id === defaultAssigneeId);
  if (!assigneeUser) {
    return res.status(404).json({ error: 'Usuário responsável não encontrado.' });
  }

  const list = db.getChannelAssignees();
  const existingIndex = list.findIndex(a => a.clientId === clientId && a.channel === channel);

  if (existingIndex >= 0) {
    list[existingIndex].defaultAssigneeId = defaultAssigneeId;
  } else {
    const newItem: ClientChannelAssignee = {
      id: `cca_${Date.now()}`,
      clientId,
      channel: channel as Channel,
      defaultAssigneeId
    };
    list.push(newItem);
  }

  db.save();

  return res.json({
    message: `Responsável padrão do canal ${channel} atualizado para ${assigneeUser.name}. Entregas existentes não foram alteradas (RF06).`,
    assignees: list
  });
});

export default router;
