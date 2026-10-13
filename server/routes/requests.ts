import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireStaff, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { ClientRequest, Delivery, Channel, DeliveryPriority } from '../types.js';

const router = Router();

// GET /api/requests (Client sees only their client's requests - AC01)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  let requests = db.getClientRequests();

  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    requests = requests.filter(r => r.clientId === currentUser.clientId);
  } else {
    const { clientId, status } = req.query;
    if (clientId) requests = requests.filter(r => r.clientId === String(clientId));
    if (status) requests = requests.filter(r => r.status === String(status));
  }

  return res.json({ requests });
});

// POST /api/requests (Client or staff can submit a request)
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { title, description, channel, desiredDate, suggestedPriority, clientId } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Título e descrição são obrigatórios.' });
  }

  // Client user can only submit for their own client
  let targetClientId = clientId;
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    targetClientId = currentUser.clientId!;
  }

  if (!targetClientId) {
    return res.status(400).json({ error: 'Cliente é obrigatório.' });
  }

  const now = new Date().toISOString();
  const newRequest: ClientRequest = {
    id: `req_${Date.now()}`,
    clientId: targetClientId,
    submittedByUserId: currentUser.id,
    submittedByName: currentUser.name,
    title,
    description,
    channel: (channel as Channel) || undefined,
    desiredDate,
    suggestedPriority: (suggestedPriority as DeliveryPriority) || 'media',
    status: 'recebida',
    isOutOfScope: false,
    adminAccepted: false,
    createdAt: now
  };

  db.getClientRequests().push(newRequest);

  // Notify team
  const adminsAndStaff = db.getUsers().filter(u => u.role === 'admin' || u.role === 'employee');
  for (const staff of adminsAndStaff) {
    db.getNotifications().push({
      id: `notif_${Date.now()}_${staff.id}`,
      recipientUserId: staff.id,
      clientId: targetClientId,
      title: 'Nova solicitação recebida do cliente',
      message: `${currentUser.name} enviou a solicitação: "${title}".`,
      linkUrl: '/requests',
      read: false,
      type: 'comentario',
      createdAt: now
    });
  }

  db.save();

  return res.status(201).json({
    request: newRequest,
    message: 'Solicitação registrada com sucesso e encaminhada para triagem da equipe.'
  });
});

// PATCH /api/requests/:id/review (Staff triage: classify, out-of-scope flag, review notes)
router.patch('/:id/review', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, isOutOfScope, reviewNotes } = req.body;

  const request = db.getClientRequests().find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Solicitação não encontrada.' });
  }

  if (status !== undefined) request.status = status;
  if (isOutOfScope !== undefined) request.isOutOfScope = !!isOutOfScope;
  if (reviewNotes !== undefined) request.reviewNotes = reviewNotes;

  db.save();

  return res.json({
    request,
    message: `Solicitação atualizada. Status: ${request.status}, Fora de escopo: ${request.isOutOfScope ? 'Sim (requer aceite do administrador)' : 'Não'}.`
  });
});

// POST /api/requests/:id/admin-accept (Admin accepts out-of-scope request - RF17, AC15)
router.post('/:id/admin-accept', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const request = db.getClientRequests().find(r => r.id === id);

  if (!request) {
    return res.status(404).json({ error: 'Solicitação não encontrada.' });
  }

  const now = new Date().toISOString();
  request.adminAccepted = true;
  request.adminAcceptedBy = req.user!.name;
  request.adminAcceptedAt = now;
  request.status = 'aceita';

  db.save();

  return res.json({
    request,
    message: `Solicitação fora de escopo aceita pelo Administrador ${req.user!.name}. Pronta para ser convertida em entrega contratual (AC15).`
  });
});

// POST /api/requests/:id/convert (Convert request into delivery - AC15 check)
router.post('/:id/convert', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { competenceMonth } = req.body;

  const request = db.getClientRequests().find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Solicitação não encontrada.' });
  }

  // AC15 CHECK: If out of scope, MUST have adminAccepted = true
  if (request.isOutOfScope && !request.adminAccepted) {
    return res.status(400).json({
      error: 'Aprovação administrativa pendente (AC15)',
      message: 'Esta solicitação foi marcada como FORA DO ESCOPO contratado. Ela exige aceite formal do Administrador antes de ser convertida em entrega.'
    });
  }

  const competence = competenceMonth || new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString();
  const deliveryId = `del_${Date.now()}`;

  // Default assignee
  const channel = request.channel || 'instagram';
  const defaultAssignee = db.getChannelAssignees().find(a => a.clientId === request.clientId && a.channel === channel);
  const assigneeId = defaultAssignee?.defaultAssigneeId || req.user!.id;
  const assigneeName = db.getUsers().find(u => u.id === assigneeId)?.name || req.user!.name;

  const newDelivery: Delivery = {
    id: deliveryId,
    clientId: request.clientId,
    competenceMonth: competence,
    title: request.title,
    channel: channel as Channel,
    format: 'estatico',
    priority: request.suggestedPriority,
    visibility: 'shared',
    primaryAssigneeId: assigneeId,
    primaryAssigneeName: assigneeName,
    productionStatus: 'em_producao',
    isBlocked: false,
    internalDeadline: request.desiredDate ? `${request.desiredDate}T18:00:00Z` : undefined,
    approvalDeadline: request.desiredDate ? `${request.desiredDate}T18:00:00Z` : undefined,
    scheduledPublicationDate: request.desiredDate ? `${request.desiredDate}T18:00:00Z` : undefined,
    originalScheduledPublicationDate: request.desiredDate ? `${request.desiredDate}T18:00:00Z` : undefined,
    briefing: `Originada da solicitação: ${request.description}`,
    copywriting: '',
    mediaUrls: request.attachments || [],
    currentVersionNumber: 1,
    versions: [
      {
        versionNumber: 1,
        title: request.title,
        briefing: request.description,
        copywriting: '',
        mediaUrls: request.attachments || [],
        channel: channel as Channel,
        scheduledPublicationDate: request.desiredDate ? `${request.desiredDate}T18:00:00Z` : undefined,
        changeSummary: 'Versão gerada a partir de solicitação convertida.',
        createdAt: now,
        createdByUserId: req.user!.id,
        createdByName: req.user!.name
      }
    ],
    approvalStatus: 'nao_solicitado',
    isScheduledConfirmed: false,
    createdAt: now,
    updatedAt: now
  };

  db.getDeliveries().push(newDelivery);

  request.status = 'convertida';
  request.convertedDeliveryId = deliveryId;

  db.save();

  return res.json({
    delivery: newDelivery,
    request,
    message: `Solicitação convertida em entrega com sucesso (ID: ${deliveryId}).`
  });
});

export default router;
