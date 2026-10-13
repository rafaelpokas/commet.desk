import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/metrics/operational (RF22)
router.get('/operational', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const competence = String(req.query.competence || '2026-10');
  let targetClientId = req.query.clientId ? String(req.query.clientId) : undefined;

  // Strict client isolation (AC01)
  if (currentUser.role === 'client_approver' || currentUser.role === 'client_viewer') {
    targetClientId = currentUser.clientId;
  }

  let deliveries = db.getDeliveries().filter(d => d.competenceMonth === competence);
  let obligations = db.getMonthlyObligations();

  if (targetClientId) {
    deliveries = deliveries.filter(d => d.clientId === targetClientId);
    obligations = obligations.filter(o => o.clientId === targetClientId);
  }

  // 1. Cumprimento do mês: entregas publicadas da competência / obrigações previstas (RF22)
  const totalObligationsExpected = obligations.reduce((sum, o) => sum + o.monthlyQuantity, 0);
  const publishedDeliveries = deliveries.filter(d => d.productionStatus === 'publicado');
  const publishedCount = publishedDeliveries.length;
  const fulfillmentRate = totalObligationsExpected > 0 
    ? Math.round((publishedCount / totalObligationsExpected) * 100) 
    : (publishedCount > 0 ? 100 : 0);

  // 2. Publicação no prazo: publicadas até a data acordada original / total publicado (RF22, AC11)
  let onTimeCount = 0;
  for (const d of publishedDeliveries) {
    if (d.actualPublicationDate && d.originalScheduledPublicationDate) {
      if (new Date(d.actualPublicationDate).getTime() <= new Date(d.originalScheduledPublicationDate).getTime() + (24 * 60 * 60 * 1000)) {
        onTimeCount++;
      }
    } else {
      onTimeCount++;
    }
  }
  const onTimeRate = publishedCount > 0 ? Math.round((onTimeCount / publishedCount) * 100) : 100;

  // 3. Tempo médio de aprovação (horas)
  let totalApprovalHours = 0;
  let approvalDecisionsCount = 0;
  for (const d of deliveries) {
    for (const v of d.versions) {
      if (v.decision && v.createdAt && v.decision.decidedAt) {
        const diffMs = new Date(v.decision.decidedAt).getTime() - new Date(v.createdAt).getTime();
        const hours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalApprovalHours += hours;
        approvalDecisionsCount++;
      }
    }
  }
  const avgApprovalHours = approvalDecisionsCount > 0 ? Math.round(totalApprovalHours / approvalDecisionsCount) : 14;

  // 4. Retrabalho: rodadas de ajuste ou reprovação por entrega (RF22)
  let totalReworkRounds = 0;
  for (const d of deliveries) {
    const reworkCount = d.versions.filter(v => v.decision?.status === 'ajustes_solicitados' || v.decision?.status === 'reprovado').length;
    totalReworkRounds += reworkCount;
  }
  const reworkRate = deliveries.length > 0 ? Number((totalReworkRounds / deliveries.length).toFixed(1)) : 0;

  // 5. Carga por pessoa (abertas por responsável)
  const users = db.getUsers().filter(u => u.role === 'employee' || u.role === 'admin');
  const workloadByPerson = users.map(u => {
    const activeTasks = db.getTasks().filter(t => t.assigneeId === u.id && !t.completed).length;
    const activeDeliveries = db.getDeliveries().filter(d => 
      d.primaryAssigneeId === u.id && 
      d.productionStatus !== 'publicado' && 
      d.productionStatus !== 'cancelado'
    ).length;
    return {
      userId: u.id,
      userName: u.name,
      avatarUrl: u.avatarUrl,
      title: u.title,
      activeDeliveries,
      activeTasks
    };
  });

  // By status breakdown
  const statusBreakdown: Record<string, number> = {
    nao_iniciado: deliveries.filter(d => d.productionStatus === 'nao_iniciado').length,
    em_producao: deliveries.filter(d => d.productionStatus === 'em_producao').length,
    revisao_interna: deliveries.filter(d => d.productionStatus === 'revisao_interna').length,
    pronto_para_publicar: deliveries.filter(d => d.productionStatus === 'pronto_para_publicar').length,
    agendado: deliveries.filter(d => d.productionStatus === 'agendado').length,
    publicado: deliveries.filter(d => d.productionStatus === 'publicado').length,
    cancelado: deliveries.filter(d => d.productionStatus === 'cancelado').length
  };

  const blockedCount = deliveries.filter(d => d.isBlocked).length;
  const pendingApprovalCount = deliveries.filter(d => d.approvalStatus === 'aguardando_aprovacao').length;

  return res.json({
    competence,
    totalExpected: totalObligationsExpected,
    publishedCount,
    fulfillmentRate,
    onTimeRate,
    avgApprovalHours,
    reworkRate,
    blockedCount,
    pendingApprovalCount,
    statusBreakdown,
    workloadByPerson
  });
});

export default router;
