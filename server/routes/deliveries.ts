import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireStaff, AuthenticatedRequest } from '../auth.js';
import {
  Delivery,
  DeliveryVersion,
  ProductionStatus,
  ApprovalStatus,
  DeliveryPriority,
  DeliveryVisibility,
  Channel,
  AuditLog,
  Notification
} from '../types.js';

const router = Router();

// Helper to check content changes requiring new version (RF10, AC07)
function hasContentChanged(
  current: DeliveryVersion | undefined,
  title: string,
  copywriting: string,
  mediaUrls: string[],
  channel: Channel,
  scheduledPublicationDate?: string
): boolean {
  if (!current) return true;
  if (current.title !== title) return true;
  if (current.copywriting !== copywriting) return true;
  if (current.channel !== channel) return true;
  if (current.scheduledPublicationDate !== scheduledPublicationDate) return true;
  if (JSON.stringify(current.mediaUrls || []) !== JSON.stringify(mediaUrls || [])) return true;
  return false;
}

// GET /api/deliveries (Filterable, strictly isolated for client users - AC01, AC06)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  let deliveries = db.getDeliveries();

  // Strict client isolation (AC01, AC06)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    deliveries = deliveries.filter(d => d.clientId === currentUser.clientId && d.visibility === 'shared');
  } else {
    // Staff filtering
    const { clientId } = req.query;
    if (clientId) {
      deliveries = deliveries.filter(d => d.clientId === String(clientId));
    }
  }

  // Common filters
  const { competence, channel, productionStatus, approvalStatus, campaignId, assigneeId, priority, blocked, search } = req.query;

  if (competence) deliveries = deliveries.filter(d => d.competenceMonth === String(competence));
  if (channel) deliveries = deliveries.filter(d => d.channel === String(channel));
  if (productionStatus) deliveries = deliveries.filter(d => d.productionStatus === String(productionStatus));
  if (approvalStatus) deliveries = deliveries.filter(d => d.approvalStatus === String(approvalStatus));
  if (campaignId) deliveries = deliveries.filter(d => d.campaignId === String(campaignId));
  if (assigneeId) deliveries = deliveries.filter(d => d.primaryAssigneeId === String(assigneeId));
  if (priority) deliveries = deliveries.filter(d => d.priority === String(priority));
  if (blocked !== undefined) deliveries = deliveries.filter(d => d.isBlocked === (blocked === 'true'));
  if (search) {
    const s = String(search).toLowerCase();
    deliveries = deliveries.filter(d => d.title.toLowerCase().includes(s) || d.copywriting.toLowerCase().includes(s));
  }

  return res.json({ deliveries });
});

// GET /api/deliveries/:id (Strict isolation check - AC01, AC06)
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user!;
  const delivery = db.getDeliveries().find(d => d.id === id);

  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  // Client user isolation check (AC01, AC06)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    if (delivery.clientId !== currentUser.clientId || delivery.visibility !== 'shared') {
      return res.status(403).json({
        error: 'Acesso Proibido',
        message: 'Acesso negado: você não tem permissão para visualizar esta entrega.'
      });
    }
  }

  return res.json({ delivery });
});

// POST /api/deliveries (Staff only, auto default assignee by channel - RF06, AC03)
router.post('/', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const {
    clientId,
    competenceMonth,
    campaignId,
    title,
    channel,
    format,
    priority,
    visibility,
    briefing,
    copywriting,
    mediaUrls,
    internalDeadline,
    approvalDeadline,
    scheduledPublicationDate,
    primaryAssigneeId,
    designatedApproverId
  } = req.body;

  if (!clientId || !competenceMonth || !title || !channel) {
    return res.status(400).json({
      error: 'Dados incompletos',
      message: 'Cliente, competência, título e canal são obrigatórios.'
    });
  }

  const client = db.getClients().find(c => c.id === clientId && c.status === 'active');
  if (!client || !client.channels.includes(channel)) return res.status(400).json({ error: 'Cliente ou canal inválido.' });
  if (designatedApproverId && !db.getUsers().some(u => u.id === designatedApproverId && u.clientId === clientId && u.role === 'client_approver' && u.status === 'active')) return res.status(400).json({ error: 'Aprovador inválido para este cliente.' });

  // RF06, AC03: Look up default assignee if not explicitly provided
  let assigneeId = primaryAssigneeId;
  let assigneeName = '';

  if (!assigneeId) {
    const channelDefault = db.getChannelAssignees().find(a => a.clientId === clientId && a.channel === channel);
    if (channelDefault) {
      assigneeId = channelDefault.defaultAssigneeId;
    } else {
      assigneeId = req.user!.id;
    }
  }

  const assigneeUser = db.getUsers().find(u => u.id === assigneeId);
  assigneeName = assigneeUser ? assigneeUser.name : 'Responsável';

  const now = new Date().toISOString();
  const deliveryId = `del_${Date.now()}`;

  const initialVersion: DeliveryVersion = {
    versionNumber: 1,
    title,
    briefing: briefing || '',
    copywriting: copywriting || '',
    mediaUrls: mediaUrls || [],
    channel: channel as Channel,
    scheduledPublicationDate,
    changeSummary: 'Versão inicial gerada pela equipe.',
    createdAt: now,
    createdByUserId: req.user!.id,
    createdByName: req.user!.name
  };

  const newDelivery: Delivery = {
    id: deliveryId,
    clientId,
    competenceMonth,
    campaignId: campaignId || undefined,
    title,
    channel: channel as Channel,
    format: format || 'estatico',
    priority: (priority as DeliveryPriority) || 'media',
    visibility: (visibility as DeliveryVisibility) || 'internal',
    primaryAssigneeId: assigneeId,
    primaryAssigneeName: assigneeName,
    productionStatus: 'nao_iniciado',
    isBlocked: false,
    internalDeadline,
    approvalDeadline,
    originalScheduledPublicationDate: scheduledPublicationDate,
    scheduledPublicationDate,
    briefing: briefing || '',
    copywriting: copywriting || '',
    mediaUrls: mediaUrls || [],
    currentVersionNumber: 1,
    versions: [initialVersion],
    approvalStatus: 'nao_solicitado',
    designatedApproverId: designatedApproverId || db.getUsers().find(u => u.clientId === clientId && u.role === 'client_approver' && u.status === 'active')?.id,
    isScheduledConfirmed: false,
    createdAt: now,
    updatedAt: now
  };

  db.getDeliveries().push(newDelivery);

  // Audit log
  const auditLog: AuditLog = {
    id: `aud_${Date.now()}`,
    deliveryId,
    clientId,
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: `Criação da entrega para o canal ${channel} atribuída a ${assigneeName}`,
    isPublicForClient: newDelivery.visibility === 'shared',
    createdAt: now
  };
  db.getAuditLogs().push(auditLog);

  db.save();

  return res.status(201).json({
    delivery: newDelivery,
    message: `Entrega criada com sucesso para ${channel}. Responsável atribuído: ${assigneeName} (RF06).`
  });
});

// PUT /api/deliveries/:id (Staff update, content changes invalidate approval & create new version - RF10, AC07)
router.put('/:id', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const delivery = db.getDeliveries().find(d => d.id === id);

  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  if (req.body.expectedUpdatedAt && req.body.expectedUpdatedAt !== delivery.updatedAt) return res.status(409).json({ error: 'A entrega foi alterada. Recarregue antes de salvar.' });
  if (delivery.productionStatus === 'publicado') return res.status(409).json({ error: 'Entrega publicada preserva o histórico. Crie uma nova entrega para republicar.' });

  const {
    title,
    briefing,
    copywriting,
    mediaUrls,
    channel,
    format,
    priority,
    visibility,
    primaryAssigneeId,
    internalDeadline,
    approvalDeadline,
    scheduledPublicationDate,
    designatedApproverId,
    changeSummary
  } = req.body;

  const now = new Date().toISOString();
  const currentVersion = delivery.versions.find(v => v.versionNumber === delivery.currentVersionNumber);

  // Check if core content has changed (RF10, AC07)
  const contentChanged = (briefing !== undefined && briefing !== delivery.briefing) || hasContentChanged(
    currentVersion,
    title ?? delivery.title,
    copywriting ?? delivery.copywriting,
    mediaUrls ?? delivery.mediaUrls,
    channel ?? delivery.channel,
    scheduledPublicationDate ?? delivery.scheduledPublicationDate
  );

  let newVersionCreated = false;
  let oldApprovalStatus = delivery.approvalStatus;

  // If content changed and delivery had an approved version or was submitted for approval (RF10, AC07)
  if (contentChanged && (currentVersion?.decision || delivery.approvalStatus !== 'nao_solicitado')) {
    const nextVersionNum = delivery.currentVersionNumber + 1;
    const newVersion: DeliveryVersion = {
      versionNumber: nextVersionNum,
      title: title ?? delivery.title,
      briefing: briefing ?? delivery.briefing,
      copywriting: copywriting ?? delivery.copywriting,
      mediaUrls: mediaUrls ?? delivery.mediaUrls,
      channel: (channel ?? delivery.channel) as Channel,
      scheduledPublicationDate: scheduledPublicationDate ?? delivery.scheduledPublicationDate,
      changeSummary: changeSummary || 'Alteração de conteúdo que invalida aprovação anterior.',
      createdAt: now,
      createdByUserId: req.user!.id,
      createdByName: req.user!.name
    };

    delivery.versions.push(newVersion);
    delivery.currentVersionNumber = nextVersionNum;
    delivery.approvalStatus = 'nao_solicitado';
    delivery.productionStatus = 'em_producao';
    delivery.isScheduledConfirmed = false;
    newVersionCreated = true;

    // Audit log
    db.getAuditLogs().push({
      id: `aud_${Date.now()}_v`,
      deliveryId: delivery.id,
      clientId: delivery.clientId,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: `Nova versão v${nextVersionNum} criada. Aprovação anterior (${oldApprovalStatus}) foi invalidada (RF10, AC07).`,
      fieldChanged: 'version',
      oldValue: `v${delivery.currentVersionNumber - 1}`,
      newValue: `v${nextVersionNum}`,
      isPublicForClient: true,
      createdAt: now
    });
  }

  // Update standard fields
  if (title !== undefined) delivery.title = title;
  if (briefing !== undefined) delivery.briefing = briefing;
  if (copywriting !== undefined) delivery.copywriting = copywriting;
  if (mediaUrls !== undefined) delivery.mediaUrls = mediaUrls;
  if (channel !== undefined) delivery.channel = channel;
  if (format !== undefined) delivery.format = format;
  if (priority !== undefined) delivery.priority = priority;
  if (visibility !== undefined) delivery.visibility = visibility;
  if (internalDeadline !== undefined) delivery.internalDeadline = internalDeadline;
  if (approvalDeadline !== undefined) delivery.approvalDeadline = approvalDeadline;
  if (designatedApproverId !== undefined) delivery.designatedApproverId = designatedApproverId;

  if (scheduledPublicationDate !== undefined) {
    if (!delivery.originalScheduledPublicationDate) {
      delivery.originalScheduledPublicationDate = scheduledPublicationDate;
    }
    delivery.scheduledPublicationDate = scheduledPublicationDate;
  }

  if (primaryAssigneeId !== undefined) {
    const user = db.getUsers().find(u => u.id === primaryAssigneeId);
    if (user) {
      delivery.primaryAssigneeId = user.id;
      delivery.primaryAssigneeName = user.name;
    }
  }

  if (contentChanged && !newVersionCreated) {
    const snapshot: DeliveryVersion = { versionNumber: delivery.currentVersionNumber, title: delivery.title, briefing: delivery.briefing, copywriting: delivery.copywriting, mediaUrls: [...delivery.mediaUrls], channel: delivery.channel, scheduledPublicationDate: delivery.scheduledPublicationDate, createdAt: now, createdByUserId: req.user!.id, createdByName: req.user!.name };
    const idx = delivery.versions.findIndex(v => v.versionNumber === delivery.currentVersionNumber);
    if (idx < 0) delivery.versions.push(snapshot); else delivery.versions[idx] = snapshot;
  }
  delivery.updatedAt = now;
  db.save();

  return res.json({
    delivery,
    newVersionCreated,
    message: newVersionCreated 
      ? `Conteúdo modificado. A versão v${delivery.currentVersionNumber} foi criada e requer nova aprovação (AC07).`
      : 'Entrega atualizada com sucesso.'
  });
});

// POST /api/deliveries/:id/send-approval (Send to client for approval)
router.post('/:id/send-approval', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const delivery = db.getDeliveries().find(d => d.id === id);

  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  if (delivery.approvalStatus === 'aguardando_aprovacao') return res.json({ delivery, message: 'Esta versão já está aguardando aprovação.' });
  if (delivery.approvalStatus === 'aprovado' || delivery.productionStatus === 'publicado') return res.status(409).json({ error: 'Esta versão já foi aprovada.' });
  if (['reprovado', 'ajustes_solicitados'].includes(delivery.approvalStatus)) return res.status(409).json({ error: 'Edite o conteúdo para criar uma nova versão antes de reenviar.' });

  // Check if closed version exists
  let currentVersion = delivery.versions.find(v => v.versionNumber === delivery.currentVersionNumber);
  const now = new Date().toISOString();

  if (!currentVersion) {
    currentVersion = {
      versionNumber: delivery.currentVersionNumber,
      title: delivery.title,
      briefing: delivery.briefing,
      copywriting: delivery.copywriting,
      mediaUrls: delivery.mediaUrls,
      channel: delivery.channel,
      scheduledPublicationDate: delivery.scheduledPublicationDate,
      changeSummary: 'Versão fechada enviada para aprovação.',
      createdAt: now,
      createdByUserId: req.user!.id,
      createdByName: req.user!.name
    };
    delivery.versions.push(currentVersion);
  }

  delivery.visibility = 'shared'; // Make shared in portal
  delivery.productionStatus = 'revisao_interna';
  delivery.approvalStatus = 'aguardando_aprovacao';
  delivery.updatedAt = now;

  // Notify client approver
  const clientApprover = db.getUsers().find(u => u.clientId === delivery.clientId && u.role === 'client_approver');
  if (clientApprover) {
    const notif: Notification = {
      id: `notif_${Date.now()}`,
      recipientUserId: clientApprover.id,
      clientId: delivery.clientId,
      title: 'Nova entrega aguardando sua aprovação',
      message: `A entrega "${delivery.title}" (v${delivery.currentVersionNumber}) está disponível no portal para validação.`,
      linkUrl: `/portal/approvals`,
      read: false,
      type: 'envio_aprovacao',
      createdAt: now
    };
    db.getNotifications().push(notif);
  }

  // Audit log
  db.getAuditLogs().push({
    id: `aud_${Date.now()}`,
    deliveryId: delivery.id,
    clientId: delivery.clientId,
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: `Versão v${delivery.currentVersionNumber} enviada para aprovação do cliente.`,
    fieldChanged: 'approvalStatus',
    oldValue: 'nao_solicitado',
    newValue: 'aguardando_aprovacao',
    isPublicForClient: true,
    createdAt: now
  });

  db.save();

  return res.json({
    delivery,
    message: `Versão v${delivery.currentVersionNumber} disponibilizada para aprovação do cliente no portal.`
  });
});

// POST /api/deliveries/:id/approval-decision (Client approves, requests adjustments, or rejects - RF10, RF11, AC07, AC08, AC10)
router.post('/:id/approval-decision', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { versionNumber, decision, feedbackNotes } = req.body;
  const currentUser = req.user!;

  const delivery = db.getDeliveries().find(d => d.id === id);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  // Isolation check: client user must belong to this delivery's client (AC01)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    if (delivery.clientId !== currentUser.clientId) {
      return res.status(403).json({
        error: 'Acesso Proibido',
        message: 'Acesso negado: isolamento de dados do cliente.'
      });
    }
  }

  // Only client_approver can make decisions (RF01, AC01)
  if (currentUser.role !== 'client_approver' && currentUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Sem permissão de aprovação',
      message: 'Apenas contatos cadastrados como Aprovador do Cliente podem registrar decisões de aprovação.'
    });
  }

  if (!decision || !['aprovado', 'ajustes_solicitados', 'reprovado'].includes(decision)) {
    return res.status(400).json({
      error: 'Decisão inválida',
      message: 'A decisão deve ser "aprovado", "ajustes_solicitados" ou "reprovado".'
    });
  }

  // AC08: Outdated version rejection
  if (Number(versionNumber) !== delivery.currentVersionNumber) {
    return res.status(409).json({
      error: 'Versão desatualizada (AC08)',
      message: `A decisão foi recusada: você tentou aprovar a versão v${versionNumber}, mas a versão vigente no servidor é v${delivery.currentVersionNumber}. Por favor atualize a página e revise a versão atual.`
    });
  }

  if (delivery.visibility !== 'shared' || delivery.approvalStatus !== 'aguardando_aprovacao') return res.status(409).json({ error: 'Esta versão não está disponível para decisão.' });
  if (currentUser.role !== 'client_approver' || (delivery.designatedApproverId && delivery.designatedApproverId !== currentUser.id)) return res.status(403).json({ error: 'A decisão pertence ao aprovador designado do cliente.' });

  // AC10: Adjustments or Rejection REQUIRES non-empty feedback notes
  if ((decision === 'ajustes_solicitados' || decision === 'reprovado') && (!feedbackNotes || !feedbackNotes.trim())) {
    return res.status(400).json({
      error: 'Justificativa obrigatória (AC10)',
      message: 'Para solicitar ajustes ou reprovar uma entrega, é obrigatório preencher a justificativa com as orientações para a equipe.'
    });
  }

  const now = new Date().toISOString();
  const targetVersion = delivery.versions.find(v => v.versionNumber === delivery.currentVersionNumber);

  if (targetVersion) {
    targetVersion.decision = {
      status: decision,
      decidedByUserId: currentUser.id,
      decidedByName: currentUser.name,
      decidedAt: now,
      feedbackNotes: feedbackNotes?.trim()
    };
  }

  if (decision === 'aprovado') {
    delivery.approvalStatus = 'aprovado';
    // When approved, it stays in current production stage until team advances it to pronto_para_publicar (or moves it directly)
  } else if (decision === 'ajustes_solicitados') {
    // AC10: Returns to 'em_producao'
    delivery.approvalStatus = 'ajustes_solicitados';
    delivery.productionStatus = 'em_producao';
  } else if (decision === 'reprovado') {
    delivery.approvalStatus = 'reprovado';
  }

  delivery.updatedAt = now;

  // Notify team
  const staffToNotify = db.getUsers().filter(u => u.id === delivery.primaryAssigneeId || u.role === 'admin');
  for (const staff of staffToNotify) {
    db.getNotifications().push({
      id: `notif_${Date.now()}_${staff.id}`,
      recipientUserId: staff.id,
      clientId: delivery.clientId,
      title: decision === 'aprovado' ? 'Entrega Aprovada pelo Cliente' : 'Ajustes Solicitados pelo Cliente',
      message: `${currentUser.name} registrou decisão "${decision}" na entrega "${delivery.title}" (v${delivery.currentVersionNumber}).`,
      linkUrl: `/deliveries`,
      read: false,
      type: 'decisao_aprovacao',
      createdAt: now
    });
  }

  // Audit log
  db.getAuditLogs().push({
    id: `aud_${Date.now()}`,
    deliveryId: delivery.id,
    clientId: delivery.clientId,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: `Decisão de aprovação da versão v${delivery.currentVersionNumber}: ${decision}`,
    fieldChanged: 'approvalStatus',
    oldValue: 'aguardando_aprovacao',
    newValue: decision,
    isPublicForClient: true,
    createdAt: now
  });

  db.save();

  return res.json({
    delivery,
    decision,
    message: `Decisão "${decision}" registrada com sucesso na versão v${delivery.currentVersionNumber}.`
  });
});

// POST /api/deliveries/:id/transition-status (Strict server validation for AC09 and AC12)
router.post('/:id/transition-status', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { targetStatus, actualPublicationDate, publicationProof, isScheduledConfirmed, cancellationReason } = req.body;

  const delivery = db.getDeliveries().find(d => d.id === id);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  const validStatuses: ProductionStatus[] = [
    'nao_iniciado',
    'em_producao',
    'revisao_interna',
    'pronto_para_publicar',
    'agendado',
    'publicado',
    'cancelado'
  ];

  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ error: 'Status de produção inválido' });
  }

  // STRICT AC09 CHECK: Advancing to 'pronto_para_publicar', 'agendado' or 'publicado' REQUIRES approvalStatus === 'aprovado'
  if (['pronto_para_publicar', 'agendado', 'publicado'].includes(targetStatus)) {
    if (delivery.approvalStatus !== 'aprovado') {
      return res.status(400).json({
        error: 'Transição bloqueada sem aprovação (AC09)',
        message: `Não é permitido avançar para "${targetStatus}" sem aprovação válida do cliente. Status de aprovação atual: "${delivery.approvalStatus}".`
      });
    }
  }

  // STRICT AC12 CHECK: Marking as 'publicado' requires actualPublicationDate and publicationProof
  if (targetStatus === 'publicado') {
    if (!actualPublicationDate || !publicationProof || !publicationProof.trim()) {
      return res.status(400).json({
        error: 'Evidência de publicação obrigatória (AC12)',
        message: 'Marcar como Publicado exige obrigatoriamente a data real de publicação e o link ou evidência de comprovação.'
      });
    }
    delivery.actualPublicationDate = actualPublicationDate;
    delivery.publicationProof = publicationProof.trim();
  }

  // Agendado confirmation check (RF09, AC12)
  if (targetStatus === 'agendado') {
    if (!isScheduledConfirmed) {
      return res.status(400).json({
        error: 'Confirmação de agendamento obrigatória',
        message: 'Agendar exige confirmação de registro manual na rede social externa.'
      });
    }
    delivery.isScheduledConfirmed = true;
  }

  // Cancelado reason check (RF09)
  if (targetStatus === 'cancelado') {
    if (!cancellationReason || !cancellationReason.trim()) {
      return res.status(400).json({
        error: 'Motivo de cancelamento obrigatório',
        message: 'Cancelar uma entrega exige o preenchimento de justificativa formal.'
      });
    }
    delivery.cancellationReason = cancellationReason.trim();
  }

  const oldStatus = delivery.productionStatus;
  delivery.productionStatus = targetStatus;
  const now = new Date().toISOString();
  delivery.updatedAt = now;

  // Audit log
  db.getAuditLogs().push({
    id: `aud_${Date.now()}`,
    deliveryId: delivery.id,
    clientId: delivery.clientId,
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: `Alteração de status de produção de "${oldStatus}" para "${targetStatus}"`,
    fieldChanged: 'productionStatus',
    oldValue: oldStatus,
    newValue: targetStatus,
    isPublicForClient: delivery.visibility === 'shared',
    createdAt: now
  });

  db.save();

  return res.json({
    delivery,
    message: `Status de produção atualizado com sucesso para "${targetStatus}".`
  });
});

// POST /api/deliveries/:id/toggle-block (Block/unblock delivery with reason)
router.post('/:id/toggle-block', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isBlocked, blockedReason } = req.body;

  const delivery = db.getDeliveries().find(d => d.id === id);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  if (isBlocked && (!blockedReason || !blockedReason.trim())) {
    return res.status(400).json({
      error: 'Motivo obrigatório',
      message: 'Sinalizar impedimento exige o preenchimento do motivo.'
    });
  }

  delivery.isBlocked = !!isBlocked;
  delivery.blockedReason = isBlocked ? blockedReason.trim() : undefined;
  delivery.updatedAt = new Date().toISOString();

  db.save();

  return res.json({
    delivery,
    message: isBlocked ? 'Impedimento registrado.' : 'Impedimento removido.'
  });
});

// POST /api/deliveries/:id/reschedule (Preserves original date for SLA - RF23, AC11)
router.post('/:id/reschedule', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newDate, reason } = req.body;

  const delivery = db.getDeliveries().find(d => d.id === id);
  if (!delivery) {
    return res.status(404).json({ error: 'Entrega não encontrada' });
  }

  if (!newDate) {
    return res.status(400).json({ error: 'Nova data é obrigatória.' });
  }

  if (!Number.isFinite(new Date(newDate).getTime())) return res.status(400).json({ error: 'Data inválida.' });
  if (delivery.productionStatus === 'publicado') return res.status(409).json({ error: 'Não é possível remarcar uma entrega publicada.' });
  if (newDate === delivery.scheduledPublicationDate) return res.json({ delivery, message: 'Data mantida.' });
  const now = new Date().toISOString();
  const currentVersion = delivery.versions.find(v => v.versionNumber === delivery.currentVersionNumber);
  const frozen = currentVersion?.decision || delivery.approvalStatus !== 'nao_solicitado';
  if (frozen) {
    delivery.currentVersionNumber++;
    delivery.approvalStatus = 'nao_solicitado';
    delivery.productionStatus = 'em_producao';
    delivery.isScheduledConfirmed = false;
  }
  const snapshot: DeliveryVersion = {versionNumber:delivery.currentVersionNumber,title:delivery.title,briefing:delivery.briefing,copywriting:delivery.copywriting,mediaUrls:[...delivery.mediaUrls],channel:delivery.channel,scheduledPublicationDate:newDate,changeSummary:reason || 'Remarcação de publicação',createdAt:now,createdByUserId:req.user!.id,createdByName:req.user!.name};
  if (frozen || !currentVersion) delivery.versions.push(snapshot);
  else Object.assign(currentVersion,snapshot);

  // Preserve original scheduled publication date if not yet recorded (RF23, AC11)
  if (!delivery.originalScheduledPublicationDate && delivery.scheduledPublicationDate) {
    delivery.originalScheduledPublicationDate = delivery.scheduledPublicationDate;
  }

  const oldDate = delivery.scheduledPublicationDate;
  delivery.scheduledPublicationDate = newDate;
  delivery.updatedAt = new Date().toISOString();

  // Audit log preserving original date
  db.getAuditLogs().push({
    id: `aud_${Date.now()}`,
    deliveryId: delivery.id,
    clientId: delivery.clientId,
    userId: req.user!.id,
    userName: req.user!.name,
    userRole: req.user!.role,
    action: `Remarcação de data prevista de publicação. Data original preservada (${delivery.originalScheduledPublicationDate}). Motivo: ${reason || 'Ajuste de cronograma'}`,
    fieldChanged: 'scheduledPublicationDate',
    oldValue: oldDate,
    newValue: newDate,
    isPublicForClient: delivery.visibility === 'shared',
    createdAt: new Date().toISOString()
  });

  db.save();

  return res.json({
    delivery,
    message: `Data remarcada com sucesso. Data acordada original preservada para auditoria e indicadores (AC11).`
  });
});

export default router;
