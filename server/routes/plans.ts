import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireStaff, AuthenticatedRequest } from '../auth.js';
import { MonthlyObligation, MonthlyPlanLog, Delivery, Channel } from '../types.js';

const router = Router();

// GET /api/plans/obligations?clientId=...
router.get('/obligations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { clientId } = req.query;
  const currentUser = req.user!;
  let obligations = db.getMonthlyObligations();

  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    obligations = obligations.filter(o => o.clientId === currentUser.clientId);
  } else if (clientId) {
    obligations = obligations.filter(o => o.clientId === String(clientId));
  }

  return res.json({ obligations });
});

// POST /api/plans/obligations (Staff only)
router.post('/obligations', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { clientId, channel, format, monthlyQuantity, titleTemplate } = req.body;

  if (!clientId || !channel || !monthlyQuantity) {
    return res.status(400).json({ error: 'clientId, channel e monthlyQuantity são obrigatórios.' });
  }

  const newObligation: MonthlyObligation = {
    id: `obl_${Date.now()}`,
    clientId,
    channel: channel as Channel,
    format: format || 'estatico',
    monthlyQuantity: Number(monthlyQuantity),
    titleTemplate: titleTemplate || `${channel.toUpperCase()} - Post #{n}`
  };

  db.getMonthlyObligations().push(newObligation);
  db.save();

  return res.status(201).json({
    obligation: newObligation,
    message: 'Obrigação mensal configurada com sucesso.'
  });
});

// POST /api/plans/generate (Idempotent monthly generation - RF08, AC13)
router.post('/generate', requireAuth, requireStaff, (req: AuthenticatedRequest, res: Response) => {
  const { clientId, competenceMonth } = req.body;

  if (!clientId || !competenceMonth) {
    return res.status(400).json({ error: 'clientId e competenceMonth (ex: 2026-10) são obrigatórios.' });
  }

  const client = db.getClients().find(c => c.id === clientId);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  const existingDeliveries = db.getDeliveries().filter(d => 
    d.clientId === clientId && 
    d.competenceMonth === competenceMonth
  );

  const obligations = db.getMonthlyObligations().filter(o => o.clientId === clientId);
  if (obligations.length === 0) {
    return res.status(400).json({
      error: 'Sem obrigações cadastradas',
      message: 'Não há obrigações cadastradas para este cliente.'
    });
  }

  // Idempotency check: see if plan was already generated
  const existingLog = db.getMonthlyPlanLogs().find(l => 
    l.clientId === clientId && 
    l.competenceMonth === competenceMonth
  );

  const createdDeliveries: Delivery[] = [];
  const now = new Date().toISOString();

  // For each obligation, check how many already exist for that channel in this competence
  for (const obl of obligations) {
    const existingCountForChannel = existingDeliveries.filter(d => d.channel === obl.channel).length;
    const remainingToCreate = Math.max(0, obl.monthlyQuantity - existingCountForChannel);

    if (remainingToCreate === 0) {
      // Idempotent: already fulfilled or generated, do not duplicate! (AC13)
      continue;
    }

    // Default assignee for this channel
    const defaultAssignee = db.getChannelAssignees().find(a => a.clientId === clientId && a.channel === obl.channel);
    let assigneeId = defaultAssignee?.defaultAssigneeId || req.user!.id;
    let assigneeName = db.getUsers().find(u => u.id === assigneeId)?.name || 'Responsável';

    for (let i = 1; i <= remainingToCreate; i++) {
      const postNumber = existingCountForChannel + i;
      const title = obl.titleTemplate.replace('{n}', String(postNumber));
      const deliveryId = `del_${Date.now()}_${obl.channel}_${postNumber}`;

      const newDelivery: Delivery = {
        id: deliveryId,
        clientId,
        competenceMonth,
        title,
        channel: obl.channel,
        format: obl.format as any,
        priority: 'media',
        visibility: 'internal', // Starts internal until production/review
        primaryAssigneeId: assigneeId,
        primaryAssigneeName: assigneeName,
        productionStatus: 'nao_iniciado',
        isBlocked: false,
        internalDeadline: `${competenceMonth}-15T18:00:00Z`,
        approvalDeadline: `${competenceMonth}-20T18:00:00Z`,
        scheduledPublicationDate: `${competenceMonth}-25T15:00:00Z`,
        originalScheduledPublicationDate: `${competenceMonth}-25T15:00:00Z`,
        briefing: `Obrigação mensal recorrente de ${obl.channel} planejada para a competência ${competenceMonth}.`,
        copywriting: '',
        mediaUrls: [],
        currentVersionNumber: 1,
        versions: [],
        approvalStatus: 'nao_solicitado',
        isScheduledConfirmed: false,
        createdAt: now,
        updatedAt: now
      };

      db.getDeliveries().push(newDelivery);
      createdDeliveries.push(newDelivery);
    }
  }

  // Update or create log
  if (existingLog) {
    existingLog.deliveriesCount += createdDeliveries.length;
    existingLog.generatedAt = now;
  } else {
    const newLog: MonthlyPlanLog = {
      id: `mpl_${Date.now()}`,
      clientId,
      competenceMonth,
      generatedAt: now,
      generatedByUserId: req.user!.id,
      deliveriesCount: createdDeliveries.length
    };
    db.getMonthlyPlanLogs().push(newLog);
  }

  db.save();

  return res.json({
    success: true,
    alreadyGenerated: !!existingLog,
    createdCount: createdDeliveries.length,
    existingCount: existingDeliveries.length,
    message: createdDeliveries.length > 0
      ? `Plano mensal gerado: ${createdDeliveries.length} nova(s) entrega(s) criada(s) para a competência ${competenceMonth}. Nenhuma entrega duplicada (AC13).`
      : `O plano da competência ${competenceMonth} já estava 100% gerado. Nenhuma entrega duplicada (AC13).`
  });
});

export default router;
