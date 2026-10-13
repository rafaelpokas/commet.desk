import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { Comment, Notification } from '../types.js';

const router = Router();

// GET /api/comments?deliveryId=... (Strict isolation and internal comment filtering - AC01, AC06)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { deliveryId } = req.query;
  const currentUser = req.user!;
  let comments = db.getComments();

  if (deliveryId) {
    comments = comments.filter(c => c.deliveryId === String(deliveryId));
  }

  // Client user isolation (AC01, AC06):
  // 1. Must belong to client's company
  // 2. Can NEVER see internal comments (isInternal === false only)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    comments = comments.filter(c => c.clientId === currentUser.clientId && !c.isInternal);
  }

  return res.json({ comments });
});

// POST /api/comments
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { deliveryId, content, isInternal, versionNumberTarget } = req.body;
  const currentUser = req.user!;

  if (!deliveryId || !content || !content.trim()) {
    return res.status(400).json({ error: 'deliveryId e content são obrigatórios.' });
  }

  const delivery = db.getDeliveries().find(d => d.id === deliveryId);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada.' });
  }

  // Client isolation check (AC01)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    if (delivery.clientId !== currentUser.clientId) {
      return res.status(403).json({ error: 'Acesso Proibido', message: 'Acesso negado: isolamento de dados do cliente.' });
    }
  }

  // Client users CANNOT post internal comments (AC06)
  const actualIsInternal = (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') 
    ? false 
    : !!isInternal;

  const now = new Date().toISOString();
  const newComment: Comment = {
    id: `cmt_${Date.now()}`,
    deliveryId,
    clientId: delivery.clientId,
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorRole: currentUser.role,
    content: content.trim(),
    isInternal: actualIsInternal,
    versionNumberTarget: versionNumberTarget ? Number(versionNumberTarget) : delivery.currentVersionNumber,
    createdAt: now
  };

  db.getComments().push(newComment);

  // Send notifications
  if (!actualIsInternal) {
    // If client commented, notify assigned staff
    if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
      const staffMember = db.getUsers().find(u => u.id === delivery.primaryAssigneeId);
      if (staffMember) {
        db.getNotifications().push({
          id: `notif_${Date.now()}`,
          recipientUserId: staffMember.id,
          clientId: delivery.clientId,
          title: 'Novo comentário compartilhado do cliente',
          message: `${currentUser.name} comentou na entrega "${delivery.title}": "${content.slice(0, 60)}..."`,
          linkUrl: '/deliveries',
          read: false,
          type: 'comentario',
          createdAt: now
        });
      }
    } else {
      // If staff posted a shared comment, notify client
      const clientApprover = db.getUsers().find(u => u.clientId === delivery.clientId && u.role === 'client_approver');
      if (clientApprover) {
        db.getNotifications().push({
          id: `notif_${Date.now()}`,
          recipientUserId: clientApprover.id,
          clientId: delivery.clientId,
          title: 'Novo comentário da equipe na entrega',
          message: `${currentUser.name} comentou em "${delivery.title}": "${content.slice(0, 60)}..."`,
          linkUrl: '/portal/approvals',
          read: false,
          type: 'comentario',
          createdAt: now
        });
      }
    }
  }

  db.save();

  return res.status(201).json({
    comment: newComment,
    message: actualIsInternal ? 'Comentário interno adicionado (visível apenas para a equipe).' : 'Comentário compartilhado adicionado.'
  });
});

export default router;
